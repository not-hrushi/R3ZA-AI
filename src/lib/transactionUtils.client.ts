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
export function categorizeTransactionType(amount: number): 'expense' | 'income' {
  return amount < 0 ? 'expense' : 'income';
}

/**
 * Formats a currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const absAmount = Math.abs(amount);
  
  if (currency === 'INR') {
    return `₹${absAmount.toLocaleString('en-IN')}`;
  }
  
  return `${currency} ${absAmount.toLocaleString()}`;
}

/**
 * Safely converts any value to a number, returning 0 if invalid
 */
export function safeParseNumber(value: any): number {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}
