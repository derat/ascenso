// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exposes auth-related functionality from Firebase.

import firebase from 'firebase/app';
import 'firebase/auth';
import './init';

export const auth = firebase.auth();

// getUser returns the firebase.auth.User for the currently-logged in user.
// An error is thrown if the user is not logged in.
export function getUser() {
  if (!auth.currentUser) {
    throw new Error('No current user');
  }
  return auth.currentUser;
}
