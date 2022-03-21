// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"bytes"
	"testing"

	"github.com/derat/ascenso/go/db"
)

func TestComputeScore(t *testing.T) {
	type cm map[string]db.ClimbState
	type rm map[string]db.Route

	const (
		r1 = "1"
		r2 = "2"
	)

	routes := rm{
		r1: db.Route{Lead: 10, TR: 5, Height: 60},
		r2: db.Route{Lead: 6, TR: 3, Height: 30},
	}

	for _, tc := range []struct {
		climbs                cm
		routes                rm
		points, count, height int
	}{
		{nil, nil, 0, 0, 0},
		{nil, rm{}, 0, 0, 0},
		{cm{}, nil, 0, 0, 0},
		{cm{}, rm{}, 0, 0, 0},
		{cm{}, routes, 0, 0, 0},
		{cm{r1: db.Lead}, routes, 10, 1, 60},
		{cm{r1: db.Lead, r2: db.TopRope}, routes, 13, 2, 90},
		{cm{r1: db.Lead, "bogus": db.Lead}, routes, 10, 1, 60},
	} {
		points, count, height := computeScore(tc.climbs, tc.routes)
		if points != tc.points || count != tc.count || height != tc.height {
			t.Errorf("computeScore(%v, %v) = (%v, %v, %v); want (%v, %v, %v)",
				tc.climbs, tc.routes, points, count, height, tc.points, tc.count, tc.height)
		}
	}
}

func TestWriteScores(t *testing.T) {
	var b bytes.Buffer
	if err := writeScores(&b, []teamSummary{
		{"Team A", "1", 123, 10, 800, []userSummary{
			{"User 1", "Team A", "1", 100, 8, 500, ""},
			{"User 2", "Team A", "1", 23, 2, 300, ""},
		}},
		{"Team B", "", 45, 5, 600, []userSummary{
			{"User 3", "Team B", "", 25, 3, 400, ""},
			{"User 4", "Team B", "", 20, 2, 200, ""},
		}},
	}, nil); err != nil {
		t.Fatal("writeScores failed: ", err)
	}
	// Uncomment this to view template output.
	//fmt.Print(b.String())
}
