// Copyright 2021 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"fmt"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/derat/ascenso/go/db"
)

// handleReadonly handles a "readonly" POST request.
// It updates the config so that the Firestore database cannot be modified by users.
func handleReadonly(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	setReadonly(ctx, w, client, true)
}

// handleReadonly handles a "writable" POST request.
// It updates the config so that the Firestore database is writable by users.
func handleWritable(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	setReadonly(ctx, w, client, false)
}

// setReadonly updates the global config doc's 'readonly' field.
func setReadonly(ctx context.Context, w http.ResponseWriter, client *firestore.Client, readonly bool) {
	if _, err := client.Doc(db.ConfigDocPath).Set(ctx, map[string]interface{}{
		"readonly": readonly,
	}, firestore.MergeAll); err != nil {
		http.Error(w, fmt.Sprintf("Failed setting readonly state: %v", err), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "Set database readonly state to %v", readonly)
}
