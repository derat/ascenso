// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains tests for the Cloud Firestore security rules in the
// firestore.rules file. It requires the Firestore emulator to be set up using
// "firebase setup:emulators:firestore".
//
// The emulator can be started using "firebase serve --only firestore", but "npm
// run test:firetore" will do this automatically before executing the tests in
// this file.
//
// More information about this junk:
//   https://firebase.google.com/docs/firestore/security/test-rules-emulator
//   https://github.com/firebase/quickstart-nodejs/tree/master/firestore-emulator/typescript-quickstart

import * as firebase from '@firebase/rules-unit-testing';

const projectId = `firestore-test-${Date.now()}`;

// Data to use in tests.
const uid = 'test-uid';
const team = 'team-id';
const name = 'Test Name';
const invite = '123456';
const climbs = { route: 1 };
const users = { [uid]: { name, climbs } };
const usersNoClimbs = { [uid]: { name, climbs: {} } };

const authPath = 'global/auth';
const configPath = 'global/config';
const userPath = `users/${uid}`;
const teamPath = `teams/${team}`;
const invitePath = `invites/${invite}`;

const otherName = 'Other Name';
const otherTeam = 'other-team-id';
const otherInvite = '999999';
const longName = 'a'.repeat(51); // exceeds limit in firestore.rules

describe('Firestore', () => {
  // The admin app bypasses security rules and can be used for test setup.
  let adminDB: firebase.firestore.Firestore;
  // The authenticated app simulates |uid| being logged in.
  let authDB: firebase.firestore.Firestore;
  // The anonymous app simulates an unauthenticated user.
  let anonDB: firebase.firestore.Firestore;

  beforeAll(async () => {
    // package.json runs "firebase emulators:exec --only firestore", which
    // automatically loads firestore.rules. If it didn't, we'd need to load the
    // rules with fs.readFileSync() here and pass them to
    // firebase.loadFirestoreRules().

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
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  // State describes documents to create for testing.
  enum State {
    // |uid| is the only member of |team|.
    ON_TEAM,
    // |uid| is the only member of |team| and hasn't reported climbs.
    ON_TEAM_NO_CLIMBS,
    // |team| exists without any members.
    EMPTY_TEAM,
    // No team doc is written.
    NO_TEAM,
  }

  // Writes initial user, team, and invite documents as described by |state|.
  async function writeDocs(state: State) {
    const userData: Record<string, any> = { name };
    if (state == State.ON_TEAM || state == State.ON_TEAM_NO_CLIMBS) {
      userData.team = team;
    }
    await adminDB.doc(userPath).set(userData);

    if (state == State.NO_TEAM) return;

    const usersMap =
      state == State.ON_TEAM
        ? users
        : state == State.ON_TEAM_NO_CLIMBS
        ? usersNoClimbs
        : {};
    await adminDB.doc(teamPath).set({ name, invite, users: usersMap });
    await adminDB.doc(invitePath).set({ team });
  }

  // Define some aliases. Tests generally don't need to create docs before
  // checking read access using allow(), since DocumentReference.get()
  // returns an empty snapshot if the document doesn't exist (as long as the
  // read isn't blocked by security rules).
  const allow = firebase.assertSucceeds;
  const deny = firebase.assertFails;

  it('denies access to auth doc', async () => {
    const ref = authDB.doc(authPath);
    await deny(ref.get());
    await deny(ref.set({}));
    await deny(ref.delete());
  });

  it('allows anonymous read-only access to config doc', async () => {
    const ref = anonDB.doc(configPath);
    await allow(ref.get());
    await deny(ref.set({}));
    await deny(ref.delete());
  });

  it('allows signed-in read-only access to config doc', async () => {
    const ref = authDB.doc(configPath);
    await allow(ref.get());
    await deny(ref.set({}));
    await deny(ref.delete());
  });

  it('denies creating or deleting other global docs', async () => {
    const ref = authDB.doc('global/foo');
    await deny(ref.set({}));
    await deny(ref.delete());
  });

  it('denies access to docs in new collections', async () => {
    const ref = authDB.doc('bogus/doc');
    await deny(ref.get());
    await deny(ref.set({}));
    await deny(ref.delete());
  });

  it('allows creating own user doc', async () => {
    await allow(authDB.doc(userPath).set({ name }));
  });

  it('denies creating user doc when readonly is set to true', async () => {
    await adminDB.doc(configPath).set({ readonly: true });
    await deny(authDB.doc(userPath).set({ name }));
  });

  it('allows creating user doc when readonly is set to false', async () => {
    await adminDB.doc(configPath).set({ readonly: false });
    await allow(authDB.doc(userPath).set({ name }));
  });

  it('allows reading and updating own user doc', async () => {
    await writeDocs(State.NO_TEAM);
    const ref = authDB.doc(userPath);
    await allow(ref.get());
    await allow(ref.update({ name: otherName }));
  });

  it('allows reading but denies updating own user doc when readonly', async () => {
    await writeDocs(State.NO_TEAM);
    await adminDB.doc(configPath).set({ readonly: true });
    const ref = authDB.doc(userPath);
    await allow(ref.get());
    await deny(ref.update({ name: otherName }));
  });

  it('denies deleting own user doc', async () => {
    await deny(authDB.doc(userPath).delete());
  });

  it('denies access to other user docs', async () => {
    const ref = authDB.doc('/users/other-uid');
    await deny(ref.get());
    await deny(ref.set({ name }));
    await deny(ref.delete());
  });

  it('denies anonymous access to user docs', async () => {
    const ref = anonDB.doc(userPath);
    await deny(ref.get());
    await deny(ref.set({ name }));
    await deny(ref.delete());
  });

  it('performs basic validation of user doc fields', async () => {
    const ref = authDB.doc(userPath);
    await deny(ref.set({}));
    await deny(ref.set({ name: '' }));
    await deny(ref.set({ name: longName }));
    // Team-related checks are tested separately.
  });

  it('denies enumerating user docs', async () => {
    await deny(authDB.collectionGroup('users').get());
  });

  it('allows read and update access to own team doc', async () => {
    await writeDocs(State.ON_TEAM);
    const ref = authDB.doc(teamPath);
    await allow(ref.get());
    await allow(ref.update({ name: otherName }));
    await deny(ref.delete());
  });

  it('allows reading but denies updating team doc when readonly', async () => {
    await writeDocs(State.ON_TEAM);
    await adminDB.doc(configPath).set({ readonly: true });
    const ref = authDB.doc(teamPath);
    await allow(ref.get());
    await deny(ref.update({ name: otherName }));
  });

  it('denies updating invite code in team doc', async () => {
    await writeDocs(State.ON_TEAM);
    await deny(authDB.doc(teamPath).update({ invite: otherInvite }));
  });

  it('allows read access to other incomplete team doc', async () => {
    await writeDocs(State.NO_TEAM);
    await adminDB
      .doc(teamPath)
      .set({ name, invite, users: { 'other-uid': {} } });

    const ref = authDB.doc(teamPath);
    await allow(ref.get());
    await deny(ref.update({ name: name + ' Foo' }));
    await deny(ref.delete());
  });

  it('denies read and write access to other full team doc', async () => {
    await writeDocs(State.NO_TEAM);
    await adminDB.doc(teamPath).set({ name, invite, users: { a: {}, b: {} } });

    const ref = authDB.doc(teamPath);
    await deny(ref.get());
    await deny(ref.update({ name: name + ' Foo' }));
    await deny(ref.delete());
  });

  it('validates team docs on create', async () => {
    await adminDB.doc(userPath).set({ name, team });
    await adminDB.doc(invitePath).set({ invite });
    const ref = authDB.doc(teamPath);

    await deny(ref.set({})); // empty doc

    // Bad names.
    await deny(ref.set({ invite, users }));
    await deny(ref.set({ name: '', invite, users }));
    await deny(ref.set({ name: longName, invite, users }));

    // Bad invite codes.
    await deny(ref.set({ name, users }));
    await deny(ref.set({ name, invite: '', users }));
    await deny(ref.set({ name, invite: '1234567', users }));
    await deny(ref.set({ name, invite: 'abcdef', users }));

    // We should be the only user on the new team.
    await deny(ref.set({ name, invite, users: {} }));
    await deny(ref.set({ name, invite, users: { other: {} } }));
    await deny(ref.set({ name, invite, users: { [uid]: {}, second: {} } }));
  });

  it('validates team docs on update', async () => {
    await writeDocs(State.ON_TEAM);
    const ref = authDB.doc(teamPath);
    await deny(ref.update({ name: '' }));
    await deny(ref.update({ invite: otherInvite }));
    await deny(ref.update({ users: { [uid]: {}, second: {}, third: {} } }));
  });

  it('denies enumerating team docs', async () => {
    await deny(authDB.collectionGroup('teams').get());
  });

  it('allows reading invite docs', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await allow(authDB.doc(invitePath).get());
  });

  it('denies updating invite docs', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await deny(authDB.doc(invitePath).set({ team }));
    await deny(authDB.doc(invitePath).delete());
  });

  it('denies enumerating invite docs', async () => {
    await deny(authDB.collectionGroup('invites').get());
  });

  it('allows creating team', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite, users });
    batch.set(authDB.doc(invitePath), { team });
    await allow(batch.commit());
  });

  it('denies creating team without updating user doc', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.set(authDB.doc(teamPath), { name, invite, users });
    batch.set(authDB.doc(invitePath), { team });
    await deny(batch.commit());
  });

  it('denies creating team when user doc has other team', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team: otherTeam });
    batch.set(authDB.doc(teamPath), { name, invite, users });
    batch.set(authDB.doc(invitePath), { team });
    await deny(batch.commit());
  });

  it('denies creating team without adding user', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite, users: {} });
    batch.set(authDB.doc(invitePath), { team });
    await deny(batch.commit());
  });

  it('denies creating team without creating invite doc', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite, users });
    await deny(batch.commit());
  });

  it('denies creating team when team doc has other invite', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite: otherInvite, users });
    batch.set(authDB.doc(invitePath), { team });
    await deny(batch.commit());
  });

  it('denies creating team when invite doc has other team', async () => {
    await writeDocs(State.NO_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite, users });
    batch.set(authDB.doc(invitePath), { team: otherTeam });
    await deny(batch.commit());
  });

  it('denies creating team with invalid invite code', async () => {
    await writeDocs(State.NO_TEAM);
    const badInvite = '1234567'; // too long
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.set(authDB.doc(teamPath), { name, invite: badInvite, users });
    batch.set(authDB.doc(`invites/${badInvite}`), { team });
    await deny(batch.commit());
  });

  it('denies creating invite doc without team', async () => {
    await deny(authDB.doc(invitePath).set({ team }));
  });

  it('allows joining empty team', async () => {
    await writeDocs(State.EMPTY_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.update(authDB.doc(teamPath), { users });
    await allow(batch.commit());
  });

  it('allows joining non-full team', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await adminDB.doc(teamPath).update({ users: { a: {} } });

    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.update(authDB.doc(teamPath), { [`users.${uid}`]: { name, climbs } });
    await allow(batch.commit());
  });

  it('denies joining full team', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await adminDB.doc(teamPath).update({ users: { a: {}, b: {} } });

    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.update(authDB.doc(teamPath), { [`users.${uid}`]: { name, climbs } });
    await deny(batch.commit());
  });

  it('denies joining team without updating team doc', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await deny(authDB.doc(userPath).update({ team }));
  });

  it('denies joining team without updating user doc', async () => {
    await writeDocs(State.EMPTY_TEAM);
    await deny(authDB.doc(teamPath).update({ users }));
  });

  it('denies joining team when user doc points at other team', async () => {
    await writeDocs(State.EMPTY_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team: otherTeam });
    batch.update(authDB.doc(teamPath), { users });
    await deny(batch.commit());
  });

  it('denies joining team with other UID in team doc', async () => {
    await writeDocs(State.EMPTY_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), { team });
    batch.update(authDB.doc(teamPath), { users: { a: { name, climbs } } });
    await deny(batch.commit());
  });

  it('allows removing from team before reporting climbs', async () => {
    await writeDocs(State.ON_TEAM_NO_CLIMBS);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), {
      team: firebase.firestore.FieldValue.delete(),
    });
    batch.update(authDB.doc(teamPath), {
      [`users.${uid}`]: firebase.firestore.FieldValue.delete(),
    });
    await allow(batch.commit());
  });

  it('allows marking left after reporting climbs', async () => {
    await writeDocs(State.ON_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), {
      team: firebase.firestore.FieldValue.delete(),
    });
    batch.update(authDB.doc(teamPath), { [`users.${uid}.left`]: true });
    await allow(batch.commit());
  });

  it('denies removing from team after reporting climbs', async () => {
    await writeDocs(State.ON_TEAM);
    const batch = authDB.batch();
    batch.update(authDB.doc(userPath), {
      team: firebase.firestore.FieldValue.delete(),
    });
    batch.update(authDB.doc(teamPath), {
      [`users.${uid}`]: firebase.firestore.FieldValue.delete(),
    });
    await deny(batch.commit());
  });

  it('denies removing from team without updating user doc', async () => {
    await writeDocs(State.ON_TEAM_NO_CLIMBS);
    await deny(authDB.doc(teamPath).update({ users: {} }));
  });

  it('denies removing from team without updating team doc', async () => {
    await writeDocs(State.ON_TEAM_NO_CLIMBS);
    await deny(
      authDB.doc(userPath).update({
        team: firebase.firestore.FieldValue.delete(),
      })
    );
  });
});
