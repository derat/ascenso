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
// If the "deleteTeams" parameter is set to "1", all teams and invite codes are also deleted.
func handleClearScores(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	if r.FormValue("confirm") != "REALLY CLEAR SCORES" {
		http.Error(w, "Didn't confirm that we really want to clear scores", http.StatusBadRequest)
		return
	}

	deleteTeams := r.FormValue("deleteTeams") == "1"

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

		if deleteTeams {
			log.Printf("Deleting team doc %s", ref.Path)
			if _, err := ref.Delete(ctx); err != nil {
				http.Error(w, fmt.Sprintf("Failed deleting team doc %v: %v", ref.Path, err),
					http.StatusInternalServerError)
				return
			}
			continue
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

		updates := []firestore.Update{{Path: "climbs", Value: firestore.Delete}}
		if deleteTeams {
			updates = append(updates, firestore.Update{Path: "team", Value: firestore.Delete})
		}
		log.Printf("Updating user doc %s (%+v)", ref.Path, user)
		if _, err := ref.Update(ctx, updates); err != nil {
			http.Error(w, fmt.Sprintf("Failed updating user: %v", err), http.StatusInternalServerError)
			return
		}
	}

	if deleteTeams {
		it := client.Collection(db.InviteCollectionPath).DocumentRefs(ctx)
		for {
			ref, err := it.Next()
			if err == iterator.Done {
				break
			} else if err != nil {
				http.Error(w, fmt.Sprintf("Failed getting invite ref: %v", err), http.StatusInternalServerError)
				return
			}
			log.Printf("Deleting invite doc %s", ref.Path)
			if _, err := ref.Delete(ctx); err != nil {
				http.Error(w, fmt.Sprintf("Failed deleting invite doc %v: %v", ref.Path, err),
					http.StatusInternalServerError)
				return
			}
		}
	}

	if deleteTeams {
		fmt.Fprintln(w, "Cleared all scores and teams")
	} else {
		fmt.Fprintln(w, "Cleared all scores")
	}
}
