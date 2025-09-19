
'use server';

/**
 * @fileOverview Predicts future expenses based on past spending habits, providing a detailed breakdown.
 *
 * - predictFutureExpenses - A function that predicts future expenses.
 * - PredictFutureExpensesInput - The input type for the predictFutureExpenses function.
 * - PredictFutureExpensesOutput - The return type for the predictFutureExpenses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictFutureExpensesInputSchema = z.object({
  pastSpendingData: z.string().describe('A JSON string containing an array of past expense transactions, each with date, amount (positive number), category, and description.'),
  predictionTimeframe: z.string().describe('The timeframe for which to predict expenses (e.g., "next month", "next 2 months", "next quarter").'),
});
export type PredictFutureExpensesInput = z.infer<typeof PredictFutureExpensesInputSchema>;

const PredictedExpenseItemSchema = z.object({
    category: z.string().describe("The expense category."),
    predictedAmount: z.number().describe("The predicted amount for this category in Rupees (₹).")
});

const PredictFutureExpensesOutputSchema = z.object({
  predictionSummary: z.string().describe("A brief textual summary of the expense prediction (2-3 sentences), mentioning the timeframe."),
  predictedExpenses: z.array(PredictedExpenseItemSchema).describe('A list of predicted expenses, broken down by category, with amounts in Rupees (₹).'),
  totalPredictedAmount: z.number().describe("The total sum of all predicted expenses in Rupees (₹)."),
  confidenceLevel: z.string().describe('A description of the confidence level in the prediction (e.g., "High", "Medium", "Low"), based on data consistency and predictability.'),
  keyFactors: z.array(z.string()).describe("A list of 2-3 key factors or trends from past data that significantly influenced this prediction (e.g., 'Consistent monthly utility payments of ~₹1500', 'Observed increase in grocery spending over the last quarter')."),
  potentialVariances: z.array(z.string()).describe("A list of 1-2 potential reasons or categories where actual spending might differ notably from the prediction, or caveats (e.g., 'Entertainment spending is highly variable and could be higher or lower', 'Does not account for unplanned large purchases unless similar patterns exist in historical data').")
});
export type PredictFutureExpensesOutput = z.infer<typeof PredictFutureExpensesOutputSchema>;

export async function predictFutureExpenses(input: PredictFutureExpensesInput): Promise<PredictFutureExpensesOutput> {
  return predictFutureExpensesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictFutureExpensesPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: PredictFutureExpensesInputSchema},
  output: {schema: PredictFutureExpensesOutputSchema},
  prompt: `You are a financial advisor specializing in expense prediction.
Use the Indian Rupee symbol (₹) for ALL monetary values.

Analyze the user's past spending data to predict their future expenses for the specified timeframe.
The past spending data is a JSON string representing an array of transactions. Each transaction object has 'date', 'amount' (as a positive number for expense), 'category', and 'description'.

Input:
- Past Spending Data: {{{pastSpendingData}}}
- Prediction Timeframe: {{{predictionTimeframe}}}

Output Requirements (Strictly follow this JSON structure):
1.  **predictionSummary**: A brief (2-3 sentences) overall summary of the predicted expenses for the '{{{predictionTimeframe}}}'.
2.  **predictedExpenses**: An array of objects. Each object must contain:
    *   'category': The name of the expense category.
    *   'predictedAmount': The predicted spending for this category in Rupees (₹) for the entire '{{{predictionTimeframe}}}'.
3.  **totalPredictedAmount**: The sum of all 'predictedAmount' values from the 'predictedExpenses' array, in Rupees (₹).
4.  **confidenceLevel**: Your confidence in this prediction (e.g., "High", "Medium", "Low"). Base this on data consistency, amount of data, and predictability of spending patterns.
5.  **keyFactors**: List 2-3 key trends or specific data points from the 'pastSpendingData' that most influenced your prediction amounts for certain categories (e.g., "Consistent monthly 'Rent' of ₹15000", "Average 'Groceries' spending is ₹5000/month based on the last 3 months").
6.  **potentialVariances**: List 1-2 important caveats or areas where actual spending might differ significantly from your prediction (e.g., "'Travel' category spending is sporadic and hard to predict accurately", "Prediction assumes no major unexpected one-time purchases like new appliances unless such patterns are evident").

Consider spending patterns, trends, seasonality (if discernible from data), and recurring expenses.
If data for a category is too sparse or erratic for a reasonable prediction, you might consolidate it into 'Other Miscellaneous' or explicitly state the uncertainty in 'potentialVariances'.
Focus on providing realistic and data-driven predictions.
Ensure all monetary values are in Rupees (₹).
`,
});

const predictFutureExpensesFlow = ai.defineFlow(
  {
    name: 'predictFutureExpensesFlow',
    inputSchema: PredictFutureExpensesInputSchema,
    outputSchema: PredictFutureExpensesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate an expense prediction. The output was empty.");
    }
    // Additional validation can be added here if needed, beyond Zod schema
    if (!output.predictedExpenses || typeof output.totalPredictedAmount !== 'number') {
        console.warn("AI output for expense prediction might be missing key fields or has incorrect types:", output);
        // Depending on strictness, you could throw an error or attempt to salvage
    }
    return output;
  }
);

