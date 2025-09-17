import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Default to empty objects/functions if Firebase can't be initialized
let app;
let db;

// Only initialize Firebase Admin if we have the necessary environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );

    app = getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert(serviceAccount),
        });

    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    // Create dummy db object for build-time
    db = {
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false, data: () => ({}) }),
          set: async () => {},
          update: async () => {}
        })
      })
    } as any;
  }
} else {
  console.warn("Firebase Admin SDK not initialized - missing service account key");
  // Create dummy db object for build-time
  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => {},
        update: async () => {}
      })
    })
  } as any;
}

export { db };
