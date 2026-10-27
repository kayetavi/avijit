/**
 * Cloud Firestore Universal Bridge for Kayet DMS
 * 
 * Seamlessly adapts Firebase Web SDK (with active cloud project credentials)
 * to provide an Admin-SDK compatible Firestore interface.
 * 
 * Supports:
 * - collection(name).doc(id).get() / .set(data, { merge }) / .update(data) / .delete()
 * - collection(name).get() / .add(data)
 * - collection(name).where(...).orderBy(...).limit(...).get()
 * - batch().set(...) / .update(...) / .delete(...) / .commit()
 * - docSnap.exists (boolean property) & docSnap.data()
 * - querySnap.empty, querySnap.size, querySnap.docs, querySnap.forEach(...)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  limit,
  orderBy,
  writeBatch,
  setLogLevel
} from "firebase/firestore";
import { getFirestoreDb, isClientAuthSignedIn } from "./firestoreClient.js";

try {
  setLogLevel("silent");
} catch (e) {}

function wrapDocSnap(snap) {
  const isExists = typeof snap.exists === "function" ? snap.exists() : !!snap.exists;
  return {
    id: snap.id,
    ref: snap.ref,
    exists: isExists,
    data() {
      return snap.data() || null;
    }
  };
}

function wrapQuerySnap(querySnap) {
  const docs = querySnap.docs.map(wrapDocSnap);
  return {
    empty: querySnap.empty,
    size: querySnap.size,
    docs,
    forEach(callback) {
      docs.forEach(callback);
    }
  };
}

function createEmptyQuerySnap() {
  return {
    empty: true,
    size: 0,
    docs: [],
    forEach() {}
  };
}

function sanitizeContactSubmissionForPublicCreate(data) {
  if (!data || typeof data !== "object") return data;
  const allowedKeys = ["id", "name", "email", "plan", "planText", "customMessage", "message", "price", "createdAt"];
  const clean = {};
  for (const k of allowedKeys) {
    if (data[k] !== undefined) clean[k] = data[k];
  }
  return clean;
}

function createQueryWrapper(clientDb, baseRef, constraints = []) {
  return {
    where(field, op, val) {
      return createQueryWrapper(clientDb, baseRef, [...constraints, where(field, op, val)]);
    },
    limit(n) {
      return createQueryWrapper(clientDb, baseRef, [...constraints, limit(n)]);
    },
    orderBy(field, dir = "asc") {
      return createQueryWrapper(clientDb, baseRef, [...constraints, orderBy(field, dir)]);
    },
    async get() {
      if (!isClientAuthSignedIn()) {
        return createEmptyQuerySnap();
      }
      const q = constraints.length > 0 ? query(baseRef, ...constraints) : baseRef;
      const snap = await getDocs(q);
      return wrapQuerySnap(snap);
    }
  };
}

function createDocWrapper(clientDb, colName, docId) {
  const dRef = doc(clientDb, colName, docId);
  return {
    id: docId,
    ref: dRef,
    async get() {
      if (!isClientAuthSignedIn()) {
        return {
          id: docId,
          ref: dRef,
          exists: false,
          data() {
            return null;
          }
        };
      }
      const snap = await getDoc(dRef);
      return wrapDocSnap(snap);
    },
    async set(data, options = {}) {
      if (!isClientAuthSignedIn()) {
        if (colName === "contactSubmissions") {
          const cleanData = sanitizeContactSubmissionForPublicCreate(data);
          await setDoc(dRef, cleanData);
          return { id: docId };
        }
        return { id: docId, skippedUnauthenticated: true };
      }
      await setDoc(dRef, data, options);
      return { id: docId };
    },
    async update(data) {
      if (!isClientAuthSignedIn()) {
        return { id: docId, skippedUnauthenticated: true };
      }
      await setDoc(dRef, data, { merge: true });
      return { id: docId };
    },
    async delete() {
      if (!isClientAuthSignedIn()) {
        return false;
      }
      await deleteDoc(dRef);
      return true;
    }
  };
}

function createCollectionWrapper(clientDb, colName) {
  const cRef = collection(clientDb, colName);
  const qWrapper = createQueryWrapper(clientDb, cRef);
  return {
    doc(docId) {
      const actualId = docId || doc(cRef).id;
      return createDocWrapper(clientDb, colName, actualId);
    },
    async add(data) {
      if (!isClientAuthSignedIn()) {
        if (colName === "contactSubmissions") {
          const cleanData = sanitizeContactSubmissionForPublicCreate(data);
          const res = await addDoc(cRef, cleanData);
          return { id: res.id, ...res };
        }
        return { id: doc(cRef).id, skippedUnauthenticated: true };
      }
      const res = await addDoc(cRef, data);
      return { id: res.id, ...res };
    },
    async get() {
      return qWrapper.get();
    },
    where(field, op, val) {
      return qWrapper.where(field, op, val);
    },
    limit(n) {
      return qWrapper.limit(n);
    },
    orderBy(field, dir) {
      return qWrapper.orderBy(field, dir);
    }
  };
}

export function createFirestoreBridge(clientDb) {
  if (!clientDb) return null;
  return {
    collection(colName) {
      return createCollectionWrapper(clientDb, colName);
    },
    doc(pathOrCol, ...segments) {
      if (segments.length === 0) {
        const parts = pathOrCol.split("/").filter(Boolean);
        if (parts.length === 2) {
          return createDocWrapper(clientDb, parts[0], parts[1]);
        }
      }
      return createDocWrapper(clientDb, pathOrCol, segments[0]);
    },
    batch() {
      const b = writeBatch(clientDb);
      let opCount = 0;
      return {
        set(docWrapperOrRef, data, options = {}) {
          if (!isClientAuthSignedIn()) return this;
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.set(actualRef, data, options);
          opCount++;
          return this;
        },
        update(docWrapperOrRef, data) {
          if (!isClientAuthSignedIn()) return this;
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.set(actualRef, data, { merge: true });
          opCount++;
          return this;
        },
        delete(docWrapperOrRef) {
          if (!isClientAuthSignedIn()) return this;
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.delete(actualRef);
          opCount++;
          return this;
        },
        async commit() {
          if (!isClientAuthSignedIn() || opCount === 0) return;
          await b.commit();
        }
      };
    }
  };
}

let cachedBridge = null;

export function getClientFirestoreBridge() {
  try {
    const clientDb = getFirestoreDb();
    if (!clientDb) return null;
    if (!cachedBridge) {
      cachedBridge = createFirestoreBridge(clientDb);
    }
    return cachedBridge;
  } catch (err) {
    console.warn("[FirestoreBridge] Error resolving client Firestore:", err.message);
    return null;
  }
}
