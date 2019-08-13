// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains random junk. The only requirement for something being here
// is that it's used by more than one testing-related file.

// Returns a deep copy of |data| (which must be serializable to JSON).
export function deepCopy(data: any) {
  return JSON.parse(JSON.stringify(data));
}
