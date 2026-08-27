// src/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Paste your Firebase web configuration here:
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBJH8Gg8ESZXA0tvvL2iB-Fe-EkFo9poqQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cbiteventfinder.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cbiteventfinder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cbiteventfinder.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||  "295946666718",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ||  "1:295946666718:web:73e3174b47c67c0887b84f",
};

/**
 * Helper to check if a valid Firebase configuration is active
 */
export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
};

// Initialize Firebase App & Firestore
let app = null;
let db = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  console.log("🔥 Firebase Firestore initialized successfully with project:", firebaseConfig.projectId);
} catch (err) {
  console.warn("⚠️ Firebase initialization warning:", err);
}

export { app, db };
