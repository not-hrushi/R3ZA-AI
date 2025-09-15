
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Sparkles, Wand2, Loader2, Building, Repeat } from "lucide-react"; 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { addTransaction, type NewTransactionData } from "@/services/transactionService";
import { categorizeExpense } from "@/ai/flows/categorize-expense";
import type { CategorizeExpenseInput } from "@/ai/flows/categorize-expense";
import { describeExpense } from "@/ai/flows/describe-expense";
import type { DescribeExpenseInput } from "@/ai/flows/describe-expense";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/constants";
import { getBudgets, type Budget } from "@/services/budgetService"; 

export default function NewTransactionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  
  const [type, setType] = useState<"expense" | "income" | "subscription">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  const [category, setCategory] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");

  const [userBudgetCategories, setUserBudgetCategories] = useState<string[]>([]);
  const [userIncomeCategories, setUserIncomeCategories] = useState<string[]>([]); 

  useEffect(() => {
    if (user?.uid) {
      getBudgets(user.uid)
        .then(budgets => {
          const budgetCats = Array.from(new Set(budgets.map(b => b.category)));
          setUserBudgetCategories(budgetCats);
        })
        .catch(err => console.error("Failed to fetch budget categories", err));
    }
  }, [user]);

  const availableExpenseCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...userBudgetCategories])).sort();
  }, [userBudgetCategories]);

  const availableIncomeCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_INCOME_CATEGORIES, ...userIncomeCategories])).sort();
  }, [userIncomeCategories]);

  const availableSubscriptionCategories = useMemo(() => {
    // For subscriptions, categories are often the service names themselves.
    // We can prime this with common ones, or user's past subscription categories.
    const commonSubs = ["Netflix", "Spotify", "Amazon Prime", "Gym Membership", "Software Subscription"];
    return Array.from(new Set([...commonSubs, ...userBudgetCategories.filter(cat => cat.toLowerCase().includes("subscription") || commonSubs.some(s => cat.toLowerCase().includes(s.toLowerCase())) )])).sort();
  }, [userBudgetCategories]);


  const handleAICategorize = async () => {
    if (!description) {
      toast({ title: "Description needed", description: "Please enter a description to use AI categorization.", variant: "destructive"});
      return;
    }
    if (type !== 'expense' && type !== 'subscription') {
      toast({ title: "AI Categorization for Expenses/Subscriptions Only", description: "AI categorization is currently available for expenses and subscriptions.", variant: "default" });
      return;
    }
    setIsCategorizing(true);
    try {
      const input: CategorizeExpenseInput = { description };
      const result = await categorizeExpense(input);
      setCategory(result.category); 
      toast({ title: "AI Categorization", description: `Category suggested: ${result.category} (Confidence: ${Math.round(result.confidence * 100)}%)` });
    } catch (error) {
      console.error("AI Categorization Error:", error);
      toast({ title: "AI Error", description: "Could not categorize expense.", variant: "destructive" });
    } finally {
      setIsCategorizing(false);
    }
  };
  
  const handleAIDescribe = async () => {
    if (!category || !amount || !date) {
      toast({ title: "Details needed", description: "Please fill in category, amount, and date to use AI description.", variant: "destructive"});
      return;
    }
    setIsDescribing(true);
    try {
      const input: DescribeExpenseInput = { 
        category, 
        amount: parseFloat(amount), 
        date, 
        payee: payee || undefined, 
        description: description || undefined 
      };
      const result = await describeExpense(input); 
      setDescription(result.expenseDescription);
      toast({ title: "AI Description", description: `Description updated.` });
    } catch (error) {
      console.error("AI Description Error:", error);
      toast({ title: "AI Error", description: "Could not generate description.", variant: "destructive" });
    } finally {
      setIsDescribing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to save a transaction.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    if (!type || !amount || !date || !category.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const newTransactionData: NewTransactionData = {
      type,
      amount: parseFloat(amount), // Service will handle making it negative for expense/subscription
      date,
      category: category.trim(),
      payee: payee.trim(),
      description: description.trim(),
    };
    
    try {
      await addTransaction(user.uid, newTransactionData);
      toast({
        title: "Transaction Saved!",
        description: `${description.trim()} for ₹${Math.abs(parseFloat(amount)).toFixed(2)} has been recorded.`,
      });
      router.push("/transactions");
    } catch (error: any) {
      console.error("Failed to save transaction to Firestore", error);
      toast({ title: "Save Error", description: error.message || "Could not save transaction.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategories = type === "expense" 
    ? availableExpenseCategories 
    : type === "income" 
      ? availableIncomeCategories
      : availableSubscriptionCategories;
  
  const categoryLabel = type === "subscription" ? "Subscription Name / Service" : "Category";

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 rounded-full pl-2">
          <Link href="/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transactions
          </Link>
        </Button>

        <Card className="shadow-xl rounded-xl animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-headline">Add New Transaction</CardTitle>
            <CardDescription>Log your income, expense, or subscription details below.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(value: "expense" | "income" | "subscription") => { setType(value); setCategory(''); }}>
                    <SelectTrigger id="type" className="rounded-full focus:ring-primary focus:border-primary">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required 
                    className="rounded-full focus:ring-primary focus:border-primary"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required 
                  className="rounded-full focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">{categoryLabel}</Label>
                <div className="flex gap-2">
                   <Input 
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={type === "subscription" ? "e.g., Netflix, Spotify" : "Type or select category"}
                    required
                    list="category-suggestions"
                    className="rounded-full focus:ring-primary focus:border-primary w-full"
                  />
                  <datalist id="category-suggestions">
                    {currentCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  {(type === "expense" || type === "subscription") && ( 
                    <Button type="button" variant="outline" size="icon" onClick={handleAICategorize} disabled={isCategorizing || !description || isSubmitting} className="rounded-full flex-shrink-0" title="AI Categorize">
                      {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="payee" className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground"/> Payee / Vendor (Optional)
                </Label>
                <Input 
                  id="payee" 
                  type="text" 
                  placeholder="e.g., SuperMart, Landlord, Netflix Inc." 
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="rounded-full focus:ring-primary focus:border-primary mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                 <div className="flex gap-2">
                    <Textarea
                      id="description"
                      placeholder="e.g., Weekly groceries, Monthly Netflix fee"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="rounded-2xl focus:ring-primary focus:border-primary min-h-[100px]"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAIDescribe} disabled={isDescribing || !category || !amount || !date || isSubmitting} className="rounded-full flex-shrink-0" title="AI Generate Description">
                      {isDescribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || authLoading || !user} className="rounded-full shadow-md hover:shadow-lg transition-shadow min-w-[120px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Saving..." : "Save Transaction"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
