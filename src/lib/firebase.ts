import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

// Check if we're in a browser environment to avoid build errors
const isBrowser = typeof window !== 'undefined';

// Add fallback values for production when environment variables are missing
// These are placeholder values - you must set real values in your Vercel environment variables
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY';
const FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project-id.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id';
const FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project-id.appspot.com';
const FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id';
const FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'your-app-id';

// Default to empty objects/functions if Firebase can't be initialized
let app;
let auth;
let db;
let googleAuthProvider;

// Only initialize Firebase if we're in a browser
if (isBrowser) {
  try {
    const firebaseConfig = {
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      appId: FIREBASE_APP_ID,
    };

    // Initialize Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app); 
    googleAuthProvider = new GoogleAuthProvider(); 
    
    // Add scopes for Google sign-in
    googleAuthProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    googleAuthProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Set custom parameters
    googleAuthProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db, googleAuthProvider };

