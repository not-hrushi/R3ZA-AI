'use server';

/**
 * @fileOverview Advanced expense analysis flow that detects subscription patterns and provides smart insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdvancedExpenseAnalysisInputSchema = z.object({
  transactions: z.string().describe('JSON string of transaction data to analyze.'),
  timeframeDays: z.number().default(180).describe('Number of days to look back for pattern analysis.'),
});
export type AdvancedExpenseAnalysisInput = z.infer<typeof AdvancedExpenseAnalysisInputSchema>;

const DetectedSubscriptionSchema = z.object({
  serviceName: z.string().describe('Name of the subscription service.'),
  category: z.string().describe('Category for the subscription.'),
  estimatedMonthlyAmount: z.number().describe('Estimated monthly cost in rupees.'),
  paymentPattern: z.enum(['monthly', 'yearly', 'quarterly', 'weekly']).describe('Detected payment frequency.'),
  nextEstimatedPaymentDate: z.string().describe('Estimated next payment date in YYYY-MM-DD format.'),
  confidence: z.number().min(0).max(1).describe('Confidence level (0-1) in this detection.'),
  transactionExamples: z.array(z.string()).describe('Example transaction descriptions that match.'),
  suggestedAction: z.string().describe('Recommendation for user action.'),
  shouldCreateReminder: z.boolean().describe('Whether to suggest creating a payment reminder.'),
  reminderDaysBeforePayment: z.number().describe('Suggested days before payment to remind user.'),
});

const ExpenseCategoryAdjustmentSchema = z.object({
  originalDescription: z.string().describe('Original transaction description.'),
  currentCategory: z.string().describe('Current category of the transaction.'),
  suggestedCategory: z.string().describe('Better category suggestion.'),
  reason: z.string().describe('Explanation for the category change suggestion.'),
  confidence: z.number().min(0).max(1).describe('Confidence in this suggestion.'),
});

const SpendingInsightSchema = z.object({
  insightType: z.enum(['overspending', 'duplicate_subscriptions', 'seasonal_trend', 'cost_increase', 'unusual_pattern']).describe('Type of insight detected.'),
  title: z.string().describe('Short title for the insight.'),
  description: z.string().describe('Detailed description of the insight.'),
  categories: z.array(z.string()).describe('Categories involved in this insight.'),
  recommendation: z.string().describe('Actionable recommendation.'),
  potentialSavings: z.number().optional().describe('Estimated potential monthly savings in rupees.'),
  urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level of addressing this insight.'),
});

const AdvancedExpenseAnalysisOutputSchema = z.object({
  detectedSubscriptions: z.array(DetectedSubscriptionSchema).describe('Subscriptions automatically detected from expense patterns.'),
  categoryAdjustments: z.array(ExpenseCategoryAdjustmentSchema).describe('Suggestions for better expense categorization.'),
  spendingInsights: z.array(SpendingInsightSchema).describe('Important spending insights and patterns detected.'),
  overallSummary: z.string().describe('High-level summary of findings and key recommendations.'),
  automationSuggestions: z.array(z.string()).describe('Suggestions for automating financial management.'),
  riskAlerts: z.array(z.string()).describe('Potential financial risks or concerning patterns identified.'),
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
  prompt: `You are an expert personal finance AI assistant specializing in subscription management, expense automation, and smart financial insights. Analyze the provided transaction data to help users optimize their finances through automation and smart recommendations.

**Primary Goals:**
1. **Detect Subscription Patterns**: Identify recurring payments that could be subscriptions
2. **Smart Categorization**: Suggest better categories for miscategorized expenses  
3. **Automation Opportunities**: Find ways to automate financial management
4. **Cost Optimization**: Identify potential savings and efficiency improvements
5. **Risk Detection**: Flag concerning spending patterns

**Transaction Data (Last {{timeframeDays}} days):**
{{{transactions}}}

**Subscription Detection Guidelines:**
- Look for payments with similar amounts occurring at regular intervals (monthly, yearly, etc.)
- Pay special attention to technology services, streaming platforms, software subscriptions
- Consider payee information as a strong indicator
- For monthly subscriptions, estimate next payment date based on the last payment + 30 days
- Set shouldCreateReminder=true for subscriptions over ₹100/month or critical services
- Suggest 3-5 days reminder for most subscriptions, 7 days for larger amounts

**Category Adjustment Guidelines:**
- Focus on obviously miscategorized transactions
- Consider description and payee to suggest better categories
- Common improvements: moving streaming services from "Other" to "Entertainment"

**Spending Insights to Look For:**
- Duplicate subscriptions (e.g., multiple music streaming services)
- Cost increases in subscriptions over time
- Seasonal spending patterns
- Unusual or concerning spending spikes
- Opportunities for bundling or switching services

**Automation Suggestions:**
- Setting up payment reminders
- Creating budgets for identified subscription categories
- Suggesting subscription audits
- Recommending expense tracking improvements

Use Indian Rupee (₹) for all monetary values.
Be specific and actionable in all recommendations.
Focus on insights that will genuinely help users save money and manage finances better.`,
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
