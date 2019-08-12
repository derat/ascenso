// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';

// Firestore document path types.
enum PathType {
  DOCUMENT,
  COLLECTION,
  RELATIVE,
}

// Removes leading and trailing slash from |path| and checks its validity per
// |pathType|.
function canonicalizePath(path: string, pathType = PathType.RELATIVE) {
  if (path.startsWith('/')) path = path.substr(1);
  if (path.endsWith('/')) path = path.substr(0, path.length - 1);
  if (!path.length) throw new Error('Path');

  // Paths begin with a collection name and alternate between collections and
  // documents, e.g. "collection/doc/subcollection/doc", so documents should
  // always have an even number of components and collections an odd number.
  // We don't check relative paths, since they'll be checked later when they're
  // appended to an absolute path.
  const even = path.split('/').length % 2 == 0;
  if (pathType == PathType.DOCUMENT && !even) {
    throw new Error(`Document path "${path}" has odd number of components`);
  } else if (pathType == PathType.COLLECTION && even) {
    throw new Error(`Collection path "${path}" has even number of components`);
  }

  return path;
}

// Returns |path|'s ID, i.e. its last component.
function pathID(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// These aren't really mocks (they're more like stubs or maybe fakes), but their
// names need to start with 'Mock' (case-insensitive) or else Jest gives a dumb
// error: "The module factory of `jest.mock()` is not allowed to reference any
// out-of-scope variables."

// Stub implementation of firebase.firestore.CollectionReference.
class MockCollectionReference {
  path: string;
  id: string;

  constructor(path: string) {
    this.path = canonicalizePath(path, PathType.COLLECTION);
    this.id = pathID(this.path);
  }
  doc(path: string) {
    return new MockDocumentReference(`${this.path}/${canonicalizePath(path)}`);
  }
}

// Stub implementation of firebase.firestore.DocumentReference.
class MockDocumentReference {
  path: string;
  id: string;

  constructor(path: string) {
    this.path = canonicalizePath(path, PathType.DOCUMENT);
    this.id = pathID(this.path);
  }
  collection(path: string) {
    return new MockCollectionReference(
      `${this.path}/${canonicalizePath(path)}`
    );
  }
  // TODO: Add more methods to this class as they're needed. In particular, this
  // will probably need to hold a reference to the data so it can mutate it.
}

// Stub implementation of firebase.auth.User.
class MockUser {
  constructor(public uid: string, public displayName: string) {}
  getIdToken() {
    return new Promise(resolve => {
      resolve('token');
    });
  }
}

interface FirestoreBinding {
  vue: Vue;
  name: string;
}

// Holds data needed to simulate (a tiny bit of) Firebase's functionality.
const MockFirebase = new class {
  // User for auth.currentUser.
  currentUser?: MockUser;
  // Firestore documents keyed by path.
  _docs: Record<string, Record<string, any>> = {};
  // Map from Firestore document path to bound Vues.
  _docBindings: Record<string, FirestoreBinding[]> = {};

  constructor() {
    this.reset();
  }

  // Resets data to defaults.
  reset() {
    this.currentUser = new MockUser('test-uid', 'Test User');
    this._docs = {};
    this._docBindings = {};
  }

  setDoc(path: string, data: Record<string, any>) {
    this._docs[path] = data;
    const bindings = MockFirebase._docBindings[path];
    if (bindings)
      bindings.forEach(b => {
        // TODO: Should probably pass a deep copy here.
        b.vue.$data[b.name] = data;
      });
  }

  // Map of global mocks that should be passed to vue-test-utils's mount() or
  // shallowMount().
  mountMocks: Record<string, any> = {
    $bind: function(name: string, ref: firebase.firestore.DocumentReference) {
      // Record the binding so we can handle updates later.
      const bindings = MockFirebase._docBindings[ref.path] || [];
      bindings.push({ vue: this as Vue, name });
      MockFirebase._docBindings[ref.path] = bindings;

      // TODO: Should probably pass a deep copy here.
      const data = MockFirebase._docs[ref.path];
      (this as Vue).$data[name] = data;
      return new Promise((resolve, reject) => {
        data ? resolve(data) : reject(`No document at ${ref.path}`);
      });
    },
  };
}();

export default MockFirebase;

jest.mock('firebase');
jest.mock('firebase/app', () => {
  return {
    initializeApp: () => {},
    auth: () => ({
      currentUser: MockFirebase.currentUser,
    }),
    firestore: () => ({
      collection: (path: string) => new MockCollectionReference(path),
      doc: (path: string) => new MockDocumentReference(path),
      enablePersistence: () => new Promise(resolve => resolve()),
    }),
  };
});

// TODO: Is this actually necessary? These modules are imported for their side
// effects in the code that's being tested.
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('firebase/functions');
