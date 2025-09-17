import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
);

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(serviceAccount),
      });

const db = getFirestore(app);

export { db };
