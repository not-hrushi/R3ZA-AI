'use client';

import { type Transaction } from '@/services/transactionService';
import { addBudget, type NewBudgetData } from '@/services/budgetService';

export interface DetectedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'quarterly';
  category: string;
  payee: string;
  lastTransactionDate: string;
  transactionCount: number;
  confidence: number;
  suggestedBudget?: NewBudgetData;
}

export interface SubscriptionDetectionResult {
  subscriptions: DetectedSubscription[];
  recurringPayments: DetectedSubscription[];
  suggestions: {
    totalMonthlySubscriptions: number;
    potentialSavings: number;
    unusedSubscriptions: DetectedSubscription[];
  };
}

/**
 * Analyze transactions to detect recurring subscriptions and payments
 */
export function detectSubscriptionsFromTransactions(transactions: Transaction[]): SubscriptionDetectionResult {
  // Filter to only debit transactions (expenses) from the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  const debitTransactions = transactions.filter(t => 
    t.amount < 0 && 
    new Date(t.date) >= twelveMonthsAgo
  );

  // Group transactions by payee/description similarity
  const payeeGroups = groupTransactionsByPayee(debitTransactions);
  
  const detectedSubscriptions: DetectedSubscription[] = [];
  const recurringPayments: DetectedSubscription[] = [];

  for (const [payeeKey, groupTransactions] of Object.entries(payeeGroups)) {
    if (groupTransactions.length < 2) continue; // Need at least 2 transactions to detect pattern

    const analysis = analyzePaymentPattern(groupTransactions);
    
    if (analysis.isRecurring) {
      const subscription: DetectedSubscription = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: analysis.name,
        amount: Math.abs(analysis.averageAmount),
        frequency: analysis.frequency,
        category: analysis.category,
        payee: analysis.payee,
        lastTransactionDate: analysis.lastTransactionDate,
        transactionCount: groupTransactions.length,
        confidence: analysis.confidence,
        suggestedBudget: createSuggestedBudget(analysis)
      };

      if (analysis.isSubscription) {
        detectedSubscriptions.push(subscription);
      } else {
        recurringPayments.push(subscription);
      }
    }
  }

  // Sort by confidence and amount
  detectedSubscriptions.sort((a, b) => b.confidence - a.confidence || b.amount - a.amount);
  recurringPayments.sort((a, b) => b.confidence - a.confidence || b.amount - a.amount);

  // Generate suggestions
  const totalMonthlySubscriptions = detectedSubscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.frequency === 'monthly' ? sub.amount : 
                         sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.amount / 3; // quarterly
    return sum + monthlyAmount;
  }, 0);

  const unusedSubscriptions = detectedSubscriptions.filter(sub => {
    const daysSinceLastTransaction = Math.floor((Date.now() - new Date(sub.lastTransactionDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceLastTransaction > 60; // No transaction in last 2 months
  });

  const potentialSavings = unusedSubscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.frequency === 'monthly' ? sub.amount : 
                         sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.amount / 3;
    return sum + monthlyAmount;
  }, 0);

  return {
    subscriptions: detectedSubscriptions,
    recurringPayments,
    suggestions: {
      totalMonthlySubscriptions,
      potentialSavings,
      unusedSubscriptions
    }
  };
}

/**
 * Group transactions by similar payees/descriptions
 */
function groupTransactionsByPayee(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};

  for (const transaction of transactions) {
    const key = normalizePayeeName(transaction.payee || transaction.description);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(transaction);
  }

  return groups;
}

/**
 * Normalize payee names for grouping
 */
function normalizePayeeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/(payment|pay|bill|subscription|sub|monthly|annual)/g, '') // Remove common words
    .trim()
    .substring(0, 20); // Limit length for grouping
}

/**
 * Analyze payment pattern for a group of transactions
 */
function analyzePaymentPattern(transactions: Transaction[]) {
  const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate intervals between transactions
  const intervals: number[] = [];
  for (let i = 1; i < sortedTransactions.length; i++) {
    const days = Math.floor((new Date(sortedTransactions[i].date).getTime() - new Date(sortedTransactions[i-1].date).getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }

  // Determine frequency
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const intervalVariance = intervals.reduce((sum, interval) => sum + Math.pow(interval - averageInterval, 2), 0) / intervals.length;
  
  let frequency: 'monthly' | 'yearly' | 'quarterly' = 'monthly';
  let isRecurring = false;
  let confidence = 0;

  // Monthly pattern (25-35 days)
  if (averageInterval >= 25 && averageInterval <= 35 && intervalVariance < 50) {
    frequency = 'monthly';
    isRecurring = true;
    confidence = Math.max(0.7, 1 - (intervalVariance / 100));
  }
  // Yearly pattern (350-380 days)
  else if (averageInterval >= 350 && averageInterval <= 380 && intervalVariance < 200) {
    frequency = 'yearly';
    isRecurring = true;
    confidence = Math.max(0.6, 1 - (intervalVariance / 500));
  }
  // Quarterly pattern (85-95 days)
  else if (averageInterval >= 85 && averageInterval <= 95 && intervalVariance < 100) {
    frequency = 'quarterly';
    isRecurring = true;
    confidence = Math.max(0.6, 1 - (intervalVariance / 200));
  }
  // Loose monthly pattern (20-40 days with higher variance)
  else if (averageInterval >= 20 && averageInterval <= 40 && transactions.length >= 3) {
    frequency = 'monthly';
    isRecurring = true;
    confidence = Math.max(0.4, 0.8 - (intervalVariance / 100));
  }

  // Calculate average amount
  const amounts = transactions.map(t => Math.abs(t.amount));
  const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const amountVariance = amounts.reduce((sum, amount) => sum + Math.pow(amount - averageAmount, 2), 0) / amounts.length;
  
  // Adjust confidence based on amount consistency
  if (amountVariance < averageAmount * 0.1) {
    confidence += 0.2; // Very consistent amounts
  } else if (amountVariance < averageAmount * 0.3) {
    confidence += 0.1; // Somewhat consistent amounts
  }

  confidence = Math.min(1, confidence);

  // Determine if it's likely a subscription vs other recurring payment
  const description = transactions[0].description.toLowerCase();
  const payee = (transactions[0].payee || '').toLowerCase();
  
  const subscriptionKeywords = [
    'netflix', 'prime', 'spotify', 'youtube', 'adobe', 'microsoft', 'office',
    'subscription', 'premium', 'pro', 'plus', 'unlimited', 'plan',
    'google', 'apple', 'dropbox', 'zoom', 'slack', 'github'
  ];

  const isSubscription = subscriptionKeywords.some(keyword => 
    description.includes(keyword) || payee.includes(keyword)
  );

  // Categorize the payment
  let category = 'Subscriptions';
  if (description.includes('electricity') || description.includes('power')) category = 'Utilities';
  else if (description.includes('water')) category = 'Utilities';
  else if (description.includes('gas')) category = 'Utilities';
  else if (description.includes('internet') || description.includes('broadband')) category = 'Utilities';
  else if (description.includes('mobile') || description.includes('phone')) category = 'Utilities';
  else if (description.includes('rent')) category = 'Housing';
  else if (description.includes('insurance')) category = 'Insurance';
  else if (description.includes('emi') || description.includes('loan')) category = 'Banking';
  else if (!isSubscription) category = 'Recurring Payments';

  return {
    isRecurring,
    isSubscription,
    frequency,
    confidence,
    averageAmount,
    name: cleanPayeeName(transactions[0].payee || transactions[0].description),
    payee: transactions[0].payee || extractPayeeFromDescription(transactions[0].description),
    category,
    lastTransactionDate: sortedTransactions[sortedTransactions.length - 1].date
  };
}

/**
 * Clean payee name for display
 */
function cleanPayeeName(name: string): string {
  return name
    .replace(/^(UPI-|NEFT-|RTGS-|ATM-|CARD-)/i, '')
    .replace(/\s+(Dr|Cr|DEBIT|CREDIT)$/i, '')
    .replace(/Rs\.?\s*[\d,]+\.?\d*/g, '')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}

/**
 * Extract payee from description
 */
function extractPayeeFromDescription(description: string): string {
  const cleaned = cleanPayeeName(description);
  return cleaned || 'Unknown Payee';
}

/**
 * Create a suggested budget for a detected subscription
 */
function createSuggestedBudget(analysis: any): NewBudgetData {
  const monthlyAmount = analysis.frequency === 'monthly' ? analysis.averageAmount :
                       analysis.frequency === 'yearly' ? analysis.averageAmount / 12 :
                       analysis.averageAmount / 3;

  return {
    category: analysis.category,
    allocated: Math.ceil(monthlyAmount * 1.1), // Add 10% buffer
    spent: 0,
    periodType: 'recurring-monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', // Recurring budgets don't need end date
  };
}

/**
 * Auto-create budgets for detected subscriptions
 */
export async function createBudgetsForSubscriptions(
  userId: string,
  subscriptions: DetectedSubscription[]
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    if (!subscription.suggestedBudget) continue;

    try {
      await addBudget(userId, subscription.suggestedBudget);
      created++;
    } catch (error: any) {
      errors.push(`Failed to create budget for ${subscription.name}: ${error.message}`);
    }
  }

  return { created, errors };
}

/**
 * Get subscription health insights
 */
export function getSubscriptionInsights(subscriptions: DetectedSubscription[]) {
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.frequency === 'monthly' ? sub.amount : 
                         sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.amount / 3;
    return sum + monthlyAmount;
  }, 0);

  const totalYearly = totalMonthly * 12;

  const byCategory = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.category]) acc[sub.category] = 0;
    const monthlyAmount = sub.frequency === 'monthly' ? sub.amount : 
                         sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.amount / 3;
    acc[sub.category] += monthlyAmount;
    return acc;
  }, {} as Record<string, number>);

  const mostExpensive = subscriptions.reduce((max, sub) => {
    const monthlyAmount = sub.frequency === 'monthly' ? sub.amount : 
                         sub.frequency === 'yearly' ? sub.amount / 12 : 
                         sub.amount / 3;
    const maxMonthlyAmount = max.frequency === 'monthly' ? max.amount : 
                            max.frequency === 'yearly' ? max.amount / 12 : 
                            max.amount / 3;
    return monthlyAmount > maxMonthlyAmount ? sub : max;
  });

  return {
    totalMonthly,
    totalYearly,
    count: subscriptions.length,
    byCategory,
    mostExpensive,
    averagePerSubscription: totalMonthly / subscriptions.length
  };
}