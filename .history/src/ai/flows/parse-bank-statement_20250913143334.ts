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
    // Check input size and implement chunking for large documents
    const MAX_CHUNK_SIZE = 50000; // Reasonable limit for API calls
    const inputText = input.rawText;
    
    console.log(`Processing bank statement with ${inputText.length} characters`);
    
    // If text is too large, implement chunking strategy
    if (inputText.length > MAX_CHUNK_SIZE) {
      console.log('Large document detected, implementing chunking strategy...');
      return await processLargeDocument(input, MAX_CHUNK_SIZE);
    }

    // Helper function to process large documents in chunks
    async function processLargeDocument(input: ParseBankStatementInput, chunkSize: number): Promise<ParseBankStatementOutput> {
      const lines = input.rawText.split('\n');
      const chunks: string[] = [];
      let currentChunk = '';
      
      // Split by lines to maintain transaction integrity
      for (const line of lines) {
        if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      console.log(`Document split into ${chunks.length} chunks`);
      
      // Process each chunk
      const allTransactions: any[] = [];
      let accountNumber: string | undefined;
      let bankName: string | undefined;
      let statementPeriod: string | undefined;
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        
        try {
          const chunkInput = {
            ...input,
            rawText: chunks[i]
          };
          
          const output = await attemptAIParsingWithRetry(chunkInput);
          
          if (output.transactions) {
            allTransactions.push(...output.transactions);
          }
          
          // Use metadata from first successful chunk
          if (!accountNumber && output.accountNumber) accountNumber = output.accountNumber;
          if (!bankName && output.bankName) bankName = output.bankName;
          if (!statementPeriod && output.statementPeriod) statementPeriod = output.statementPeriod;
          
        } catch (chunkError: any) {
          console.error(`Chunk ${i + 1} failed:`, chunkError.message);
          // Continue with other chunks
        }
      }
      
      // Post-process combined results
      const processedTransactions = allTransactions
        .filter((transaction: any) => {
          return transaction.date && 
                 transaction.description && 
                 typeof transaction.amount === 'number' && 
                 transaction.type && 
                 typeof transaction.confidence === 'number';
        })
        .map((transaction: any) => ({
          ...transaction,
          amount: Math.abs(transaction.amount),
          description: (transaction.description || 'Unknown Transaction').trim(),
          payee: transaction.payee || extractPayeeFromDescription(transaction.description || ''),
          category: transaction.category || categorizeTransaction(transaction.description || ''),
          confidence: Math.max(0, Math.min(1, transaction.confidence || 0.5))
        }))
        // Remove duplicates based on date, amount, and description
        .filter((transaction: any, index: number, arr: any[]) => {
          return arr.findIndex((t: any) => 
            t.date === transaction.date && 
            t.amount === transaction.amount && 
            t.description === transaction.description
          ) === index;
        });
      
      return {
        transactions: processedTransactions,
        accountNumber,
        statementPeriod,
        bankName,
        parsingNotes: `Successfully processed ${processedTransactions.length} transactions from ${chunks.length} document chunks. ${allTransactions.length - processedTransactions.length} duplicates removed.`
      };
    }
    // Helper function to extract a field value from a JSON string
    function extractFromJson(jsonStr: string, fieldName: string): string | undefined {
      try {
        const regex = new RegExp(`"${fieldName}":\\s*"([^"]*)"`, 'i');
        const match = jsonStr.match(regex);
        return match ? match[1] : undefined;
      } catch {
        return undefined;
      }
    }

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

    // Helper function to process partial data consistently
    function processPartialData(partialData: any): ParseBankStatementOutput {
      const processedTransactions = (partialData.transactions || [])
        .filter((transaction: any) => {
          // More lenient filtering - only require basic fields
          return transaction.date && 
                 (transaction.description || transaction.payee) && 
                 typeof transaction.amount === 'number' && 
                 transaction.type;
        })
        .map((transaction: any) => ({
          date: transaction.date,
          description: transaction.description || transaction.payee || 'Unknown Transaction',
          amount: Math.abs(transaction.amount),
          type: transaction.type === 'DEBIT' || transaction.type === 'debit' ? 'debit' : 'credit',
          payee: transaction.payee || extractPayeeFromDescription(transaction.description || ''),
          category: transaction.category || categorizeTransaction(transaction.description || ''),
          confidence: Math.max(0, Math.min(1, transaction.confidence || 0.7))
        }));

      return {
        transactions: processedTransactions,
        accountNumber: partialData.accountNumber,
        statementPeriod: partialData.statementPeriod,
        bankName: partialData.bankName,
        parsingNotes: processedTransactions.length > 0 
          ? `Successfully processed ${processedTransactions.length} transactions. Some transactions may have been filtered out due to incomplete data.`
          : 'No valid transactions could be extracted from the provided data.'
      };
    }

    // Helper function to attempt AI parsing with retry
    async function attemptAIParsingWithRetry(inputData: ParseBankStatementInput, maxRetries = 2): Promise<any> {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting to call Google Generative AI (attempt ${attempt}/${maxRetries})...`);
          console.log('Input text length:', inputData.rawText.length);
          
          const { output } = await prompt(inputData);
          
          if (!output) {
            throw new Error('Failed to get output from AI model');
          }

          console.log('AI response received successfully');
          console.log('Number of transactions found:', output.transactions?.length || 0);
          return output;
          
        } catch (apiError: any) {
          console.error(`AI attempt ${attempt} failed:`, apiError.message);
          
          if (attempt === maxRetries) {
            throw apiError; // Re-throw on final attempt
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    try {
      const output = await attemptAIParsingWithRetry(input);

      // Post-process to ensure data quality
      const processedTransactions = output.transactions
        .filter((transaction: any) => {
          // Filter out transactions that don't have required fields
          return transaction.date && 
                 transaction.description && 
                 typeof transaction.amount === 'number' && 
                 transaction.type && 
                 typeof transaction.confidence === 'number';
        })
        .map((transaction: any) => ({
          ...transaction,
          // Ensure amount is always positive
          amount: Math.abs(transaction.amount),
          // Clean up description and ensure it's not empty
          description: (transaction.description || 'Unknown Transaction').trim(),
          // Ensure payee is set if available
          payee: transaction.payee || extractPayeeFromDescription(transaction.description || ''),
          // Set default category if not provided
          category: transaction.category || categorizeTransaction(transaction.description || ''),
          // Ensure confidence is within bounds
          confidence: Math.max(0, Math.min(1, transaction.confidence || 0.5))
        }));

      return {
        ...output,
        transactions: processedTransactions,
        parsingNotes: output.parsingNotes || `Successfully processed ${processedTransactions.length} transactions${processedTransactions.length !== output.transactions?.length ? ` (filtered from ${output.transactions?.length})` : ''}`
      };
    } catch (error: any) {
      console.error('AI parsing error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        traceId: error.traceId,
        digest: error.digest
      });

      // Check if it's a network/API connectivity issue
      if (error.message?.includes('fetch failed') || 
          error.message?.includes('GoogleGenerativeAI Error') ||
          error.message?.includes('Network request failed')) {
        
        console.warn('Network/API error detected, returning fallback response');
        return {
          transactions: [],
          parsingNotes: `AI service is currently unavailable (${error.message}). Please check your internet connection and try again later. If the problem persists, please contact support.`
        };
      }

      // If there's a validation error, try to extract what we can from the error details
      if (error.message?.includes('Schema validation failed') && error.originalMessage) {
        console.warn('AI output validation failed, attempting to extract partial data:', error.originalMessage);
        
        try {
          // Try to parse the partial data from the error message
          const dataMatch = error.originalMessage.match(/Provided data:\s*\n\s*({[\s\S]*})/);
          if (dataMatch) {
            let jsonStr = dataMatch[1];
            
            // Handle truncated JSON by trying to find the last complete transaction
            if (jsonStr.includes('... ') && jsonStr.includes('more characters')) {
              // JSON is truncated, try to extract what we can
              const transactionsMatch = jsonStr.match(/"transactions":\s*\[([\s\S]*?)\]/);
              if (transactionsMatch) {
                // Find the last complete transaction object
                const transactionsStr = transactionsMatch[1];
                const transactionMatches = [...transactionsStr.matchAll(/\{[^{}]*\}/g)];
                
                if (transactionMatches.length > 0) {
                  // Build a valid JSON with complete transactions
                  const completeTransactions = transactionMatches.map(match => {
                    try {
                      return JSON.parse(match[0]);
                    } catch {
                      return null;
                    }
                  }).filter(Boolean);
                  
                  if (completeTransactions.length > 0) {
                    const partialData = {
                      transactions: completeTransactions,
                      accountNumber: extractFromJson(jsonStr, 'accountNumber'),
                      statementPeriod: extractFromJson(jsonStr, 'statementPeriod'),
                      bankName: extractFromJson(jsonStr, 'bankName')
                    };
                    
                    const result = processPartialData(partialData);
                    if (result.transactions.length > 0) {
                      return result;
                    }
                  }
                }
              }
            } else {
              // Try to parse the complete JSON, but handle potential truncation
              try {
                const partialData = JSON.parse(jsonStr);
                const result = processPartialData(partialData);
                if (result.transactions.length > 0) {
                  return result;
                }
              } catch (jsonError) {
                console.warn('Complete JSON parsing failed, attempting to extract transactions manually:', jsonError);
                
                // Enhanced manual extraction approach for malformed JSON
                const result = extractTransactionsFromText(jsonStr);
                if (result && result.transactions.length > 0) {
                  return result;
                }
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to extract partial data:', parseError);
        }
        
        // Return a basic response with error information
        return {
          transactions: [],
          parsingNotes: 'AI parsing encountered validation issues. The bank statement format may be complex. Please try again or contact support if the problem persists.'
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }
);