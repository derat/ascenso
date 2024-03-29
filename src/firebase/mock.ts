// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { deepCopy } from '@/testutil';

import type firebase from 'firebase';

type DocumentReference = firebase.firestore.DocumentReference;

// Firestore document data as property names to values.
// This also gets used for describing document updates,
// i.e. the keys may be dotted properties.
type DocData = Record<string, any>;

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

// Stub implementation of firebase.firestore.DocumentSnapshot.
class MockDocumentSnapshot {
  _data: DocData | undefined;
  constructor(data: DocData | undefined) {
    this._data = data;
  }
  data() {
    return this._data;
  }
  get(field: string) {
    // TODO: Implement dotted field paths if we need them.
    if (field.indexOf('.') != -1) throw new Error('Field paths unsupported');
    return this._data ? this._data[field] : undefined;
  }
  get exists() {
    return this._data !== undefined;
  }
}

/* eslint-disable @typescript-eslint/no-use-before-define */

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
  get() {
    return Promise.resolve(
      new MockDocumentSnapshot(MockFirebase.getDoc(this.path))
    );
  }
  set(data: DocData) {
    return Promise.resolve(MockFirebase.setDoc(this.path, data));
  }
  update(props: DocData) {
    return Promise.resolve(MockFirebase._updateDoc(this.path, props));
  }
}

/* eslint-enable @typescript-eslint/no-use-before-define */

// Prefix and next ID for automatically-generated Firestore document IDs.
// We do this instead of generating a UUID to make tests deterministic.
// It's totally not because generating UUIDs in JS is painful.
const autogenPrefix = 'auto-doc-';
let nextAutogenNum = 1;

// Stub implementation of firebase.firestore.CollectionReference.
class MockCollectionReference {
  path: string;
  id: string;

  constructor(path: string) {
    this.path = canonicalizePath(path, PathType.COLLECTION);
    this.id = pathID(this.path);
  }
  doc(path: string) {
    if (path === undefined) path = `${autogenPrefix}${nextAutogenNum++}`;
    return new MockDocumentReference(`${this.path}/${canonicalizePath(path)}`);
  }
}

// Operations that can be executed as part of a MockWriteBatch.
class BatchSet {
  constructor(public path: string, public data: DocData) {}
}
class BatchUpdate {
  constructor(public path: string, public props: DocData) {}
}

/* eslint-disable @typescript-eslint/no-use-before-define */

// Stub implementation of firebase.firestore.WriteBatch.
class MockWriteBatch {
  _ops: (BatchUpdate | BatchSet)[] = [];

  set(ref: DocumentReference, data: DocData) {
    this._ops.push(new BatchSet(ref.path, data));
  }
  update(ref: DocumentReference, props: DocData) {
    this._ops.push(new BatchUpdate(ref.path, props));
  }
  commit() {
    return new Promise((resolve) => {
      for (const op of this._ops) {
        if (op instanceof BatchSet) {
          MockFirebase.setDoc(op.path, op.data);
        } else if (op instanceof BatchUpdate) {
          MockFirebase._updateDoc(op.path, op.props);
        } else {
          throw new Error(`Invalid type for batch operation ${op}`);
        }
      }
      this._ops = [];
      resolve();
    });
  }
}

/* eslint-enable @typescript-eslint/no-use-before-define */

// Stub implementation of firebase.auth.User.
export class MockUser {
  constructor(public uid: string, public displayName: string | null) {}
  getIdToken() {
    return Promise.resolve('token');
  }
}

interface FirestoreBinding {
  vm: Vue;
  name: string; // data property name
}

// Sentinel value for firebase.firestore.FieldValue.delete().
const mockDeleteSentinel = {};

// Holds data needed to simulate (a tiny bit of) Firebase's functionality.
export const MockFirebase = new (class {
  // User for auth.currentUser.
  currentUser: MockUser | null = null;
  // May be set by tests to inject additional logic into getDoc().
  // If null is returned, getDoc() returns the document as usual.
  getDocHook: ((path: string) => DocData | null) | null = null;

  // Firestore documents keyed by path.
  _docs: Record<string, DocData> = {};
  // Firestore document paths to bound Vue data props.
  _bindings: Record<string, FirestoreBinding[]> = {};

  constructor() {
    this.reset();
  }

  // Resets data to defaults.
  reset() {
    this.currentUser = new MockUser('test-uid', 'Test User');
    this.getDocHook = null;
    this._docs = {};
    this._bindings = {};
  }

  // Sets the document at |path| to |data|.
  setDoc(path: string, data: DocData) {
    this._docs[path] = deepCopy(data);

    // Update all Vue instance data properties bound to the doc.
    for (const binding of this._bindings[path] || []) {
      binding.vm.$data[binding.name] = deepCopy(data);
    }
  }

  // Returns the document at |path|. Primarily used to simulate actual document
  // fetches, but exposed publicly to let tests check stored data.
  getDoc(path: string): DocData | undefined {
    if (this.getDocHook) {
      const data = this.getDocHook(path);
      if (data != null) return data;
    }

    return Object.prototype.hasOwnProperty.call(this._docs, path)
      ? deepCopy(this._docs[path])
      : undefined;
  }

  // Updates portions of the document at |path|. This is used to implement
  // firebase.firestore.DocumentReference.update.
  _updateDoc(path: string, props: firebase.firestore.UpdateData) {
    const doc = this._docs[path] || {};
    for (let prop of Object.keys(props)) {
      let obj = doc; // final object to set property on
      const data = props[prop]; // data to set
      // Strip off each dotted component from the full property path, walking
      // deeper into the document and creating new nested objects if needed.
      for (let i = prop.indexOf('.'); i != -1; i = prop.indexOf('.')) {
        const first = prop.slice(0, i);
        obj = Object.prototype.hasOwnProperty.call(obj, first)
          ? obj[first]
          : (obj[first] = {});
        prop = prop.slice(i + 1);
      }
      data === mockDeleteSentinel ? delete obj[prop] : (obj[prop] = data);
    }
    this.setDoc(path, doc);
  }

  // Map of global mocks that should be passed to vue-test-utils's mount() or
  // shallowMount().
  mountMocks: Record<string, any> = {
    $bind: function (name: string, ref: DocumentReference) {
      if (!Object.prototype.hasOwnProperty.call(MockFirebase._docs, ref.path)) {
        return Promise.reject(`No document at ${ref.path}`);
      }

      // Record the binding so we can handle updates later.
      const vm = this as Vue;
      vm.$unbind(name);
      const bindings = MockFirebase._bindings[ref.path] || [];
      bindings.push({ vm, name });
      MockFirebase._bindings[ref.path] = bindings;

      // Assign the data to the Vue.
      const data = deepCopy(MockFirebase._docs[ref.path]);
      (this as Vue).$data[name] = data;
      (this as any).$firestoreRefs[name] = data;
      return Promise.resolve(data);
    },

    $unbind: function (name: string) {
      // Unregister the binding so the Vue's data property won't be updated.
      const vm = this as Vue;
      for (const path of Object.keys(MockFirebase._bindings)) {
        MockFirebase._bindings[path] = MockFirebase._bindings[path].filter(
          (b) => !(b.vm == vm && b.name == name)
        );
      }
      vm.$data[name] = null;
      delete (vm as any).$firestoreRefs[name];
    },

    $firestoreRefs: {} as Record<string, any>,
  };
})();

export const MockEmailAuthProviderID = 'password';
export const MockGoogleAuthProviderID = 'google.com';

jest.mock('firebase');
jest.mock('firebase/app', () => {
  // This implementation is gross, since we'll return a new object each time
  // e.g. firebase.firestore() is called. I think we can get away with it for
  // now since all of these are just wrappers around groups of methods, though.
  const app = {
    mocked: true, // checked by src/firebase/index.ts
    initializeApp: () => app,
    auth: () => ({
      get currentUser() {
        return MockFirebase.currentUser;
      },
      onAuthStateChanged: (observer: any) => {
        new Promise((resolve) => {
          observer(MockFirebase.currentUser);
          resolve();
        });
      },
      signOut: () => {
        MockFirebase.currentUser = null;
        return Promise.resolve();
      },
    }),
    firestore: () => ({
      batch: () => new MockWriteBatch(),
      collection: (path: string) => new MockCollectionReference(path),
      doc: (path: string) => new MockDocumentReference(path),
      enablePersistence: () => Promise.resolve(),
      waitForPendingWrites: () => Promise.resolve(),
    }),
  };

  // Various Firebase constants and sentinels are implemented via static
  // variables or methods on classes in the firebase.auth and firebase.firestore
  // namespaces. I've wasted hours trying to find the right way to mock this
  // without any luck, so I'm just simulating these by setting properties on the
  // corresponding methods instead. This is totally wrong and would fall apart
  // if these code were type-checked.
  (app.auth as any).EmailAuthProvider = {
    PROVIDER_ID: MockEmailAuthProviderID,
  };
  (app.auth as any).GoogleAuthProvider = {
    PROVIDER_ID: MockGoogleAuthProviderID,
  };
  (app.firestore as any).FieldValue = {
    delete: () => mockDeleteSentinel,
  };
  // Probably there's some way to use the real Timestamp implementation here
  // instead, but I'm not sure how to get at it.
  (app.firestore as any).Timestamp = {
    fromMillis: (ms: number) => ({
      toDate: () => new Date(ms),
      toMillis: () => ms,
    }),
  };

  return app;
});

jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('firebase/functions');

// Mock implementation of firebaseui.auth.AuthUI.
export const MockAuthUI = new (class {
  // Return value for isPendingRedirect(). This is false when the page is first
  // loaded and then true when redirecting back to it after authentication has
  // been performed.
  pendingRedirect = false;
  // Container element ID passed to start().
  containerID: string | null = null;
  // Configuration object passed to start().
  config: Record<string, any> | null = null;

  constructor() {
    this.reset();
  }

  // Resets data to defaults.
  reset() {
    this.pendingRedirect = false;
    this.containerID = null;
    this.config = null;
  }

  isPendingRedirect() {
    return this.pendingRedirect;
  }

  start(id: string, config: object) {
    this.containerID = id;
    this.config = config;
  }
})();

jest.mock('firebaseui', () => {
  return {
    auth: {
      AuthUI: {
        // Pretend like an instance has already been created.
        getInstance: () => MockAuthUI,
      },
      CredentialHelper: {
        NONE: {},
      },
    },
  };
});
