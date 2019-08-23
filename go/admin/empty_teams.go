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

	"ascenso/go/db"
)

// handleEmptyTeams handles an "emptyTeams" POST request.
// It deletes empty teams from Cloud Firestore.
func handleEmptyTeams(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	var deleted []db.Team

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

		log.Printf("Team %s (%q) has %d user(s)", ref.ID, team.Name, len(team.Users))
		if len(team.Users) != 0 {
			continue
		}

		batch := client.Batch()
		log.Printf("Deleting %s (%+v)", ref.Path, team)
		batch.Delete(ref)

		// Also delete the team's invite doc so it won't be orphaned.
		inviteRef := client.Collection(db.InviteCollectionPath).Doc(team.Invite)
		log.Printf("Deleting %s", inviteRef.Path)
		batch.Delete(inviteRef)

		if _, err := batch.Commit(ctx); err != nil {
			http.Error(w, fmt.Sprintf("Failed deleting team: %v", err), http.StatusInternalServerError)
			return
		}
		deleted = append(deleted, team)
	}

	fmt.Fprintf(w, "Deleted %d empty team(s)\n", len(deleted))
	for _, t := range deleted {
		fmt.Fprintf(w, "%q\n", t.Name)
	}
}
