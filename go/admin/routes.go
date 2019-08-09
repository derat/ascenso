// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"cloud.google.com/go/firestore"
)

// handlePostRoutes handles a "routes" POST request.
// It reads uploaded CSV files from w and inserts data into Cloud Firestore.
func handlePostRoutes(ctx context.Context, w http.ResponseWriter, r *http.Request, client *firestore.Client) {
	// Read supplied areas.
	areasFile, _, err := r.FormFile("areas")
	if err != nil {
		http.Error(w, "Area data not supplied", http.StatusBadRequest)
		return
	}
	areas, err := readAreas(areasFile)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed reading area data: %v", err), http.StatusBadRequest)
		return
	}

	// Read supplied routes.
	routesFile, _, err := r.FormFile("routes")
	if err != nil {
		http.Error(w, "Route data not supplied", http.StatusBadRequest)
		return
	}
	routes, err := readRoutes(routesFile)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed reading route data: %v", err), http.StatusBadRequest)
		return
	}

	// Generate documents and write to Cloud Firestore.
	sd, err := newSortedData(areas, routes)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed sorting data: %v", err), http.StatusBadRequest)
		return
	}
	if _, err := client.Doc(sortedDataDocPath).Set(ctx, sd); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing to %v: %v", sortedDataDocPath, err),
			http.StatusInternalServerError)
		return
	}

	if _, err := client.Doc(indexedDataDocPath).Set(ctx, newIndexedData(areas, routes)); err != nil {
		http.Error(w, fmt.Sprintf("Failed writing to %v: %v", indexedDataDocPath, err),
			http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Wrote %d area(s) and %d route(s)", len(areas), len(routes))
}

// readAreas reads and returns areas in CSV format from r.
// The input must begin with a row specifying "id" and "name" columns.
func readAreas(r io.Reader) ([]area, error) {
	var areas []area
	if err := readCSV(r, func() map[string]interface{} {
		areas = append(areas, area{})
		a := &areas[len(areas)-1]
		return map[string]interface{}{
			"id":   &a.ID,
			"name": &a.Name,
		}
	}); err != nil {
		return nil, err
	}
	return areas, nil
}

// readRoutes reads and returns routes in CSV format from r.
// The input must begin with a row specifying "id", "name", "area", "grade",
// "lead", and "tr" columns.
func readRoutes(r io.Reader) ([]route, error) {
	var routes []route
	if err := readCSV(r, func() map[string]interface{} {
		routes = append(routes, route{})
		rt := &routes[len(routes)-1]
		return map[string]interface{}{
			"id":    &rt.ID,
			"name":  &rt.Name,
			"area":  &rt.Area,
			"grade": &rt.Grade,
			"lead":  &rt.Lead,
			"tr":    &rt.TR,
		}
	}); err != nil {
		return nil, err
	}
	return routes, nil
}

// rowDestFunc is passed to readCSV and returns a map from column name to
// destination (either *string or *int) for data in a new row.
type rowDestFunc func() map[string]interface{}

// readCSV returns CSV data from r. The first row should contain column names.
// f is invoked for each row and should return a map from column names to
// destinations for their values.
func readCSV(r io.Reader, f rowDestFunc) error {
	cr := csv.NewReader(r)
	head, err := cr.Read()
	if err != nil {
		return fmt.Errorf("failed to read header: %v", err)
	}

	for {
		row, err := cr.Read()
		if err == io.EOF {
			break
		} else if err != nil {
			return fmt.Errorf("failed reading row: %v", err)
		}

		// Iterate over columns and copy values to the appropriate destination.
		dstMap := f()
		for i, name := range head {
			dst, ok := dstMap[name]
			if !ok {
				return fmt.Errorf("unknown or duplicate column %q in %q", name, row)
			}

			// Delete entries from the map as we go so we can detect duplicate
			// columns and check that all expected columns were seen.
			delete(dstMap, name)

			switch td := dst.(type) {
			case *string:
				*td = row[i]
			case *int:
				if *td, err = strconv.Atoi(row[i]); err != nil {
					return fmt.Errorf("failed to parse %q in %q: %v", row[i], row, err)
				}
			default:
				return fmt.Errorf("unsupported type %T for column %q", td, name)
			}
		}

		// If any columns remain in the map, they were missing from the row.
		if len(dstMap) != 0 {
			missing := make([]string, 0, len(dstMap))
			for name := range dstMap {
				missing = append(missing, name)
			}
			return fmt.Errorf("missing column(s) %q", missing)
		}
	}

	return nil
}
