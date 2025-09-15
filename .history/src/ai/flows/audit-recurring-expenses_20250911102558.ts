
'use server';
/**
 * @fileOverview An AI agent that audits transactions to identify potential recurring expenses/subscriptions.
 *
 * - auditRecurringExpenses - A function that performs the audit.
 * - AuditRecurringExpensesInput - The input type for the auditRecurringExpenses function.
 * - AuditRecurringExpensesOutput - The return type for the auditRecurringExpenses function.
 */

import {ai}from '@/ai/genkit';
import {z}from 'genkit';

const TransactionForAuditSchema = z.object({
  date: z.string().describe("Date of the transaction (YYYY-MM-DD)."),
  description: z.string().describe("Description of the transaction."),
  amount: z.number().describe("Amount of the transaction (expenses/subscriptions are negative, income positive. Use absolute for analysis if helpful but original sign is available)."),
  payee: z.string().optional().describe("The merchant or entity paid (e.g., 'Netflix', 'Amazon', 'Local Gym'). This field is optional but highly recommended for better accuracy."),
  category: z.string().describe("Category of the transaction."),
  type: z.enum(["expense", "income", "subscription"]).describe("Type of transaction: 'expense', 'income', or 'subscription'.")
});

const AuditRecurringExpensesInputSchema = z.object({
  transactions: z.array(TransactionForAuditSchema).describe("An array of user's transactions from the last 6-12 months for analysis. Each transaction MUST include 'date', 'description', 'amount', 'category', and 'type'. 'payee' is optional but highly recommended for better accuracy.")
});
export type AuditRecurringExpensesInput = z.infer<typeof AuditRecurringExpensesInputSchema>;
export type TransactionForAudit = z.infer<typeof TransactionForAuditSchema>;

const IdentifiedRecurringExpenseSchema = z.object({
  likelyServiceName: z.string().describe("The likely name of the recurring service or subscription (e.g., 'Netflix Subscription', 'Gym Membership', 'Monthly Software Bill'). If type is 'subscription', use the transaction's category as this name."),
  estimatedMonthlyCost: z.number().describe("Estimated monthly cost in Rupees (₹). If paid annually, prorate to monthly. This should be a positive value representing the cost."),
  lastPaymentDate: z.string().optional().describe("Date of the most recent transaction found for this recurring item (YYYY-MM-DD)."),
  transactionExamples: z.array(z.string()).max(3).describe("Up to 3 example transaction descriptions (include payee if informative) that led to this identification. For 'subscription' type, this might be redundant if only one instance is present but useful if multiple payments for same subscription are in data."),
  suggestion: z.string().describe("A brief suggestion, e.g., 'Review if still needed', 'Check for cheaper plans', 'Consider canceling if unused', or 'Explicitly marked as a subscription. Confirm details.'")
});

const AuditRecurringExpensesOutputSchema = z.object({
  auditSummary: z.string().describe("A brief summary of the audit findings (e.g., 'Identified X potential recurring expenses. Review them below.')."),
  identifiedExpenses: z.array(IdentifiedRecurringExpenseSchema).describe("A list of identified potential recurring expenses or subscriptions. If none found, this can be an empty array."),
  generalTip: z.string().optional().describe("A general tip related to managing subscriptions or recurring costs.")
});
export type AuditRecurringExpensesOutput = z.infer<typeof AuditRecurringExpensesOutputSchema>;
export type IdentifiedRecurringExpense = z.infer<typeof IdentifiedRecurringExpenseSchema>;

export async function auditRecurringExpenses(input: AuditRecurringExpensesInput): Promise<AuditRecurringExpensesOutput> {
  return auditRecurringExpensesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'auditRecurringExpensesPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: AuditRecurringExpensesInputSchema},
  output: {schema: AuditRecurringExpensesOutputSchema},
  prompt: `You are a financial assistant helping a user identify potential recurring expenses and subscriptions from their transaction history. Use the Indian Rupee symbol (₹) for ALL monetary values.

User's Transactions (analyze for patterns):
{{#each transactions}}
  - Date: {{{date}}}, Type: {{{type}}}, Description: {{{description}}}, Payee: {{#if payee}}{{{payee}}}{{else}}N/A{{/if}}, Amount: {{{amount}}}, Category: {{{category}}}
{{/each}}

Based on the provided transactions, please:
1.  **Identify Recurring Expenses/Subscriptions**:
    *   **Explicit Subscriptions**: If a transaction has \`type: "subscription"\`, it is DEFINITELY a recurring subscription.
        *   Its 'likelyServiceName' should be taken directly from its \`category\` field.
        *   Its 'estimatedMonthlyCost' is the absolute value of its \`amount\`. If multiple transactions exist for the same subscription category, average or use the latest.
        *   Its 'suggestion' should be something like "Explicitly marked as a subscription. Review terms and usage."
    *   **Inferred Recurring Expenses (from 'expense' type transactions)**: Look for patterns in transactions with \`type: "expense"\` such as:
        *   Similar descriptions appearing on a regular basis (e.g., monthly, annually).
        *   Keywords like "Subscription," "Membership," "Monthly," "Annual," "Auto-pay" in the description.
        *   Consistent payment amounts to the same or similar payees (even if payee isn't explicitly listed for all, infer from description if possible).
        *   **Recognize common subscription service providers from the \`payee\` field** (e.g., 'Netflix', 'Spotify', 'Amazon Prime', 'Microsoft*Subscription', 'Google*Play', 'Adobe', 'Apple.com/bill', 'AWS'). If a known provider is identified as the payee for an 'expense' type transaction with somewhat regular payments, list it as a potential recurring expense. The 'suggestion' for these should reflect that it was identified primarily via the payee.

2.  **For each identified recurring item (both explicit subscriptions and inferred expenses), provide**:
    *   'likelyServiceName': Descriptive name. For \`type: "subscription"\`, use its \`category\`. For inferred, e.g., "Netflix Premium", "Local Gym Fee".
    *   'estimatedMonthlyCost': Estimated cost per month in Rupees (₹) (always positive). If annual, prorate.
    *   'lastPaymentDate': Date of the most recent transaction for this item (YYYY-MM-DD).
    *   'transactionExamples': Up to 3 example transaction descriptions (include payee) that support this identification.
    *   'suggestion': Brief, actionable suggestion. For inferred from payee, state this (e.g., "Potentially Netflix based on payee. Review."). For others: "Review if still used," "Consider lower-tier plan."

3.  **Provide an 'auditSummary'**: Short overview (e.g., "Found 3 potential recurring items."). If none, state that.
4.  **Optionally, provide a 'generalTip'**: Useful tip about managing subscriptions.

Only list expenses that have a strong indication of being recurring.
If no recurring expenses are clearly identifiable beyond those explicitly marked as 'subscription' with no other patterns, the 'identifiedExpenses' array might just contain those. If truly none, it can be empty.
Output should strictly follow the JSON schema provided for \`AuditRecurringExpensesOutputSchema\`.
`,
});

const auditRecurringExpensesFlow = ai.defineFlow(
  {
    name: 'auditRecurringExpensesFlow',
    inputSchema: AuditRecurringExpensesInputSchema,
    outputSchema: AuditRecurringExpensesOutputSchema,
  },
  async (input): Promise<AuditRecurringExpensesOutput> => {
    try {
      const transactionsToAudit = input.transactions.map(t => ({
          ...t,
          payee: t.payee || "", 
          amount: t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount)
      }));
      
      const expenseAndSubscriptionTransactions = transactionsToAudit.filter(
          t => t.type === 'expense' || t.type === 'subscription'
      );

      if (expenseAndSubscriptionTransactions.length === 0) {
          return {
              auditSummary: "No expense or subscription transactions provided or found for audit.",
              identifiedExpenses: [],
              generalTip: "Add some expense or subscription transactions to audit for recurring payments."
          };
      }

      const {output} = await prompt({transactions: expenseAndSubscriptionTransactions});
      
      if (!output) {
          console.error("[auditRecurringExpensesFlow] AI returned no output or output was null after prompt call.");
          return {
              auditSummary: "AI analysis did not return any data.",
              identifiedExpenses: [],
              generalTip: "The AI model provided an empty or unparseable response. Please try again."
          };
      }
      
      return {
        ...output,
        identifiedExpenses: output.identifiedExpenses || []
      };

    } catch (flowError: any) {
        // This catch block will handle any error from input processing, the prompt call, or output handling.
        console.error("[auditRecurringExpensesFlow] An error occurred within the auditRecurringExpensesFlow:", flowError.message);
        // To help debug on Vercel, you might want to log the full error if possible,
        // but be careful about sensitive details if flowError itself contains them.
        // console.error("[auditRecurringExpensesFlow] Full error object structure:", JSON.stringify(flowError, Object.getOwnPropertyNames(flowError)));


        let userFriendlyMessage = "The AI could not process your request at this time. Please try again later.";
        if (flowError instanceof Error && flowError.name === 'GenkitError' && (flowError as any).reason === 'INVALID_ARGUMENT') {
            userFriendlyMessage = "The AI model's response was not in the expected format. Please try again.";
             // Optionally, log more details from GenkitError if available and safe
            // if ((flowError as any).details) {
            //   console.error("[auditRecurringExpensesFlow] GenkitError details:", (flowError as any).details);
            // }
        }

        return {
            auditSummary: "An error occurred during the expense audit.",
            identifiedExpenses: [], 
            generalTip: userFriendlyMessage
        };
    }
  }
);

