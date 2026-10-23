// /firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk",
  authDomain: "loginapp-feb72.firebaseapp.com",
  projectId: "loginapp-feb72",
  storageBucket: "loginapp-feb72.firebasestorage.app",
  messagingSenderId: "743648198302",
  appId: "1:743648198302:web:fe5a2cb3f81d2a31f5458f",
  measurementId: ""
};

// Silence internal gRPC idle stream disconnect logs
try {
  setLogLevel("silent");
} catch (e) {}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
} catch (e) {
  db = getFirestore(app);
}

export { auth, db, firebaseConfig };

