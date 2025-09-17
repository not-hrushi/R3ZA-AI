
'use client'; 

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, updateDoc, getDoc } from 'firebase/firestore';

const GUEST_USER_ID = "GUEST_USER_ID"; 
const GUEST_TRANSACTIONS_KEY = 'r3za_guest_transactions';

export interface Transaction {
  id: string;
  date: string; // ISO string
  description: string;
  category: string;
  amount: number;
  type: "expense" | "income" | "subscription"; // Added "subscription" type
  payee?: string;
  createdAt?: string; // ISO string
}

export type NewTransactionData = Omit<Transaction, 'id' | 'createdAt'>;
export type UpdateTransactionData = Partial<Omit<Transaction, 'id' | 'createdAt'>>;

// Helper to get guest transactions from localStorage
function getGuestTransactionsFromStorage(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(GUEST_TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper to save guest transactions to localStorage
function saveGuestTransactionsToStorage(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export async function addTransaction(userId: string, transactionData: NewTransactionData): Promise<Transaction> {
  let finalAmount = transactionData.amount;
  if (transactionData.type === 'subscription') {
    finalAmount = -Math.abs(transactionData.amount); // Ensure subscriptions are negative
  } else if (transactionData.type === 'expense') {
    finalAmount = -Math.abs(transactionData.amount);
  } else {
    finalAmount = Math.abs(transactionData.amount);
  }

  const dataToSave = {
    ...transactionData,
    amount: finalAmount,
    payee: transactionData.payee || "", 
  };

  if (userId === GUEST_USER_ID) {
    const transactions = getGuestTransactionsFromStorage();
    const newTransaction: Transaction = {
      ...dataToSave,
      id: String(Date.now()), 
      createdAt: new Date().toISOString(),
    };
    transactions.push(newTransaction);
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveGuestTransactionsToStorage(transactions);
    return newTransaction;
  } else {
    if (!userId) throw new Error("User ID is required to add a transaction.");
    try {
      const nowTimestamp = Timestamp.now();
      const docRef = await addDoc(collection(db, `users/${userId}/transactions`), {
        ...dataToSave,
        date: Timestamp.fromDate(new Date(dataToSave.date)),
        createdAt: nowTimestamp
      });
      return { ...dataToSave, id: docRef.id, createdAt: nowTimestamp.toDate().toISOString() };
    } catch (error: any) {
      console.error("Error adding transaction to Firestore: ", error);
      const errorMessage = error.message || "Failed to save transaction due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  if (userId === GUEST_USER_ID) {
    return getGuestTransactionsFromStorage(); 
  } else {
    if (!userId) throw new Error("User ID is required to get transactions.");
    try {
      const transactionsCol = collection(db, `users/${userId}/transactions`);
      const q = query(transactionsCol, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const transaction: Transaction = {
          id: docSnap.id,
          date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
          description: data.description,
          category: data.category,
          amount: data.amount,
          type: data.type as "expense" | "income" | "subscription",
          payee: data.payee || "", 
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
        };
        return transaction;
      });
    } catch (error: any) {
      console.error("Error fetching transactions from Firestore: ", error);
      const errorMessage = error.message || "Failed to fetch transactions due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function getTransactionById(userId: string, transactionId: string): Promise<Transaction | null> {
    if (userId === GUEST_USER_ID) {
        const transactions = getGuestTransactionsFromStorage();
        return transactions.find(t => t.id === transactionId) || null;
    } else {
        if (!userId) throw new Error("User ID is required.");
        if (!transactionId) throw new Error("Transaction ID is required.");
        try {
            const transactionDocRef = doc(db, `users/${userId}/transactions`, transactionId);
            const docSnap = await getDoc(transactionDocRef);
            if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
                description: data.description,
                category: data.category,
                amount: data.amount,
                type: data.type as "expense" | "income" | "subscription",
                payee: data.payee || "", 
                createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
            };
            } else {
            return null;
            }
        } catch (error: any) {
            console.error("Error fetching transaction by ID from Firestore: ", error);
            throw new Error(error.message || "Failed to fetch transaction.");
        }
    }
}


export async function updateTransaction(userId: string, transactionId: string, transactionData: UpdateTransactionData): Promise<void> {
  const dataToUpdate: any = { ...transactionData };
  
  if (transactionData.hasOwnProperty('payee')) {
    dataToUpdate.payee = transactionData.payee || "";
  }

  if (transactionData.type === 'subscription') {
    dataToUpdate.amount = -Math.abs(transactionData.amount || 0);
  } else if (transactionData.type === 'expense') {
    dataToUpdate.amount = -Math.abs(transactionData.amount || 0);
  } else if (transactionData.type === 'income' && transactionData.amount !== undefined) {
    dataToUpdate.amount = Math.abs(transactionData.amount);
  }


  if (userId === GUEST_USER_ID) {
    let transactions = getGuestTransactionsFromStorage();
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...dataToUpdate } as Transaction;
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      saveGuestTransactionsToStorage(transactions);
    } else {
      throw new Error("Transaction not found in guest storage.");
    }
  } else {
    if (!userId) throw new Error("User ID is required to update a transaction.");
    if (!transactionId) throw new Error("Transaction ID is required to update a transaction.");
    try {
      const transactionDocRef = doc(db, `users/${userId}/transactions`, transactionId);
      
      if (dataToUpdate.date && typeof dataToUpdate.date === 'string') {
        dataToUpdate.date = Timestamp.fromDate(new Date(dataToUpdate.date));
      }
      
      await updateDoc(transactionDocRef, dataToUpdate);
    } catch (error: any) {
      console.error("Error updating transaction in Firestore: ", error);
      const errorMessage = error.message || "Failed to update transaction due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  if (userId === GUEST_USER_ID) {
    let transactions = getGuestTransactionsFromStorage();
    transactions = transactions.filter(t => t.id !== transactionId);
    saveGuestTransactionsToStorage(transactions); 
  } else {
    if (!userId) throw new Error("User ID is required to delete a transaction.");
    if (!transactionId) throw new Error("Transaction ID is required to delete a transaction.");
    try {
      await deleteDoc(doc(db, `users/${userId}/transactions`, transactionId));
    } catch (error: any) {
      console.error("Error deleting transaction from Firestore: ", error);
      const errorMessage = error.message || "Failed to delete transaction due to a server error.";
      throw new Error(errorMessage);
    }
  }
}
