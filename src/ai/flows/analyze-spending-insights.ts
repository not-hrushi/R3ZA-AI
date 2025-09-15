
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing user spending habits and providing detailed, actionable insights.
 *
 * - analyzeSpendingInsights - A function that takes spending data as input and returns AI-powered insights.
 * - AnalyzeSpendingInsightsInput - The input type for the analyzeSpendingInsights function.
 * - AnalyzeSpendingInsightsOutput - The return type for the analyzeSpendingInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSpendingInsightsInputSchema = z.object({
  income: z.number().describe('The user`s monthly income in Rupees (₹).'),
  expenses: z.array(
    z.object({
      category: z.string().describe('The category of the expense.'),
      amount: z.number().describe('The amount spent on the expense in Rupees (₹).'),
    })
  ).describe('A list of expenses with their categories and amounts.'),
  budgetGoals: z.array(
    z.object({
      category: z.string().describe('The category of the budget goal.'),
      amount: z.number().describe('The target budget for the category in Rupees (₹).'),
    })
  ).describe('A list of budget goals with their categories and amounts.'),
});
export type AnalyzeSpendingInsightsInput = z.infer<typeof AnalyzeSpendingInsightsInputSchema>;

const AreaForImprovementSchema = z.object({
  category: z.string().describe("The spending category identified for improvement."),
  suggestion: z.string().describe("A specific, actionable suggestion for this category (e.g., 'Consider reducing discretionary spending here by 10-15%')."),
  potentialSavings: z.number().optional().describe("Estimated potential monthly savings in Rupees (₹) if the suggestion is followed. Omit if not applicable or hard to quantify.")
});

const AnalyzeSpendingInsightsOutputSchema = z.object({
  overallSummary: z.string().describe('A brief (2-3 sentences) overall summary of the user\'s spending habits in relation to their income and budget goals. Be encouraging but realistic.'),
  areasForImprovement: z.array(AreaForImprovementSchema).describe('A list of 2-3 specific areas where the user can improve their spending, with actionable suggestions.'),
  positiveHabits: z.array(z.string()).describe('A list of 1-2 positive spending habits or well-managed categories observed (e.g., "Consistently staying within your Groceries budget is great!").'),
  actionableTips: z.array(z.string()).describe('A list of 2-3 general, actionable financial tips relevant to the user\'s situation but not tied to a specific category (e.g., "Set up automatic savings transfers each payday," "Review all subscriptions quarterly to ensure they are still needed").')
});
export type AnalyzeSpendingInsightsOutput = z.infer<typeof AnalyzeSpendingInsightsOutputSchema>;

export async function analyzeSpendingInsights(input: AnalyzeSpendingInsightsInput): Promise<AnalyzeSpendingInsightsOutput> {
  return analyzeSpendingInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSpendingInsightsPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: AnalyzeSpendingInsightsInputSchema},
  output: {schema: AnalyzeSpendingInsightsOutputSchema},
  prompt: `You are an expert personal finance advisor. Your goal is to provide comprehensive, actionable, and encouraging financial insights to the user. Use the Indian Rupee symbol (₹) for ALL monetary values.

User's Financial Data:
- Monthly Income: ₹{{{income}}}
- Expenses:
{{#each expenses}}
  - Category: {{{category}}}, Amount Spent: ₹{{{amount}}}
{{/each}}
- Budget Goals:
{{#each budgetGoals}}
  - Category: {{{category}}}, Budgeted Amount: ₹{{{amount}}}
{{/each}}

Based on this data, please provide the following in the specified structured JSON format:

1.  **overallSummary**: A brief (2-3 sentences) overall summary of their spending habits in relation to their income and budget goals. Be encouraging but realistic. For example, mention if spending is generally aligned with income, or if there are significant deviations from budget.

2.  **areasForImprovement**: Identify 2-3 specific spending categories where the user might be overspending or could optimize. For each area, provide:
    - the 'category' (name of the spending category),
    - a 'suggestion' (clear, actionable advice, e.g., "Consider reducing 'Entertainment' spending by 10-15%"),
    - and optionally, 'potentialSavings' (estimated monthly savings in Rupees (₹) if the suggestion is followed, e.g., ₹300 if a 15% reduction on ₹2000 spending is advised. Omit if not easily quantifiable).

3.  **positiveHabits**: Identify 1-2 positive spending habits or categories where the user is doing well. This could be staying within a budget for a key category, a low spending in a typically high-cost area, or if their overall expenses are well below income. Be specific, e.g., "Consistently staying within your 'Groceries' budget is excellent!" or "Your spending on 'Transportation' appears well-managed."

4.  **actionableTips**: Provide 2-3 general, actionable financial tips that are relevant to their situation but not tied to a specific category. Examples: "Set up a small, automatic transfer to your savings account each payday," "Review all your subscriptions quarterly to ensure they are still providing value," "Try the 50/30/20 budgeting rule (50% needs, 30% wants, 20% savings)."

Focus on practical, personalized advice based on the data provided. Ensure all monetary values are in Rupees (₹). Avoid overly generic statements.
Output should strictly follow the JSON schema provided for \`AnalyzeSpendingInsightsOutputSchema\`.
`,
});

const analyzeSpendingInsightsFlow = ai.defineFlow(
  {
    name: 'analyzeSpendingInsightsFlow',
    inputSchema: AnalyzeSpendingInsightsInputSchema,
    outputSchema: AnalyzeSpendingInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate insights. The output was empty.");
    }
    // Basic validation to ensure the output structure is somewhat as expected,
    // though Zod validation on output schema definition should handle most cases.
    if (!output.overallSummary || !output.areasForImprovement || !output.positiveHabits || !output.actionableTips) {
        console.warn("AI output might be missing some expected fields:", output);
        // Depending on strictness, you could throw an error here or try to proceed with partial data.
        // For now, let's assume Genkit's schema validation handles strictness.
    }
    return output;
  }
);
