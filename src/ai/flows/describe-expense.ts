
'use server';

/**
 * @fileOverview An AI agent that provides a description of expense details.
 *
 * - describeExpense - A function that provides an expense description.
 * - DescribeExpenseInput - The input type for the describeExpense function.
 * - DescribeExpenseOutput - The return type for the describeExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DescribeExpenseInputSchema = z.object({
  category: z.string().describe('The category of the expense.'),
  amount: z.number().describe('The amount of the expense.'),
  date: z.string().describe('The date of the expense (YYYY-MM-DD format).'),
  payee: z.string().optional().describe('The payee or vendor of the expense, if available.'),
  description: z.string().optional().describe('Any additional notes provided by the user for the expense.'),
});
export type DescribeExpenseInput = z.infer<typeof DescribeExpenseInputSchema>;

const DescribeExpenseOutputSchema = z.object({
  expenseDescription: z.string().describe('A detailed and natural language description of the expense.'),
});
export type DescribeExpenseOutput = z.infer<typeof DescribeExpenseOutputSchema>;

export async function describeExpense(input: DescribeExpenseInput): Promise<DescribeExpenseOutput> {
  return describeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'describeExpensePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: DescribeExpenseInputSchema},
  output: {schema: DescribeExpenseOutputSchema},
  prompt: `You are a personal finance assistant. Generate a concise and clear description for an expense.
Use the Indian Rupee symbol (₹) for the amount.
The expense details are:
Category: {{{category}}}
Amount: ₹{{{amount}}}
Date: {{{date}}}
{{#if payee}}Payee/Vendor: {{{payee}}}{{/if}}
User's notes (if any): {{#if description}}{{{description}}}{{else}}None{{/if}}

Based on this, create a helpful summary. For example:
- If category is 'Groceries', amount is 500, date is '2023-10-26', and payee is 'BigMart', a good description might be: "Groceries purchase of ₹500.00 from BigMart on October 26, 2023."
- If no payee and category is 'Utilities', amount is 1200, date is '2023-11-05', a good description might be: "Utilities payment of ₹1200.00 on November 05, 2023."
- If user notes are "Monthly subscription", category 'Entertainment', amount 99, date '2023-11-10', description could be: "Entertainment expense of ₹99.00 on November 10, 2023 (Monthly subscription)."

Ensure the output is a single, coherent sentence or two. Be natural and informative.
`,
});

const describeExpenseFlow = ai.defineFlow(
  {
    name: 'describeExpenseFlow',
    inputSchema: DescribeExpenseInputSchema,
    outputSchema: DescribeExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

