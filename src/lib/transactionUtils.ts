'use server';

// Define the transaction type for consistent usage across the application
export interface Transaction {
  id: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'expense' | 'income' | 'subscription';
  payee?: string;
  // Add any other fields that might be in your transactions
}

// Helper functions for common transaction operations

/**
 * Categorizes a transaction based on its amount
 */
export async function categorizeTransactionType(amount: number): Promise<'expense' | 'income'> {
  return amount < 0 ? 'expense' : 'income';
}

/**
 * Formats a currency amount for display
 */
export async function formatCurrency(amount: number, currency: string = 'INR'): Promise<string> {
  const absAmount = Math.abs(amount);
  
  if (currency === 'INR') {
    return `₹${absAmount.toLocaleString('en-IN')}`;
  }
  
  return `${currency} ${absAmount.toLocaleString()}`;
}

/**
 * Safely converts any value to a number, returning 0 if invalid
 */
export async function safeParseNumber(value: any): Promise<number> {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}
