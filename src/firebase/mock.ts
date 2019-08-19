// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { deepCopy } from '@/testutil';

type DocumentReference = firebase.firestore.DocumentReference;

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
  set(data: Record<string, any>) {
    return Promise.resolve(MockFirebase.setDoc(this.path, data));
  }
  update(props: Record<string, any>) {
    return Promise.resolve(MockFirebase._updateDoc(this.path, props));
  }
}

// Stub implementation of firebase.firestore.DocumentSnapshot.
class MockDocumentSnapshot {
  _data: Record<string, any> | undefined;
  constructor(data: Record<string, any>) {
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

// Operations that can be executed as part of a MockWriteBatch.
class BatchSet {
  constructor(public path: string, public data: Record<string, any>) {}
}
class BatchUpdate {
  constructor(public path: string, public props: Record<string, any>) {}
}

// Stub implementation of firebase.firestore.WriteBatch.
class MockWriteBatch {
  _ops: (BatchUpdate | BatchSet)[] = [];

  set(ref: DocumentReference, data: Record<string, any>) {
    this._ops.push(new BatchSet(ref.path, data));
  }
  update(ref: DocumentReference, props: Record<string, any>) {
    this._ops.push(new BatchUpdate(ref.path, props));
  }
  commit() {
    return new Promise(resolve => {
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

// Stub implementation of firebase.auth.User.
export class MockUser {
  constructor(public uid: string, public displayName: string) {}
  getIdToken() {
    return Promise.resolve('token');
  }
}

interface FirestoreBinding {
  vm: Vue;
  name: string; // data property name
}

// Holds data needed to simulate (a tiny bit of) Firebase's functionality.
export const MockFirebase = new class {
  // User for auth.currentUser.
  currentUser: MockUser | null = null;
  // Firestore documents keyed by path.
  _docs: Record<string, Record<string, any>> = {};
  // Firestore document paths to bound Vue data props.
  _bindings: Record<string, FirestoreBinding[]> = {};

  constructor() {
    this.reset();
  }

  // Resets data to defaults.
  reset() {
    this.currentUser = new MockUser('test-uid', 'Test User');
    this._docs = {};
    this._bindings = {};
  }

  // Sets the document at |path| to |data|.
  setDoc(path: string, data: Record<string, any>) {
    this._docs[path] = deepCopy(data);

    // Update all Vue instance data properties bound to the doc.
    for (const binding of this._bindings[path] || []) {
      binding.vm.$data[binding.name] = deepCopy(data);
    }
  }

  // Returns the document at |path|. Exposed to let tests check stored data.
  getDoc(path: string) {
    return this._docs.hasOwnProperty(path)
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
        obj = obj.hasOwnProperty(first) ? obj[first] : (obj[first] = {});
        prop = prop.slice(i + 1);
      }
      data === mockDeleteSentinel ? delete obj[prop] : (obj[prop] = data);
    }
    this.setDoc(path, doc);
  }

  // Map of global mocks that should be passed to vue-test-utils's mount() or
  // shallowMount().
  mountMocks: Record<string, any> = {
    $bind: function(name: string, ref: DocumentReference) {
      if (!MockFirebase._docs.hasOwnProperty(ref.path)) {
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
      return Promise.resolve(data);
    },

    $unbind: function(name: string) {
      // Unregister the binding so the Vue's data property won't be updated.
      const vm = this as Vue;
      for (const path of Object.keys(MockFirebase._bindings)) {
        MockFirebase._bindings[path] = MockFirebase._bindings[path].filter(
          b => !(b.vm == vm && b.name == name)
        );
      }
      vm.$data[name] = null;
    },
  };
}();

// Sentinel value for firebase.firestore.FieldValue.delete().
const mockDeleteSentinel = {};

export const MockEmailAuthProviderID = 'email';
export const MockGoogleAuthProviderID = 'google';

jest.mock('firebase');
jest.mock('firebase/app', () => {
  // This implementation is gross, since we'll return a new object each time
  // e.g. firebase.firestore() is called. I think we can get away with it for
  // now since all of these are just wrappers around groups of methods, though.
  const app = {
    initializeApp: () => app,
    auth: () => ({
      get currentUser() {
        return MockFirebase.currentUser;
      },
      onAuthStateChanged: (observer: any) => {
        new Promise(resolve => {
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
    }),
  };

  // Also set weird sentinel value that lives on the firestore method.
  (app.firestore as any).FieldValue = {
    delete: () => mockDeleteSentinel,
  };

  // Set some random const properties on the auth method.
  (app.auth as any).EmailAuthProvider = {
    PROVIDER_ID: MockEmailAuthProviderID,
  };
  (app.auth as any).GoogleAuthProvider = {
    PROVIDER_ID: MockGoogleAuthProviderID,
  };

  return app;
});

// TODO: Is this actually necessary? These modules are imported for their side
// effects in the code that's being tested.
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('firebase/functions');

// Mock implementation of firebaseui.auth.AuthUI.
export const MockAuthUI = new class {
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
}();

jest.mock('firebaseui', () => {
  return {
    auth: {
      AuthUI: {
        // Pretend like an instance has already been created.
        getInstance: () => MockAuthUI,
      },
    },
  };
});
