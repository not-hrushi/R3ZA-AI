'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// Simplified reminder structure for now (until dependencies are resolved)
export interface SimpleReminder {
  id: string;
  serviceName: string;
  amount: number;
  nextPaymentDate: string;
  reminderDays: number;
  status: 'pending' | 'notified' | 'dismissed' | 'paid';
}

const GUEST_REMINDERS_KEY = 'financeflow_guest_subscription_reminders';
const NOTIFICATION_CHECK_INTERVAL = 1000 * 60 * 60; // Check every hour

export function useSubscriptionReminders() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<SimpleReminder[]>([]);
  const [lastNotificationCheck, setLastNotificationCheck] = useState<string | null>(null);

  // Load reminders from storage
  const loadReminders = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const storageKey = isGuest ? GUEST_REMINDERS_KEY : `financeflow_reminders_${user?.uid}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setReminders(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading reminders:', error);
      }
    }
  }, [user?.uid, isGuest]);

  // Save reminders to storage
  const saveReminders = useCallback((newReminders: SimpleReminder[]) => {
    if (typeof window === 'undefined') return;
    
    const storageKey = isGuest ? GUEST_REMINDERS_KEY : `financeflow_reminders_${user?.uid}`;
    localStorage.setItem(storageKey, JSON.stringify(newReminders));
    setReminders(newReminders);
  }, [user?.uid, isGuest]);

  // Add a new reminder
  const addReminder = useCallback((reminder: Omit<SimpleReminder, 'id'>) => {
    const newReminder: SimpleReminder = {
      ...reminder,
      id: Date.now().toString(),
    };
    const updated = [...reminders, newReminder].sort((a, b) => 
      new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
    );
    saveReminders(updated);
    toast({
      title: "Reminder Added",
      description: `Payment reminder set for ${reminder.serviceName}`,
    });
  }, [reminders, saveReminders, toast]);

  // Update reminder status
  const updateReminderStatus = useCallback((id: string, status: SimpleReminder['status']) => {
    const updated = reminders.map(r => 
      r.id === id ? { ...r, status } : r
    );
    saveReminders(updated);
  }, [reminders, saveReminders]);

  // Delete a reminder
  const deleteReminder = useCallback((id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    saveReminders(updated);
    toast({
      title: "Reminder Deleted",
      description: "Payment reminder has been removed",
    });
  }, [reminders, saveReminders, toast]);

  // Check for pending notifications
  const checkNotifications = useCallback(() => {
    if (!reminders.length) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Don't check more than once per hour
    if (lastNotificationCheck) {
      const lastCheck = new Date(lastNotificationCheck);
      if (now.getTime() - lastCheck.getTime() < NOTIFICATION_CHECK_INTERVAL) {
        return;
      }
    }

    const pendingReminders = reminders.filter(reminder => {
      if (reminder.status !== 'pending') return false;
      
      const paymentDate = new Date(reminder.nextPaymentDate);
      const reminderDate = new Date(paymentDate);
      reminderDate.setDate(reminderDate.getDate() - reminder.reminderDays);
      
      return reminderDate <= now && paymentDate >= now;
    });

    if (pendingReminders.length > 0) {
      // Request notification permission if needed
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              showNotifications(pendingReminders);
            }
          });
        } else if (Notification.permission === 'granted') {
          showNotifications(pendingReminders);
        }
      }

      // Also show toast notifications
      pendingReminders.forEach(reminder => {
        const daysUntil = Math.ceil((new Date(reminder.nextPaymentDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        toast({
          title: `💳 Payment Due Soon: ${reminder.serviceName}`,
          description: `₹${reminder.amount.toFixed(2)} payment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          duration: 10000, // Show for 10 seconds
        });
        
        // Mark as notified
        updateReminderStatus(reminder.id, 'notified');
      });

      setLastNotificationCheck(now.toISOString());
    }
  }, [reminders, lastNotificationCheck, toast, updateReminderStatus]);

  // Show browser notifications
  const showNotifications = useCallback((pendingReminders: SimpleReminder[]) => {
    pendingReminders.forEach(reminder => {
      const daysUntil = Math.ceil((new Date(reminder.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      new Notification(`💳 Payment Reminder: ${reminder.serviceName}`, {
        body: `₹${reminder.amount.toFixed(2)} payment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        icon: '/logo.svg',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
      });
    });
  }, []);

  // Auto-create reminder from transaction pattern
  const createReminderFromTransaction = useCallback((
    serviceName: string,
    amount: number,
    estimatedNextDate: string,
    reminderDays: number = 3
  ) => {
    // Check if reminder already exists for this service
    const existingReminder = reminders.find(r => 
      r.serviceName.toLowerCase() === serviceName.toLowerCase() && 
      r.status === 'pending'
    );

    if (!existingReminder) {
      addReminder({
        serviceName,
        amount: Math.abs(amount),
        nextPaymentDate: estimatedNextDate,
        reminderDays,
        status: 'pending',
      });
      return true;
    }
    return false;
  }, [reminders, addReminder]);

  // Initialize
  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user, loadReminders]);

  // Check notifications periodically
  useEffect(() => {
    if (reminders.length > 0) {
      checkNotifications();
      
      // Set up periodic checks
      const interval = setInterval(checkNotifications, NOTIFICATION_CHECK_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [reminders, checkNotifications]);

  return {
    reminders: reminders.filter(r => r.status !== 'paid'), // Hide paid reminders
    addReminder,
    updateReminderStatus,
    deleteReminder,
    createReminderFromTransaction,
    checkNotifications,
  };
}
