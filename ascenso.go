// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package ascenso contains entry points to Cloud Functions.
package ascenso

import (
	"context"
	"net/http"

	"ascenso/admin"
)

// Admin is the entry point into the "Admin" Cloud Function.
// The actual implementation lives in the admin package.
func Admin(w http.ResponseWriter, r *http.Request) {
	admin.HandleRequest(context.Background(), w, r)
}
