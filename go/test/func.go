// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package log implements the "Test" Cloud Function.
package test

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"ascenso/go/db"
)

// We can't name this file "test.go" since we don't want it to be picked up by "go test".

// HandleRequest handles an HTTP request to the "Test" Cloud Function.
func HandleRequest(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, fmt.Sprintf("Bad method %q", r.Method), http.StatusMethodNotAllowed)
		return
	}

	action := r.FormValue("action")
	switch action {
	case "deleteUser":
		email := r.FormValue("email")
		if err := deleteUser(ctx, email); err != nil {
			log.Printf("Failed deleting %v: %v", email, err)
			http.Error(w, fmt.Sprintf("Failed deleting %v: %v", email, err), http.StatusInternalServerError)
		} else {
			fmt.Fprintf(w, "Deleted %v\n", email)
		}
	default:
		http.Error(w, fmt.Sprintf("Invalid action %q", action), http.StatusBadRequest)
		return
	}
}

// deleteUser deletes the user doc corresponding to email.
// It also removes the user from their team, if any, or deletes the whole team doc
// and the corresponding invite doc if the user was the team's only member.
func deleteUser(ctx context.Context, email string) error {
	if !isTestEmail(email) {
		return errors.New("bad email address")
	}

	// Look up the user ID.
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed creating Firebase app: %v", err)
	}
	ac, err := app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("failed getting auth client: %v", err)
	}
	userInfo, err := ac.GetUserByEmail(ctx, email)
	if err != nil {
		return fmt.Errorf("failed getting user: %v", err)
	} else if userInfo == nil {
		return errors.New("user not found")
	}
	uid := userInfo.UID

	log.Printf("Deleting user %v with email %v", uid, email)

	// Initialize Cloud Firestore.
	client, err := firestore.NewClient(ctx, os.Getenv("GCP_PROJECT")) // automatically set by runtime
	if err != nil {
		return fmt.Errorf("failed creating Firestore client: %v", err)
	}

	// Create a batched write so we can atomically update multiple docs.
	batch := client.Batch()

	// Get the user doc from Firestore.
	userRef := client.Collection(db.UserCollectionPath).Doc(uid)
	userSnap, err := userRef.Get(ctx)
	if status.Code(err) == codes.NotFound {
		log.Printf("User doc %v doesn't exist; nothing to do", userRef.Path)
		return nil
	} else if err != nil {
		return fmt.Errorf("failed getting %v: %v", userRef.Path, err)
	}
	var user db.User
	if err := userSnap.DataTo(&user); err != nil {
		return fmt.Errorf("failed decoding %v: %v", userRef.Path, err)
	}
	log.Printf("Deleting user doc %v: %+v", userRef.Path, user)
	batch.Delete(userRef)

	if user.Team != "" {
		// Get the team doc from Firestore.
		teamRef := client.Collection(db.TeamCollectionPath).Doc(user.Team)
		var team db.Team
		if err := db.GetDoc(ctx, teamRef, &team); err != nil {
			return err
		}
		if _, ok := team.Users[uid]; !ok {
			return fmt.Errorf("user %v not on team %v", uid, teamRef.ID)
		}
		if len(team.Users) == 1 {
			log.Printf("Deleting team doc %v: %+v", teamRef.Path, team)
			batch.Delete(teamRef)

			inviteRef := client.Collection(db.InviteCollectionPath).Doc(team.Invite)
			log.Printf("Deleting invite doc %v", inviteRef.Path)
			batch.Delete(inviteRef)
		} else {
			log.Printf("Removing user from team doc %v: %+v", teamRef.Path, team)
			batch.Update(teamRef, []firestore.Update{{Path: "users." + uid, Value: firestore.Delete}})
		}
	}

	if _, err := batch.Commit(ctx); err != nil {
		return fmt.Errorf("failed committing batched writes: %v", err)
	}
	return nil
}

// isTestEmail returns true if email looks like it belongs to a test account.
// We only allow fake users from IANA-managed reserved example domains to be deleted.
func isTestEmail(email string) bool {
	for _, suf := range []string{"@example.com", "@example.net", "@example.org"} {
		if strings.HasSuffix(email, suf) {
			return true
		}
	}
	return false
}
