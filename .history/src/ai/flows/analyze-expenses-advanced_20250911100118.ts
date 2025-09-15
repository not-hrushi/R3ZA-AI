'use server';

/**
 * @fileOverview Advanced expense analysis flow that detects patterns, categorizes expenses,
 * and identifies potential subscriptions with payment dates.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdvancedExpenseAnalysisInputSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      description: z.string(),
      amount: z.number(),
      category: z.string(),
      payee: z.string().optional(),
      type: z.enum(['income', 'expense', 'subscription']),
    })
  ).describe('Array of transaction data to analyze.'),
  timeframeDays: z.number().default(180).describe('Number of days to look back for pattern analysis.'),
});
export type AdvancedExpenseAnalysisInput = z.infer<typeof AdvancedExpenseAnalysisInputSchema>;

const DetectedSubscriptionSchema = z.object({
  serviceName: z.string().describe('Name of the subscription service (e.g., "Netflix", "Spotify").'),
  category: z.string().describe('Category for the subscription (e.g., "Entertainment", "Software").'),
  estimatedMonthlyAmount: z.number().describe('Estimated monthly cost in rupees.'),
  paymentPattern: z.enum(['monthly', 'yearly', 'quarterly', 'weekly']).describe('Detected payment frequency.'),
  nextEstimatedPaymentDate: z.string().describe('Estimated next payment date in YYYY-MM-DD format.'),
  confidence: z.number().min(0).max(1).describe('Confidence level (0-1) in this detection.'),
  transactionIds: z.array(z.string()).describe('IDs of transactions that match this pattern.'),
  suggestedAction: z.string().describe('Recommendation for user action.'),
});

const ExpenseCategoryAdjustmentSchema = z.object({
  transactionId: z.string().describe('ID of the transaction to recategorize.'),
  currentCategory: z.string().describe('Current category of the transaction.'),
  suggestedCategory: z.string().describe('Better category suggestion.'),
  reason: z.string().describe('Explanation for the category change suggestion.'),
  confidence: z.number().min(0).max(1).describe('Confidence in this suggestion.'),
});

const SpendingPatternInsightSchema = z.object({
  patternType: z.enum(['seasonal', 'weekly', 'monthly', 'irregular']).describe('Type of spending pattern detected.'),
  description: z.string().describe('Description of the pattern.'),
  categories: z.array(z.string()).describe('Categories involved in this pattern.'),
  recommendation: z.string().describe('Actionable recommendation based on this pattern.'),
  potentialSavings: z.number().optional().describe('Estimated potential monthly savings in rupees.'),
});

const AdvancedExpenseAnalysisOutputSchema = z.object({
  detectedSubscriptions: z.array(DetectedSubscriptionSchema).describe('Subscriptions automatically detected from expense patterns.'),
  categoryAdjustments: z.array(ExpenseCategoryAdjustmentSchema).describe('Suggestions for better expense categorization.'),
  spendingPatterns: z.array(SpendingPatternInsightSchema).describe('Detected spending patterns and insights.'),
  overallSummary: z.string().describe('High-level summary of findings and recommendations.'),
  riskAlerts: z.array(z.string()).describe('Potential financial risks or concerns identified.'),
});
export type AdvancedExpenseAnalysisOutput = z.infer<typeof AdvancedExpenseAnalysisOutputSchema>;

export async function analyzeExpensesAdvanced(input: AdvancedExpenseAnalysisInput): Promise<AdvancedExpenseAnalysisOutput> {
  return analyzeExpensesAdvancedFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeExpensesAdvancedPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: AdvancedExpenseAnalysisInputSchema},
  output: {schema: AdvancedExpenseAnalysisOutputSchema},
  prompt: `You are an expert financial analyst specializing in personal finance automation and subscription management. 

Analyze the provided transaction data over the last {{timeframeDays}} days to:

1. **Detect Subscriptions**: Look for recurring payments with similar amounts, payees, or descriptions. Pay special attention to:
   - Technology services (Netflix, Spotify, Adobe, etc.)
   - Utilities (internet, phone, electricity)
   - Insurance payments
   - Gym memberships
   - Software subscriptions
   - Any payments that occur at regular intervals

2. **Categorization Improvements**: Identify transactions that might be miscategorized based on description and payee information.

3. **Spending Patterns**: Identify trends, seasonal patterns, or unusual spending behaviors.

4. **Risk Assessment**: Flag any concerning patterns like increasing subscription costs or duplicate services.

Transaction Data:
{{#each transactions}}
- ID: {{id}}, Date: {{date}}, Amount: ₹{{amount}}, Description: "{{description}}", Payee: "{{payee}}", Category: {{category}}, Type: {{type}}
{{/each}}

For subscription detection, be very careful about:
- Payment dates should be realistic based on historical data
- Consider monthly cycles (same day of month) for monthly subscriptions
- Look for exact or very similar amounts across multiple transactions
- Use payee information as a strong indicator
- For services already marked as "subscription" type, validate and improve the analysis

For next payment date estimation:
- If monthly: Add 1 month to the last payment date
- If yearly: Add 1 year to the last payment date
- If patterns are unclear, make a conservative estimate

Use Indian Rupee (₹) for all monetary values.
Provide actionable, specific recommendations that help users manage their finances better.`,
});

const analyzeExpensesAdvancedFlow = ai.defineFlow(
  {
    name: 'analyzeExpensesAdvancedFlow',
    inputSchema: AdvancedExpenseAnalysisInputSchema,
    outputSchema: AdvancedExpenseAnalysisOutputSchema,
  },
  async (input: AdvancedExpenseAnalysisInput) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate advanced expense analysis. The output was empty.");
    }
    return output;
  }
);
