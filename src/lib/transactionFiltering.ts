
import { type Transaction } from '@/services/transactionService';
import { parseISO, isValid, getYear, getMonth } from 'date-fns';

export interface TransactionFilters {
  searchTerm?: string;
  filterYear?: string | 'all-years';
  filterMonth?: string | 'all-months';
  filterType?: string;
}

const ALL_YEARS_VALUE = "all-years";
const ALL_MONTHS_VALUE = "all-months";

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  let itemsToProcess = [...transactions];
  const { searchTerm, filterYear, filterMonth, filterType } = filters;

  const currentFilterYear = (!filterYear || filterYear === ALL_YEARS_VALUE) ? "" : filterYear;
  const currentFilterMonth = (!filterMonth || filterMonth === ALL_MONTHS_VALUE) ? "" : filterMonth;

  if (filterType && filterType !== "all") {
    itemsToProcess = itemsToProcess.filter(t => t.type === filterType);
  }

  if (currentFilterYear) {
    itemsToProcess = itemsToProcess.filter(t => {
      if (!t.date) return false;
      const transactionDate = parseISO(t.date);
      return isValid(transactionDate) && getYear(transactionDate) === parseInt(currentFilterYear, 10);
    });
  }

  if (currentFilterMonth && currentFilterYear) {
    itemsToProcess = itemsToProcess.filter(t => {
      if (!t.date) return false;
      const transactionDate = parseISO(t.date);
      return isValid(transactionDate) && (getMonth(transactionDate) + 1) === parseInt(currentFilterMonth, 10);
    });
  }

  if (searchTerm) {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    itemsToProcess = itemsToProcess.filter(transaction =>
      (transaction.description && transaction.description.toLowerCase().includes(lowercasedSearchTerm)) ||
      (transaction.category && transaction.category.toLowerCase().includes(lowercasedSearchTerm)) ||
      (transaction.payee && transaction.payee.toLowerCase().includes(lowercasedSearchTerm))
    );
  }

  return itemsToProcess;
}
