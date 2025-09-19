import { db as adminDb } from '@/lib/firebase.server';
import { FieldValue } from 'firebase-admin/firestore';

const TRANSACTIONS_COLLECTION = 'transactions';

// Helper to get the collection for a specific user
const getCollection = (userId: string) => adminDb.collection('users').doc(userId).collection(TRANSACTIONS_COLLECTION);

// GET all transactions for a user
export const getTransactionsForServer = async (userId: string) => {
  console.log(`[Server] Fetching transactions for user: ${userId}`);
  const snapshot = await getCollection(userId).orderBy('date', 'desc').get();
  if (snapshot.empty) {
    console.log(`[Server] No transactions found for user: ${userId}`);
    return [];
  }
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate ? doc.data().date.toDate().toISOString() : doc.data().date,
  }));
  console.log(`[Server] Found ${transactions.length} transactions for user: ${userId}`);
  return transactions;
};

// ADD a new transaction for a user
export const addTransactionForServer = async (userId: string, transaction: any) => {
  console.log(`[Server] Adding transaction for user: ${userId}`, transaction);
  const collectionRef = getCollection(userId);

  // Gracefully handle date: default to now if not provided or invalid
  let transactionDate = transaction.date ? new Date(transaction.date) : new Date();
  if (isNaN(transactionDate.getTime())) {
    console.warn(`[Server] Invalid or missing date received: "${transaction.date}". Defaulting to current date.`);
    transactionDate = new Date();
  }

  const docRef = await collectionRef.add({
    ...transaction,
    date: transactionDate,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`[Server] Added transaction with ID: ${docRef.id}`);
  return { id: docRef.id };
};

// UPDATE an existing transaction for a user
export const updateTransactionForServer = async (userId: string, transactionId: string, data: any) => {
  console.log(`[Server] Updating transaction ${transactionId} for user: ${userId}`, data);
  const docRef = getCollection(userId).doc(transactionId);
  await docRef.update({
    ...data,
    ...(data.date && { date: new Date(data.date) }), // Convert date string to Date object if present
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`[Server] Updated transaction ${transactionId}`);
};

// DELETE a transaction for a user
export const deleteTransactionForServer = async (userId: string, transactionId: string) => {
  console.log(`[Server] Deleting transaction ${transactionId} for user: ${userId}`);
  const docRef = getCollection(userId).doc(transactionId);
  await docRef.delete();
  console.log(`[Server] Deleted transaction ${transactionId}`);
};
