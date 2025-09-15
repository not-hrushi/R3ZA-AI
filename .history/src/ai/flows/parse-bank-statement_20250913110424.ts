// Bank statement parsing flow using AI
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for a single parsed transaction
const ParsedTransactionSchema = z.object({
  date: z.string().describe("Transaction date in YYYY-MM-DD format"),
  description: z.string().describe("Transaction description or payee name"),
  amount: z.number().describe("Transaction amount (always positive number)"),
  type: z.enum(["credit", "debit"]).describe("Whether money was added (credit) or spent (debit)"),
  payee: z.string().optional().describe("The entity/person involved in the transaction"),
  category: z.string().optional().describe("Suggested category for the transaction"),
  confidence: z.number().min(0).max(1).describe("Confidence score for this parsed transaction (0-1)")
});

// Input schema
const ParseBankStatementInputSchema = z.object({
  rawText: z.string().describe("Raw text extracted from the bank statement PDF"),
  userHints: z.object({
    bankName: z.string().optional().describe("User-provided bank name hint"),
    accountType: z.string().optional().describe("Account type hint (savings, current, etc.)"),
    expectedTransactions: z.number().optional().describe("Expected number of transactions")
  }).optional()
});

// Output schema
const ParseBankStatementOutputSchema = z.object({
  transactions: z.array(ParsedTransactionSchema).describe("Array of parsed transactions"),
  accountNumber: z.string().optional().describe("Account number if found (last 4 digits only for privacy)"),
  statementPeriod: z.string().optional().describe("Statement period if found"),
  bankName: z.string().optional().describe("Bank name if identifiable"),
  parsingNotes: z.string().optional().describe("Any notes about the parsing process or data quality")
});

export type ParseBankStatementInput = z.infer<typeof ParseBankStatementInputSchema>;
export type ParseBankStatementOutput = z.infer<typeof ParseBankStatementOutputSchema>;

export async function parseBankStatement(input: ParseBankStatementInput): Promise<ParseBankStatementOutput> {
  return parseBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseBankStatementPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: ParseBankStatementInputSchema },
  output: { schema: ParseBankStatementOutputSchema },
  prompt: `You are an expert at parsing Indian bank statements. Analyze the provided text and extract all transaction data with high accuracy.

IMPORTANT PARSING RULES:
1. Extract ALL transactions found in the text
2. Convert dates to YYYY-MM-DD format
3. For amounts, extract the absolute numeric value (no negative signs)
4. Use "debit" for money going out (expenses, withdrawals, payments)
5. Use "credit" for money coming in (deposits, salary, refunds)
6. Provide descriptive but concise transaction descriptions
7. Suggest appropriate categories based on transaction description
8. Give confidence scores based on data clarity

COMMON INDIAN BANK STATEMENT PATTERNS:
- Date formats: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY
- Amount formats: 1,23,456.78, Rs. 1,23,456.78, ₹1,23,456.78
- Transaction types: UPI, NEFT, RTGS, ATM, Card payments, Cash deposits
- Common payees: Zomato, Swiggy, Amazon, Flipkart, Google Pay, PhonePe, Paytm

CATEGORIZATION GUIDELINES:
- Food & Dining: Restaurant payments, food delivery, cafes
- Transportation: Uber, Ola, fuel payments, metro, bus
- Shopping: E-commerce, retail stores, markets
- Utilities: Electricity, water, gas, internet, mobile bills
- Entertainment: Movies, Netflix, Spotify, games
- Healthcare: Hospital, pharmacy, insurance
- Education: School fees, courses, books
- Subscriptions: Monthly/annual service payments
- Banking: ATM charges, bank fees, loan EMIs
- Salary: Salary credits, bonuses
- Transfers: Money transfers to family/friends
- Other: Miscellaneous transactions

EXAMPLE PARSING:
Input: "15/03/2024 UPI-ZOMATO ORDER Rs. 450.00 Dr"
Output: {
  date: "2024-03-15",
  description: "Zomato Food Order",
  amount: 450.00,
  type: "debit",
  payee: "Zomato",
  category: "Food & Dining",
  confidence: 0.95
}

{{#if userHints}}
USER HINTS:
- Bank: {{userHints.bankName}}
- Account Type: {{userHints.accountType}}
- Expected Transactions: {{userHints.expectedTransactions}}
{{/if}}

RAW BANK STATEMENT TEXT:
{{{rawText}}}

Please extract and parse all transactions from this bank statement text. Be thorough and accurate.`,
});

const parseBankStatementFlow = ai.defineFlow(
  {
    name: 'parseBankStatementFlow',
    inputSchema: ParseBankStatementInputSchema,
    outputSchema: ParseBankStatementOutputSchema,
  },
  async (input: ParseBankStatementInput) => {
    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error('Failed to get output from AI model');
    }

    // Post-process to ensure data quality
    const processedTransactions = output.transactions.map((transaction: any) => ({
      ...transaction,
      // Ensure amount is always positive
      amount: Math.abs(transaction.amount),
      // Clean up description
      description: transaction.description.trim(),
      // Ensure payee is set if available
      payee: transaction.payee || extractPayeeFromDescription(transaction.description),
      // Set default category if not provided
      category: transaction.category || categorizeTransaction(transaction.description)
    }));

    return {
      ...output,
      transactions: processedTransactions
    };
  }
);

// Helper function to extract payee from description
function extractPayeeFromDescription(description: string): string {
  // Remove common prefixes and extract meaningful payee name
  const cleaned = description
    .replace(/^(UPI-|NEFT-|RTGS-|ATM-|CARD-)/i, '')
    .replace(/\s+(Dr|Cr|DEBIT|CREDIT)$/i, '')
    .replace(/Rs\.?\s*[\d,]+\.?\d*/g, '')
    .trim();
  
  // Take first meaningful part
  const parts = cleaned.split(/\s+/);
  return parts.slice(0, 2).join(' ') || cleaned;
}

// Helper function for basic categorization
function categorizeTransaction(description: string): string {
  const descLower = description.toLowerCase();
  
  const categories = {
    'Food & Dining': ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger'],
    'Transportation': ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'bus'],
    'Shopping': ['amazon', 'flipkart', 'shopping', 'store', 'market', 'purchase'],
    'Utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'phone', 'recharge'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'prime', 'youtube'],
    'Banking': ['atm', 'bank', 'fee', 'charge', 'emi', 'loan'],
    'Transfers': ['transfer', 'upi', 'paytm', 'phonepe', 'googlepay', 'gpay']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}