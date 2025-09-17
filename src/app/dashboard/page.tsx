"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, PiggyBank, BarChart3, PlusCircle, ArrowRight, Loader2, Repeat } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { type Transaction, getTransactions as fetchTransactionsService, deleteTransaction as deleteTransactionService } from "@/services/transactionService"; 
import { type Budget, getBudgets as fetchBudgetsService } from "@/services/budgetService"; 
import { useToast } from "@/hooks/use-toast";
import { TransactionDetailDialog } from "@/components/transactions/transaction-detail-dialog";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { collection, query, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Timestamp as FirestoreTimestamp } from "firebase/firestore";
import { DraggableAIChat } from "@/components/r3za-ai/draggable-ai-chat";

const GUEST_USER_ID = "GUEST_USER_ID";

interface BudgetGoalDisplay {
 category: string;
 spent: number; 
 allocated: number;
 progress: number;
 isCompleted?: boolean; 
}

interface SpendingByCategory {
  category: string;
  totalSpent: number;
}

const MAX_DESC_LENGTH = 35; 

const chartConfig = {
  totalSpent: {
    label: "Spent",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [liveBudgets, setLiveBudgets] = useState<Budget[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [transactionsInitialLoadDone, setTransactionsInitialLoadDone] = useState(false);
  const [budgetsInitialLoadDone, setBudgetsInitialLoadDone] = useState(false);

  const [summaryData, setSummaryData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    budgetProgress: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [budgetGoalsDisplay, setBudgetGoalsDisplay] = useState<BudgetGoalDisplay[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);

  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const processFetchedData = useCallback((transactions: Transaction[], budgets: Budget[]) => {
    try {
      if (!transactions || !budgets) {
          setSummaryData({ income: 0, expenses: 0, savings: 0, budgetProgress: 0 });
          setRecentTransactions([]);
          setBudgetGoalsDisplay([]);
          setSpendingByCategory([]);
          return;
      }

      const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(sortedTransactions.slice(0, 4));

      let income = 0;
      let expenses = 0;
      const categorySpending: Record<string, number> = {};

      transactions.forEach(t => {
        if (t.type === 'income') {
          income += t.amount;
        } else if (t.type === 'expense' || t.type === 'subscription') { // Subscriptions are expenses
           const absAmount = Math.abs(t.amount); 
           expenses += absAmount; 
           categorySpending[t.category] = (categorySpending[t.category] || 0) + absAmount;
        }
      });
      
      const spendingDataForChart: SpendingByCategory[] = Object.entries(categorySpending)
        .map(([category, totalSpent]) => ({ category, totalSpent }))
        .sort((a,b) => b.totalSpent - a.totalSpent);
      setSpendingByCategory(spendingDataForChart);

      let totalAllocatedBudget = 0;
      let totalEffectiveSpentOnBudgets = 0;

      const updatedBudgetGoalsDisplay = budgets.map(budget => {
        const effectiveSpent = budget.isCompleted ? budget.allocated : budget.spent;
        const progress = budget.allocated > 0 
          ? Math.min((effectiveSpent / budget.allocated) * 100, 100)
          : (effectiveSpent > 0 ? 100 : 0); 
        
        totalAllocatedBudget += budget.allocated;
        totalEffectiveSpentOnBudgets += effectiveSpent;
        
        return {
          category: budget.category,
          spent: effectiveSpent,
          allocated: budget.allocated,
          progress: parseFloat(progress.toFixed(0)),
          isCompleted: budget.isCompleted
        };
      });
      setBudgetGoalsDisplay(updatedBudgetGoalsDisplay);

      const overallBudgetProgress = totalAllocatedBudget > 0 
        ? Math.min((totalEffectiveSpentOnBudgets / totalAllocatedBudget) * 100, 100) 
        : 0;

      setSummaryData({
        income,
        expenses,
        savings: income - expenses,
        budgetProgress: parseFloat(overallBudgetProgress.toFixed(0)),
      });
    } catch (processingError: any) {
        console.error("Error processing dashboard data:", processingError);
        toast({ title: "Data Processing Error", description: "Could not process data for the dashboard.", variant: "destructive" });
        setSummaryData({ income: 0, expenses: 0, savings: 0, budgetProgress: 0 });
        setRecentTransactions([]);
        setBudgetGoalsDisplay([]);
        setSpendingByCategory([]);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (isGuest || user.uid === GUEST_USER_ID) {
      setIsLoadingData(true);
      const fetchDataForGuest = async () => {
        try {
          const [guestTransactions, guestBudgets] = await Promise.all([
            fetchTransactionsService(GUEST_USER_ID),
            fetchBudgetsService(GUEST_USER_ID)
          ]);
          setLiveTransactions(guestTransactions);
          setLiveBudgets(guestBudgets);
        } catch (error: any) {
          console.error("Dashboard: Error fetching guest data:", error);
          toast({ title: "Error", description: "Could not load guest data.", variant: "destructive" });
        } finally {
          setIsLoadingData(false); 
        }
      };
      fetchDataForGuest();
    } else {
      setIsLoadingData(true);
      setTransactionsInitialLoadDone(false);
      setBudgetsInitialLoadDone(false);

      const unsubscribes: Unsubscribe[] = [];

      const transactionsCol = collection(db, `users/${user.uid}/transactions`);
      const transactionsQuery = query(transactionsCol, orderBy("date", "desc"));
      unsubscribes.push(onSnapshot(transactionsQuery, (querySnapshot) => {
        const fetchedTransactions = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            date: (data.date as FirestoreTimestamp).toDate().toISOString().split('T')[0],
            description: data.description,
            category: data.category,
            amount: data.amount,
            type: data.type as "expense" | "income" | "subscription",
            payee: data.payee || "",
            createdAt: data.createdAt ? (data.createdAt as FirestoreTimestamp).toDate().toISOString() : undefined,
          } as Transaction;
        });
        setLiveTransactions(fetchedTransactions);
        setTransactionsInitialLoadDone(true);
      }, (error) => {
        console.error("Dashboard: Error fetching real-time transactions:", error);
        toast({ title: "Error", description: "Could not load transaction data in real-time.", variant: "destructive" });
        setTransactionsInitialLoadDone(true); 
      }));

      const budgetsCol = collection(db, `users/${user.uid}/budgets`);
      unsubscribes.push(onSnapshot(query(budgetsCol), (querySnapshot) => {
        const fetchedBudgets = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            category: data.category,
            allocated: data.allocated,
            spent: data.spent, 
            isCompleted: data.isCompleted || false,
            periodType: data.periodType || 'ongoing',
            startDate: data.startDate ? (data.startDate as FirestoreTimestamp).toDate().toISOString().split('T')[0] : undefined,
            endDate: data.endDate ? (data.endDate as FirestoreTimestamp).toDate().toISOString().split('T')[0] : undefined,
            createdAt: data.createdAt ? (data.createdAt as FirestoreTimestamp).toDate().toISOString() : undefined,
          } as Budget;
        });
        setLiveBudgets(fetchedBudgets);
        setBudgetsInitialLoadDone(true);
      }, (error) => {
        console.error("Dashboard: Error fetching real-time budgets:", error);
        toast({ title: "Error", description: "Could not load budget data in real-time.", variant: "destructive" });
        setBudgetsInitialLoadDone(true); 
      }));
      
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }
  }, [user, authLoading, isGuest, toast]); 

  useEffect(() => {
    if (isGuest) return; 

    if (transactionsInitialLoadDone && budgetsInitialLoadDone) {
      setIsLoadingData(false);
    }
  }, [transactionsInitialLoadDone, budgetsInitialLoadDone, isGuest]);

  useEffect(() => {
    if (!isLoadingData || isGuest) {
      processFetchedData(liveTransactions, liveBudgets);
    }
  }, [liveTransactions, liveBudgets, processFetchedData, isLoadingData, isGuest]);


  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransactionForDetail(transaction);
    setIsDetailDialogOpen(true);
  };

  const handleEditTransaction = (transactionId: string) => {
    router.push(`/transactions/edit/${transactionId}`);
    setIsDetailDialogOpen(false);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user || !user.uid) {
      toast({ title: "Auth Error", description: "Not logged in.", variant: "destructive"});
      return;
    }
    try {
      await deleteTransactionService(user.uid, transactionId);
      toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
      if (isGuest || user.uid === GUEST_USER_ID) {
          const updatedTransactions = await fetchTransactionsService(GUEST_USER_ID);
          setLiveTransactions(updatedTransactions); 
      }
    } catch (error: any) {
      toast({ title: "Delete Error", description: error.message || "Could not delete transaction.", variant: "destructive"});
    }
    setIsDetailDialogOpen(false);
  };

  if (authLoading || isLoadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
          <Button asChild className="rounded-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-[hsl(var(--primary-gradient-start))] to-[hsl(var(--primary-gradient-end))] text-primary-foreground">
            <Link href="/transactions/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Transaction
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              <div className="text-2xl font-bold">₹{summaryData.income.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              <div className="text-2xl font-bold">₹{summaryData.expenses.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
              <PiggyBank className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              <div className="text-2xl font-bold">₹{summaryData.savings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{summaryData.savings >= 0 ? "Positive cash flow" : "Negative cash flow"}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in" style={{animationDelay: '0.3s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-sm font-medium">Budget Progress</CardTitle>
              <BarChart3 className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              <div className="text-2xl font-bold">{summaryData.budgetProgress.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Overall budget utilization</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in overflow-hidden" style={{animationDelay: '0.4s'}}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Spending Overview</CardTitle>
              <CardDescription>Your spending breakdown by category (from transactions).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-[230px] sm:h-[300px] md:h-[350px] pt-4 px-4 pb-4 sm:px-6 sm:pb-6">
               {spendingByCategory.length > 0 ? (
                 <ChartContainer config={chartConfig} className="w-full flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendingByCategory} margin={{ top: 5, right: 0, left: -20, bottom: 40 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted-foreground/30"/>
                            <XAxis 
                                dataKey="category" 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8}
                                angle={-45}
                                textAnchor="end"
                                interval="preserveStartEnd"
                                height={40} 
                                tick={{ fontSize: 9, sm: {fontSize: 10}, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8} 
                                tickFormatter={(value) => `₹${value/1000}k`}
                                tick={{ fontSize: 9, sm: {fontSize: 10}, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <ChartTooltip 
                                cursor={false}
                                content={<ChartTooltipContent 
                                    labelFormatter={(label, payload) => {
                                      if (payload && payload.length > 0 && payload[0].payload.category) {
                                        return payload[0].payload.category;
                                      }
                                      return label;
                                    }}
                                    formatter={(value) => `₹${Number(value).toFixed(2)}`} 
                                    indicator="dot" 
                                />} 
                            />
                            <Bar dataKey="totalSpent" fill="var(--color-totalSpent)" radius={5} barSize={10} sm={{barSize: 15}} />
                        </BarChart>
                    </ResponsiveContainer>
                 </ChartContainer>
               ) : (
                <p className="text-muted-foreground h-full flex items-center justify-center">No spending data available for chart.</p>
               )}
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in overflow-hidden" style={{animationDelay: '0.5s'}}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activities.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              {recentTransactions.length > 0 ? (
                <ul className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <li 
                      key={transaction.id} 
                      className="flex justify-between items-center p-2 sm:p-3 bg-card hover:bg-muted/50 transition-colors rounded-lg shadow-sm cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTransactionClick(transaction)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-baseline min-w-0">
                          <span className="flex-shrink-0 whitespace-nowrap">{new Date(transaction.date).toLocaleDateString()} - {transaction.category}</span>
                           {transaction.type === 'subscription' && <Repeat className="h-3 w-3 text-blue-500 ml-1.5 flex-shrink-0" title="Subscription"/>}
                          {transaction.payee && (
                            <span className="ml-1 truncate inline-block max-w-[100px] sm:max-w-[150px]">
                              ({transaction.payee})
                            </span>
                          )}
                        </p>
                      </div>
                      <p className={`font-semibold ml-2 flex-shrink-0 ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.amount >= 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No recent transactions. <Link href="/transactions/new" className="text-primary hover:underline">Add one?</Link></p>
              )}
              {recentTransactions.length > 0 && ( 
                 <Button variant="outline" asChild className="mt-4 rounded-full w-full sm:w-auto">
                    <Link href="/transactions">
                        View all transactions <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                 </Button>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in" style={{animationDelay: '0.6s'}}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Budget Goals</CardTitle>
            <CardDescription>Track progress based on manually set spent amounts or completion status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
            {budgetGoalsDisplay.length > 0 ? budgetGoalsDisplay.map((goal, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium truncate">{goal.category}</span>
                  <span className="text-sm text-muted-foreground">
                    {goal.isCompleted 
                      ? `₹${goal.allocated.toFixed(2)} of ₹${goal.allocated.toFixed(2)} (Completed)` 
                      : `₹${goal.spent.toFixed(2)} / ₹${goal.allocated.toFixed(2)}`}
                  </span>
                </div>
                <Progress 
                  value={goal.progress} 
                  className={`h-3 ${goal.spent > goal.allocated && !goal.isCompleted ? "bg-destructive/70 [&>div]:bg-destructive" : (goal.isCompleted ? "bg-green-500/70 [&>div]:bg-green-500" : "")}`} 
                />
                 <div className="mt-1 flex justify-between text-xs">
                    <span className={`font-medium ${goal.spent > goal.allocated && !goal.isCompleted ? 'text-destructive' : (goal.isCompleted ? 'text-green-600' : 'text-muted-foreground')}`}>
                      {goal.isCompleted 
                        ? 'Completed' 
                        : (goal.spent > goal.allocated ? `Overspent by ₹${(goal.spent - goal.allocated).toFixed(2)}` : `₹${(goal.allocated - goal.spent).toFixed(2)} remaining`)}
                    </span>
                    <span className={`font-semibold ${goal.spent > goal.allocated && !goal.isCompleted ? 'text-destructive' : (goal.isCompleted ? 'text-green-600' : 'text-primary')}`}>{goal.progress.toFixed(0)}%</span>
                  </div>
              </div>
            )) : (
              <p className="text-muted-foreground">No budget goals set yet. <Link href="/budgets" className="text-primary hover:underline">Create one?</Link></p>
            )}
             <Button variant="outline" asChild className="mt-4 rounded-full w-full sm:w-auto">
                <Link href="/budgets">
                  Manage budgets <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
          </CardContent>
        </Card>
      </div>
      {selectedTransactionForDetail && (
        <TransactionDetailDialog
          transaction={selectedTransactionForDetail}
          isOpen={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}
      <DraggableAIChat />
    </AppLayout>
  );
}
