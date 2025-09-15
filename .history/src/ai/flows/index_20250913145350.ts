/**
 * @fileOverview Barrel file for all AI flows.
 * This file re-exports all available flow functions.
 * Types should be imported directly from their respective flow files.
 */

export { analyzeSpendingInsights } from './analyze-spending-insights';
export { categorizeExpense } from './categorize-expense';
export { describeExpense } from './describe-expense';
export { predictFutureExpenses } from './predict-future-expenses';
// export { suggestFinancialGoals } from './suggest-financial-goals'; // Removed
export { simulateFinancialScenario } from './simulate-financial-scenario'; // Added
export { auditRecurringExpenses } from './audit-recurring-expenses'; // Added
export { parseBankStatement } from './parse-bank-statement'; // Added
