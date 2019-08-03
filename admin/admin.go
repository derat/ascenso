// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package admin implements the "Admin" Cloud Function.
package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
)

const (
	authDocPath     = "global/auth" // document path in Cloud Firestore
	maxRequestBytes = 10 << 20      // memory for parsing HTTP requests
)

// HandleRequest handles an HTTP request to the "Admin" Cloud Function.
func HandleRequest(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		fmt.Fprint(w, strings.TrimLeft(getHTML, "\n"))
	case http.MethodPost:
		if err := r.ParseMultipartForm(maxRequestBytes); err != nil {
			http.Error(w, "Failed parsing form data", http.StatusBadRequest)
			return
		}

		// Initialize Cloud Firestore.
		client, err := firestore.NewClient(ctx, os.Getenv("GCP_PROJECT")) // automatically set by runtime
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed creating Firestore client: %v", err), http.StatusInternalServerError)
			return
		}

		// Check that the request is authorized.
		if ok, err := checkPassword(ctx, client, r.FormValue("password")); err != nil {
			http.Error(w, fmt.Sprintf("Failed checking password: %v", err), http.StatusInternalServerError)
			return
		} else if !ok {
			http.Error(w, "Incorrect password", http.StatusUnauthorized)
			return
		}

		action := r.FormValue("action")
		switch action {
		case "routes":
			handlePostRoutes(ctx, w, r, client)
		default:
			http.Error(w, fmt.Sprintf("Bad action %q", action), http.StatusBadRequest)
		}
	default:
		http.Error(w, fmt.Sprintf("Bad method %q", r.Method), http.StatusMethodNotAllowed)
	}
}

// checkPassword checks that the supplied password matches the hash in Cloud Storage.
func checkPassword(ctx context.Context, client *firestore.Client, password string) (ok bool, err error) {
	snap, err := client.Doc(authDocPath).Get(ctx)
	if err != nil {
		return false, err
	}
	var data struct {
		Hash string `firestore:"cloudFunctionSHA256"`
	}
	if err := snap.DataTo(&data); err != nil {
		return false, err
	}

	sum := sha256.Sum256([]byte(password))
	return data.Hash == hex.EncodeToString(sum[:]), nil
}

// HTML data returned for GET requests.
const getHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Admin</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
    }
    .input-row {
      display: flex;
      padding: 5px;
      align-items: baseline;
    }
    .label {
      min-width: 100px;
    }
  </style>
</head>
<body>
  <form enctype="multipart/form-data" method="POST">
    <h1>Admin</h1>

	<div class="input-row">
      <span class="label">Password</span>
      <input name="password" type="password" />
    </div>

    <h2>Update routes</h3>
    <div class="input-row">
      <span class="label">Areas CSV</span>
      <input name="areas" type="file" accept=".csv" />
    </div>
    <div class="input-row">
      <span class="label">Routes CSV</span>
      <input name="routes" type="file" accept=".csv" />
    </div>
    <div class="input-row">
      <button name="action" value="routes" type="submit">Upload</button>
    </div>
  </form>
</body>
</html>`
