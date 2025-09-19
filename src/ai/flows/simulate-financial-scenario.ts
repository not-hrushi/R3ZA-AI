
'use server';
/**
 * @fileOverview An AI agent that simulates financial scenarios based on user input.
 *
 * - simulateFinancialScenario - A function that simulates a financial scenario.
 * - SimulateFinancialScenarioInput - The input type for the simulateFinancialScenario function.
 * - SimulateFinancialScenarioOutput - The return type for the simulateFinancialScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialSnapshotSchema = z.object({
  averageMonthlyIncome: z.number().optional().describe("User's approximate average monthly income in Rupees (₹)."),
  averageMonthlyExpenses: z.number().optional().describe("User's approximate average monthly expenses in Rupees (₹) based on transaction data."),
  currentSavings: z.number().optional().describe("User's current total savings in Rupees (₹), if provided for simulation context."),
  currentDebt: z.number().optional().describe("User's current total debt in Rupees (₹) (excluding mortgage), if provided for simulation context.")
});

const SimulateFinancialScenarioInputSchema = z.object({
  currentFinancials: FinancialSnapshotSchema.describe("A snapshot of the user's current financial situation."),
  scenarioDescription: z.string().describe("The financial scenario or 'what-if' question the user wants to simulate (e.g., 'What if I save an extra ₹5000 per month?', 'Impact of a 10% raise on my savings goal?')."),
  simulationTimeframe: z.string().describe("The timeframe for the simulation (e.g., '1 year', '5 years', 'until I reach ₹100,000 in savings').")
});
export type SimulateFinancialScenarioInput = z.infer<typeof SimulateFinancialScenarioInputSchema>;

const ProjectedOutcomeSchema = z.object({
  metric: z.string().describe("The financial metric being projected (e.g., 'Projected Savings Balance', 'Estimated Debt Reduction', 'Time to Reach Goal')."),
  value: z.string().describe("The projected value or outcome for the metric in Rupees (₹) or a relevant unit (e.g., '₹1,20,000', 'Debt-free in approx. 2 years')."),
  details: z.string().optional().describe("Any additional details or context for this specific projection.")
});

const SimulateFinancialScenarioOutputSchema = z.object({
  scenarioInterpretation: z.string().describe("A brief interpretation of what the AI understands the user's scenario to be."),
  simulationSummary: z.string().describe("A textual summary (3-5 sentences) of the overall simulated impact of the scenario over the given timeframe. Use Rupees (₹) for monetary values."),
  projectedOutcomes: z.array(ProjectedOutcomeSchema).describe("A list of 2-4 key projected outcomes or changes to financial metrics."),
  keyAssumptions: z.array(z.string()).describe("A list of 2-3 significant assumptions made by the AI during the simulation (e.g., 'Assumes consistent income and expense patterns unless specified in the scenario', 'Does not account for major unforeseen events or detailed investment returns unless part of the scenario description')."),
  thingsToConsider: z.array(z.string()).describe("A list of 2-3 related considerations, advice, or potential next steps for the user based on the simulation (e.g., 'This scenario could accelerate your path to X goal', 'Remember to adjust your budget to reflect these changes', 'Market conditions can affect investment-related scenarios').")
});
export type SimulateFinancialScenarioOutput = z.infer<typeof SimulateFinancialScenarioOutputSchema>;

export async function simulateFinancialScenario(input: SimulateFinancialScenarioInput): Promise<SimulateFinancialScenarioOutput> {
  return simulateFinancialScenarioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateFinancialScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: SimulateFinancialScenarioInputSchema},
  output: {schema: SimulateFinancialScenarioOutputSchema},
  prompt: `You are an expert financial planning assistant. Your task is to simulate a financial scenario described by the user and provide insights. Use the Indian Rupee symbol (₹) for ALL monetary values.

User's Current Financial Snapshot (approximate, if provided):
- Average Monthly Income: {{#if currentFinancials.averageMonthlyIncome}}₹{{{currentFinancials.averageMonthlyIncome}}}{{else}}Not specified{{/if}}
- Average Monthly Expenses: {{#if currentFinancials.averageMonthlyExpenses}}₹{{{currentFinancials.averageMonthlyExpenses}}}{{else}}Not specified{{/if}}
- Current Savings: {{#if currentFinancials.currentSavings}}₹{{{currentFinancials.currentSavings}}}{{else}}Not specified{{/if}}
- Current Debt: {{#if currentFinancials.currentDebt}}₹{{{currentFinancials.currentDebt}}}{{else}}Not specified{{/if}}

User's Scenario:
- Scenario Description: {{{scenarioDescription}}}
- Simulation Timeframe: {{{simulationTimeframe}}}

Based on this, please provide the following in the specified structured JSON format:

1.  **scenarioInterpretation**: Briefly re-state your understanding of the user's scenario in 1-2 sentences.
2.  **simulationSummary**: Provide a textual summary (3-5 sentences) of the overall simulated impact. Be realistic. If the scenario involves changes to income/spending, estimate the net effect.
3.  **projectedOutcomes**: Identify 2-4 key metrics that would change based on the scenario and timeframe. For each, provide:
    *   'metric': (e.g., 'Projected Savings after X years', 'Change in Monthly Cash Flow', 'Time to achieve Y goal').
    *   'value': The estimated value (e.g., '₹75,000', '+₹3,000/month', 'Approx. 18 months').
    *   'details': (optional) Brief context for the metric.
4.  **keyAssumptions**: List 2-3 important assumptions you made (e.g., "Assumes current income/expense levels remain constant outside of scenario changes," "Does not factor in inflation or detailed investment growth unless specified in scenario," "Assumes scenario changes are implemented immediately and consistently").
5.  **thingsToConsider**: List 2-3 relevant pieces of advice, considerations, or potential next steps for the user based on the simulation (e.g., "This path could significantly boost your emergency fund," "Remember to update your budget if you proceed with this change," "Consider the impact on your discretionary spending").

Focus on providing a qualitative but insightful simulation. You are not a financial calculator for precise figures but an assistant helping the user think through possibilities.
If the scenario is vague (e.g., "What if I get rich?"), interpret it reasonably (e.g., "Let's simulate a significant, sustained income increase of 50%...") or ask for clarification in your summary while still attempting a general projection.
Ensure all monetary values are in Rupees (₹).
Output should strictly follow the JSON schema provided for \`SimulateFinancialScenarioOutputSchema\`.
`,
});

const simulateFinancialScenarioFlow = ai.defineFlow(
  {
    name: 'simulateFinancialScenarioFlow',
    inputSchema: SimulateFinancialScenarioInputSchema,
    outputSchema: SimulateFinancialScenarioOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to generate a scenario simulation. The output was empty.");
    }
    // Basic validation
    if (!output.scenarioInterpretation || !output.simulationSummary || !output.projectedOutcomes || output.projectedOutcomes.length === 0 || !output.keyAssumptions || !output.thingsToConsider) {
      console.warn("AI output for scenario simulation might be missing key fields. Output:", JSON.stringify(output, null, 2));
    }
    return output;
  }
);
