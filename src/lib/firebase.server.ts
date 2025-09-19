import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Default to empty objects/functions if Firebase can't be initialized
let app;
let db;

// Fallback service account for production if environment variable is missing
// This is a placeholder - you'll need to set the actual service account in Vercel environment variables
const DEFAULT_SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "your-private-key",
  "client_email": "your-client-email",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-client-cert-url",
  "universe_domain": "googleapis.com"
};

try {
  let serviceAccount;
  
  // Try to use environment variable if available, otherwise use default
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, using default:", error);
      serviceAccount = DEFAULT_SERVICE_ACCOUNT;
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not provided, using default");
    serviceAccount = DEFAULT_SERVICE_ACCOUNT;
  }

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

export { db };
