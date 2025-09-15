/**
 * @fileOverview Service for managing subscription payment reminders
 * Handles CRUD operations for reminders and notification scheduling
 */

interface Reminder {
  id: string;
  subscriptionName: string;
  category: string;
  amount: number;
  nextPaymentDate: string; // YYYY-MM-DD format
  paymentFrequency: 'monthly' | 'yearly' | 'quarterly' | 'weekly';
  reminderDaysBeforePayment: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  notificationEnabled: boolean;
  autoDetected: boolean; // Whether this was detected by AI vs manually added
}

interface CreateReminderInput {
  subscriptionName: string;
  category: string;
  amount: number;
  nextPaymentDate: string;
  paymentFrequency: 'monthly' | 'yearly' | 'quarterly' | 'weekly';
  reminderDaysBeforePayment?: number;
  notificationEnabled?: boolean;
  autoDetected?: boolean;
}

interface ReminderNotification {
  id: string;
  reminderId: string;
  scheduledDate: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'financeflow_reminders';
const NOTIFICATIONS_KEY = 'financeflow_reminder_notifications';

/**
 * Get reminders from localStorage or return empty array
 */
function getRemindersFromStorage(): Reminder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading reminders from storage:', error);
    return [];
  }
}

/**
 * Save reminders to localStorage
 */
function saveRemindersToStorage(reminders: Reminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Error saving reminders to storage:', error);
  }
}

/**
 * Generate next payment date based on frequency
 */
function calculateNextPaymentDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to monthly
  }
  
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

/**
 * Calculate when to show reminder based on days before payment
 */
function calculateReminderDate(paymentDate: string, daysBefore: number): string {
  const date = new Date(paymentDate);
  date.setDate(date.getDate() - daysBefore);
  return date.toISOString().split('T')[0];
}

/**
 * Create a new reminder
 */
export function createReminder(input: CreateReminderInput): Reminder {
  const reminders = getRemindersFromStorage();
  const now = new Date().toISOString();
  
  const newReminder: Reminder = {
    id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    subscriptionName: input.subscriptionName,
    category: input.category,
    amount: input.amount,
    nextPaymentDate: input.nextPaymentDate,
    paymentFrequency: input.paymentFrequency,
    reminderDaysBeforePayment: input.reminderDaysBeforePayment || 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    notificationEnabled: input.notificationEnabled !== false, // Default to true
    autoDetected: input.autoDetected || false,
  };
  
  reminders.push(newReminder);
  saveRemindersToStorage(reminders);
  
  return newReminder;
}

/**
 * Get all reminders
 */
export function getAllReminders(): Reminder[] {
  return getRemindersFromStorage();
}

/**
 * Get active reminders only
 */
export function getActiveReminders(): Reminder[] {
  return getRemindersFromStorage().filter(reminder => reminder.isActive);
}

/**
 * Get reminder by ID
 */
export function getReminderById(id: string): Reminder | undefined {
  return getRemindersFromStorage().find(reminder => reminder.id === id);
}

/**
 * Update a reminder
 */
export function updateReminder(id: string, updates: Partial<Reminder>): Reminder | null {
  const reminders = getRemindersFromStorage();
  const index = reminders.findIndex(reminder => reminder.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedReminder = {
    ...reminders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  reminders[index] = updatedReminder;
  saveRemindersToStorage(reminders);
  
  return updatedReminder;
}

/**
 * Delete a reminder
 */
export function deleteReminder(id: string): boolean {
  const reminders = getRemindersFromStorage();
  const filteredReminders = reminders.filter(reminder => reminder.id !== id);
  
  if (filteredReminders.length === reminders.length) {
    return false; // Reminder not found
  }
  
  saveRemindersToStorage(filteredReminders);
  return true;
}

/**
 * Mark payment as completed and calculate next payment date
 */
export function markPaymentCompleted(reminderId: string): Reminder | null {
  const reminder = getReminderById(reminderId);
  if (!reminder) {
    return null;
  }
  
  const nextPaymentDate = calculateNextPaymentDate(
    reminder.nextPaymentDate,
    reminder.paymentFrequency
  );
  
  return updateReminder(reminderId, {
    nextPaymentDate,
  });
}

/**
 * Get reminders that should trigger notifications today
 */
export function getRemindersForToday(): Reminder[] {
  const today = new Date().toISOString().split('T')[0];
  const activeReminders = getActiveReminders();
  
  return activeReminders.filter(reminder => {
    if (!reminder.notificationEnabled) return false;
    
    const reminderDate = calculateReminderDate(
      reminder.nextPaymentDate,
      reminder.reminderDaysBeforePayment
    );
    
    return reminderDate === today;
  });
}

/**
 * Get upcoming reminders in the next N days
 */
export function getUpcomingReminders(days: number = 7): Reminder[] {
  const activeReminders = getActiveReminders();
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  
  return activeReminders.filter(reminder => {
    const paymentDate = new Date(reminder.nextPaymentDate);
    return paymentDate >= today && paymentDate <= futureDate;
  });
}

/**
 * Check for reminders with duplicate subscription names
 */
export function findDuplicateReminders(): Reminder[][] {
  const reminders = getActiveReminders();
  const groups: { [key: string]: Reminder[] } = {};
  
  reminders.forEach(reminder => {
    const key = reminder.subscriptionName.toLowerCase().trim();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(reminder);
  });
  
  return Object.values(groups).filter(group => group.length > 1);
}

/**
 * Bulk create reminders from AI detection results
 */
export function createRemindersFromAIDetection(detectedSubscriptions: any[]): Reminder[] {
  const createdReminders: Reminder[] = [];
  
  detectedSubscriptions.forEach(subscription => {
    if (subscription.shouldCreateReminder) {
      try {
        const reminder = createReminder({
          subscriptionName: subscription.serviceName,
          category: subscription.category,
          amount: subscription.estimatedMonthlyAmount,
          nextPaymentDate: subscription.nextEstimatedPaymentDate,
          paymentFrequency: subscription.paymentPattern,
          reminderDaysBeforePayment: subscription.reminderDaysBeforePayment || 3,
          autoDetected: true,
          notificationEnabled: true,
        });
        createdReminders.push(reminder);
      } catch (error) {
        console.error(`Failed to create reminder for ${subscription.serviceName}:`, error);
      }
    }
  });
  
  return createdReminders;
}

/**
 * Get reminder statistics
 */
export function getReminderStats(): {
  total: number;
  active: number;
  autoDetected: number;
  totalMonthlyAmount: number;
  upcomingThisWeek: number;
} {
  const reminders = getAllReminders();
  const activeReminders = getActiveReminders();
  const upcomingReminders = getUpcomingReminders(7);
  
  const totalMonthlyAmount = activeReminders.reduce((sum, reminder) => {
    // Convert to monthly amount based on frequency
    switch (reminder.paymentFrequency) {
      case 'weekly':
        return sum + (reminder.amount * 4.33); // Average weeks per month
      case 'quarterly':
        return sum + (reminder.amount / 3);
      case 'yearly':
        return sum + (reminder.amount / 12);
      default:
        return sum + reminder.amount; // Monthly
    }
  }, 0);
  
  return {
    total: reminders.length,
    active: activeReminders.length,
    autoDetected: reminders.filter(r => r.autoDetected).length,
    totalMonthlyAmount: Math.round(totalMonthlyAmount * 100) / 100,
    upcomingThisWeek: upcomingReminders.length,
  };
}
