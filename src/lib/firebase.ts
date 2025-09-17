
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Added GoogleAuthProvider
import { getFirestore } from "firebase/firestore"; 

// Check if we're in a browser environment to avoid build errors
const isBrowser = typeof window !== 'undefined';

// Only proceed with Firebase initialization if necessary environment variables are available
const hasEnvVars = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 
                  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Default to empty objects/functions if Firebase can't be initialized
let app;
let auth;
let db;
let googleAuthProvider;

// Only initialize Firebase if we're in a browser and have the necessary environment variables
if (isBrowser && hasEnvVars) {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Initialize Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app); 
    googleAuthProvider = new GoogleAuthProvider(); // Added
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db, googleAuthProvider }; // Added googleAuthProvider to exports

