// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"reflect"
	"strings"
	"testing"
)

func TestReadAreas(t *testing.T) {
	for _, tc := range []struct {
		in  string // input CSV data (including header row)
		out []area // expected output; nil if error is expected
	}{
		{"id,name\na1,A1\na2,A2\n", []area{{"a1", "A1", nil}, {"a2", "A2", nil}}},
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
		in  string  // input CSV data (including header row)
		out []route // expected output; nil if error is expected
	}{
		{
			in: "id,name,area,grade,lead,tr\n" +
				"r1,R1,a1,5.8,10,5\n" +
				"r2,R2,a2,5.10a,8,4\n" +
				"r3,R3,a1,5.12d,20,10\n",
			out: []route{
				{"r1", "R1", "a1", "5.8", 10, 5},
				{"r2", "R2", "a2", "5.10a", 8, 4},
				{"r3", "R3", "a1", "5.12d", 20, 10},
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
	a1 := area{"a1", "A1", nil}
	a2 := area{"a2", "A2", nil}
	r1 := route{"r1", "R1", "a1", "5.8", 10, 5}
	r2 := route{"r2", "R2", "a1", "5.9", 12, 6}
	r3 := route{"r3", "R3", "a2", "5.10a", 16, 8}

	// makeArea returns a copy of a with its ID field cleared and rs assigned to its Routes field.
	makeArea := func(a area, rs ...route) area {
		a.ID = ""
		for _, r := range rs {
			r.Area = ""
			a.Routes = append(a.Routes, r)
		}
		return a
	}

	for _, tc := range []struct {
		desc   string      // human-readable description of test case
		areas  []area      // input areas
		routes []route     // input routes
		out    *sortedData // expected output; nil if error is expected
	}{
		{"good", []area{a1, a2}, []route{r1, r2, r3}, &sortedData{[]area{makeArea(a1, r1, r2), makeArea(a2, r3)}}},
		{"route refers to nonexistent area", []area{a1}, []route{r1, r2, r3}, nil},
		{"area doesn't have any routes", []area{a1, a2}, []route{r1, r2}, nil},
	} {
		if data, err := newSortedData(tc.areas, tc.routes); err != nil {
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
