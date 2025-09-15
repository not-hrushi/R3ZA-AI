
"use client";

import type { Transaction } from "@/services/transactionService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, CalendarDays, Tag, Building, MessageSquare, IndianRupee, AlertTriangle, Repeat } from "lucide-react";

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEdit: (transactionId: string) => void;
  onDelete: (transactionId: string) => void;
}

export function TransactionDetailDialog({
  transaction,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const typeLabel = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
  const typeColorClass = 
    transaction.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-500' 
    : transaction.type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-500' 
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-500'; // Subscription

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Transaction Details</DialogTitle>
          <DialogDescription>
            Overview of your financial activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3">
            <IndianRupee className={`h-6 w-6 ${transaction.type === 'income' ? 'text-green-500' : (transaction.type === 'expense' || transaction.type === 'subscription') ? 'text-red-500' : 'text-muted-foreground'}`} />
            <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : (transaction.type === 'expense' || transaction.type === 'subscription') ? 'text-red-600' : 'text-foreground'}`}>
              {transaction.type === 'income' ? '+' : '-'}₹{Math.abs(transaction.amount).toFixed(2)}
            </p>
            <Badge variant={transaction.type === 'income' ? 'default' : transaction.type === 'expense' ? 'destructive' : 'secondary'} className={`${typeColorClass} rounded-full`}>
                {transaction.type === 'subscription' && <Repeat className="inline -ml-0.5 mr-1 h-3 w-3"/>}
                {typeLabel}
            </Badge>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start">
              <MessageSquare className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="font-medium text-foreground">Description:</span>
                <p className="text-muted-foreground">{transaction.description}</p>
              </div>
            </div>
            {transaction.payee && (
              <div className="flex items-start">
                <Building className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground">Payee/Vendor:</span>
                  <p className="text-muted-foreground">{transaction.payee}</p>
                </div>
              </div>
            )}
            <div className="flex items-start">
              <Tag className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="font-medium text-foreground">{transaction.type === 'subscription' ? 'Subscription Name:' : 'Category:'}</span>
                <p className="text-muted-foreground">{transaction.category}</p>
              </div>
            </div>
            <div className="flex items-start">
              <CalendarDays className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
               <div>
                <span className="font-medium text-foreground">Date:</span>
                <p className="text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
             {transaction.createdAt && (
                <div className="flex items-start">
                    <CalendarDays className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                        <span className="font-medium text-foreground">Recorded:</span>
                        <p className="text-muted-foreground">{new Date(transaction.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            Close
          </Button>
          <Button variant="outline" onClick={() => onEdit(transaction.id)} className="rounded-full">
            <Edit2 className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => onDelete(transaction.id)} className="rounded-full">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
