// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains tests for the Cloud Firestore security rules in the
// firestore.rules file. It requires the Firestore emulator to be running:
//   firebase setup:emulators:firestore
//   firebase serve --only firestore
//
// More information about this junk:
//   https://firebase.google.com/docs/firestore/security/test-rules-emulator
//   https://github.com/firebase/quickstart-nodejs/tree/master/firestore-emulator/typescript-quickstart

import * as firebase from '@firebase/testing';
import * as fs from 'fs';

const projectId = `firestore-test-${Date.now()}`;
const uid = 'test-uid';

const authPath = 'global/auth';
const configPath = 'global/config';
const userPath = `users/${uid}`;
const teamPath = 'teams/team-id';
const invitePath = 'invites/123456';

describe('Firestore', () => {
  // The admin app bypasses security rules and can be used for test setup.
  let adminDB: firebase.firestore.Firestore;
  // The authenticated app simulates |uid| being logged in.
  let authDB: firebase.firestore.Firestore;
  // The anonymous app simulates an unauthenticated user.
  let anonDB: firebase.firestore.Firestore;

  beforeAll(async () => {
    const rules = fs.readFileSync('./firestore.rules', 'utf8');
    await firebase.loadFirestoreRules({ projectId, rules });

    adminDB = firebase.initializeAdminApp({ projectId }).firestore();
    authDB = firebase
      .initializeTestApp({ projectId, auth: { uid } })
      .firestore();
    anonDB = firebase.initializeTestApp({ projectId }).firestore();
  });

  beforeEach(async () => {
    await firebase.clearFirestoreData({ projectId });
  });

  afterAll(async () => {
    // Clean up the apps.
    await Promise.all(firebase.apps().map(app => app.delete()));
  });

  it('denies access to auth doc', async () => {
    await firebase.assertFails(authDB.doc(authPath).get());
    await firebase.assertFails(authDB.doc(authPath).set({}));
  });

  it('allows anonymous read access to config doc', async () => {
    await firebase.assertSucceeds(anonDB.doc(configPath).get());
    await firebase.assertFails(anonDB.doc(configPath).set({}));
  });

  it('allows signed-in read access to config doc', async () => {
    await firebase.assertSucceeds(authDB.doc(configPath).get());
    await firebase.assertFails(authDB.doc(configPath).set({}));
  });

  it('denies creating global doc', async () => {
    await firebase.assertFails(authDB.doc('/global/foo').set({}));
  });

  it('denies creating doc in new collection', async () => {
    await firebase.assertFails(authDB.doc('/bogus/doc').set({}));
  });

  it('allows read and write access to own user doc', async () => {
    await firebase.assertSucceeds(authDB.doc(userPath).get());
    await firebase.assertSucceeds(authDB.doc(userPath).set({}));
  });

  it('denies access to other user doc', async () => {
    const path = '/users/other-uid';
    await firebase.assertFails(authDB.doc(path).get());
    await firebase.assertFails(authDB.doc(path).set({}));
  });

  it('denies anonymous access to user docs', async () => {
    await firebase.assertFails(anonDB.doc(userPath).get());
    await firebase.assertFails(anonDB.doc(userPath).set({}));
  });

  it('denies enumerating user docs', async () => {
    await firebase.assertFails(authDB.collectionGroup('users').get());
  });

  it('allows creating team doc', async () => {
    const data = { users: { [uid]: {} } };
    await firebase.assertSucceeds(authDB.doc(teamPath).set(data));
  });

  it('allows read and write access to own team doc', async () => {
    const data = { users: { [uid]: {}, 'other-uid': {} } };
    await adminDB.doc(teamPath).set(data);
    await firebase.assertSucceeds(authDB.doc(teamPath).get());
    await firebase.assertSucceeds(authDB.doc(teamPath).set(data));
  });

  it('allows read and write access to other incomplete team doc', async () => {
    const data = { users: { 'other-uid': {} } };
    await adminDB.doc(teamPath).set(data);
    await firebase.assertSucceeds(authDB.doc(teamPath).get());
    await firebase.assertSucceeds(authDB.doc(teamPath).set(data));
  });

  it('denies read and write access to other complete team doc', async () => {
    const data = { users: { a: {}, b: {} } };
    await adminDB.doc(teamPath).set(data);
    await firebase.assertFails(authDB.doc(teamPath).get());
    await firebase.assertFails(authDB.doc(teamPath).set(data));
  });

  it('denies enumerating team docs', async () => {
    await firebase.assertFails(authDB.collectionGroup('teams').get());
  });

  it('allows reading and creating invite doc', async () => {
    await firebase.assertSucceeds(authDB.doc(invitePath).get());
    await firebase.assertSucceeds(authDB.doc(invitePath).set({}));

    // Updates to the now-existing doc should be blocked.
    await firebase.assertFails(authDB.doc(invitePath).set({}));
  });

  it('denies enumerating invite docs', async () => {
    await firebase.assertFails(authDB.collectionGroup('invites').get());
  });
});
