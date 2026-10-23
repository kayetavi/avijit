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
  writeBatch
} from "firebase/firestore";
import { getFirestoreDb } from "./firestoreClient.js";

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
      const snap = await getDoc(dRef);
      return wrapDocSnap(snap);
    },
    async set(data, options = {}) {
      await setDoc(dRef, data, options);
      return { id: docId };
    },
    async update(data) {
      await setDoc(dRef, data, { merge: true });
      return { id: docId };
    },
    async delete() {
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
      return {
        set(docWrapperOrRef, data, options = {}) {
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.set(actualRef, data, options);
          return this;
        },
        update(docWrapperOrRef, data) {
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.set(actualRef, data, { merge: true });
          return this;
        },
        delete(docWrapperOrRef) {
          const actualRef = docWrapperOrRef?.ref || docWrapperOrRef;
          b.delete(actualRef);
          return this;
        },
        async commit() {
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
