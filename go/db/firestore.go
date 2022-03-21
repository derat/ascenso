// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Package db contains Firestore-related constants, types, and helper functions.
package db

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
)

const (
	// Document paths in Cloud Firestore.
	AuthDocPath        = "global/auth"
	ConfigDocPath      = "global/config"
	IndexedDataDocPath = "global/indexedData"
	SortedDataDocPath  = "global/sortedData"

	// Collection paths in Cloud Firestore.
	InviteCollectionPath = "invites"
	TeamCollectionPath   = "teams"
	UserCollectionPath   = "users"
)

// GetDoc fetches a snapshot of the document at ref and decodes it into out,
// which should be a pointer to a struct representing the document.
func GetDoc(ctx context.Context, ref *firestore.DocumentRef, out interface{}) error {
	snap, err := ref.Get(ctx)
	if err != nil {
		return fmt.Errorf("failed getting snapshot for %v: %v", ref.Path, err)
	}
	if err := snap.DataTo(out); err != nil {
		return fmt.Errorf("failed decoding %v: %v", ref.Path, err)
	}
	return nil
}

// SortedData holds sorted area and then route data.
// This format is structured to be easy to display in the app's routes view.
// It corresponds to the document at sortedDataDocPath.
type SortedData struct {
	// Areas contains areas in the order in which they were seen.
	// Each area's Routes field contains routes in the order in which they were seen.
	Areas []Area `firestore:"areas"`
}

// newSortedData constructs a sortedData struct from the supplied areas and routes.
// An error is returned if any areas don't contain routes or any routes
// reference undefined areas.
func NewSortedData(areas []Area, routes []Route) (SortedData, error) {
	// Build a map from area ID to slice of routes, clearing area IDs as we go.
	areaRoutes := make(map[string][]Route)
	for _, r := range routes {
		id := r.Area
		r.Area = ""
		areaRoutes[id] = append(areaRoutes[id], r)
	}

	// Copy areas and assign routes.
	sd := SortedData{Areas: make([]Area, len(areas))}
	copy(sd.Areas, areas)
	for i := range sd.Areas {
		id := sd.Areas[i].ID
		if _, ok := areaRoutes[id]; !ok {
			return SortedData{}, fmt.Errorf("no routes defined for area %q", id)
		}
		sd.Areas[i].Routes = areaRoutes[id]
		delete(areaRoutes, id)
	}

	// Check that we didn't see any routes belonging to undefined areas.
	if len(areaRoutes) != 0 {
		missing := make([]string, 0, len(areaRoutes))
		for id := range areaRoutes {
			missing = append(missing, id)
		}
		return SortedData{}, fmt.Errorf("routes defined for undefined area(s) %q", missing)
	}

	return sd, nil
}

// IndexedData contains areas and routes optimized for lookup by ID.
// It corresponds to the document at indexedDataDocPath.
type IndexedData struct {
	// Areas contains all areas keyed by unique area ID, i.e. area.ID.
	// The area.ID and area.Routes fields are unset.
	Areas map[string]Area `firestore:"areas"`
	// Routes contains all routes keyed by unique route ID, i.e. route.ID.
	// The route.ID field is unset.
	Routes map[string]Route `firestore:"routes"`
}

// newIndexedData constructs an indexedData struct from the supplied areas and routes.
// The area.ID and route.ID fields are cleared (since those IDs are already used as keys).
func NewIndexedData(areas []Area, routes []Route) IndexedData {
	indexed := IndexedData{
		Areas:  make(map[string]Area),
		Routes: make(map[string]Route),
	}
	for _, a := range areas {
		id := a.ID
		a.ID = ""
		indexed.Areas[id] = a
	}
	for _, r := range routes {
		id := r.ID
		r.ID = ""
		indexed.Routes[id] = r
	}
	return indexed
}

// Area contains information about an area consisting of multiple routes.
type Area struct {
	// ID contains a short name uniquely identifying the area, e.g. "el_bloque".
	ID string `firestore:"id,omitempty"`
	// Name contains the full area name, e.g. "El Bloque".
	Name string `firestore:"name"`
	// Routes optionally contains sorted routes.
	Routes []Route `firestore:"routes,omitempty"`
	// MPID contains the area's Mountain Project ID.
	MPID string `firestore:"mpId,omitempty"`
}

// Route contains information about an individual route.
type Route struct {
	// ID contains a short name uniquely identifying the route, e.g. "night_vision".
	ID string `firestore:"id,omitempty"`
	// Name contains the full route name, e.g. "Night Vision".
	Name string `firestore:"name"`
	// Area contains the ID of the area containing this route, i.e. area.ID.
	Area string `firestore:"area,omitempty"`
	// Grade contains the route's grade, e.g. "5.10b" or "5.11c/d".
	Grade string `firestore:"grade,omitempty"`
	// Lead contains the number of points awarded for leading the route.
	Lead int `firestore:"lead,omitempty"`
	// TR contains the number of points awarded for top-roping the route.
	TR int `firestore:"tr,omitempty"`
	// MPID contains the route's Mountain Project ID.
	MPID string `firestore:"mpId,omitempty"`
	// Route height in feet.
	Height int `firestore:"height,omitempty"`
}

// climbState describes whether and how a route was climbed.
type ClimbState int

const (
	NotClimbed ClimbState = iota
	Lead
	TopRope
)

// Team contains information about a team.
// It correponds to documents in the collection at TeamCollectionPath.
type Team struct {
	// Name contains the team's name.
	Name string `firestore:"name"`
	// Num optionally contains the team's number.
	Num int `firestore:"num"`
	// Invite contains the team's invitation code.
	Invite string `firestore:"invite"`
	// Users contains information about the team's members, keyed by user ID.
	Users map[string]struct {
		// Name contains the user's name.
		Name string `firestore:"name"`
		// Climbs contains a map from route ID (see route.ID) to state.
		Climbs map[string]ClimbState `firestore:"climbs"`
	} `firestore:"users"`
}

// User contains information about a user.
// It correponds to documents in the collection at UserCollectionPath.
type User struct {
	// Name contains the user's name.
	Name string `firestore:"name"`
	// Climbs contains the user's climbs. It's only used if the user isn't on a team.
	Climbs map[string]ClimbState `firestore:"climbs"`
	// Team contains the user's team ID. It's empty if they aren't on a team.
	Team string `firestore:"team"`
}
