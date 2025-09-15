'use client';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { addDays, format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

const GUEST_USER_ID = "GUEST_USER_ID";
const GUEST_REMINDERS_KEY = 'financeflow_guest_reminders';

export type ReminderStatus = 'pending' | 'notified' | 'dismissed' | 'paid';
export type ReminderType = 'subscription' | 'bill' | 'custom';

export interface SubscriptionReminder {
  id: string;
  userId: string;
  serviceName: string;
  amount: number;
  category: string;
  nextPaymentDate: string; // ISO string
  reminderDays: number; // Days before payment to remind
  reminderType: ReminderType;
  status: ReminderStatus;
  isRecurring: boolean;
  recurringPattern: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | null;
  lastNotifiedDate?: string; // ISO string
  transactionId?: string; // Link to original transaction
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type NewReminderData = Omit<SubscriptionReminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateReminderData = Partial<Omit<SubscriptionReminder, 'id' | 'userId' | 'createdAt'>>;

// Helper functions for guest mode
function getGuestRemindersFromStorage(): SubscriptionReminder[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(GUEST_REMINDERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveGuestRemindersToStorage(reminders: SubscriptionReminder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_REMINDERS_KEY, JSON.stringify(reminders));
}

export async function addSubscriptionReminder(userId: string, reminderData: NewReminderData): Promise<SubscriptionReminder> {
  const now = new Date().toISOString();
  const fullReminderData: Omit<SubscriptionReminder, 'id'> = {
    ...reminderData,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  if (userId === GUEST_USER_ID) {
    const reminders = getGuestRemindersFromStorage();
    const newReminder: SubscriptionReminder = {
      ...fullReminderData,
      id: String(Date.now()),
    };
    reminders.push(newReminder);
    reminders.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    saveGuestRemindersToStorage(reminders);
    return newReminder;
  } else {
    if (!userId) throw new Error("User ID is required to add a reminder.");
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/reminders`), {
        ...fullReminderData,
        nextPaymentDate: Timestamp.fromDate(new Date(fullReminderData.nextPaymentDate)),
        lastNotifiedDate: fullReminderData.lastNotifiedDate ? Timestamp.fromDate(new Date(fullReminderData.lastNotifiedDate)) : null,
        createdAt: Timestamp.fromDate(new Date(fullReminderData.createdAt)),
        updatedAt: Timestamp.fromDate(new Date(fullReminderData.updatedAt)),
      });
      return { ...fullReminderData, id: docRef.id };
    } catch (error: any) {
      console.error("Error adding reminder to Firestore: ", error);
      throw new Error(error.message || "Failed to save reminder due to a server error.");
    }
  }
}

export async function getSubscriptionReminders(userId: string): Promise<SubscriptionReminder[]> {
  if (userId === GUEST_USER_ID) {
    return getGuestRemindersFromStorage();
  } else {
    if (!userId) throw new Error("User ID is required to get reminders.");
    try {
      const remindersCol = collection(db, `users/${userId}/reminders`);
      const q = query(remindersCol, orderBy("nextPaymentDate", "asc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          serviceName: data.serviceName,
          amount: data.amount,
          category: data.category,
          nextPaymentDate: (data.nextPaymentDate as Timestamp).toDate().toISOString().split('T')[0],
          reminderDays: data.reminderDays,
          reminderType: data.reminderType,
          status: data.status,
          isRecurring: data.isRecurring,
          recurringPattern: data.recurringPattern,
          lastNotifiedDate: data.lastNotifiedDate ? (data.lastNotifiedDate as Timestamp).toDate().toISOString() : undefined,
          transactionId: data.transactionId,
          notes: data.notes,
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
        } as SubscriptionReminder;
      });
    } catch (error: any) {
      console.error("Error fetching reminders from Firestore: ", error);
      throw new Error(error.message || "Failed to fetch reminders due to a server error.");
    }
  }
}

export async function updateSubscriptionReminder(userId: string, reminderId: string, reminderData: UpdateReminderData): Promise<void> {
  const dataToUpdate: any = { 
    ...reminderData, 
    updatedAt: new Date().toISOString() 
  };

  if (userId === GUEST_USER_ID) {
    let reminders = getGuestRemindersFromStorage();
    const index = reminders.findIndex(r => r.id === reminderId);
    if (index !== -1) {
      reminders[index] = { ...reminders[index], ...dataToUpdate };
      reminders.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
      saveGuestRemindersToStorage(reminders);
    } else {
      throw new Error("Reminder not found in guest storage.");
    }
  } else {
    if (!userId) throw new Error("User ID is required to update a reminder.");
    if (!reminderId) throw new Error("Reminder ID is required to update a reminder.");
    try {
      const reminderDocRef = doc(db, `users/${userId}/reminders`, reminderId);
      const firestoreData: any = { ...dataToUpdate };
      
      if (dataToUpdate.nextPaymentDate) {
        firestoreData.nextPaymentDate = Timestamp.fromDate(new Date(dataToUpdate.nextPaymentDate));
      }
      if (dataToUpdate.lastNotifiedDate) {
        firestoreData.lastNotifiedDate = Timestamp.fromDate(new Date(dataToUpdate.lastNotifiedDate));
      }
      firestoreData.updatedAt = Timestamp.fromDate(new Date(dataToUpdate.updatedAt));
      
      await updateDoc(reminderDocRef, firestoreData);
    } catch (error: any) {
      console.error("Error updating reminder in Firestore: ", error);
      throw new Error(error.message || "Failed to update reminder due to a server error.");
    }
  }
}

export async function deleteSubscriptionReminder(userId: string, reminderId: string): Promise<void> {
  if (userId === GUEST_USER_ID) {
    let reminders = getGuestRemindersFromStorage();
    reminders = reminders.filter(r => r.id !== reminderId);
    saveGuestRemindersToStorage(reminders);
  } else {
    if (!userId) throw new Error("User ID is required to delete a reminder.");
    if (!reminderId) throw new Error("Reminder ID is required to delete a reminder.");
    try {
      await deleteDoc(doc(db, `users/${userId}/reminders`, reminderId));
    } catch (error: any) {
      console.error("Error deleting reminder from Firestore: ", error);
      throw new Error(error.message || "Failed to delete reminder due to a server error.");
    }
  }
}

// Get reminders that need notification (within reminder days of payment date)
export async function getPendingReminders(userId: string, daysAhead: number = 7): Promise<SubscriptionReminder[]> {
  const allReminders = await getSubscriptionReminders(userId);
  const today = startOfDay(new Date());
  const checkUntil = endOfDay(addDays(today, daysAhead));

  return allReminders.filter(reminder => {
    if (reminder.status !== 'pending') return false;
    
    const paymentDate = parseISO(reminder.nextPaymentDate);
    const reminderDate = addDays(paymentDate, -reminder.reminderDays);
    
    // Check if we should remind now (reminder date is today or in the past, but payment hasn't passed)
    return (
      (isBefore(reminderDate, checkUntil) || reminderDate.getTime() === today.getTime()) &&
      isAfter(paymentDate, today)
    );
  });
}

// Update next payment date for recurring subscriptions
export function calculateNextPaymentDate(currentDate: string, pattern: 'monthly' | 'yearly' | 'quarterly' | 'weekly'): string {
  const current = parseISO(currentDate);
  
  switch (pattern) {
    case 'monthly':
      return format(addDays(current, 30), 'yyyy-MM-dd'); // Approximate monthly
    case 'quarterly':
      return format(addDays(current, 90), 'yyyy-MM-dd');
    case 'yearly':
      return format(addDays(current, 365), 'yyyy-MM-dd');
    case 'weekly':
      return format(addDays(current, 7), 'yyyy-MM-dd');
    default:
      return currentDate;
  }
}

// Mark reminder as paid and update next payment date if recurring
export async function markReminderAsPaid(userId: string, reminderId: string): Promise<void> {
  if (userId === GUEST_USER_ID) {
    let reminders = getGuestRemindersFromStorage();
    const index = reminders.findIndex(r => r.id === reminderId);
    if (index !== -1) {
      const reminder = reminders[index];
      if (reminder.isRecurring && reminder.recurringPattern) {
        // Update to next payment date
        reminder.nextPaymentDate = calculateNextPaymentDate(reminder.nextPaymentDate, reminder.recurringPattern);
        reminder.status = 'pending';
      } else {
        reminder.status = 'paid';
      }
      reminder.updatedAt = new Date().toISOString();
      saveGuestRemindersToStorage(reminders);
    }
  } else {
    const reminders = await getSubscriptionReminders(userId);
    const reminder = reminders.find(r => r.id === reminderId);
    if (reminder) {
      const updateData: UpdateReminderData = {
        status: reminder.isRecurring && reminder.recurringPattern ? 'pending' : 'paid',
      };
      
      if (reminder.isRecurring && reminder.recurringPattern) {
        updateData.nextPaymentDate = calculateNextPaymentDate(reminder.nextPaymentDate, reminder.recurringPattern);
      }
      
      await updateSubscriptionReminder(userId, reminderId, updateData);
    }
  }
}

// Browser notification helper
export function createReminderNotification(reminder: SubscriptionReminder): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const daysUntil = Math.ceil((new Date(reminder.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    new Notification(`💳 Payment Reminder: ${reminder.serviceName}`, {
      body: `₹${reminder.amount.toFixed(2)} payment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${format(parseISO(reminder.nextPaymentDate), 'MMM dd, yyyy')})`,
      icon: '/logo.svg',
      tag: `reminder-${reminder.id}`,
      requireInteraction: true,
    });
  }
}
