
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Building, Repeat } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, type FormEvent, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getTransactionById, updateTransaction, type Transaction, type UpdateTransactionData } from "@/services/transactionService";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/constants";
import { getBudgets, type Budget } from "@/services/budgetService"; 


export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const transactionId = params.id as string;

  const [isLoadingTransaction, setIsLoadingTransaction] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [type, setType] = useState<"expense" | "income" | "subscription">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(""); 
  const [category, setCategory] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");

  const [userBudgetCategories, setUserBudgetCategories] = useState<string[]>([]);

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
    return Array.from(new Set([...DEFAULT_INCOME_CATEGORIES])).sort(); 
  }, []);

  const availableSubscriptionCategories = useMemo(() => {
    const commonSubs = ["Netflix", "Spotify", "Amazon Prime", "Gym Membership", "Software Subscription"];
    return Array.from(new Set([...commonSubs, ...userBudgetCategories.filter(cat => cat.toLowerCase().includes("subscription") || commonSubs.some(s => cat.toLowerCase().includes(s.toLowerCase())) )])).sort();
  }, [userBudgetCategories]);


  useEffect(() => {
    if (user && user.uid && transactionId) {
      setIsLoadingTransaction(true);
      getTransactionById(user.uid, transactionId)
        .then(transaction => {
          if (transaction) {
            setType(transaction.type);
            setAmount(String(Math.abs(transaction.amount))); 
            setDate(transaction.date); 
            setCategory(transaction.category);
            setPayee(transaction.payee || "");
            setDescription(transaction.description);
          } else {
            toast({ title: "Not Found", description: "Transaction not found.", variant: "destructive" });
            router.push("/transactions");
          }
        })
        .catch(error => {
          toast({ title: "Error", description: `Failed to load transaction: ${error.message}`, variant: "destructive" });
          router.push("/transactions");
        })
        .finally(() => setIsLoadingTransaction(false));
    } else if (!authLoading && !user) {
        router.push("/login"); 
    }
  }, [user, authLoading, transactionId, router, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid || !transactionId) {
      toast({ title: "Error", description: "User or transaction ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    if (!type || !amount || !date || !category.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const updatedTransactionData: UpdateTransactionData = {
      type,
      amount: parseFloat(amount), // Service will handle making it negative for expense/subscription
      date,
      category: category.trim(),
      payee: payee.trim(),
      description: description.trim(),
    };
    
    try {
      await updateTransaction(user.uid, transactionId, updatedTransactionData);
      toast({
        title: "Transaction Updated!",
        description: `Transaction details have been saved.`,
      });
      router.push("/transactions");
    } catch (error: any) {
      console.error("Failed to update transaction in Firestore", error);
      toast({ title: "Save Error", description: error.message || "Could not update transaction.", variant: "destructive"});
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


  if (authLoading || isLoadingTransaction) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-150px)]">
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
            <CardTitle className="text-2xl font-bold font-headline">Edit Transaction</CardTitle>
            <CardDescription>Update your income, expense, or subscription details below.</CardDescription>
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
              
              <div>
                <Label htmlFor="category">{categoryLabel}</Label>
                 <Input 
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={type === "subscription" ? "e.g., Netflix, Spotify" : "Type or select category"}
                    required
                    list="category-suggestions-edit"
                    className="rounded-full focus:ring-primary focus:border-primary w-full"
                  />
                  <datalist id="category-suggestions-edit">
                    {currentCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Weekly groceries, Salary payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="rounded-2xl focus:ring-primary focus:border-primary min-h-[100px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || authLoading || !user} className="rounded-full shadow-md hover:shadow-lg transition-shadow min-w-[120px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
