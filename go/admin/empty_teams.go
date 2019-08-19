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

// handleEmptyTeams handles an "emptyTeams" POST request.
// It deletes empty teams from Cloud Firestore.
func handleEmptyTeams(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	var deleted []team

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

		log.Printf("Team %s (%q) has %d user(s)", ref.ID, teamData.Name, len(teamData.Users))
		if len(teamData.Users) != 0 {
			continue
		}

		log.Printf("Deleting %s (%+v)", ref.Path, teamData)
		if _, err := ref.Delete(ctx); err != nil {
			http.Error(w, fmt.Sprintf("Failed deleting team: %v", err), http.StatusInternalServerError)
			return
		}
		deleted = append(deleted, teamData)
	}

	fmt.Fprintf(w, "Deleted %d empty team(s)\n", len(deleted))
	for _, t := range deleted {
		fmt.Fprintf(w, "%q\n", t.Name)
	}
}
