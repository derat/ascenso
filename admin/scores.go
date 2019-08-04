// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"sort"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// handlePostScores handles a "scores" POST request.
// It reads teams' scores from Cloud Firestore and writes an HTML scoreboard document to w.
func handlePostScores(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	// First, load the indexed data so we can look up the points for each route.
	var indexed indexedData
	if err := getDoc(ctx, client.Doc(indexedDataDocPath), &indexed); err != nil {
		http.Error(w, fmt.Sprintf("Failed getting indexed data: %v", err),
			http.StatusInternalServerError)
		return
	}

	// Iterate over all of the teams.
	var teams []teamSummary
	it := client.Collection(teamCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			http.Error(w, fmt.Sprintf("Failed getting team ref: %v", err), http.StatusInternalServerError)
			return
		}
		var teamData team
		if err := getDoc(ctx, ref, &teamData); err != nil {
			http.Error(w, fmt.Sprintf("Failed getting team doc: %v", err), http.StatusInternalServerError)
			return
		}

		summary := teamSummary{Name: teamData.Name}

		// Iterate over the team's members.
		for _, u := range teamData.Users {
			score, climbs := computeScore(u.Climbs, indexed.Routes)
			summary.Score += score
			summary.NumClimbs += climbs
			summary.Users = append(summary.Users, userSummary{u.Name, score, climbs})
		}
		sort.Slice(summary.Users, func(i, j int) bool {
			return summary.Users[i].Score > summary.Users[j].Score
		})

		teams = append(teams, summary)
	}

	sort.Slice(teams, func(i, j int) bool { return teams[i].Score > teams[j].Score })
	if err := writeScores(w, teams); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing template: %v", err), http.StatusInternalServerError)
		return
	}
}

// computeScore iterates over the supplied climbs and returns the user's total score
// and number of climbs.
func computeScore(climbs map[string]climbState, routes map[string]route) (points, count int) {
	if climbs == nil || routes == nil {
		return 0, 0
	}

	for id, state := range climbs {
		rt, ok := routes[id]
		if !ok {
			continue
		}
		if state == lead {
			points += rt.Lead
			count++
		} else if state == topRope {
			points += rt.TR
			count++
		}
	}
	return points, count
}

// teamSummary describes a team's performance.
type teamSummary struct {
	Name      string
	Score     int
	NumClimbs int
	Users     []userSummary
}

// userSummary describes an individual climber's performance.
type userSummary struct {
	Name      string
	Score     int
	NumClimbs int
}

// writeScores writes an HTML document describing the scores in teams to w.
func writeScores(w io.Writer, teams []teamSummary) error {
	tmpl, err := template.New("").Parse(strings.TrimLeft(scoreTemplate, "\n"))
	if err != nil {
		return err
	}
	return tmpl.Execute(w, struct {
		Teams []teamSummary
	}{
		Teams: teams,
	})
}

const scoreTemplate = `
<!DOCTYPE html>
<html>
  <head>
    <title>Scores</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
      }
      table {
        border: 1px solid #aaa;
        border-collapse: collapse;
      }
      td, th {
        border: 1px solid #aaa;
        max-width: 20em;
        padding: 2px 10px;
      }
      th {
        background-color: #ddd;
        font-weight: bold;
        text-align: left;
      }
      .num {
        text-align: right;
      } 
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th>Team</th>
        <th>Score</th>
        <th>Climbs</th>
        <th>Climber</th>
        <th>Score</th>
        <th>Climbs</th>
      </tr>
{{- range .Teams}}
      <tr>
        <td rowspan="{{len .Users}}">{{.Name}}</td>
        <td rowspan="{{len .Users}}" class="num">{{.Score}}</td>
        <td rowspan="{{len .Users}}" class="num">{{.NumClimbs}}</td>
{{- range $i, $user := .Users}}
{{- if ne $i 0}}
      <tr>
{{- end}}
        <td>{{$user.Name}}</td>
        <td class="num">{{$user.Score}}</td>
        <td class="num">{{$user.NumClimbs}}</td>
      </tr>
{{- end}}
{{- end}}
    </table>
  </body>
</html>
`
