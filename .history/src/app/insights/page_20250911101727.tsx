
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, TrendingUp, Bot, Loader2, Sparkles, LogIn, Info, Database, TrendingDown, ThumbsUp, CheckCircle, IndianRupee, AlertTriangle, ListChecks, Landmark, Rocket, ShieldAlert, PiggyBank, CalendarCheck, Calculator, Receipt, Search, Clock } from "lucide-react"; 
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth"; 
import { analyzeSpendingInsights, predictFutureExpenses, simulateFinancialScenario, auditRecurringExpenses, analyzeExpensesAdvanced } from "@/ai/flows";
import type { AnalyzeSpendingInsightsInput, AnalyzeSpendingInsightsOutput } from "@/ai/flows/analyze-spending-insights";
import type { PredictFutureExpensesInput, PredictFutureExpensesOutput } from "@/ai/flows/predict-future-expenses";
import type { SimulateFinancialScenarioInput, SimulateFinancialScenarioOutput } from "@/ai/flows/simulate-financial-scenario";
import type { AuditRecurringExpensesInput, AuditRecurringExpensesOutput, IdentifiedRecurringExpense, TransactionForAudit } from "@/ai/flows/audit-recurring-expenses";
import type { AdvancedExpenseAnalysisInput, AdvancedExpenseAnalysisOutput } from "@/ai/flows/analyze-expenses-advanced";

import { getTransactions, type Transaction } from "@/services/transactionService";
import { getBudgets, type Budget } from "@/services/budgetService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FaqSection } from "@/components/common/faq-section";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, parseISO } from "date-fns";

const GUEST_USER_ID = "GUEST_USER_ID";

interface AggregatedCategoryData {
  category: string;
  amount: number;
}

type ExpensePredictionResultState = PredictFutureExpensesOutput & { predictionTimeframe?: string } | null;
type ScenarioSimulationResultState = SimulateFinancialScenarioOutput | null;
type RecurringExpenseAuditResultState = AuditRecurringExpensesOutput | null;


const insightsFaqs = [
  {
    question: "What kind of AI insights can I get?",
    answer: (
      <>
        <p>FinanceFlow offers several AI-powered insights (available to logged-in users and guests with local data):</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Spending Analysis:</strong> Get a detailed breakdown of your spending, areas for improvement, positive habits, and actionable tips. Requires your monthly income.</li>
          <li><strong>Future Expense Prediction:</strong> Get an AI-generated forecast of your expenses for a chosen timeframe, including category breakdown and key influencing factors.</li>
          <li><strong>Financial Scenario Simulator:</strong> Describe a financial change (e.g., "What if I save ₹X more per month?") and see the AI's projection of its impact over time.</li>
          <li><strong>Subscription & Recurring Expense Auditor:</strong> Let the AI scan your expenses to find potential recurring payments and subscriptions you might want to review. It pays attention to common service providers in the payee field.</li>
        </ul>
      </>
    ),
  },
  {
    question: "What data is used for AI analysis?",
    answer: "The AI features use your logged transaction data (both income and expenses, including payee information) and your set budget goals. For specific features, you may be asked for additional details like monthly income or savings. If you're in Guest Mode, data from your browser's local storage is used. If logged in, your cloud-saved data is used.",
  },
  {
    question: "How does the Financial Scenario Simulator work?",
    answer: "Go to the 'Financial Scenario Simulator' section. Provide a brief summary of your current financial situation (optional, but helpful for context), describe the scenario you want to simulate (e.g., 'What if I invest an extra ₹5000 monthly?'), and set a timeframe. The AI will then project potential outcomes and considerations.",
  },
   {
    question: "How does the Subscription Auditor work?",
    answer: "Expand the 'Subscription & Recurring Expense Auditor' section and click 'Audit My Expenses'. The AI will analyze your past expense transactions (typically the last 6-12 months of data is most relevant), including payee information, to identify patterns that suggest recurring payments. It will then list them for your review.",
  },
  {
    question: "What if I don't have enough data for AI insights?",
    answer: "If you lack sufficient transaction or budget data, the AI tools might not be able to generate meaningful insights or might provide very general advice. The page will display alerts if necessary data is missing. More historical data generally leads to better and more personalized AI results.",
  },
];


export default function InsightsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading, isGuest } = useAuth(); 

  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userBudgets, setUserBudgets] = useState<Budget[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Spending Analysis States
  const [incomeForAnalysis, setIncomeForAnalysis] = useState<number | undefined>(undefined);
  const [spendingAnalysisResult, setSpendingAnalysisResult] = useState<AnalyzeSpendingInsightsOutput | null>(null);

  // Expense Prediction States
  const [predictionTimeframe, setPredictionTimeframe] = useState<string>("next month");
  const [expensePredictionResult, setExpensePredictionResult] = useState<ExpensePredictionResultState>(null); 

  // Financial Scenario Simulator States
  const [scenarioDescription, setScenarioDescription] = useState<string>("");
  const [simulationTimeframe, setSimulationTimeframe] = useState<string>("1 year");
  const [simCurrentIncome, setSimCurrentIncome] = useState<string>("");
  const [simCurrentExpenses, setSimCurrentExpenses] = useState<string>("");
  const [simCurrentSavings, setSimCurrentSavings] = useState<string>("");
  const [simCurrentDebt, setSimCurrentDebt] = useState<string>("");
  const [scenarioSimulationResult, setScenarioSimulationResult] = useState<ScenarioSimulationResultState>(null);

  // Subscription Auditor States
  const [recurringExpenseAuditResult, setRecurringExpenseAuditResult] = useState<RecurringExpenseAuditResultState>(null);

  // Advanced Analysis - Enhanced subscription detection and reminders
  const [advancedAnalysisResult, setAdvancedAnalysisResult] = useState<AdvancedExpenseAnalysisOutput | null>(null);

  const [loadingStates, setLoadingStates] = useState({
    spending: false,
    prediction: false,
    scenario: false, 
    audit: false,    
  });

  const fetchDataForUser = useCallback(async (currentUserId: string) => {
    setIsDataLoading(true);
    try {
      const [transactions, budgets] = await Promise.all([
        getTransactions(currentUserId), 
        getBudgets(currentUserId)       
      ]);
      setUserTransactions(transactions);
      setUserBudgets(budgets);
    } catch (error) {
      console.error("Error fetching data for insights:", error);
      toast({ title: "Data Fetch Error", description: "Could not load your financial data for AI analysis.", variant: "destructive" });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return; 

    if (user && user.uid) { 
        fetchDataForUser(user.uid); 
    } else { 
        setIsDataLoading(false);
        setUserTransactions([]);
        setUserBudgets([]);
    }
  }, [user, authLoading, fetchDataForUser]);


  const fetchSpendingInsights = async () => {
    if (!user) { 
      toast({ title: "Access Denied", description: "Please log in or use Guest Mode to access AI insights.", variant: "destructive" });
      return;
    }
    if (incomeForAnalysis === undefined || incomeForAnalysis <= 0) {
      toast({ title: "Input Required", description: "Please enter a valid monthly income.", variant: "destructive" });
      return;
    }
     if (userTransactions.filter(t => t.type === 'expense').length === 0) {
      toast({ title: "No Expense Data", description: "Please add some expense transactions to analyze spending.", variant: "destructive" });
      return;
    }

    setLoadingStates(prev => ({ ...prev, spending: true }));
    setSpendingAnalysisResult(null);
    try {
      const expensesForAnalysisInput: AggregatedCategoryData[] = userTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const existing = acc.find(item => item.category === t.category);
          if (existing) {
            existing.amount += Math.abs(t.amount);
          } else {
            acc.push({ category: t.category, amount: Math.abs(t.amount) });
          }
          return acc;
        }, [] as AggregatedCategoryData[]);

      const budgetGoalsForAnalysisInput: AggregatedCategoryData[] = userBudgets.map(b => ({
        category: b.category,
        amount: b.allocated
      }));
      
      const input: AnalyzeSpendingInsightsInput = {
        income: incomeForAnalysis,
        expenses: expensesForAnalysisInput, 
        budgetGoals: budgetGoalsForAnalysisInput, 
      };
      const result = await analyzeSpendingInsights(input);
      setSpendingAnalysisResult(result);
      toast({ title: "Spending Insights Generated!" });
    } catch (error: any) {
      console.error("Error fetching spending insights:", error);
      toast({ title: "Error", description: error.message || "Could not generate spending insights.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, spending: false }));
    }
  };

  const fetchExpensePrediction = async () => {
    if (!user) {
       toast({ title: "Access Denied", description: "Please log in or use Guest Mode to predict future expenses.", variant: "destructive" });
      return;
    }
    const pastExpenses = userTransactions.filter(t => t.type === 'expense');
    if (pastExpenses.length < 3) { 
      toast({ title: "Insufficient Data", description: "Please add more expense transactions (at least 3) for a more reliable future expense prediction.", variant: "destructive" });
      return;
    }

    setLoadingStates(prev => ({ ...prev, prediction: true }));
    setExpensePredictionResult(null); 
    try {
      const pastSpendingDataForFlow = pastExpenses.map(t => ({
        date: t.date,
        category: t.category,
        amount: Math.abs(t.amount), 
        description: t.description,
        payee: t.payee || "",
      }));

      const input: PredictFutureExpensesInput = {
        pastSpendingData: JSON.stringify(pastSpendingDataForFlow), 
        predictionTimeframe: predictionTimeframe,
      };
      const flowResult: PredictFutureExpensesOutput = await predictFutureExpenses(input);
      setExpensePredictionResult({ ...flowResult, predictionTimeframe: input.predictionTimeframe });
      toast({ title: "Expense Prediction Ready!" });
    } catch (error: any) {
      console.error("Error fetching expense prediction:", error);
      toast({ title: "Error", description: error.message || "Could not predict future expenses.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, prediction: false }));
    }
  };
  
  const fetchScenarioSimulation = async () => {
    if (!user) {
      toast({ title: "Access Denied", description: "Please log in or use Guest Mode for scenario simulation.", variant: "destructive" });
      return;
    }
    if (!scenarioDescription.trim()) {
      toast({ title: "Input Required", description: "Please describe the scenario you want to simulate.", variant: "destructive" });
      return;
    }
    if (!simulationTimeframe.trim()) {
      toast({ title: "Input Required", description: "Please specify a timeframe for the simulation.", variant: "destructive" });
      return;
    }

    setLoadingStates(prev => ({ ...prev, scenario: true }));
    setScenarioSimulationResult(null);

    const incomeTx = userTransactions.filter(t => t.type === 'income');
    const expenseTx = userTransactions.filter(t => t.type === 'expense');
    const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const uniqueMonthsWithData = new Set(userTransactions.map(t => t.date.substring(0,7))).size;
    const avgMonthlyIncome = uniqueMonthsWithData > 0 ? totalIncome / uniqueMonthsWithData : undefined;
    const avgMonthlyExpenses = uniqueMonthsWithData > 0 ? totalExpenses / uniqueMonthsWithData : undefined;


    try {
      const input: SimulateFinancialScenarioInput = {
        currentFinancials: {
          averageMonthlyIncome: simCurrentIncome ? parseFloat(simCurrentIncome) : avgMonthlyIncome,
          averageMonthlyExpenses: simCurrentExpenses ? parseFloat(simCurrentExpenses) : avgMonthlyExpenses,
          currentSavings: simCurrentSavings ? parseFloat(simCurrentSavings) : undefined,
          currentDebt: simCurrentDebt ? parseFloat(simCurrentDebt) : undefined,
        },
        scenarioDescription: scenarioDescription,
        simulationTimeframe: simulationTimeframe,
      };
      const result = await simulateFinancialScenario(input);
      setScenarioSimulationResult(result);
      toast({ title: "Scenario Simulation Complete!" });
    } catch (error: any) {
      console.error("Error fetching scenario simulation:", error);
      toast({ title: "Error", description: error.message || "Could not simulate scenario.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, scenario: false }));
    }
  };

  const fetchRecurringExpenseAudit = async () => {
    if (!user) {
      toast({ title: "Access Denied", description: "Please log in or use Guest Mode for expense audit.", variant: "destructive" });
      return;
    }
    const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
    const relevantTransactions: TransactionForAudit[] = userTransactions
      .filter(t => (t.type === 'expense' || t.type === 'subscription') && t.date >= sixMonthsAgo)
      .map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount, 
          category: t.category,
          payee: t.payee || "",
          type: t.type, // Ensure 'type' is included
      }));

    if (relevantTransactions.length === 0) {
      toast({ title: "Insufficient Data", description: "No expense or subscription transactions found in the last 6 months to audit.", variant: "default" });
      setRecurringExpenseAuditResult({ auditSummary: "No relevant transactions found.", identifiedExpenses: [], generalTip: "Add more expense or subscription transactions."});
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, audit: true }));
    setRecurringExpenseAuditResult(null);
    try {
      const input: AuditRecurringExpensesInput = { transactions: relevantTransactions };
      const result = await auditRecurringExpenses(input);
      setRecurringExpenseAuditResult(result);
      if (result.identifiedExpenses.length > 0 || result.auditSummary) {
          toast({ title: "Expense Audit Complete!" });
      } else {
          toast({ title: "Audit Returned No Data", description: "The AI analysis didn't identify specific recurring expenses or provide a summary.", variant: "default" });
      }
    } catch (error: any) {
      console.error("Error fetching recurring expense audit:", error);
      toast({ title: "Error", description: error.message || "Could not audit expenses.", variant: "destructive" });
      setRecurringExpenseAuditResult({ auditSummary: "Error during audit.", identifiedExpenses: [], generalTip: "An error occurred while processing your expenses." });
    } finally {
      setLoadingStates(prev => ({ ...prev, audit: false }));
    }
  };


  if (authLoading || (user && isDataLoading)) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-150px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const hasExpenseTransactions = userTransactions.some(t => t.type === 'expense');
  const hasExpenseOrSubscriptionTransactions = userTransactions.some(t => t.type === 'expense' || t.type === 'subscription');
  const hasTransactions = userTransactions.length > 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">AI Financial Insights</h1>
           <Bot className="h-10 w-10 text-primary" />
        </div>
        
        {!user ? ( 
          <Card className="shadow-lg rounded-xl animate-fade-in text-center py-12">
            <CardHeader>
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Unlock Your Financial Potential</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Sign in or create an account to securely save your data and access AI-driven financial insights. Or, try our features in Guest Mode!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                    <Link href="/login">
                    <LogIn className="mr-2 h-5 w-5" /> Sign In / Sign Up
                    </Link>
                </Button>
                <Button variant="outline" onClick={() => { const { enterGuestMode } = useAuth(); enterGuestMode(); }} className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                    <Database className="mr-2 h-5 w-5" /> Try in Guest Mode
                </Button>
              </div>
            </CardContent>
            <CardDescription className="mt-4 text-xs">
              Gain deeper understanding and control over your finances with FinanceFlow.
            </CardDescription>
          </Card>
        ) : (
          <>
            <p className="text-muted-foreground text-lg">
              {isGuest 
                ? "You're in Guest Mode. Insights are based on your locally stored data." 
                : "Unlock powerful insights with our AI-driven tools."
              } Your transaction and budget data is used automatically where relevant.
            </p>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {/* Spending Analysis */}
              <AccordionItem value="item-1" className="bg-card rounded-xl shadow-lg border-none animate-fade-in">
                <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-6 w-6 text-primary" /> Spending Analysis
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Enter your monthly income. Your recorded expense transactions and budget goals will be used for analysis.
                  </p>
                  <div>
                    <Label htmlFor="incomeAnalysis">Monthly Income (₹)</Label>
                    <Input 
                      id="incomeAnalysis" 
                      type="number" 
                      value={incomeForAnalysis === undefined ? "" : incomeForAnalysis} 
                      onChange={(e) => setIncomeForAnalysis(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                      placeholder="e.g., 50000"
                      className="rounded-full mt-1"
                    />
                  </div>
                   {!hasExpenseTransactions && (
                    <Alert variant="default" className="mt-2">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No Expense Data</AlertTitle>
                      <AlertDescription>
                        You don't have any expense transactions recorded. <Link href="/transactions/new" className="font-semibold text-primary hover:underline">Add expenses</Link> to enable spending analysis.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button onClick={fetchSpendingInsights} disabled={loadingStates.spending || incomeForAnalysis === undefined || incomeForAnalysis <= 0 || !hasExpenseTransactions} className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                    {loadingStates.spending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analyze My Spending
                  </Button>
                  
                  {spendingAnalysisResult && (
                    <div className="mt-6 space-y-6">
                      <Card className="bg-background/30 dark:bg-card/50">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" />Overall Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm prose dark:prose-invert max-w-none">
                          <p>{spendingAnalysisResult.overallSummary}</p>
                        </CardContent>
                      </Card>

                      {spendingAnalysisResult.areasForImprovement && spendingAnalysisResult.areasForImprovement.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><TrendingDown className="mr-2 h-5 w-5 text-destructive" />Areas for Improvement</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {spendingAnalysisResult.areasForImprovement.map((area, index) => (
                              <Card key={index} className="bg-card/70 dark:bg-background/40 p-3 shadow-sm rounded-lg">
                                <CardHeader className="p-0 pb-1 mb-1">
                                  <CardTitle className="text-md font-semibold flex items-center">
                                    <Badge variant="outline" className="mr-2 rounded-full border-destructive/50 text-destructive">{area.category}</Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 text-sm">
                                  <p className="text-muted-foreground">{area.suggestion}</p>
                                  {area.potentialSavings !== undefined && area.potentialSavings > 0 && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium flex items-center">
                                      <IndianRupee className="mr-0.5 h-3 w-3"/> Potential Savings: ₹{area.potentialSavings.toFixed(2)}/month
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {spendingAnalysisResult.positiveHabits && spendingAnalysisResult.positiveHabits.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><ThumbsUp className="mr-2 h-5 w-5 text-green-500" />Positive Habits</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {spendingAnalysisResult.positiveHabits.map((habit, index) => <li key={index}>{habit}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {spendingAnalysisResult.actionableTips && spendingAnalysisResult.actionableTips.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                           <CardHeader>
                            <CardTitle className="text-xl flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-accent" />Actionable Tips</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {spendingAnalysisResult.actionableTips.map((tip, index) => <li key={index}>{tip}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              
              {/* Future Expense Prediction */}
              <AccordionItem value="item-3" className="bg-card rounded-xl shadow-lg border-none animate-fade-in" style={{animationDelay: '0.2s'}}>
                <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" /> Future Expense Prediction
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Select a timeframe. Your past expense transaction history (including payees) will be used for prediction. More data leads to better accuracy.
                  </p>
                  <div>
                    <Label htmlFor="predictionTimeframe">Prediction Timeframe</Label>
                    <Input id="predictionTimeframe" value={predictionTimeframe} onChange={(e) => setPredictionTimeframe(e.target.value)} placeholder="e.g., next month, next 3 months" className="rounded-full mt-1"/>
                  </div>
                   {!hasExpenseTransactions && (
                     <Alert variant="default" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Expense Data</AlertTitle>
                        <AlertDescription>
                            You don't have any expense transactions recorded. <Link href="/transactions/new" className="font-semibold text-primary hover:underline">Add expenses</Link> to enable future expense prediction.
                        </AlertDescription>
                    </Alert>
                  )}
                  <Button onClick={fetchExpensePrediction} disabled={loadingStates.prediction || !hasExpenseTransactions} className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                    {loadingStates.prediction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Predict Expenses
                  </Button>
                  
                  {expensePredictionResult && (
                    <div className="mt-6 space-y-6">
                      <Card className="bg-background/30 dark:bg-card/50">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" />Prediction Summary ({expensePredictionResult.predictionTimeframe})</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm prose dark:prose-invert max-w-none">
                          <p>{expensePredictionResult.predictionSummary}</p>
                          <p className="mt-2"><strong>Total Predicted Expenses:</strong> <span className="font-semibold text-primary">₹{expensePredictionResult.totalPredictedAmount.toFixed(2)}</span></p>
                          <p><strong>Confidence Level:</strong> <Badge variant="outline" className="rounded-full">{expensePredictionResult.confidenceLevel}</Badge></p>
                        </CardContent>
                      </Card>

                      {expensePredictionResult.predictedExpenses && expensePredictionResult.predictedExpenses.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary-focus" />Predicted Expenses by Category</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {expensePredictionResult.predictedExpenses.map((item, index) => (
                              <Card key={index} className="bg-card/70 dark:bg-background/40 p-3 shadow-sm rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-foreground">{item.category}</span>
                                  <span className="text-primary font-medium">₹{item.predictedAmount.toFixed(2)}</span>
                                </div>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {expensePredictionResult.keyFactors && expensePredictionResult.keyFactors.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-blue-500" />Key Influencing Factors</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {expensePredictionResult.keyFactors.map((factor, index) => <li key={index}>{factor}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {expensePredictionResult.potentialVariances && expensePredictionResult.potentialVariances.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                           <CardHeader>
                            <CardTitle className="text-xl flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-amber-500" />Potential Variances & Caveats</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {expensePredictionResult.potentialVariances.map((variance, index) => <li key={index}>{variance}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Financial Scenario Simulator */}
              <AccordionItem value="item-4" className="bg-card rounded-xl shadow-lg border-none animate-fade-in" style={{animationDelay: '0.3s'}}>
                <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-6 w-6 text-primary" /> Financial Scenario Simulator
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Describe a financial change or "what-if" scenario. Optionally, provide current financial context if different from your overall averages. AI will use your transaction data if context isn't provided.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="scenarioDescription">Scenario Description</Label>
                    <Textarea 
                      id="scenarioDescription" 
                      value={scenarioDescription} 
                      onChange={(e) => setScenarioDescription(e.target.value)} 
                      placeholder="e.g., What if I save an extra ₹3000 per month? / What if my rent increases by 10%?"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="simulationTimeframe">Simulation Timeframe</Label>
                      <Input id="simulationTimeframe" value={simulationTimeframe} onChange={(e) => setSimulationTimeframe(e.target.value)} placeholder="e.g., 1 year, 5 years" className="rounded-full mt-1"/>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Optional: Provide specific current financial figures for this simulation if they differ from your general transaction data averages.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="simCurrentIncome">Avg. Monthly Income (₹)</Label>
                      <Input id="simCurrentIncome" type="number" value={simCurrentIncome} onChange={(e) => setSimCurrentIncome(e.target.value)} placeholder="e.g., 60000" className="rounded-full mt-1"/>
                    </div>
                     <div>
                      <Label htmlFor="simCurrentExpenses">Avg. Monthly Expenses (₹)</Label>
                      <Input id="simCurrentExpenses" type="number" value={simCurrentExpenses} onChange={(e) => setSimCurrentExpenses(e.target.value)} placeholder="e.g., 40000" className="rounded-full mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="simCurrentSavings">Current Savings (₹)</Label>
                      <Input id="simCurrentSavings" type="number" value={simCurrentSavings} onChange={(e) => setSimCurrentSavings(e.target.value)} placeholder="e.g., 100000" className="rounded-full mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="simCurrentDebt">Current Debt (₹, excl. mortgage)</Label>
                      <Input id="simCurrentDebt" type="number" value={simCurrentDebt} onChange={(e) => setSimCurrentDebt(e.target.value)} placeholder="e.g., 25000" className="rounded-full mt-1"/>
                    </div>
                  </div>
                   {!hasTransactions && (
                     <Alert variant="default" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Transaction Data</AlertTitle>
                        <AlertDescription>
                            Simulations are more accurate with transaction data. <Link href="/transactions/new" className="font-semibold text-primary hover:underline">Add transactions</Link>. If not, ensure to provide detailed current financial context above.
                        </AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    onClick={fetchScenarioSimulation} 
                    disabled={loadingStates.scenario || !scenarioDescription.trim() || !simulationTimeframe.trim()} 
                    className="rounded-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    {loadingStates.scenario ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Simulate Scenario
                  </Button>
                  
                  {scenarioSimulationResult && (
                    <div className="mt-6 space-y-6">
                      <Card className="bg-background/30 dark:bg-card/50">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center"><Calculator className="mr-2 h-5 w-5 text-primary" />Scenario Interpretation & Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm prose dark:prose-invert max-w-none space-y-2">
                          <p><strong>Your Scenario:</strong> {scenarioSimulationResult.scenarioInterpretation}</p>
                          <p><strong>AI Summary:</strong> {scenarioSimulationResult.simulationSummary}</p>
                        </CardContent>
                      </Card>

                      {scenarioSimulationResult.projectedOutcomes && scenarioSimulationResult.projectedOutcomes.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-green-500" />Projected Outcomes</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {scenarioSimulationResult.projectedOutcomes.map((outcome, index) => (
                              <Card key={index} className="bg-card/70 dark:bg-background/40 p-3 shadow-sm rounded-lg">
                                <CardHeader className="p-0 pb-1 mb-1">
                                  <CardTitle className="text-md font-semibold">{outcome.metric}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 text-sm">
                                  <p className="font-medium text-primary">{outcome.value}</p>
                                  {outcome.details && <p className="text-xs text-muted-foreground mt-0.5">{outcome.details}</p>}
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {scenarioSimulationResult.keyAssumptions && scenarioSimulationResult.keyAssumptions.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><Info className="mr-2 h-5 w-5 text-blue-500" />Key Assumptions Made</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {scenarioSimulationResult.keyAssumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                       {scenarioSimulationResult.thingsToConsider && scenarioSimulationResult.thingsToConsider.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-accent" />Things to Consider</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                              {scenarioSimulationResult.thingsToConsider.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Subscription & Recurring Expense Auditor */}
              <AccordionItem value="item-5" className="bg-card rounded-xl shadow-lg border-none animate-fade-in" style={{animationDelay: '0.4s'}}>
                <AccordionTrigger className="hover:no-underline px-6 py-4 text-lg font-semibold rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-6 w-6 text-primary" /> Subscription & Recurring Expense Auditor
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                  <p className="text-muted-foreground">
                    Let AI scan your expense history (typically last 6-12 months, including payee names) to find potential recurring payments and subscriptions you might want to review.
                  </p>
                  {!hasExpenseOrSubscriptionTransactions && (
                     <Alert variant="default" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Expense/Subscription Data</AlertTitle>
                        <AlertDescription>
                           You don't have any expense or subscription transactions recorded. <Link href="/transactions/new" className="font-semibold text-primary hover:underline">Add some</Link> to enable the audit.
                        </AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    onClick={fetchRecurringExpenseAudit} 
                    disabled={loadingStates.audit || !hasExpenseOrSubscriptionTransactions} 
                    className="rounded-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    {loadingStates.audit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Audit My Expenses
                  </Button>
                  
                  {recurringExpenseAuditResult && (
                    <div className="mt-6 space-y-6">
                      <Card className="bg-background/30 dark:bg-card/50">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center"><Receipt className="mr-2 h-5 w-5 text-primary" />Audit Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm prose dark:prose-invert max-w-none space-y-2">
                          <p>{recurringExpenseAuditResult.auditSummary}</p>
                          {recurringExpenseAuditResult.generalTip && <p className="text-xs italic text-muted-foreground"><strong>Quick Tip:</strong> {recurringExpenseAuditResult.generalTip}</p>}
                        </CardContent>
                      </Card>

                      {recurringExpenseAuditResult.identifiedExpenses && recurringExpenseAuditResult.identifiedExpenses.length > 0 && (
                        <Card className="bg-background/30 dark:bg-card/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-blue-500" />Identified Recurring Expenses</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {recurringExpenseAuditResult.identifiedExpenses.map((expense, index) => (
                              <Card key={index} className="bg-card/70 dark:bg-background/40 p-3 shadow-sm rounded-lg">
                                <CardHeader className="p-0 pb-1 mb-1">
                                  <CardTitle className="text-md font-semibold flex justify-between items-center">
                                    {expense.likelyServiceName}
                                    <Badge variant="secondary" className="rounded-full">₹{expense.estimatedMonthlyCost.toFixed(2)}/mo</Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 text-sm space-y-1">
                                  <p className="text-muted-foreground"><strong className="text-foreground/80">Suggestion:</strong> {expense.suggestion}</p>
                                  {expense.lastPaymentDate && <p className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3 mr-1"/>Last payment found: {format(parseISO(expense.lastPaymentDate), "dd MMM yyyy")}</p>}
                                  {expense.transactionExamples && expense.transactionExamples.length > 0 && (
                                    <div className="text-xs text-muted-foreground/80">
                                      Examples: {expense.transactionExamples.join("; ")}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                       {recurringExpenseAuditResult.identifiedExpenses && recurringExpenseAuditResult.identifiedExpenses.length === 0 && (
                           <p className="text-muted-foreground text-center py-4">No obvious recurring expenses found in the recent transaction data.</p>
                       )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>


            </Accordion>
          </>
        )}
        <FaqSection items={insightsFaqs} />
      </div>
    </AppLayout>
  );
}
