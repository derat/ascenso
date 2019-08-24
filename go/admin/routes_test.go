// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"ascenso/go/db"
	"reflect"
	"strings"
	"testing"
)

func TestReadAreas(t *testing.T) {
	for _, tc := range []struct {
		in  string    // input CSV data (including header row)
		out []db.Area // expected output; nil if error is expected
	}{
		{"id,name\na1,A1\na2,A2\n", []db.Area{{ID: "a1", Name: "A1"}, {ID: "a2", Name: "A2"}}},
		{"", nil},                         // empty data, i.e. no header row
		{"id,name\na1\n", nil},            // missing name column in data
		{"id\na1\n", nil},                 // missing name column in header/data
		{"id,name,id\na1,A1,a1\n", nil},   // duplicated id column
		{"id,name,abc\na1,A1,def\n", nil}, // extra 'abc' column
	} {
		if as, err := readAreas(strings.NewReader(tc.in)); err != nil {
			if tc.out != nil {
				t.Errorf("readAreas(%q) failed: %v", tc.in, err)
			}
		} else if tc.out == nil {
			t.Errorf("readAreas(%q) unexpectedly succeeded with %+v", tc.in, as)
		} else if !reflect.DeepEqual(as, tc.out) {
			t.Errorf("readAreas(%q) = %+v; want %+v", tc.in, as, tc.out)
		}
	}
}

func TestReadRoutes(t *testing.T) {
	for _, tc := range []struct {
		in  string     // input CSV data (including header row)
		out []db.Route // expected output; nil if error is expected
	}{
		{
			in: "id,name,area,grade,lead,tr\n" +
				"r1,R1,a1,5.8,10,5\n" +
				"r2,R2,a2,5.10a,8,4\n" +
				"r3,R3,a1,5.12d,20,10\n",
			out: []db.Route{
				{ID: "r1", Name: "R1", Area: "a1", Grade: "5.8", Lead: 10, TR: 5},
				{ID: "r2", Name: "R2", Area: "a2", Grade: "5.10a", Lead: 8, TR: 4},
				{ID: "r3", Name: "R3", Area: "a1", Grade: "5.12d", Lead: 20, TR: 10},
			},
		},
		{"", nil}, // empty data, i.e. no header row
		{"id,name,area,grade,lead,tr\nr1,R1,a1,5.8,10\n", nil},           // missing tr column in data
		{"id,name,area,grade,lead\nr1,R1,a1,5.8,10\n", nil},              // missing tr column in header/data
		{"id,name,area,grade,lead,tr,id\nr1,R1,a1,5.8,10,5,r1\n", nil},   // duplicated id column
		{"id,name,area,grade,lead,tr,abc\nr1,R1,a1,5.8,10,5,def\n", nil}, // extra 'abc' column
		{"id,name,area,grade,lead,tr\nr1,R1,a1,5.8,10,a\n", nil},         // unparseable tr value
	} {
		if rs, err := readRoutes(strings.NewReader(tc.in)); err != nil {
			if tc.out != nil {
				t.Errorf("readRoutes(%q) failed: %v", tc.in, err)
			}
		} else if tc.out == nil {
			t.Errorf("readRoutes(%q) unexpectedly succeeded with %+v", tc.in, rs)
		} else if !reflect.DeepEqual(rs, tc.out) {
			t.Errorf("readRoutes(%q) = %+v; want %+v", tc.in, rs, tc.out)
		}
	}
}

func TestNewSortedData(t *testing.T) {
	a1 := db.Area{ID: "a1", Name: "A1"}
	a2 := db.Area{ID: "a2", Name: "A2"}
	r1 := db.Route{ID: "r1", Name: "R1", Area: "a1", Grade: "5.8", Lead: 10, TR: 5}
	r2 := db.Route{ID: "r2", Name: "R2", Area: "a1", Grade: "5.9", Lead: 12, TR: 6}
	r3 := db.Route{ID: "r3", Name: "R3", Area: "a2", Grade: "5.10a", Lead: 16, TR: 8}

	// makeArea returns a copy of a with rs assigned to its Routes field.
	makeArea := func(a db.Area, rs ...db.Route) db.Area {
		for _, r := range rs {
			r.Area = ""
			a.Routes = append(a.Routes, r)
		}
		return a
	}

	for _, tc := range []struct {
		desc   string         // human-readable description of test case
		areas  []db.Area      // input areas
		routes []db.Route     // input routes
		out    *db.SortedData // expected output; nil if error is expected
	}{
		{"good", []db.Area{a1, a2}, []db.Route{r1, r2, r3},
			&db.SortedData{Areas: []db.Area{makeArea(a1, r1, r2), makeArea(a2, r3)}}},
		{"route refers to nonexistent area", []db.Area{a1}, []db.Route{r1, r2, r3}, nil},
		{"area doesn't have any routes", []db.Area{a1, a2}, []db.Route{r1, r2}, nil},
	} {
		if data, err := db.NewSortedData(tc.areas, tc.routes); err != nil {
			if tc.out != nil {
				t.Errorf("newSortedData (%q) failed: %v", tc.desc, err)
			}
		} else if tc.out == nil {
			t.Errorf("newSortedData (%q) unexpectedly succeeded with %+v", tc.desc, data)
		} else if !reflect.DeepEqual(data, *tc.out) {
			t.Errorf("newSortedData (%q) = %+v; want %+v", tc.desc, data, *tc.out)
		}
	}
}
