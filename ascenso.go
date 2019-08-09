// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package ascenso contains entry points to Cloud Functions.
package ascenso

import (
	"context"
	"net/http"

	"ascenso/go/admin"
	"ascenso/go/log"
)

// Admin is the entry point into the "Admin" Cloud Function.
// The actual implementation lives in the admin package.
func Admin(w http.ResponseWriter, r *http.Request) {
	admin.HandleRequest(context.Background(), w, r)
}

// Log is the entry point into the "Log" Cloud Function.
// The actual implementation lives in the log package.
func Log(w http.ResponseWriter, r *http.Request) {
	log.HandleRequest(context.Background(), w, r)
}
