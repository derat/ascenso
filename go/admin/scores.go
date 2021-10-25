// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"encoding/csv"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"

	"github.com/derat/ascenso/go/db"
)

// handlePostScores handles a "scores" POST request.
// It reads teams' scores from Cloud Firestore and writes an HTML scoreboard document to w.
func handlePostScores(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	teams, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	sort.Slice(teams, func(i, j int) bool { return teams[i].Score > teams[j].Score })
	if err := writeScores(w, teams); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing template: %v", err), http.StatusInternalServerError)
		return
	}
}

// handlePostScoresTeamsCSV handles a "scoresTeamsCsv" POST request.
func handlePostScoresTeamsCSV(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	teams, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	sort.Slice(teams, func(i, j int) bool { return teams[i].Name < teams[j].Name })

	recs := [][]string{{"team", "name_1", "name_2", "score", "climbs", "height"}}
	for _, team := range teams {
		rec := []string{team.Name}
		if len(team.Users) > 0 {
			rec = append(rec, team.Users[0].Name)
		} else {
			rec = append(rec, "")
		}
		if len(team.Users) > 1 {
			rec = append(rec, team.Users[1].Name)
		} else {
			rec = append(rec, "")
		}
		rec = append(rec, strconv.Itoa(team.Score), strconv.Itoa(team.NumClimbs), strconv.Itoa(team.Height))

		recs = append(recs, rec)
	}

	setCSVHeaders(w.Header(), "teams.csv")
	if err := csv.NewWriter(w).WriteAll(recs); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing teams: %v", err), http.StatusInternalServerError)
	}
}

// handlePostScoresUsersCSV handles a "scoresUsersCsv" POST request.
func handlePostScoresUsersCSV(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	teams, err := getScores(ctx, client)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed loading scores: %v", err), http.StatusInternalServerError)
		return
	}
	var users []userSummary
	for _, t := range teams {
		users = append(users, t.Users...)
	}
	sort.Slice(users, func(i, j int) bool { return users[i].Name < users[j].Name })

	recs := [][]string{{"name", "team", "score", "climbs", "height"}}
	for _, u := range users {
		recs = append(recs, []string{
			u.Name, u.Team, strconv.Itoa(u.Score), strconv.Itoa(u.NumClimbs), strconv.Itoa(u.Height),
		})
	}

	setCSVHeaders(w.Header(), "users.csv")
	if err := csv.NewWriter(w).WriteAll(recs); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing users: %v", err), http.StatusInternalServerError)
	}
}

// setCSVHeaders sets headers on h to indicate a CSV attachment with the given filename.
func setCSVHeaders(h http.Header, fn string) {
	h.Set("Content-Encoding", "UTF-8")
	h.Set("Content-Type", "text/csv; charset=UTF-8")
	h.Set("Content-Disposition", "attachment; filename="+fn)
}

// getScores reads teams' scores from Cloud Firestore and returns summarized data.
func getScores(ctx context.Context, client *firestore.Client) ([]teamSummary, error) {
	// First, load the indexed data so we can look up the points for each route.
	var indexed db.IndexedData
	if err := db.GetDoc(ctx, client.Doc(db.IndexedDataDocPath), &indexed); err != nil {
		return nil, fmt.Errorf("failed getting indexed data: %v", err)
	}

	// Iterate over all of the teams.
	var teams []teamSummary
	it := client.Collection(db.TeamCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			return nil, fmt.Errorf("failed getting team ref: %v", err)
		}
		var team db.Team
		if err := db.GetDoc(ctx, ref, &team); err != nil {
			return nil, fmt.Errorf("failed getting team doc: %v", err)
		}

		if len(team.Users) == 0 {
			continue
		}

		summary := teamSummary{Name: team.Name}

		// Iterate over the team's members.
		for _, u := range team.Users {
			score, climbs, height := computeScore(u.Climbs, indexed.Routes)
			summary.Score += score
			summary.NumClimbs += climbs
			summary.Height += height
			summary.Users = append(summary.Users, userSummary{
				Name:      u.Name,
				Team:      team.Name,
				Score:     score,
				NumClimbs: climbs,
				Height:    height,
			})
		}
		sort.Slice(summary.Users, func(i, j int) bool {
			return summary.Users[i].Score > summary.Users[j].Score
		})

		teams = append(teams, summary)
	}

	return teams, nil
}

// computeScore iterates over the supplied climbs and returns the user's total score, number of
// climbs, and total height.
func computeScore(climbs map[string]db.ClimbState, routes map[string]db.Route) (points, count, height int) {
	if climbs == nil || routes == nil {
		return 0, 0, 0
	}

	for id, state := range climbs {
		rt, ok := routes[id]
		if !ok {
			continue
		}
		if state == db.Lead {
			points += rt.Lead
			count++
		} else if state == db.TopRope {
			points += rt.TR
			count++
		}
		height += rt.Height
	}
	return points, count, height
}

// teamSummary describes a team's performance.
type teamSummary struct {
	Name      string
	Score     int
	NumClimbs int
	Height    int
	Users     []userSummary
}

// userSummary describes an individual climber's performance.
type userSummary struct {
	Name      string
	Team      string // redundant, but used for per-user CSV
	Score     int
	NumClimbs int
	Height    int
}

// writeScores writes an HTML document describing the scores in teams to w.
func writeScores(w io.Writer, teams []teamSummary) error {
	tmpl, err := template.New("").Parse(strings.TrimLeft(scoresTemplate, "\n"))
	if err != nil {
		return err
	}
	return tmpl.Execute(w, struct {
		Teams []teamSummary
	}{
		Teams: teams,
	})
}

const scoresTemplate = `
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
        <th>Height</th>
        <th>Climber</th>
        <th>Score</th>
        <th>Climbs</th>
        <th>Height</th>
      </tr>
{{- range .Teams}}
      <tr>
        <td rowspan="{{len .Users}}">{{.Name}}</td>
        <td rowspan="{{len .Users}}" class="num">{{.Score}}</td>
        <td rowspan="{{len .Users}}" class="num">{{.NumClimbs}}</td>
        <td rowspan="{{len .Users}}" class="num">{{.Height}}'</td>
{{- range $i, $user := .Users}}
{{- if ne $i 0}}
      <tr>
{{- end}}
        <td>{{$user.Name}}</td>
        <td class="num">{{$user.Score}}</td>
        <td class="num">{{$user.NumClimbs}}</td>
        <td class="num">{{$user.Height}}'</td>
      </tr>
{{- end}}
{{- end}}
    </table>
  </body>
</html>
`
