
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Edit2, Trash2, AlertTriangle, Loader2, CheckCircle2, CalendarDays, CalendarRange, ListChecks, Sparkles, IndianRupee, Repeat, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { addBudget as addBudgetService, updateBudget as updateBudgetService, deleteBudget as deleteBudgetService, getBudgets as fetchBudgetsService, type Budget, type NewBudgetData, type UpdateBudgetData, type BudgetPeriodType, getCurrentMonthValue, getCurrentYearValue } from "@/services/budgetService"; 
import { getTransactions as fetchTransactionsService, type Transaction as ExpenseTransaction } from "@/services/transactionService"; 
import { auditRecurringExpenses } from "@/ai/flows";
import type { AuditRecurringExpensesInput } from "@/ai/flows/audit-recurring-expenses";
import { detectSubscriptionsFromTransactions, createBudgetsForSubscriptions, type DetectedSubscription, type SubscriptionDetectionResult } from "@/lib/subscriptionDetection";
import { collection, query, onSnapshot, Unsubscribe } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import type { Timestamp as FirestoreTimestamp } from "firebase/firestore";
import { FaqSection } from "@/components/common/faq-section";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isValid as isValidDateFn, formatISO, subMonths, getYear as dateFnsGetYear, getMonth as dateFnsGetMonth } from "date-fns";

const GUEST_USER_ID = "GUEST_USER_ID";

interface IdentifiedRecurringExpense {
  likelyServiceName: string;
  estimatedMonthlyCost: number;
  lastPaymentDate?: string;
  transactionExamples: string[];
  suggestion: string;
}

interface DisplayBudget extends Budget {
  calculatedTransactionSpent: number; 
  progress: number;
  isEffectivelyComplete: boolean;
  isOverspent: boolean;
  periodDisplay: string;
  trackedPeriodDescription: string;
  displayStatusText: string; // e.g., "₹50 spent of ₹100"
  remainingText: string;     // e.g., "₹50 remaining", "Overspent by ₹10", "Completed"
}

const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString().padStart(2, '0'), // "01", "02", ...
  label: format(new Date(0, i), 'MMMM')
}));

const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => (currentYear - 5 + i).toString());
};


const budgetFaqs = [
  {
    question: "What is a budget?",
    answer: "A budget is a plan for how you'll spend your money. You set an allocated amount for different categories (e.g., Groceries, Rent) for a specific period, and FinanceFlow helps you track your actual spending against these goals.",
  },
  {
    question: "How do I create a new budget?",
    answer: "Click the 'Set New Budget' button. You'll provide a category name, allocated amount, choose a budget period, and optionally enter a manual spent amount.",
  },
  {
    question: "What is the Subscription Budget Helper?",
    answer: "Click the 'Subscription Budget Helper' button. The AI will scan your recent expense transactions (last 6-12 months) to find potential recurring subscriptions. You can then review this list and easily add any identified subscription as a new monthly budget by clicking 'Add as Budget' next to it. The budget form will be pre-filled for your convenience.",
  },
  {
    question: "How is the 'Manual Spent' amount used for the progress bar?",
    answer: (
      <>
        <p>The 'Manual Spent' amount you enter in the budget dialog primarily drives the progress bar, especially for 'Ongoing', 'Monthly (Specific)', 'Yearly (Specific)', and 'Custom Dates' budgets. It also influences 'Recurring' budgets if it meets or exceeds the allocated amount.</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>If 'Manual Spent' equals or exceeds the 'Allocated Amount', the progress bar will show 100% and the status as 'Target Met', regardless of the 'Mark as Complete' checkbox.</li>
          <li>If 'Mark as Complete' is checked, the progress always shows 100% as 'Completed'.</li>
          <li>The 'Manual Spent' amount is NOT automatically reset by the system for any budget type.</li>
        </ul>
      </>
    ),
  },
   {
    question: "How does the progress bar work for 'Recurring Monthly/Yearly' budgets?",
    answer: (
      <>
        <p>For 'Recurring Monthly' and 'Recurring Yearly' budgets, the progress bar's behavior is more dynamic:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>If the budget is NOT 'Marked as Complete' AND the 'Manual Spent' amount has NOT yet met or exceeded the 'Allocated Amount', the progress bar will primarily reflect the total of relevant expense/subscription transactions logged for the <strong>current calendar month/year</strong>. This creates a visual "reset" at the start of each new period based on actual transactions.</li>
          <li>If 'Manual Spent' meets/exceeds 'Allocated Amount', OR if 'Mark as Complete' is checked, the progress will show 100%.</li>
        </ul>
        <p className="mt-2">The 'Manual Spent' value itself is not reset by the system. The 'Tracked from transactions' figure (shown below the progress bar) always reflects current period spending for these types.</p>
      </>
    )
  },
  {
    question: "What does the 'Tracked from transactions' amount show?",
    answer: (
      <>
        <p>This figure shows the sum of actual expense/subscription transactions logged in the app that match the budget's category, specifically for the budget's active period:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>Recurring Monthly:</strong> Shows transactions from the current calendar month.</li>
          <li><strong>Recurring Yearly:</strong> Shows transactions from the current calendar year.</li>
          <li><strong>Monthly (Specific):</strong> Shows transactions from the selected specific month and year (e.g., July 2024).</li>
          <li><strong>Yearly (Specific):</strong> Shows transactions from the selected specific year (e.g., 2024).</li>
          <li><strong>Custom Dates:</strong> Shows transactions within the defined custom start and end dates.</li>
          <li><strong>Ongoing:</strong> Shows the total of all transactions ever logged for that category.</li>
        </ul>
        <p className="mt-2">This provides a dynamic view of your spending from actual transactions for the relevant period, separate from the manually set 'spent' amount or current period transaction tracking that drives the progress bar.</p>
      </>
    )
  },
  {
    question: "What does the 'Mark as Complete' checkbox do?",
    answer: "Ticking this checkbox will definitively mark the budget as 100% complete ('Completed' status), overriding other calculations for progress display. The progress bar will show full, and remaining will be zero.",
  },
   {
    question: "What are the different Budget Periods?",
    answer: (
      <>
        <p>Choose a period type that best suits your budget:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>Recurring Monthly:</strong> A budget that applies every calendar month (e.g., ₹500 for Groceries each month). 'Tracked from transactions' will show spending for the current month.</li>
          <li><strong>Recurring Yearly:</strong> A budget that applies every calendar year. 'Tracked from transactions' will show spending for the current year.</li>
          <li><strong>Monthly (Specific):</strong> For a budget tied to a specific calendar month and year (e.g., "July 2024 Vacation Fund").</li>
          <li><strong>Yearly (Specific):</strong> For a budget tied to a specific calendar year (e.g., "2024 Home Improvement Projects").</li>
          <li><strong>Custom Dates:</strong> You define a specific start and end date.</li>
          <li><strong>Ongoing (All Time):</strong> The budget is active indefinitely. 'Tracked from transactions' will show all-time spending for the category.</li>
        </ul>
      </>
    ),
  },
  {
    question: "Can I edit an existing budget's period?",
    answer: "Yes, click the pencil icon. You can change the period type, dates, allocated amount, or manual spent amount. Category names for existing budgets cannot be changed.",
  }
];

interface CurrentBudgetFormState extends Partial<Budget> {
  selectedMonth?: string;
  selectedYear?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export default function BudgetsPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]); 
  const [allTransactions, setAllTransactions] = useState<ExpenseTransaction[]>([]);
  const [displayBudgets, setDisplayBudgets] = useState<DisplayBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmittingDialog, setIsSubmittingDialog] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<CurrentBudgetFormState | null>(null);
  
  const [dialogPeriodType, setDialogPeriodType] = useState<BudgetPeriodType>('ongoing');
  const [dialogSelectedMonth, setDialogSelectedMonth] = useState<string>(getCurrentMonthValue());
  const [dialogSelectedYear, setDialogSelectedYear] = useState<string>(getCurrentYearValue());
  const [dialogCustomStartDate, setDialogCustomStartDate] = useState<string>("");
  const [dialogCustomEndDate, setDialogCustomEndDate] = useState<string>("");

  const [isHelperDialogOpen, setIsHelperDialogOpen] = useState(false);
  const [helperResults, setHelperResults] = useState<IdentifiedRecurringExpense[] | null>(null);
  const [isHelperLoading, setIsHelperLoading] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [subscriptionResults, setSubscriptionResults] = useState<SubscriptionDetectionResult | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);


  const { toast } = useToast();

  const loadBudgetsAndTransactions = useCallback(async (currentUserId: string) => {
    setIsLoading(true);
    try {
      const [fetchedBudgets, fetchedTransactions] = await Promise.all([
        fetchBudgetsService(currentUserId),
        fetchTransactionsService(currentUserId)
      ]);
      setBudgets(fetchedBudgets);
      setAllTransactions(fetchedTransactions.filter(t => t.type === 'expense' || t.type === 'subscription'));
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Could not load budget or transaction data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (isGuest || user.uid === GUEST_USER_ID) {
      loadBudgetsAndTransactions(GUEST_USER_ID);
    } else {
      setIsLoading(true);
      const budgetsCol = collection(db, `users/${user.uid}/budgets`);
      const q = query(budgetsCol); 

      const unsubscribeBudgets = onSnapshot(q, 
        async (querySnapshot) => {
          const fetchedBudgets = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              category: data.category,
              allocated: data.allocated,
              spent: data.spent, 
              isCompleted: data.isCompleted || false,
              periodType: data.periodType || 'ongoing',
              startDate: data.startDate ? formatISO((data.startDate as FirestoreTimestamp).toDate(), {representation: 'date'}) : undefined,
              endDate: data.endDate ? formatISO((data.endDate as FirestoreTimestamp).toDate(), {representation: 'date'}) : undefined,
              createdAt: data.createdAt ? formatISO((data.createdAt as FirestoreTimestamp).toDate()) : undefined,
            } as Budget;
          });
          setBudgets(fetchedBudgets);
          
          try {
            const fetchedTransactions = await fetchTransactionsService(user.uid);
            setAllTransactions(fetchedTransactions.filter(t => t.type === 'expense' || t.type === 'subscription'));
          } catch (error:any) {
            toast({ title: "Transaction Fetch Error", description: "Could not refresh transactions for budget calculations.", variant: "destructive" });
          }
          setIsLoading(false); 
        },
        (error) => {
          console.error("Failed to fetch budgets with real-time updates:", error);
          toast({ title: "Error", description: "Could not load budgets in real-time.", variant: "destructive" });
          setIsLoading(false);
        }
      );
      return () => unsubscribeBudgets();
    }
  }, [user, authLoading, isGuest, toast, loadBudgetsAndTransactions]);

  const getPeriodDisplayString = (budget: Budget): string => {
    if (!budget.periodType) return "Ongoing (All Time)";
    const now = new Date();
    switch (budget.periodType) {
      case 'recurring-monthly':
        return `Recurring Monthly (${format(now, "MMMM yyyy")})`;
      case 'recurring-yearly':
        return `Recurring Yearly (${format(now, "yyyy")})`;
      case 'monthly':
        return budget.startDate ? format(parseISO(budget.startDate), "MMMM yyyy") : "Monthly (Date Error)";
      case 'yearly':
        return budget.startDate ? format(parseISO(budget.startDate), "yyyy") : "Yearly (Date Error)";
      case 'custom':
        if (budget.startDate && budget.endDate) {
          try {
            const start = parseISO(budget.startDate);
            const end = parseISO(budget.endDate);
            if (isValidDateFn(start) && isValidDateFn(end)) {
                return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
            }
          } catch { /* fall through */ }
        }
        return "Custom (Date Error)";
      case 'ongoing':
      default:
        return "Ongoing (All Time)";
    }
  };


  useEffect(() => {
    const newDisplayBudgets = budgets.map(budget => {
      let calculatedTransactionSpent = 0;
      let trackedPeriodDesc = "";
      const now = new Date();

      const transactionsForCategory = allTransactions.filter(
        t => t.category.toLowerCase() === budget.category.toLowerCase()
      );

      if (budget.periodType === 'recurring-monthly') {
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        calculatedTransactionSpent = transactionsForCategory
          .filter(t => {
            const transactionDate = parseISO(t.date);
            return isValidDateFn(transactionDate) && transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        trackedPeriodDesc = "this month";
      } else if (budget.periodType === 'recurring-yearly') {
        const currentYearStart = startOfYear(now);
        const currentYearEnd = endOfYear(now);
        calculatedTransactionSpent = transactionsForCategory
          .filter(t => {
            const transactionDate = parseISO(t.date);
            return isValidDateFn(transactionDate) && transactionDate >= currentYearStart && transactionDate <= currentYearEnd;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        trackedPeriodDesc = "this year";
      } else if (budget.periodType === 'ongoing') {
        calculatedTransactionSpent = transactionsForCategory
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        trackedPeriodDesc = "all time";
      } else if (budget.startDate && budget.endDate && ['monthly', 'yearly', 'custom'].includes(budget.periodType)) {
        try {
          const budgetStartDate = parseISO(budget.startDate);
          const budgetEndDate = parseISO(budget.endDate);
          if (isValidDateFn(budgetStartDate) && isValidDateFn(budgetEndDate)) {
            calculatedTransactionSpent = transactionsForCategory
              .filter(t => {
                const transactionDate = parseISO(t.date);
                return isValidDateFn(transactionDate) && transactionDate >= budgetStartDate && transactionDate <= budgetEndDate;
              })
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            trackedPeriodDesc = "in period";
          } else {
             trackedPeriodDesc = "period (date error)";
          }
        } catch { 
            trackedPeriodDesc = "period (date error)";
        }
      }
      
      let currentSpentForProgress: number;
      let progressPercentage: number;
      let statusText: string; 
      let remainingAmountOrStatus: string; 
      let isVisuallyComplete: boolean = budget.isCompleted || false;
      let isVisuallyOverspent: boolean = false;

      if (budget.isCompleted) {
          currentSpentForProgress = budget.allocated; 
          progressPercentage = 100;
          statusText = `₹${budget.allocated.toFixed(2)} of ₹${budget.allocated.toFixed(2)} (Completed)`;
          remainingAmountOrStatus = 'Completed';
      } else if (budget.allocated > 0 && budget.spent >= budget.allocated) {
          isVisuallyComplete = true; 
          currentSpentForProgress = budget.allocated; 
          progressPercentage = 100;
          statusText = `₹${budget.allocated.toFixed(2)} of ₹${budget.allocated.toFixed(2)} (Target Met)`;
          remainingAmountOrStatus = 'Target Met';
      } else {
          if (budget.periodType === 'recurring-monthly' || budget.periodType === 'recurring-yearly') {
              currentSpentForProgress = calculatedTransactionSpent;
          } else {
              currentSpentForProgress = budget.spent;
          }

          if (budget.allocated > 0) {
              progressPercentage = Math.min((currentSpentForProgress / budget.allocated) * 100, 100);
              isVisuallyOverspent = currentSpentForProgress > budget.allocated;
              const diff = budget.allocated - currentSpentForProgress;
              remainingAmountOrStatus = isVisuallyOverspent
                  ? `Overspent by ₹${Math.abs(diff).toFixed(2)}`
                  : `₹${diff.toFixed(2)} remaining`;
          } else { 
              progressPercentage = currentSpentForProgress > 0 ? 100 : 0;
              isVisuallyOverspent = currentSpentForProgress > 0;
              remainingAmountOrStatus = currentSpentForProgress > 0 ? `Spent ₹${currentSpentForProgress.toFixed(2)} (No Allocation)` : `₹0.00 remaining`;
          }
          statusText = `₹${currentSpentForProgress.toFixed(2)} spent of ₹${budget.allocated.toFixed(2)}`;
      }

      return {
        ...budget,
        calculatedTransactionSpent,
        progress: parseFloat(progressPercentage.toFixed(0)),
        isOverspent: isVisuallyOverspent,
        periodDisplay: getPeriodDisplayString(budget),
        trackedPeriodDescription: trackedPeriodDesc,
        displayStatusText: statusText,
        remainingText: remainingAmountOrStatus,
        isEffectivelyComplete: isVisuallyComplete,
      };
    }).sort((a,b) => {
        const typeOrder = (type: BudgetPeriodType) => {
            if (type.startsWith('recurring')) return 0;
            if (type === 'monthly' || type === 'yearly' || type === 'custom') return 1;
            return 2; 
        };
        const orderA = typeOrder(a.periodType);
        const orderB = typeOrder(b.periodType);
        if (orderA !== orderB) return orderA - orderB;
        
        if (a.startDate && b.startDate) {
            const dateA = parseISO(a.startDate).getTime();
            const dateB = parseISO(b.startDate).getTime();
            if(dateA !== dateB) return dateA - dateB;
        }
        if (a.startDate && !b.startDate) return -1;
        if (!a.startDate && b.startDate) return 1;
        return a.category.localeCompare(b.category);
    });
    setDisplayBudgets(newDisplayBudgets);
  }, [budgets, allTransactions]);


  const handleSaveBudget = async () => {
    if (!user || !user.uid || !currentBudget) {
      toast({ title: "Authentication Error", description: "User session not found.", variant: "destructive" });
      return;
    }
    if (!currentBudget.category?.trim() || currentBudget.allocated === undefined || currentBudget.allocated < 0) {
       toast({ title: "Error", description: "Category and a valid allocated amount are required.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingDialog(true);
    const categoryToSave = currentBudget.category.trim();
    
    let finalStartDate: string | undefined = undefined;
    let finalEndDate: string | undefined = undefined;

    if (dialogPeriodType === 'monthly') {
      const year = parseInt(dialogSelectedYear);
      const month = parseInt(dialogSelectedMonth) - 1;
      if (!isNaN(year) && !isNaN(month)) {
        finalStartDate = formatISO(startOfMonth(new Date(year, month)), { representation: 'date' });
        finalEndDate = formatISO(endOfMonth(new Date(year, month)), { representation: 'date' });
      } else {
        toast({ title: "Invalid Date", description: "Please select a valid month and year.", variant: "destructive" });
        setIsSubmittingDialog(false); return;
      }
    } else if (dialogPeriodType === 'yearly') {
      const year = parseInt(dialogSelectedYear);
       if (!isNaN(year)) {
        finalStartDate = formatISO(startOfYear(new Date(year, 0)), { representation: 'date' });
        finalEndDate = formatISO(endOfYear(new Date(year, 0)), { representation: 'date' });
      } else {
        toast({ title: "Invalid Date", description: "Please select a valid year.", variant: "destructive" });
        setIsSubmittingDialog(false); return;
      }
    } else if (dialogPeriodType === 'custom') {
      if (!dialogCustomStartDate || !dialogCustomEndDate) {
        toast({ title: "Invalid Dates", description: "Please select both start and end dates for custom period.", variant: "destructive" });
        setIsSubmittingDialog(false); return;
      }
      try {
        finalStartDate = formatISO(parseISO(dialogCustomStartDate), { representation: 'date' });
        finalEndDate = formatISO(parseISO(dialogCustomEndDate), { representation: 'date' });
        if (parseISO(finalStartDate) > parseISO(finalEndDate)) {
          toast({ title: "Invalid Date Range", description: "Start date cannot be after end date.", variant: "destructive" });
          setIsSubmittingDialog(false); return;
        }
      } catch {
        toast({ title: "Invalid Date Format", description: "Please use valid dates.", variant: "destructive" });
        setIsSubmittingDialog(false); return;
      }
    } 

    try {
      if (currentBudget.id) { 
        const updateData: UpdateBudgetData = {
          category: categoryToSave, 
          allocated: Number(currentBudget.allocated),
          spent: Number(currentBudget.spent || 0), 
          isCompleted: currentBudget.isCompleted || false,
          periodType: dialogPeriodType,
          startDate: ['ongoing', 'recurring-monthly', 'recurring-yearly'].includes(dialogPeriodType) ? null : finalStartDate, 
          endDate: ['ongoing', 'recurring-monthly', 'recurring-yearly'].includes(dialogPeriodType) ? null : finalEndDate,    
        };
        await updateBudgetService(user.uid, currentBudget.id, updateData);
        toast({ title: "Budget Updated", description: `Budget for ${categoryToSave} updated.`});
      } else { 
        const newBudgetData: NewBudgetData = {
          category: categoryToSave,
          allocated: Number(currentBudget.allocated),
          spent: Number(currentBudget.spent || 0),
          isCompleted: currentBudget.isCompleted || false, 
          periodType: dialogPeriodType,
          startDate: ['ongoing', 'recurring-monthly', 'recurring-yearly'].includes(dialogPeriodType) ? undefined : finalStartDate,
          endDate: ['ongoing', 'recurring-monthly', 'recurring-yearly'].includes(dialogPeriodType) ? undefined : finalEndDate,
        };
        await addBudgetService(user.uid, newBudgetData);
        toast({ title: "Budget Added", description: `Budget for ${categoryToSave} created.`});
      }

      if (isGuest || user.uid === GUEST_USER_ID) { 
        loadBudgetsAndTransactions(GUEST_USER_ID);
      }
      setIsDialogOpen(false);
      setCurrentBudget(null);
    } catch (error: any) {
      toast({ title: "Save Error", description: error.message || "Could not save budget.", variant: "destructive" });
    } finally {
      setIsSubmittingDialog(false);
    }
  };

  const openEditDialog = (budget: DisplayBudget) => {
    setCurrentBudget({ 
      id: budget.id, 
      category: budget.category, 
      allocated: budget.allocated, 
      spent: budget.spent, 
      isCompleted: budget.isCompleted,
      periodType: budget.periodType || 'ongoing',
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setDialogPeriodType(budget.periodType || 'ongoing');
    if (budget.periodType === 'monthly' && budget.startDate) {
        const startDateObj = parseISO(budget.startDate);
        setDialogSelectedMonth(format(startDateObj, 'MM'));
        setDialogSelectedYear(format(startDateObj, 'yyyy'));
    } else if (budget.periodType === 'yearly' && budget.startDate) {
        setDialogSelectedYear(format(parseISO(budget.startDate), 'yyyy'));
    } else if (budget.periodType === 'custom') {
        setDialogCustomStartDate(budget.startDate || "");
        setDialogCustomEndDate(budget.endDate || "");
    } else { 
        setDialogSelectedMonth(getCurrentMonthValue());
        setDialogSelectedYear(getCurrentYearValue());
        setDialogCustomStartDate("");
        setDialogCustomEndDate("");
    }
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setCurrentBudget({ category: "", allocated: 0, spent: 0, isCompleted: false, periodType: 'ongoing' }); 
    setDialogPeriodType('ongoing');
    setDialogSelectedMonth(getCurrentMonthValue());
    setDialogSelectedYear(getCurrentYearValue());
    setDialogCustomStartDate("");
    setDialogCustomEndDate("");
    setIsDialogOpen(true);
  };

  const handleDeleteBudget = async (id: string) => {
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "User session not found.", variant: "destructive" });
      return;
    }
    try {
      await deleteBudgetService(user.uid, id); 
      toast({ title: "Budget Deleted", description: "The budget has been removed."});
      if (isGuest || user.uid === GUEST_USER_ID) { 
        loadBudgetsAndTransactions(GUEST_USER_ID);
      }
    } catch (error: any) {
      toast({ title: "Delete Error", description: error.message || "Could not delete budget.", variant: "destructive"});
    }
  };

  const handleToggleComplete = async (budgetId: string, currentCompletedStatus: boolean) => {
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "User session not found.", variant: "destructive" });
      return;
    }
    try {
      await updateBudgetService(user.uid, budgetId, { isCompleted: !currentCompletedStatus });
      toast({ title: "Budget Updated", description: `Budget completion status toggled.` });
      if (isGuest || user.uid === GUEST_USER_ID) { 
        loadBudgetsAndTransactions(GUEST_USER_ID);
      }
    } catch (error: any) {
      toast({ title: "Update Error", description: "Could not update budget completion status.", variant: "destructive" });
    }
  };

  const availableYears = getYears();

  const handleOpenSubscriptionHelper = async () => {
    if (!user) {
        toast({ title: "Access Denied", description: "Please log in or use Guest Mode.", variant: "destructive" });
        return;
    }
    setIsHelperLoading(true);
    setHelperResults(null);
    setIsHelperDialogOpen(true);

    try {
        let transactionsForAudit = allTransactions;
        if (isGuest || user.uid === GUEST_USER_ID) { 
           transactionsForAudit = await fetchTransactionsService(GUEST_USER_ID).then(txs => txs.filter(t => t.type === 'expense' || t.type === 'subscription'));
        }

        const sixMonthsAgo = format(subMonths(new Date(), 12), 'yyyy-MM-dd'); 
        const relevantTransactions = transactionsForAudit
            .filter(t => (t.type === 'expense' || t.type === 'subscription') && t.date >= sixMonthsAgo)
            .map(t_1 => ({
                date: t_1.date,
                description: t_1.description,
                amount: t_1.amount, 
                category: t_1.category,
                payee: t_1.payee || "",
                type: t_1.type,
            }));

        if (relevantTransactions.length === 0) {
            toast({ title: "Insufficient Data", description: "No expense/subscription transactions found in the last 12 months to audit.", variant: "default" });
            setHelperResults([]);
            setIsHelperLoading(false);
            return;
        }

        const input: AuditRecurringExpensesInput = { transactions: relevantTransactions };
        const result = await auditRecurringExpenses(input);
        setHelperResults(result.identifiedExpenses);
        if (result.identifiedExpenses.length === 0) {
            toast({ title: "No Subscriptions Found", description: "The AI couldn't identify any potential recurring subscriptions from your recent transactions.", variant: "default" });
        }
    } catch (error: any) {
        console.error("Error fetching recurring expense audit for helper:", error);
        toast({ title: "Helper Error", description: error.message || "Could not audit expenses.", variant: "destructive" });
        setHelperResults([]);
    } finally {
        setIsHelperLoading(false);
    }
  };

  const handleDetectSubscriptions = async () => {
    if (!user) {
        toast({ title: "Access Denied", description: "Please log in or use Guest Mode.", variant: "destructive" });
        return;
    }
    setIsSubscriptionLoading(true);
    setSubscriptionResults(null);
    setShowSubscriptionDialog(true);

    try {
        let transactionsForDetection = allTransactions;
        if (isGuest || user.uid === GUEST_USER_ID) { 
           transactionsForDetection = await fetchTransactionsService(GUEST_USER_ID).then(txs => txs.filter(t => t.type === 'expense' || t.type === 'subscription'));
        }

        const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd'); 
        const relevantTransactions = transactionsForDetection
            .filter(t => (t.type === 'expense' || t.type === 'subscription') && t.date >= sixMonthsAgo);

        if (relevantTransactions.length === 0) {
            toast({ title: "Insufficient Data", description: "No expense/subscription transactions found in the last 6 months to analyze.", variant: "default" });
            setSubscriptionResults(null);
            setIsSubscriptionLoading(false);
            return;
        }

        const detected = await detectSubscriptionsFromTransactions(relevantTransactions);
        setSubscriptionResults(detected);
        
        if (detected.subscriptions.length === 0 && detected.recurringPayments.length === 0) {
            toast({ title: "No Subscriptions Detected", description: "No recurring subscription patterns were found in your recent transactions.", variant: "default" });
        } else {
            const totalFound = detected.subscriptions.length + detected.recurringPayments.length;
            toast({ title: "Subscriptions Detected", description: `Found ${totalFound} potential subscription(s).`, variant: "default" });
        }
    } catch (error: any) {
        console.error("Error detecting subscriptions:", error);
        toast({ title: "Detection Error", description: error.message || "Could not analyze transactions for subscriptions.", variant: "destructive" });
        setSubscriptionResults(null);
    } finally {
        setIsSubscriptionLoading(false);
    }
  };

  const handleCreateBudgetsFromSubscriptions = async (subscriptions: DetectedSubscription[]) => {
    try {
      const userIdForBudgets = user?.uid || GUEST_USER_ID;
      await createBudgetsForSubscriptions(subscriptions, userIdForBudgets);
      await loadUserData(); // Refresh the budgets list
      setShowSubscriptionDialog(false);
      toast({ 
        title: "Budgets Created", 
        description: `Successfully created ${subscriptions.length} budget(s) from detected subscriptions.`, 
        variant: "default" 
      });
    } catch (error: any) {
      console.error("Error creating budgets from subscriptions:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Could not create budgets from subscriptions.", 
        variant: "destructive" 
      });
    }
  };

  const handleAddSubscriptionAsBudget = (item: IdentifiedRecurringExpense) => {
    setCurrentBudget({
        category: item.likelyServiceName,
        allocated: Math.abs(item.estimatedMonthlyCost), 
        spent: 0,
        isCompleted: false,
        periodType: 'recurring-monthly', 
    });
    setDialogPeriodType('recurring-monthly');
    setDialogSelectedMonth(getCurrentMonthValue()); 
    setDialogSelectedYear(getCurrentYearValue());   
    setDialogCustomStartDate("");
    setDialogCustomEndDate("");
    
    setIsHelperDialogOpen(false);
    setIsDialogOpen(true); 
  };

  const showDatePickers = ['monthly', 'yearly', 'custom'].includes(dialogPeriodType);


  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">Budgets</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleOpenSubscriptionHelper} variant="outline" className="rounded-full shadow-sm hover:shadow-md transition-shadow">
              <ListChecks className="mr-2 h-5 w-5" /> Subscription Budget Helper
            </Button>
            <Button onClick={() => setShowSubscriptionDialog(true)} variant="outline" className="rounded-full shadow-sm hover:shadow-md transition-shadow">
              <Search className="mr-2 h-5 w-5" /> Detect Subscriptions
            </Button>
            <Button onClick={openNewDialog} className="rounded-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-[hsl(var(--primary-gradient-start))] to-[hsl(var(--primary-gradient-end))] text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" /> Set New Budget
            </Button>
          </div>
        </div>
        {isGuest && (
             <CardDescription className="text-center text-accent dark:text-accent-foreground/80">You are in Guest Mode. Budget data is stored locally in your browser.</CardDescription>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : displayBudgets.length === 0 ? (
           <Card className="shadow-lg rounded-xl animate-fade-in text-center py-12">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-2xl">No Budgets Yet</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
              <p className="text-muted-foreground mb-4">Start managing your finances by setting up your first budget or try the Subscription Helper.</p>
              <Button onClick={openNewDialog} className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                <PlusCircle className="mr-2 h-5 w-5" /> Create Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayBudgets.map((budget, index) => (
                <Card key={budget.id} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in ${budget.isEffectivelyComplete ? 'opacity-70 border-green-500' : ''}`} style={{animationDelay: `${index * 0.05}s`}}>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <CardTitle className="text-xl font-semibold truncate">{budget.category}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarRange className="h-3 w-3"/> {budget.periodDisplay}
                        </CardDescription>
                        <CardDescription className="mt-1 text-sm sm:text-base">
                         {budget.displayStatusText}
                        </CardDescription>
                        {!budget.isEffectivelyComplete && budget.calculatedTransactionSpent > 0 && (
                          <CardDescription className="text-xs text-muted-foreground/80 mt-0.5">
                            (Tracked from transactions {budget.trackedPeriodDescription}: ₹{budget.calculatedTransactionSpent.toFixed(2)})
                          </CardDescription>
                        )}
                      </div>
                      {budget.isOverspent && !budget.isEffectivelyComplete && <AlertTriangle className="h-5 w-5 text-destructive" />}
                      {budget.isEffectivelyComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                    <Progress value={budget.progress} className={`h-3 ${budget.isOverspent && !budget.isEffectivelyComplete ? "bg-destructive/70 [&>div]:bg-destructive" : (budget.isEffectivelyComplete ? "bg-green-500/70 [&>div]:bg-green-500" : "")}`} />
                    <div className="mt-2 flex justify-between text-xs sm:text-sm">
                      <span className={`font-medium ${budget.isOverspent && !budget.isEffectivelyComplete ? 'text-destructive' : (budget.isEffectivelyComplete ? 'text-green-600' : 'text-muted-foreground')}`}>
                        {budget.remainingText}
                      </span>
                      <span className={`font-semibold ${budget.isOverspent && !budget.isEffectivelyComplete ? 'text-destructive' : (budget.isEffectivelyComplete ? 'text-green-600' : 'text-primary')}`}>{budget.progress.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6 flex justify-between items-center">
                     <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`complete-${budget.id}`}
                            checked={budget.isCompleted} // Checkbox directly reflects DB state
                            onCheckedChange={() => handleToggleComplete(budget.id, budget.isCompleted || false)}
                            aria-label="Mark budget as complete"
                        />
                        <Label htmlFor={`complete-${budget.id}`} className="text-xs text-muted-foreground cursor-pointer">Mark as Complete</Label>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(budget)} className="rounded-full h-8 w-8" title="Edit Budget">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit Budget</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBudget(budget.id)} className="text-destructive hover:text-destructive rounded-full h-8 w-8" title="Delete Budget">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Budget</span>
                        </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Budget Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setCurrentBudget(null); }}>
        <DialogContent className="sm:max-w-md rounded-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentBudget?.id ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
            <DialogDescription>
              {currentBudget?.id ? `Update the details for your ${currentBudget.category} budget.` : 'Set a new budget for a specific category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={currentBudget?.category || ""}
                onChange={(e) => setCurrentBudget(prev => ({ ...prev, category: e.target.value }))}
                className="rounded-full text-sm sm:text-base"
                placeholder="e.g., Groceries, Rent, Netflix"
                disabled={isSubmittingDialog || (!!currentBudget?.id)} 
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="allocated">Allocated Amount (₹)</Label>
              <Input
                id="allocated"
                type="number"
                value={currentBudget?.allocated === undefined ? "" : String(currentBudget.allocated)}
                onChange={(e) => setCurrentBudget(prev => ({ ...prev, allocated: parseFloat(e.target.value) || 0 }))}
                className="rounded-full text-sm sm:text-base"
                placeholder="e.g., 5000"
                min="0"
                step="0.01"
                disabled={isSubmittingDialog}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="spent">Manual Spent (₹)</Label>
              <Input
                id="spent"
                type="number"
                value={currentBudget?.spent === undefined ? "" : String(currentBudget.spent)}
                onChange={(e) => setCurrentBudget(prev => ({ ...prev, spent: parseFloat(e.target.value) || 0 }))}
                className="rounded-full text-sm sm:text-base"
                placeholder="e.g., 250 (Optional, for manual tracking)"
                min="0"
                step="0.01"
                disabled={isSubmittingDialog}
                title="Amount manually set as spent. This drives the progress bar."
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="periodType">Budget Period</Label>
                <Select value={dialogPeriodType} onValueChange={(value: BudgetPeriodType) => setDialogPeriodType(value)}>
                    <SelectTrigger id="periodType" className="rounded-full text-sm sm:text-base">
                        <SelectValue placeholder="Select period type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recurring-monthly"><Repeat className="inline-flex mr-2 h-4 w-4 text-muted-foreground" />Recurring Monthly</SelectItem>
                        <SelectItem value="recurring-yearly"><Repeat className="inline-flex mr-2 h-4 w-4 text-muted-foreground" />Recurring Yearly</SelectItem>
                        <SelectItem value="monthly">Monthly (Specific)</SelectItem>
                        <SelectItem value="yearly">Yearly (Specific)</SelectItem>
                        <SelectItem value="custom">Custom Dates</SelectItem>
                        <SelectItem value="ongoing">Ongoing (All Time)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {showDatePickers && dialogPeriodType === 'monthly' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="month">Month</Label>
                        <Select value={dialogSelectedMonth} onValueChange={setDialogSelectedMonth}>
                            <SelectTrigger id="month" className="rounded-full text-sm sm:text-base">
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="yearMonthly">Year</Label>
                        <Select value={dialogSelectedYear} onValueChange={setDialogSelectedYear}>
                             <SelectTrigger id="yearMonthly" className="rounded-full text-sm sm:text-base">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {showDatePickers && dialogPeriodType === 'yearly' && (
                <div className="space-y-1">
                    <Label htmlFor="yearYearly">Year</Label>
                     <Select value={dialogSelectedYear} onValueChange={setDialogSelectedYear}>
                        <SelectTrigger id="yearYearly" className="rounded-full text-sm sm:text-base">
                            <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {showDatePickers && dialogPeriodType === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="customStartDate">Start Date</Label>
                        <Input type="date" id="customStartDate" value={dialogCustomStartDate} onChange={(e) => setDialogCustomStartDate(e.target.value)} className="rounded-full text-sm sm:text-base" disabled={isSubmittingDialog} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="customEndDate">End Date</Label>
                        <Input type="date" id="customEndDate" value={dialogCustomEndDate} onChange={(e) => setDialogCustomEndDate(e.target.value)} className="rounded-full text-sm sm:text-base" disabled={isSubmittingDialog} />
                    </div>
                </div>
            )}

          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full py-2.5 text-sm" disabled={isSubmittingDialog}>Cancel</Button>
            <Button onClick={handleSaveBudget} className="rounded-full shadow-md hover:shadow-lg transition-shadow py-2.5 text-sm" disabled={isSubmittingDialog}>
              {isSubmittingDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Budget Helper Dialog */}
      <Dialog open={isHelperDialogOpen} onOpenChange={setIsHelperDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" />Subscription Budget Helper</DialogTitle>
            <DialogDescription>
              AI has scanned your recent transactions. Review potential subscriptions below and add them as monthly budgets.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {isHelperLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Scanning transactions...</p>
              </div>
            )}
            {!isHelperLoading && helperResults === null && (
              <p className="text-muted-foreground text-center">Click "Scan Transactions" to begin.</p>
            )}
            {!isHelperLoading && helperResults && helperResults.length === 0 && (
              <p className="text-muted-foreground text-center">No obvious recurring subscriptions found in your recent transactions.</p>
            )}
            {!isHelperLoading && helperResults && helperResults.length > 0 && (
              helperResults.map((item, index) => (
                <Card key={index} className="bg-muted/50 p-3 rounded-md shadow-sm">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold truncate" title={item.likelyServiceName}>{item.likelyServiceName}</p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <IndianRupee className="h-3 w-3 mr-0.5"/> Est. Cost: ₹{item.estimatedMonthlyCost.toFixed(2)}/month
                        {item.lastPaymentDate && ` (Last: ${format(parseISO(item.lastPaymentDate), "dd MMM yyyy")})`}
                      </p>
                       <p className="text-xs text-muted-foreground/80 truncate" title={item.suggestion}>{item.suggestion}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddSubscriptionAsBudget(item)} className="rounded-full flex-shrink-0">
                      <PlusCircle className="mr-1.5 h-4 w-4" /> Add as Budget
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FaqSection items={budgetFaqs} />
    </AppLayout>
  );
}

