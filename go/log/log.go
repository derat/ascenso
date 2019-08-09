// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package log implements the "Log" Cloud Function.
package log

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/logging"
	firebase "firebase.google.com/go"
)

const logName = "client" // Stackdriver log name

// logRecord describes an individual log record passed by the client.
// This corresponds to the TypeScript LogRecord interface.
type logRecord struct {
	Time     int64                  `json:"time"`
	Severity string                 `json:"severity"`
	Code     string                 `json:"code"`
	Token    string                 `json:"token"`
	Payload  map[string]interface{} `json:"payload"`
}

// HandleRequest handles an HTTP request to the "Log" Cloud Function.
func HandleRequest(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	// Grab the current time as soon as possible since we're going to compute the
	// difference between it and a client-supplied timestamp.
	now := time.Now()

	// Respond to CORS preflight requests by saying that we'll accept
	// authorized POSTs from anywhere. For more information, see
	// https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
	if r.Method == http.MethodOptions {
		setCORSHeaders(w, r, true /* preflight */)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	setCORSHeaders(w, r, false /* preflight */)

	if r.Method != http.MethodPost {
		http.Error(w, fmt.Sprintf("Bad method %q", r.Method), http.StatusMethodNotAllowed)
		return
	}

	// The client-supplied data is passed in a "data" property in a JSON object.
	var body struct {
		Data struct {
			Records []logRecord `json:"records"`
			Now     int64       `json:"now"`
		} `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Print("Failed reading body: ", err)
		http.Error(w, "Failed reading body", http.StatusBadRequest)
		return
	}

	// Determine how far off client-supplied times are. This is a bit imprecise
	// since it can't incorporate the time that the client spends calling us.
	// For example, if we and the client are synced to exactly the same time but
	// it takes the client 200 ms to invoke this method, the client's log records
	// will get timestamps 200 ms later than when they actually happened.
	clientOffset := now.Sub(time.Unix(0, body.Data.Now*int64(time.Millisecond)))

	client, err := logging.NewClient(ctx, os.Getenv("GCP_PROJECT")) // automatically set by runtime
	if err != nil {
		log.Print("Failed creating Stackdriver client: ", err)
		http.Error(w, "Failed creating logging client", http.StatusInternalServerError)
		return
	}
	lg := client.Logger(logName)

	for _, rec := range body.Data.Records {
		var uid string
		if rec.Token != "" {
			var err error
			if uid, err = getUIDFromToken(ctx, rec.Token); err != nil {
				log.Printf("Failed to get UID from token %q: %v", rec.Token, err)
			}
		}

		lg.Log(logging.Entry{
			// We use the adjusted time supplied by the client here.
			// Stackdriver automatically adds a "receiveTimestamp" field
			// containing the time when it received the record from us.
			Timestamp: time.Unix(0, rec.Time*int64(time.Millisecond)).Add(clientOffset),
			Severity:  logging.ParseSeverity(rec.Severity),
			Labels: map[string]string{
				"code": rec.Code,
				"uid":  uid,
				"addr": getClientAddr(r),
			},
			Payload: rec.Payload,
		})
	}

	if err := client.Close(); err != nil {
		log.Print("Failed closing Stackdriver client: ", err)
		http.Error(w, "Failed closing logging client", http.StatusInternalServerError)
		return
	}

	// Send an abitrary response; the Cloud Functions client library appears to
	// just expect a JSON object with a "data" property.
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(struct {
		Message string `json:"data"`
	}{"ok"}); err != nil {
		log.Print("Failed writing response: ", err)
		http.Error(w, "Failed writing response", http.StatusInternalServerError)
		return
	}
}

// setCORSHeaders sets CORS-related headers on the response to a preflight or main request.
// See https://cloud.google.com/functions/docs/writing/http#handling_cors_requests.
func setCORSHeaders(w http.ResponseWriter, r *http.Request, preflight bool) {
	// Access-Control-Allow-Credentials prohibits the use of wildcards in
	// Access-Control-Allow-Origin, so we just echo back the request's origin.
	if len(r.Header["Origin"]) == 0 {
		panic("No origin header")
	}
	w.Header().Set("Access-Control-Allow-Origin", r.Header["Origin"][0])
	w.Header().Set("Vary", "Origin")

	if preflight {
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Max-Age", "3600")
	}
}

// getUIDFromToken decodes the supplied auth token to get the Firebase UID.
func getUIDFromToken(ctx context.Context, token string) (string, error) {
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("failed creating Firebase app: %v", err)
	}
	auth, err := app.Auth(ctx)
	if err != nil {
		return "", fmt.Errorf("failed getting auth client: %v", err)
	}
	t, err := auth.VerifyIDToken(ctx, token)
	if err != nil {
		return "", fmt.Errorf("failed validating auth token: %v", err)
	}
	return t.UID, nil
}

// getClientAddr attempts to return the client's address.
// See https://stackoverflow.com/q/48032909/ for details.
func getClientAddr(r *http.Request) string {
	if vals := r.Header["Fastly-Client-Ip"]; len(vals) != 0 {
		return vals[0]
	}
	if vals := r.Header["X-Forwarded-For"]; len(vals) != 0 {
		return vals[0]
	}
	return r.RemoteAddr
}
