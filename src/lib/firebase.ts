/**
 * Firebase initialization for Veer Suraksha Grid
 * Connects to Firebase Realtime Database for live telemetry from ESP32 sensors
 */
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  get,
  push,
  update,
  type DatabaseReference,
} from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.apiKey,
  authDomain: import.meta.env.authDomain,
  databaseURL: import.meta.env.databaseURL,
  projectId: import.meta.env.projectId,
  storageBucket: import.meta.env.storageBucket,
  messagingSenderId: import.meta.env.messagingSenderId,
  appId: import.meta.env.appId,
  measurementId: import.meta.env.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get database instance
const db = getDatabase(app);

// Helper: get a database reference
export function dbRef(path: string): DatabaseReference {
  return ref(db, path);
}

// Export everything needed
export { db, ref, onValue, set, get, push, update };
export default app;
