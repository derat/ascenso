// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package admin

import (
	"bytes"
	"testing"
)

func TestComputeScore(t *testing.T) {
	type cm map[string]climbState
	type rm map[string]route

	const (
		r1 = "1"
		r2 = "2"
	)

	routes := rm{
		r1: route{Lead: 10, TR: 5},
		r2: route{Lead: 6, TR: 3},
	}

	for _, tc := range []struct {
		climbs        cm
		routes        rm
		points, count int
	}{
		{nil, nil, 0, 0},
		{nil, rm{}, 0, 0},
		{cm{}, nil, 0, 0},
		{cm{}, rm{}, 0, 0},
		{cm{}, routes, 0, 0},
		{cm{r1: lead}, routes, 10, 1},
		{cm{r1: lead, r2: topRope}, routes, 13, 2},
		{cm{r1: lead, "bogus": lead}, routes, 10, 1},
	} {
		points, count := computeScore(tc.climbs, tc.routes)
		if points != tc.points || count != tc.count {
			t.Errorf("computeScore(%v, %v) = (%v, %v); want (%v, %v)",
				tc.climbs, tc.routes, points, count, tc.points, tc.count)
		}
	}
}

func TestWriteScores(t *testing.T) {
	var b bytes.Buffer
	if err := writeScores(&b, []teamSummary{
		{"Team A", 123, 10, []userSummary{{"User 1", 100, 8}, {"User 2", 23, 2}}},
		{"Team B", 45, 5, []userSummary{{"User 3", 25, 3}, {"User 4", 20, 2}}},
	}); err != nil {
		t.Fatal("writeScores failed: ", err)
	}
	// Uncomment this to view template output.
	//fmt.Print(b.String())
}
