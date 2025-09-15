// Simple transaction extraction utility that doesn't rely on JSON parsing
'use server';

import { ParseBankStatementOutput } from '../flows/parse-bank-statement';

export async function extractTransactionsFromValidatedData(parsedData: any): Promise<ParseBankStatementOutput> {
  console.log('Using direct transaction extraction from parsed data...');
  
  if (!parsedData || !parsedData.transactions) {
    return {
      transactions: [],
      parsingNotes: 'No valid transaction data found in the response.'
    };
  }

  // Helper function for basic categorization
  function categorizeTransaction(description: string): string {
    const descLower = description.toLowerCase();
    
    const categories = {
      'Food & Dining': ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'dominos'],
      'Transportation': ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'bus'],
      'Shopping': ['amazon', 'flipkart', 'shopping', 'store', 'market', 'purchase'],
      'Utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'phone', 'recharge', 'airtel', 'bharti'],
      'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'prime', 'youtube', 'steam', 'googleplay', 'riot'],
      'Banking': ['atm', 'bank', 'fee', 'charge', 'emi', 'loan', 'interest'],
      'Transfers': ['transfer', 'upi', 'paytm', 'phonepe', 'googlepay', 'gpay']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }

  // Helper function to extract payee from description
  function extractPayeeFromDescription(description: string): string {
    // Remove common prefixes and extract meaningful payee name
    const cleaned = description
      .replace(/^(UPI-|NEFT-|RTGS-|ATM-|CARD-|UPI Payment to |ECOM Purchase )/i, '')
      .replace(/\s+(Dr|Cr|DEBIT|CREDIT|AXIS BANK|YES BANK|HDFC BANK|SBI|CANARA BANK|ICICI|State Bank).*$/i, '')
      .replace(/Rs\.?\s*[\d,]+\.?\d*/g, '')
      .trim();
    
    // Take first meaningful part
    const parts = cleaned.split(/\s+/);
    return parts.slice(0, 2).join(' ') || cleaned || 'Unknown';
  }

  // Process transactions with robust filtering
  const validTransactions = parsedData.transactions
    .filter((transaction: any) => {
      return transaction &&
             transaction.date && 
             transaction.description && 
             typeof transaction.amount === 'number' && 
             transaction.type &&
             typeof transaction.confidence === 'number';
    })
    .map((transaction: any) => ({
      date: transaction.date,
      description: (transaction.description || 'Unknown Transaction').trim(),
      amount: Math.abs(Number(transaction.amount)),
      type: transaction.type === 'DEBIT' || transaction.type === 'debit' ? 'debit' : 'credit',
      payee: transaction.payee || extractPayeeFromDescription(transaction.description || ''),
      category: transaction.category || categorizeTransaction(transaction.description || ''),
      confidence: Math.max(0, Math.min(1, Number(transaction.confidence) || 0.5))
    }))
    // Remove duplicates based on date, amount, and description
    .filter((transaction: any, index: number, arr: any[]) => {
      return arr.findIndex((t: any) => 
        t.date === transaction.date && 
        Math.abs(t.amount - transaction.amount) < 0.01 && 
        t.description === transaction.description
      ) === index;
    });

  console.log(`Successfully processed ${validTransactions.length} valid transactions`);

  return {
    transactions: validTransactions,
    accountNumber: parsedData.accountNumber,
    statementPeriod: parsedData.statementPeriod,
    bankName: parsedData.bankName,
    parsingNotes: `Successfully processed ${validTransactions.length} transactions${parsedData.transactions.length !== validTransactions.length ? ` (filtered from ${parsedData.transactions.length} total)` : ''}.`
  };
}