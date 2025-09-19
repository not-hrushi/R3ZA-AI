'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import {
  addTransactionForServer,
  deleteTransactionForServer,
  updateTransactionForServer,
  getTransactionsForServer,
} from '@/services/transactionService.server';
import { generate, ToolRequestPart } from '@genkit-ai/ai';
import { normalizeCategory, STANDARD_CATEGORIES } from '@/lib/categories.client';
import { Transaction, safeParseNumber } from '@/lib/transactionUtils.client';

// Schemas for the tools
const transactionSchema = z.object({
    date: z.string().optional().describe("The date of the transaction in YYYY-MM-DD format. If not provided, today's date will be used."),
    description: z.string().describe('A detailed description of the transaction. Capture all relevant details from the user query.'),
    category: z.string().describe('The category of the transaction. Can be a standard category or a custom one.'),
    amount: z.number().describe('The amount of the transaction'),
    type: z.enum(['expense', 'income', 'subscription']).describe('The type of the transaction'),
    payee: z.string().optional().describe('The payee of the transaction'),
});

const updateTransactionSchema = z.object({
    id: z.string().describe('The ID of the transaction to update'),
    data: transactionSchema.partial().describe('The fields to update'),
});

const deleteTransactionSchema = z.object({
    id: z.string().describe('The ID of the transaction to delete'),
});

// NEW: Schema for the powerful search tool
const searchSchema = z.object({
    description: z.string().optional().describe("A keyword or phrase to search for in the transaction's description or payee."),
    category: z.string().optional().describe("A specific category to filter by."),
    type: z.enum(['expense', 'income', 'subscription']).optional().describe("A specific transaction type to filter by."),
});

// Schema for bulk category update
const bulkCategoryUpdateSchema = z.object({
  search: z.string().describe('Keyword or phrase to search for in description or payee.'),
  newCategory: z.string().describe('The new category to assign (preset or custom).'),
});

// Updated: Schema for precise financial calculations with category support
const calculateTotalSchema = z.object({
  search: z.string().optional().describe("Keyword or phrase to search for in the transaction's description or payee to filter the transactions to be summed."),
  category: z.string().optional().describe("Category name to filter transactions by (e.g., 'Food', 'Entertainment', etc.)."),
  type: z.enum(['expense', 'income']).optional().describe("Filter by 'expense' for spending or 'income' for earnings. If omitted, all types are considered."),
});

// NEW: Schema for finding largest transaction(s)
const largestTransactionSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense').describe("Find largest 'expense' or largest 'income'"),
  category: z.string().optional().describe("Optional category to filter by"),
  timeframe: z.enum(['all', 'this-month', 'this-year']).default('all').describe("Time period to search: 'all' (all time), 'this-month', or 'this-year'"),
  count: z.number().default(1).describe("Number of top transactions to return")
});


// ===================================================================================
//  REFINED AI TOOLS
// ===================================================================================

// NEW: A tool for precise financial calculations, offloading math from the AI.
export const calculateTotalTool = ai.defineTool(
  {
    name: 'calculateTotal',
    description: `Accurately calculates the sum of transactions based on search keyword or category. Use this for any questions involving totals, sums, or total amounts.
    
For category-based queries like "how much did I spend on food", use the category parameter with these standard categories: ${STANDARD_CATEGORIES.join(', ')}.
    
For search-based queries like "how much did I spend at Starbucks", use the search parameter.`,
    inputSchema: calculateTotalSchema,
    outputSchema: z.object({
      total: z.number(),
      count: z.number(),
      currency: z.string(),
      timeframe: z.string().optional(),
    }),
  },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required for calculations.');

    // Normalize category if provided
    let normalizedCategory = null;
    if (input.category) {
      normalizedCategory = normalizeCategory(input.category);
      console.log(`[calculateTotalTool] Normalized category from "${input.category}" to "${normalizedCategory}"`);
    }

    const transactions = await getTransactionsForServer(userId);
    console.log(`[calculateTotalTool] Fetched ${transactions.length} transactions for user ${userId}`);
    
    // Log available categories in the data for debugging
    const availableCategories = [...new Set(transactions.map((tx: any) => tx.category))];
    console.log(`[calculateTotalTool] Available categories in data:`, availableCategories);
    
    const filtered = transactions.filter((tx: any) => {
      // Type filtering
      let typeMatch = true;
      if (input.type === 'expense') {
        // Handle potential undefined or non-numeric amounts
        const amount = tx && tx.amount !== undefined ? safeParseNumber(tx.amount) : 0;
        typeMatch = amount < 0;
      } else if (input.type === 'income') {
        const amount = tx && tx.amount !== undefined ? safeParseNumber(tx.amount) : 0;
        typeMatch = amount > 0;
      }
      
      // Search term filtering - only apply if search is provided
      let searchMatch = true;
      if (input.search) {
        const desc = ((tx.description || '') + ' ' + (tx.payee || '')).toLowerCase();
        searchMatch = desc.includes(input.search.toLowerCase());
      }
      
      // Category filtering - only apply if category is provided
      let categoryMatch = true;
      if (input.category) {
        const txCategory = (tx.category || '').toLowerCase();
        
        // Use both normalized and original category for matching
        if (normalizedCategory) {
          categoryMatch = txCategory === normalizedCategory.toLowerCase();
        } else {
          categoryMatch = txCategory === input.category.toLowerCase();
        }
      }

      return typeMatch && searchMatch && categoryMatch;
    });

    console.log(`[calculateTotalTool] Found ${filtered.length} transactions matching criteria:`, {
      search: input.search,
      category: input.category,
      normalizedCategory,
      type: input.type
    });

    // Safely calculate the total with proper type handling
    const total = filtered.reduce((sum, tx: any) => {
      // Ensure we safely handle the amount property regardless of its existence or type
      const amount = tx && tx.amount !== undefined ? safeParseNumber(tx.amount) : 0;
      return sum + amount;
    }, 0);

    // Determine the timeframe if not explicitly provided
    let timeframe = "all time";
    
    return {
      total: Math.abs(total), // Return positive value for easier display
      count: filtered.length,
      currency: 'INR', // Assuming INR, can be made dynamic later
      timeframe: timeframe,
    };
  }
);

// NEW: A tool for finding the largest expense or income transactions
export const getLargestTransactionsTool = ai.defineTool(
  {
    name: 'getLargestTransactions',
    description: 'Finds the largest expense or income transactions, optionally filtered by category and time period. Use this for queries like "What was my biggest expense this month?" or "What are my top 3 expenses of all time?"',
    inputSchema: largestTransactionSchema,
    outputSchema: z.array(z.object({
      date: z.string(),
      description: z.string(),
      category: z.string(),
      amount: z.number(),
      payee: z.string().optional(),
    })),
  },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required');
    
    const transactions = await getTransactionsForServer(userId);
    
    // Filter by type (expense/income)
    let filtered = transactions.filter((tx: any) => {
      if (input.type === 'expense') {
        return Number(tx.amount) < 0;
      } else if (input.type === 'income') {
        return Number(tx.amount) > 0;
      }
      return true;
    });
    
    // Filter by category if provided
    if (input.category) {
      filtered = filtered.filter((tx: any) => 
        tx.category?.toLowerCase() === input.category?.toLowerCase()
      );
    }
    
    // Apply timeframe filter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (input.timeframe === 'this-month') {
      filtered = filtered.filter((tx: any) => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
    } else if (input.timeframe === 'this-year') {
      filtered = filtered.filter((tx: any) => {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === currentYear;
      });
    }
    
    // Sort by absolute amount in descending order
    filtered.sort((a: any, b: any) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    
    // Return the top N results
    return filtered.slice(0, input.count).map((tx: any) => ({
      date: tx.date,
      description: tx.description,
      category: tx.category,
      amount: Math.abs(Number(tx.amount)), // Return positive values for display
      payee: tx.payee
    }));
  }
);

// NEW: A more powerful search tool instead of just getting all transactions
export const searchTransactionsTool = ai.defineTool(
  {
    name: 'searchTransactions',
    description: 'Search for specific transactions based on criteria like description, category, or type. Use this to answer user questions about their spending.',
    inputSchema: searchSchema,
    outputSchema: z.any(),
  },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required to search transactions.');
    console.log(`[searchTransactionsTool] Searching transactions for user ${userId} with criteria:`, input);
    const transactions = await getTransactionsForServer(userId);
    // Filter transactions based on input criteria
    return transactions.filter((tx: any) => {
      let matches = true;
      if (input.description) {
        const desc = (tx.description || '') + ' ' + (tx.payee || '');
        matches = matches && desc.toLowerCase().includes(input.description.toLowerCase());
      }
      if (input.category) {
        matches = matches && tx.category === input.category;
      }
      if (input.type) {
        matches = matches && tx.type === input.type;
      }
      return matches;
    });
  }
);

export const addTransactionTool = ai.defineTool(
  { name: 'addTransaction', description: 'Add a new transaction.', inputSchema: transactionSchema, outputSchema: z.any() },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required to add a transaction.');
    await addTransactionForServer(userId, input);
    return { success: true, description: input.description };
  }
);

export const updateTransactionTool = ai.defineTool(
  { name: 'updateTransaction', description: 'Update an existing transaction.', inputSchema: updateTransactionSchema, outputSchema: z.any() },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required to update a transaction.');
    await updateTransactionForServer(userId, input.id, input.data);
    return { success: true, id: input.id };
  }
);

export const deleteTransactionTool = ai.defineTool(
  { name: 'deleteTransaction', description: 'Delete a transaction.', inputSchema: deleteTransactionSchema, outputSchema: z.any() },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required to delete a transaction.');
    await deleteTransactionForServer(userId, input.id);
    return { success: true, id: input.id };
  }
);

// Tool: Bulk update category for matching transactions
export const bulkUpdateCategoryTool = ai.defineTool(
  {
    name: 'bulkUpdateCategory',
    description: 'Search transactions by keyword and update their category in bulk. Supports custom categories.',
    inputSchema: bulkCategoryUpdateSchema,
    outputSchema: z.any(),
  },
  async (input, { context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error('User ID is required for bulk category update.');
    const transactions = await getTransactionsForServer(userId);
    const matches = transactions.filter((tx: any) => {
      const desc = (tx.description || '') + ' ' + (tx.payee || '');
      return desc.toLowerCase().includes(input.search.toLowerCase());
    });
    for (const tx of matches) {
      await updateTransactionForServer(userId, tx.id, { category: input.newCategory });
    }
    return { updatedCount: matches.length };
  }
);


// ===================================================================================
//  AI HANDLER WITH NEW SEARCH CAPABILITIES
// ===================================================================================
export async function r3zaAIFlow({ prompt, userId, previousMessages = [] }: { prompt: string; userId: string; previousMessages?: { role: string; content: string }[] }): Promise<{ response: string; mutation: boolean; }> {
    console.log(`[r3zaAIFlow] Started for user: ${userId}, prompt: "${prompt}"`);

    if (!userId) {
        return { response: "I'm sorry, I can't access your data without a user session. Please log in.", mutation: false };
    }

    try {
        // The new search tool replaces the old getTransactionsTool
        const tools = [getLargestTransactionsTool, calculateTotalTool, searchTransactionsTool, addTransactionTool, updateTransactionTool, deleteTransactionTool, bulkUpdateCategoryTool];
        const systemPrompt = `You are R3ZA AI, a proactive and intelligent personal finance assistant designed to give direct, helpful answers.

IMPORTANT DIRECTIVES:

1. TOOL SELECTION: You MUST choose the right tool for each query type.
   - DO NOT just search for keywords; understand the user's intent.
   - ALWAYS use proper parameters when calling tools.

2. FOR CATEGORY QUESTIONS: When the user mentions a category like "Food", "Entertainment", etc.:
   - ALWAYS use 'calculateTotal' tool with the category parameter
   - Example: "total spent on food" → use calculateTotal with category="Food"
   - Example: "how much did I spend on groceries" → use calculateTotal with category="Groceries"
   - NEVER use the search parameter for category names

3. FOR FINDING LARGEST EXPENSES: When the user asks about biggest/largest expenses:
   - ALWAYS use 'getLargestTransactions' tool
   - Default to current month/year if not specified

4. FOR GENERAL TOTALS & SUMS: To answer questions about specific payees/descriptions:
   - ALWAYS use 'calculateTotal' tool with the search parameter
   - Example: "how much did I send to Vishant" → use calculateTotal with search="Vishant"
   - Example: "total paid to Amazon" → use calculateTotal with search="Amazon"

5. FOR TRANSACTION DETAILS: For listing or showing transactions:
   - Use 'searchTransactions' tool
   - Example: "show my recent transactions" or "list my expenses"

6. FOR ADDING/UPDATING/DELETING: Use the appropriate tool:
   - 'addTransaction' for adding new transactions
   - 'updateTransaction' for modifying existing transactions
   - 'deleteTransaction' for removing transactions
   - 'bulkUpdateCategory' for changing multiple transaction categories at once

7. BE CONSISTENT WITH CATEGORY NAMES: Use exact category names when filtering:
   - "Food", "Entertainment", "Transport", "Shopping", etc.
   - Match categories case-insensitive

Remember: Assume current month/year unless specified otherwise. Be direct and helpful in your responses.`;

        // Construct a prompt that includes conversation context
        let fullPrompt = prompt;
        if (previousMessages.length > 0) {
            // Focus on the most recent 4 message pairs to avoid token limits
            const recentMessages = previousMessages.slice(-8);
            console.log(`[r3zaAIFlow] Including ${recentMessages.length} previous messages for context`);
            
            // Add conversation context to help the AI remember what's being discussed
            fullPrompt = `
User's recent messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Current question: ${prompt}

Please keep the entire conversation context in mind when responding.`;
        }

        const result = await ai.generate({
            model: gemini15Flash,
            prompt: fullPrompt,
            system: systemPrompt,
            tools: tools,
            context: { userId: userId },
            config: { temperature: 0.0 },
        });

        const responseText = result.text;
        const toolRequests = result.toolRequests;

        let mutation = false;
        if (toolRequests.length > 0) {
            const mutationTools = ['addTransaction', 'updateTransaction', 'deleteTransaction', 'bulkUpdateCategory'];
            if (toolRequests.some((call: ToolRequestPart) => mutationTools.includes(call.toolRequest.name))) {
                mutation = true;
            }
        }

        console.log(`[r3zaAIFlow] Finished. Mutation: ${mutation}, Response: "${responseText}"`);
        return { response: responseText, mutation };

    } catch (error) {
        console.error("[r3zaAIFlow] Error processing AI flow:", error);
        return { response: "I encountered an unexpected error. Please try again.", mutation: false };
    }
}
