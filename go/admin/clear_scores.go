// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"

	"github.com/derat/ascenso/go/db"
)

// handleClearScores handles an "clearScores" POST request.
// It clears all scores from Cloud Firestore.
func handleClearScores(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	if r.FormValue("confirm") != "REALLY CLEAR SCORES" {
		http.Error(w, "Didn't confirm that we really want to clear scores", http.StatusBadRequest)
		return
	}

	// First, iterate over team documents.
	it := client.Collection(db.TeamCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			http.Error(w, fmt.Sprintf("Failed getting team ref: %v", err), http.StatusInternalServerError)
			return
		}
		var team db.Team
		if err := db.GetDoc(ctx, ref, &team); err != nil {
			http.Error(w, fmt.Sprintf("Failed getting team doc: %v", err), http.StatusInternalServerError)
			return
		}

		// Reset all of the "climbs" maps from the nested user data.
		var updates []firestore.Update
		for uid := range team.Users {
			updates = append(updates, firestore.Update{
				Path:  "users." + uid + ".climbs",
				Value: map[string]db.ClimbState{},
			})
		}
		if len(updates) > 0 {
			log.Printf("Clearing scores from team doc %s (%+v)", ref.Path, team)
			if _, err := ref.Update(ctx, updates); err != nil {
				http.Error(w, fmt.Sprintf("Failed updating team: %v", err), http.StatusInternalServerError)
				return
			}
		}
	}

	// Next, iterate over user documents.
	it = client.Collection(db.UserCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			http.Error(w, fmt.Sprintf("Failed getting user ref: %v", err), http.StatusInternalServerError)
			return
		}
		var user db.User
		if err := db.GetDoc(ctx, ref, &user); err != nil {
			http.Error(w, fmt.Sprintf("Failed getting user doc: %v", err), http.StatusInternalServerError)
			return
		}

		// Clear the "climbs" map at the top level of the document.
		var newClimbs interface{} = map[string]db.ClimbState{}
		// If the user is on a team, we delete the map (since their climbs are
		// stored in the team doc).
		if user.Team != "" {
			newClimbs = firestore.Delete
		}

		log.Printf("Clearing score from user doc %s (%+v)", ref.Path, user)
		if _, err := ref.Update(ctx, []firestore.Update{{Path: "climbs", Value: newClimbs}}); err != nil {
			http.Error(w, fmt.Sprintf("Failed updating user: %v", err), http.StatusInternalServerError)
			return
		}
	}

	fmt.Fprintln(w, "Cleared all scores")
}
