
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit2, Filter, Loader2, Download, FileText, Repeat } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getTransactions as fetchTransactionsService, deleteTransaction as deleteTransactionService, type Transaction } from "@/services/transactionService"; 
import { useRouter } from "next/navigation";
import { collection, query, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Timestamp } from "firebase/firestore";
import { format, getMonth, getYear, parseISO, isValid } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FaqSection } from "@/components/common/faq-section";

const GUEST_USER_ID = "GUEST_USER_ID";
type SortKey = keyof Transaction;

const transactionFaqs = [
  {
    question: "How do I add a new transaction?",
    answer: "Click the 'Add New Transaction' button. You'll be prompted to fill in details like type (income/expense/subscription), amount, date, category (or subscription name), and description. AI assistance is available for categorization and description generation.",
  },
  {
    question: "What's the 'Subscription' type for?",
    answer: "The 'Subscription' type helps you specifically flag recurring payments like Netflix, Spotify, etc. The category field should then be used for the name of the subscription service. This helps the AI better monitor these types of expenses.",
  },
  {
    question: "Can I edit or delete transactions?",
    answer: "Yes. In the transaction list, each transaction has an 'Edit' (pencil icon) and 'Delete' (trash icon) button. Clicking 'Edit' will take you to a form pre-filled with the transaction's details.",
  },
  {
    question: "How do I filter transactions by month and year?",
    answer: "Above the transaction table, you'll find dropdown menus for 'Year' and 'Month'. Select a year and month to view transactions specifically for that period. Choose 'All Years' or 'All Months' to clear the respective filter."
  },
  {
    question: "How can I export my transaction data?",
    answer: "Click the 'Export Transactions' button. A dialog will appear where you can choose the export format (CSV or PDF) and the range of data to export (e.g., current view, selected month, or all time)."
  },
  {
    question: "What information is included in the PDF export?",
    answer: "The PDF export includes a table of your selected transactions, featuring the FinanceFlow logo, a report title, generation date, and page numbers. The table is styled with themed colors and clear typography for easy reading."
  },
  {
    question: "How does sorting work?",
    answer: "You can sort transactions by clicking on the column headers like 'Date', 'Description', 'Category', or 'Amount'. Clicking again will reverse the sort order.",
  },
  {
    question: "What is a 'Payee'?",
    answer: "The payee is the person or entity you paid (for expenses/subscriptions) or received money from (for income). For example, 'SuperMart' for groceries or 'Netflix Inc.' for a subscription. This field is optional."
  },
  {
    question: "How does Guest Mode work for transactions?",
    answer: "In Guest Mode, your transactions are saved locally in your browser. They are not synced to the cloud and will be lost if you clear your browser data or switch devices. To save data permanently, please sign up for a free account."
  }
];

const ALL_YEARS_VALUE = "all-years";
const ALL_MONTHS_VALUE = "all-months";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

function hslToRgb(h:number, s:number, l:number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n:number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n:number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

const PDF_PRIMARY_COLOR_RGB = hslToRgb(217, 91, 60); 
const PDF_ACCENT_COLOR_RGB = hslToRgb(258, 46, 63); 
const PDF_TEXT_COLOR_DARK = [33, 33, 33];
const PDF_TEXT_COLOR_LIGHT = [255, 255, 255];
const PDF_MUTED_COLOR_RGB = [100, 100, 100];
const PDF_BACKGROUND_ALT_ROW_RGB = [245, 245, 245];

const months = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export default function TransactionsPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const { toast } = useToast();

  const [filterYear, setFilterYear] = useState<string>(ALL_YEARS_VALUE); 
  const [filterMonth, setFilterMonth] = useState<string>(ALL_MONTHS_VALUE); 
  const [filterType, setFilterType] = useState<string>("all");


  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exportRange, setExportRange] = useState<"current" | "month" | "all">("current");
  const [isExporting, setIsExporting] = useState(false);

  const availableYears = useMemo(() => {
    if (transactions.length === 0) return [String(new Date().getFullYear())];
    const years = new Set(
      transactions
        .map(t => {
          if (!t.date || typeof t.date !== 'string') return null;
          try {
            const parsedDate = parseISO(t.date);
            return isValid(parsedDate) ? format(parsedDate, "yyyy") : null;
          } catch (e) { return null; }
        })
        .filter(year => year && year.length > 0) 
    );
    const yearArray = Array.from(years) as string[];
    return yearArray.length > 0 ? yearArray.sort((a, b) => parseInt(b) - parseInt(a)) : [String(new Date().getFullYear())];
  }, [transactions]);


  const loadTransactions = useCallback(async (currentUserId: string) => {
    setIsLoading(true);
    try {
      const fetchedTransactions = await fetchTransactionsService(currentUserId);
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error);
      toast({ title: "Error", description: "Could not load transactions.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (isGuest || user.uid === GUEST_USER_ID) {
      loadTransactions(GUEST_USER_ID);
    } else {
      setIsLoading(true);
      const transactionsCol = collection(db, `users/${user.uid}/transactions`);
      const q = query(transactionsCol, orderBy("date", "desc"));

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const fetchedTransactions = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
              description: data.description,
              category: data.category,
              amount: data.amount,
              type: data.type as "expense" | "income" | "subscription",
              payee: data.payee || "",
              createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
            } as Transaction;
          });
          setTransactions(fetchedTransactions);
          setIsLoading(false);
        },
        (error) => {
          console.error("Failed to fetch transactions with real-time updates:", error);
          toast({ title: "Error", description: "Could not load transactions in real-time.", variant: "destructive" });
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [user, authLoading, isGuest, loadTransactions, toast]);

  const filteredAndSortedTransactions = useMemo(() => {
    let itemsToProcess = [...transactions];
    
    const currentFilterYear = filterYear === ALL_YEARS_VALUE ? "" : filterYear;
    const currentFilterMonth = filterMonth === ALL_MONTHS_VALUE ? "" : filterMonth;

    if (filterType !== "all") {
      itemsToProcess = itemsToProcess.filter(t => t.type === filterType);
    }

    if (currentFilterYear) {
      itemsToProcess = itemsToProcess.filter(t => {
        const transactionDate = parseISO(t.date);
        return isValid(transactionDate) && getYear(transactionDate) === parseInt(currentFilterYear);
      });
    }
    if (currentFilterMonth && currentFilterYear) { 
      itemsToProcess = itemsToProcess.filter(t => {
        const transactionDate = parseISO(t.date);
        return isValid(transactionDate) && (getMonth(transactionDate) + 1) === parseInt(currentFilterMonth);
      });
    }

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      itemsToProcess = itemsToProcess.filter(transaction =>
        transaction.description.toLowerCase().includes(lowercasedSearchTerm) ||
        transaction.category.toLowerCase().includes(lowercasedSearchTerm) ||
        (transaction.payee && transaction.payee.toLowerCase().includes(lowercasedSearchTerm))
      );
    }

    if (sortConfig.key) {
      itemsToProcess.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (sortConfig.key === 'date') {
          return sortConfig.direction === 'ascending' ? new Date(valA).getTime() - new Date(valB).getTime() : new Date(valB).getTime() - new Date(valA).getTime();
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return itemsToProcess;
  }, [transactions, searchTerm, sortConfig, filterYear, filterMonth, filterType]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "User session not found.", variant: "destructive"});
      return;
    }
    try {
      await deleteTransactionService(user.uid, id); 
      toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
      if (isGuest || user.uid === GUEST_USER_ID) { 
        loadTransactions(GUEST_USER_ID);
      }
    } catch (error: any) {
      toast({ title: "Delete Error", description: error.message || "Could not delete transaction.", variant: "destructive"});
    }
  };

  const getDataForExport = (): Transaction[] => {
    if (exportRange === "all") {
      return transactions; 
    }
    if (exportRange === "month" && filterYear !== ALL_YEARS_VALUE && filterMonth !== ALL_MONTHS_VALUE) {
      return transactions.filter(t => { 
        const transactionDate = parseISO(t.date);
        if (!isValid(transactionDate)) return false;
        return getYear(transactionDate) === parseInt(filterYear) && 
               (getMonth(transactionDate) + 1) === parseInt(filterMonth);
      });
    }
    return filteredAndSortedTransactions; 
  };

  const handleExport = async () => {
    setIsExporting(true);
    const dataToExport = getDataForExport();

    if (dataToExport.length === 0) {
      toast({ title: "No Data", description: "No transactions to export for the selected range.", variant: "default" });
      setIsExporting(false);
      return;
    }

    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    
    if (exportFormat === "csv") {
      const headers = ["Date", "Description", "Payee", "Category", "Amount", "Type"];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(t => [
          t.date,
          `"${t.description.replace(/"/g, '""')}"`, 
          `"${(t.payee || "").replace(/"/g, '""')}"`,
          t.category,
          String(t.amount),
          t.type
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `financeflow_transactions_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast({ title: "CSV Exported", description: "Transaction data downloaded." });
    } else if (exportFormat === "pdf") {
      const doc = new jsPDF('p', 'pt', 'a4') as jsPDFWithAutoTable;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageMargin = 40; 

      const logoSize = 20; 
      doc.setLineWidth(1.5);
      doc.setFillColor(...PDF_PRIMARY_COLOR_RGB); 

      const logoX = pageMargin;
      const logoY = pageMargin - 5;
      const scale = logoSize / 24; 

      doc.path([
          {op: 'm', c: [12*scale+logoX, 2*scale+logoY]},
          {op: 'l', c: [2*scale+logoX, 7*scale+logoY]},
          {op: 'l', c: [12*scale+logoX, 12*scale+logoY]},
          {op: 'l', c: [22*scale+logoX, 7*scale+logoY]},
          {op: 'l', c: [12*scale+logoX, 2*scale+logoY]},
          {op: 'h'}
      ]).fillStroke();
      doc.path([
          {op: 'm', c: [2*scale+logoX, 17*scale+logoY]},
          {op: 'l', c: [12*scale+logoX, 22*scale+logoY]},
          {op: 'l', c: [22*scale+logoX, 17*scale+logoY]}
      ]).stroke();
      doc.path([
          {op: 'm', c: [2*scale+logoX, 12*scale+logoY]},
          {op: 'l', c: [12*scale+logoX, 17*scale+logoY]},
          {op: 'l', c: [22*scale+logoX, 12*scale+logoY]}
      ]).stroke();

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...PDF_PRIMARY_COLOR_RGB);
      doc.text("FinanceFlow", logoX + logoSize + 8, logoY + logoSize * 0.7);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...PDF_TEXT_COLOR_DARK);
      doc.text("Transaction Report", pageWidth / 2, logoY + logoSize + 25, { align: 'center' });
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_MUTED_COLOR_RGB);
      doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageWidth / 2, logoY + logoSize + 40, { align: 'center' });

      const tableColumn = ["Date", "Description", "Payee", "Category", "Amount (₹)", "Type"];
      const tableRows = dataToExport.map(t => [
        format(parseISO(t.date), "dd/MM/yy"),
        t.description,
        t.payee || "-",
        t.category,
        t.amount.toFixed(2),
        t.type.charAt(0).toUpperCase() + t.type.slice(1) 
      ]);

      let firstPage = true;
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: logoY + logoSize + 60,
        theme: 'plain', 
        margin: { top: pageMargin, right: pageMargin, bottom: pageMargin + 20, left: pageMargin },
        styles: {
          font: 'Helvetica',
          fontSize: 9,
          cellPadding: 5,
          textColor: PDF_TEXT_COLOR_DARK,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: PDF_PRIMARY_COLOR_RGB,
          textColor: PDF_TEXT_COLOR_LIGHT,
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: PDF_BACKGROUND_ALT_ROW_RGB
        },
        columnStyles: {
          0: { cellWidth: 55 }, 
          1: { cellWidth: 'auto' }, 
          2: { cellWidth: 80 }, 
          3: { cellWidth: 70 }, 
          4: { halign: 'right', cellWidth: 65 }, 
          5: { halign: 'center', cellWidth: 50 } 
        },
        didDrawCell: (data) => {
          if (data.column.index === 4 && data.row.section === 'body') { 
            const amount = parseFloat(data.cell.raw as string);
            if (amount < 0) {
              doc.setTextColor(220, 53, 69); 
            } else if (amount > 0) {
              doc.setTextColor(25, 135, 84); 
            }
          }
        },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.setTextColor(...PDF_MUTED_COLOR_RGB);
          const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc as any).internal.getNumberOfPages();
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - (pageMargin/2), { align: 'center' });
          doc.setLineWidth(0.5);
          doc.setDrawColor(...PDF_MUTED_COLOR_RGB);
          doc.line(pageMargin, doc.internal.pageSize.height - (pageMargin/2) - 5, pageWidth - pageMargin, doc.internal.pageSize.height - (pageMargin/2) - 5);

          firstPage = false;
        }
      });
      doc.save(`financeflow_transactions_${timestamp}.pdf`);
      toast({ title: "PDF Exported", description: "Transaction data downloaded as PDF." });
    }
    
    setIsExporting(false);
    setIsExportDialogOpen(false);
  };

  const handleYearChange = (value: string) => {
    setFilterYear(value);
    if (value === ALL_YEARS_VALUE) {
      setFilterMonth(ALL_MONTHS_VALUE);
    }
  };

  const handleMonthChange = (value: string) => {
    setFilterMonth(value);
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Transactions</h1>
          <div className="flex gap-2">
            <Button onClick={() => setIsExportDialogOpen(true)} variant="outline" className="rounded-full shadow-sm hover:shadow-md">
              <Download className="mr-2 h-4 w-4" /> Export Transactions
            </Button>
            <Button asChild className="rounded-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-[hsl(var(--primary-gradient-start))] to-[hsl(var(--primary-gradient-end))] text-primary-foreground">
              <Link href="/transactions/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Transaction
              </Link>
            </Button>
          </div>
        </div>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View and manage all your income, expenses and subscriptions.
            {isGuest && <span className="block text-sm text-accent dark:text-accent-foreground/80 mt-1">You are in Guest Mode. Data is stored locally.</span>}
            </CardDescription>
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 flex-wrap">
              <Input
                placeholder="Search description, category, payee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs sm:max-w-sm rounded-full focus:ring-primary focus:border-primary"
              />
              <Select value={filterYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-full sm:w-[120px] rounded-full">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_YEARS_VALUE}>All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={handleMonthChange} disabled={filterYear === ALL_YEARS_VALUE}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-full">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MONTHS_VALUE}>All Months</SelectItem>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full">
                    <Filter className="mr-2 h-4 w-4" /> 
                    {filterType === "all" ? "All Types" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterType("all")}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("income")}>Income</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("expense")}>Expense</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("subscription")}>Subscription</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('date')}>Date{getSortIndicator('date')}</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('description')}>Description{getSortIndicator('description')}</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('payee')}>Payee{getSortIndicator('payee')}</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('category')}>Category{getSortIndicator('category')}</TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => requestSort('amount')}>Amount (₹){getSortIndicator('amount')}</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTransactions.length > 0 ? filteredAndSortedTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{transaction.payee || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.amount >= 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${
                            transaction.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                            : transaction.type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' // Subscription color
                          }`}>
                            {transaction.type === 'subscription' ? <Repeat className="inline -ml-0.5 mr-1 h-3 w-3"/> : null}
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/transactions/edit/${transaction.id}`)} className="rounded-full h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(transaction.id)} className="rounded-full h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions found for the selected criteria. <Link href="/transactions/new" className="text-primary hover:underline">Add one now!</Link>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <FaqSection items={transactionFaqs} />
      </div>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Export Transactions</DialogTitle>
            <DialogDescription>Select format and data range for your export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-base font-medium">Export Format</Label>
              <RadioGroup value={exportFormat} onValueChange={(value: "csv" | "pdf") => setExportFormat(value)} className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="csv" id="csv-format" className="peer sr-only" />
                  <Label htmlFor="csv-format" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <FileText className="mb-2 h-6 w-6" /> CSV
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="pdf" id="pdf-format" className="peer sr-only" />
                  <Label htmlFor="pdf-format" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <FileText className="mb-2 h-6 w-6" /> PDF
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-base font-medium">Data Range</Label>
              <RadioGroup value={exportRange} onValueChange={(value: "current" | "month" | "all") => setExportRange(value)} className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="range-current" />
                  <Label htmlFor="range-current" className="cursor-pointer">Current Filtered View</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month" id="range-month" disabled={filterYear === ALL_YEARS_VALUE || filterMonth === ALL_MONTHS_VALUE} />
                  <Label htmlFor="range-month" className={`cursor-pointer ${(filterYear === ALL_YEARS_VALUE || filterMonth === ALL_MONTHS_VALUE) ? 'text-muted-foreground' : ''}`}>
                    All for {filterMonth !== ALL_MONTHS_VALUE && filterYear !== ALL_YEARS_VALUE ? `${months.find(m=>m.value===filterMonth)?.label} ${filterYear}` : "(select specific month/year)"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="range-all" />
                  <Label htmlFor="range-all" className="cursor-pointer">All Transactions</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full" disabled={isExporting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleExport} className="rounded-full shadow-md hover:shadow-lg" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
