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

const maxRequestBytes = 10 << 20 // memory for parsing HTTP requests

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
		case "clearScores":
			handleClearScores(ctx, w, r, client)
		case "emptyTeams":
			handleEmptyTeams(ctx, w, r, client)
		case "routes":
			handlePostRoutes(ctx, w, r, client)
		case "scores":
			handlePostScores(ctx, w, r, client)
		default:
			http.Error(w, fmt.Sprintf("Bad action %q", action), http.StatusBadRequest)
		}
	default:
		http.Error(w, fmt.Sprintf("Bad method %q", r.Method), http.StatusMethodNotAllowed)
	}
}

// checkPassword checks that the supplied password matches the hash in Cloud Storage.
func checkPassword(ctx context.Context, client *firestore.Client, password string) (ok bool, err error) {
	var data struct {
		Hash string `firestore:"cloudFunctionSHA256"`
	}
	if err := getDoc(ctx, client.Doc(authDocPath), &data); err != nil {
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

      <p>A password must be supplied to perform any admin operations.</p>
      <div class="input-row">
        <span class="label">Password</span>
        <input name="password" type="password" />
      </div>

      <h2>View scores</h2>
      <p>View a scoreboard listing all teams.</p>
      <div class="input-row">
        <button name="action" value="scores" type="submit">View scores</button>
      </div>

      <h2>Update routes</h2>
      <p>
        Upload new area and route data in CSV format and use it to replace the
        existing data.
      </p>
      <div class="input-row">
        <span class="label">Areas CSV</span>
        <input name="areas" type="file" accept=".csv" />
      </div>
      <div class="input-row">
        <span class="label">Routes CSV</span>
        <input name="routes" type="file" accept=".csv" />
      </div>
      <div class="input-row">
        <button name="action" value="routes" type="submit">
          Update routes
        </button>
      </div>

      <h2>Delete empty teams</h2>
      <p>Delete all teams that don't have any members.</p>
      <div class="input-row">
        <button name="action" value="emptyTeams" type="submit">
          Delete empty teams
        </button>
      </div>

      <h2>Clear scores</h2>
      <p>Clear scores for all teams and users.</p>
      <div class="input-row">
        <span class="label">Confirm</span>
        <input
          name="confirm"
          type="text"
          autocomplete="off"
          placeholder="Type 'REALLY CLEAR SCORES'"
          style="min-width: 15em"
        />
      </div>
      <div class="input-row">
        <button name="action" value="clearScores" type="submit">
          Clear scores
        </button>
      </div>
    </form>
  </body>
</html>`
