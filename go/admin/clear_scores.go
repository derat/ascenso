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
)

// handleClearScores handles an "clearScores" POST request.
// It clears all scores from Cloud Firestore.
func handleClearScores(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	if r.FormValue("confirm") != "REALLY CLEAR SCORES" {
		http.Error(w, "Didn't confirm that we really want to clear scores", http.StatusBadRequest)
		return
	}

	// First, iterate over team documents.
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

		// Reset all of the "climbs" maps from the nested user data.
		var updates []firestore.Update
		for uid := range teamData.Users {
			updates = append(updates, firestore.Update{
				Path:  "users." + uid + ".climbs",
				Value: map[string]climbState{},
			})
		}
		if len(updates) > 0 {
			log.Printf("Clearing scores from team doc %s (%+v)", ref.Path, teamData)
			if _, err := ref.Update(ctx, updates); err != nil {
				http.Error(w, fmt.Sprintf("Failed updating team: %v", err), http.StatusInternalServerError)
				return
			}
		}
	}

	// Next, iterate over user documents.
	it = client.Collection(userCollectionPath).DocumentRefs(ctx)
	for {
		ref, err := it.Next()
		if err == iterator.Done {
			break
		} else if err != nil {
			http.Error(w, fmt.Sprintf("Failed getting user ref: %v", err), http.StatusInternalServerError)
			return
		}
		var userData user
		if err := getDoc(ctx, ref, &userData); err != nil {
			http.Error(w, fmt.Sprintf("Failed getting user doc: %v", err), http.StatusInternalServerError)
			return
		}

		// Clear the "climbs" map at the top level of the document.
		var newClimbs interface{} = map[string]climbState{}
		// If the user is on a team, we delete the map (since their climbs are
		// stored in the team doc).
		if userData.Team != "" {
			newClimbs = firestore.Delete
		}

		log.Printf("Clearing score from user doc %s (%+v)", ref.Path, userData)
		if _, err := ref.Update(ctx, []firestore.Update{{Path: "climbs", Value: newClimbs}}); err != nil {
			http.Error(w, fmt.Sprintf("Failed updating user: %v", err), http.StatusInternalServerError)
			return
		}
	}

	fmt.Fprintln(w, "Cleared all scores")
}
