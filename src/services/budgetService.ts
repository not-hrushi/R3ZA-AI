
'use client'; 

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import { formatISO, parseISO, isValid as isValidDateFn, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, getMonth } from 'date-fns';

const GUEST_USER_ID = "GUEST_USER_ID"; 
const GUEST_BUDGETS_KEY = 'financeflow_guest_budgets';

export type BudgetPeriodType = 'ongoing' | 'monthly' | 'yearly' | 'custom' | 'recurring-monthly' | 'recurring-yearly';

export interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number; 
  isCompleted?: boolean; 
  periodType: BudgetPeriodType;
  startDate?: string; // ISO string, used for specific 'monthly', 'yearly', 'custom'
  endDate?: string;   // ISO string, used for specific 'monthly', 'yearly', 'custom'
  createdAt?: string; 
}

export interface NewBudgetData {
  category: string;
  allocated: number;
  spent: number; 
  isCompleted?: boolean; 
  periodType: BudgetPeriodType;
  startDate?: string; // Only for 'monthly', 'yearly', 'custom'
  endDate?: string;   // Only for 'monthly', 'yearly', 'custom'
}

export interface UpdateBudgetData {
  category?: string;
  allocated?: number;
  spent?: number;
  isCompleted?: boolean;
  periodType?: BudgetPeriodType;
  startDate?: string | null; 
  endDate?: string | null;   
}


function getGuestBudgetsFromStorage(): Budget[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(GUEST_BUDGETS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveGuestBudgetsToStorage(budgets: Budget[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_BUDGETS_KEY, JSON.stringify(budgets));
}

export async function addBudget(userId: string, budgetData: NewBudgetData): Promise<Budget> {
  const fullBudgetData: Omit<Budget, 'id' | 'createdAt'> = {
    ...budgetData,
    isCompleted: budgetData.isCompleted || false,
    startDate: budgetData.startDate && ['monthly', 'yearly', 'custom'].includes(budgetData.periodType) ? formatISO(parseISO(budgetData.startDate), { representation: 'date' }) : undefined,
    endDate: budgetData.endDate && ['monthly', 'yearly', 'custom'].includes(budgetData.periodType) ? formatISO(parseISO(budgetData.endDate), { representation: 'date' }) : undefined,
  };

  if (userId === GUEST_USER_ID) {
    const budgets = getGuestBudgetsFromStorage();
    const newBudget: Budget = {
      ...fullBudgetData,
      id: String(Date.now()), 
      createdAt: new Date().toISOString(),
    };
    budgets.push(newBudget);
    // Sort logic can be more complex if recurring types should appear differently
    budgets.sort((a,b) => a.category.localeCompare(b.category)); 
    saveGuestBudgetsToStorage(budgets);
    return newBudget;
  } else {
    if (!userId) throw new Error("User ID is required to add a budget.");
    try {
      const nowTimestamp = Timestamp.now();
      const docRef = await addDoc(collection(db, `users/${userId}/budgets`), {
        ...fullBudgetData,
        createdAt: nowTimestamp,
        startDate: fullBudgetData.startDate ? Timestamp.fromDate(parseISO(fullBudgetData.startDate)) : null,
        endDate: fullBudgetData.endDate ? Timestamp.fromDate(parseISO(fullBudgetData.endDate)) : null,
      });
      return { 
        ...fullBudgetData, 
        id: docRef.id, 
        createdAt: nowTimestamp.toDate().toISOString(),
        startDate: fullBudgetData.startDate, 
        endDate: fullBudgetData.endDate,   
      };
    } catch (error: any) {
      console.error("Error adding budget to Firestore: ", error);
      const errorMessage = error.message || "Failed to save budget due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function getBudgets(userId: string): Promise<Budget[]> {
  if (userId === GUEST_USER_ID) {
    return getGuestBudgetsFromStorage(); 
  } else {
    if (!userId) throw new Error("User ID is required to get budgets.");
    try {
      const budgetsCol = collection(db, `users/${userId}/budgets`);
      const querySnapshot = await getDocs(budgetsCol);
      const budgets = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const budget: Budget = {
          id: docSnap.id,
          category: data.category,
          allocated: data.allocated,
          spent: data.spent,
          isCompleted: data.isCompleted || false,
          periodType: data.periodType || 'ongoing',
          startDate: data.startDate ? formatISO((data.startDate as Timestamp).toDate(), { representation: 'date' }) : undefined,
          endDate: data.endDate ? formatISO((data.endDate as Timestamp).toDate(), { representation: 'date' }) : undefined,
          createdAt: data.createdAt ? formatISO((data.createdAt as Timestamp).toDate()) : undefined,
        };
        return budget;
      });
       return budgets.sort((a,b) => {
        // Basic sort: recurring first, then by start date, then category
        const isARecurring = a.periodType.startsWith('recurring');
        const isBRecurring = b.periodType.startsWith('recurring');
        if (isARecurring && !isBRecurring) return -1;
        if (!isARecurring && isBRecurring) return 1;

        if (a.startDate && b.startDate) {
          const dateA = parseISO(a.startDate).getTime();
          const dateB = parseISO(b.startDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
        }
        if (a.startDate && !b.startDate) return -1;
        if (!a.startDate && b.startDate) return 1;
        return a.category.localeCompare(b.category);
      });
    } catch (error: any) {
      console.error("Error fetching budgets from Firestore: ", error);
      const errorMessage = error.message || "Failed to fetch budgets due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function updateBudget(userId: string, budgetId: string, budgetData: UpdateBudgetData): Promise<void> {
  const dataToUpdate: any = { ...budgetData };
  
  if (budgetData.periodType && ['recurring-monthly', 'recurring-yearly', 'ongoing'].includes(budgetData.periodType)) {
    dataToUpdate.startDate = null;
    dataToUpdate.endDate = null;
  } else {
    if (budgetData.hasOwnProperty('startDate')) {
      dataToUpdate.startDate = budgetData.startDate ? formatISO(parseISO(budgetData.startDate), { representation: 'date' }) : null;
    }
    if (budgetData.hasOwnProperty('endDate')) {
      dataToUpdate.endDate = budgetData.endDate ? formatISO(parseISO(budgetData.endDate), { representation: 'date' }) : null;
    }
  }

  if (userId === GUEST_USER_ID) {
    let budgets = getGuestBudgetsFromStorage();
    const index = budgets.findIndex(b => b.id === budgetId);
    if (index !== -1) {
      const updatedBudget = { ...budgets[index], ...dataToUpdate };
      // Explicitly set nulls from dataToUpdate if properties were there
      if (budgetData.hasOwnProperty('startDate')) updatedBudget.startDate = dataToUpdate.startDate;
      if (budgetData.hasOwnProperty('endDate')) updatedBudget.endDate = dataToUpdate.endDate;
      
      budgets[index] = updatedBudget as Budget;
      // Re-sort logic same as getBudgets
      budgets.sort((a,b) => {
        const isARecurring = a.periodType.startsWith('recurring');
        const isBRecurring = b.periodType.startsWith('recurring');
        if (isARecurring && !isBRecurring) return -1;
        if (!isARecurring && isBRecurring) return 1;
        if (a.startDate && b.startDate) return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
        if (a.startDate) return -1; if (b.startDate) return 1;
        return a.category.localeCompare(b.category);
      });
      saveGuestBudgetsToStorage(budgets);
    } else {
      throw new Error("Budget not found in guest storage.");
    }
  } else {
    if (!userId) throw new Error("User ID is required to update a budget.");
    if (!budgetId) throw new Error("Budget ID is required to update a budget.");
    try {
      const budgetDocRef = doc(db, `users/${userId}/budgets`, budgetId);
      const firestoreReadyData: any = { ...dataToUpdate };
       if (firestoreReadyData.hasOwnProperty('startDate')) {
        firestoreReadyData.startDate = firestoreReadyData.startDate ? Timestamp.fromDate(parseISO(firestoreReadyData.startDate)) : null;
      }
      if (firestoreReadyData.hasOwnProperty('endDate')) {
        firestoreReadyData.endDate = firestoreReadyData.endDate ? Timestamp.fromDate(parseISO(firestoreReadyData.endDate)) : null;
      }
      delete firestoreReadyData.createdAt; 
      await updateDoc(budgetDocRef, firestoreReadyData);
    } catch (error: any) {
      console.error("Error updating budget in Firestore: ", error);
      const errorMessage = error.message || "Failed to update budget due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  if (userId === GUEST_USER_ID) {
    let budgets = getGuestBudgetsFromStorage();
    budgets = budgets.filter(b => b.id !== budgetId);
    saveGuestBudgetsToStorage(budgets); 
  } else {
    if (!userId) throw new Error("User ID is required to delete a budget.");
    if (!budgetId) throw new Error("Budget ID is required to delete a budget.");
    try {
      await deleteDoc(doc(db, `users/${userId}/budgets`, budgetId));
    } catch (error: any) {
      console.error("Error deleting budget from Firestore: ", error);
      const errorMessage = error.message || "Failed to delete budget due to a server error.";
      throw new Error(errorMessage);
    }
  }
}

export const getCurrentMonthValue = () => {
  return formatISO(new Date(), { representation: 'date' }).substring(5, 7); // MM
};

export const getCurrentYearValue = () => {
  return new Date().getFullYear().toString();
};
