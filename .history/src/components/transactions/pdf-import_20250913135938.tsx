'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, Download, Eye, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseBankStatement, type ParseBankStatementInput, type ParseBankStatementOutput } from '@/ai/flows/parse-bank-statement';
import { addTransaction, type NewTransactionData } from '@/services/transactionService';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

interface ImportedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  payee?: string;
  category?: string;
  confidence: number;
  selected: boolean;
  processed?: boolean;
}

interface PDFImportProps {
  onImportComplete?: (importedCount: number) => void;
  onCancel?: () => void;
}

export function PDFImportComponent({ onImportComplete, onCancel }: PDFImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Client-side only check
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Import state
  const [extractedText, setExtractedText] = useState('');
  const [parsedData, setParsedData] = useState<ParseBankStatementOutput | null>(null);
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // UI state
  const [showRawText, setShowRawText] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a PDF file.',
          variant: 'destructive'
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File Too Large',
          description: 'Please select a PDF file smaller than 10MB.',
          variant: 'destructive'
        });
        return;
      }
      
      setSelectedFile(file);
      setPassword('');
      setIsPasswordRequired(false);
      setExtractedText('');
      setParsedData(null);
      setImportedTransactions([]);
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // Step 1: Extract text from PDF
      setProcessingStep('Extracting text from PDF...');
      setProcessingProgress(20);
      
      const extractResult: PDFImportResult = await extractTextFromPDF(selectedFile, password);
      
      if (!extractResult.success) {
        if (extractResult.requiresPassword) {
          setIsPasswordRequired(true);
          setIsProcessing(false);
          return;
        }
        throw new Error(extractResult.error || 'Failed to extract text from PDF');
      }

      const rawText = extractResult.text || '';
      setExtractedText(rawText);
      
      // Step 2: Validate bank statement
      setProcessingStep('Validating bank statement...');
      setProcessingProgress(40);
      
      const validation = validateBankStatement(rawText);
      if (!validation.isValid) {
        throw new Error(validation.reason || 'Document does not appear to be a valid bank statement');
      }

      // Step 3: Preprocess text
      setProcessingStep('Preprocessing text...');
      setProcessingProgress(50);
      
      const preprocessedText = preprocessBankStatementText(rawText);

      // Step 4: Parse with AI
      setProcessingStep('Parsing transactions with AI...');
      setProcessingProgress(70);
      
      const parseInput: ParseBankStatementInput = {
        rawText: preprocessedText,
        userHints: {
          bankName: '', // Could be added as user input
          accountType: 'savings',
          expectedTransactions: undefined
        }
      };
      
      const parseResult = await parseBankStatement(parseInput);
      setParsedData(parseResult);

      // Step 5: Convert to importable format
      setProcessingStep('Preparing transactions for import...');
      setProcessingProgress(90);
      
      const importableTransactions: ImportedTransaction[] = parseResult.transactions.map((transaction, index) => ({
        id: `import-${index}`,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        payee: transaction.payee,
        category: transaction.category,
        confidence: transaction.confidence,
        selected: transaction.confidence >= 0.7, // Auto-select high confidence transactions
        processed: false
      }));
      
      setImportedTransactions(importableTransactions);
      setIsPreviewMode(true);
      setProcessingProgress(100);
      setProcessingStep('Processing complete!');
      
      toast({
        title: 'PDF Processed Successfully',
        description: `Found ${importableTransactions.length} transactions. Review and import below.`,
      });

    } catch (error: any) {
      console.error('PDF processing error:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process PDF. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      toast({
        title: 'Password Required',
        description: 'Please enter the PDF password.',
        variant: 'destructive'
      });
      return;
    }
    processFile();
  };

  const toggleTransactionSelection = (id: string) => {
    setImportedTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const selectAll = () => {
    setImportedTransactions(prev =>
      prev.map(t => ({ ...t, selected: true }))
    );
  };

  const deselectAll = () => {
    setImportedTransactions(prev =>
      prev.map(t => ({ ...t, selected: false }))
    );
  };

  const removeTransaction = (id: string) => {
    setImportedTransactions(prev => prev.filter(t => t.id !== id));
  };

  const importSelectedTransactions = async () => {
    if (!user?.uid) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to import transactions.',
        variant: 'destructive'
      });
      return;
    }

    const selectedTransactions = importedTransactions.filter(t => t.selected && !t.processed);
    if (selectedTransactions.length === 0) {
      toast({
        title: 'No Transactions Selected',
        description: 'Please select at least one transaction to import.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Importing transactions...');
    let importedCount = 0;
    let errors = 0;

    for (const transaction of selectedTransactions) {
      try {
        const newTransactionData: NewTransactionData = {
          date: transaction.date,
          description: transaction.description,
          category: transaction.category || 'Other',
          amount: transaction.amount,
          type: transaction.type === 'credit' ? 'income' : 'expense',
          payee: transaction.payee || ''
        };

        await addTransaction(user.uid, newTransactionData);
        
        // Mark as processed
        setImportedTransactions(prev =>
          prev.map(t => t.id === transaction.id ? { ...t, processed: true } : t)
        );
        
        importedCount++;
        setProcessingProgress((importedCount / selectedTransactions.length) * 100);
      } catch (error) {
        console.error('Error importing transaction:', error);
        errors++;
      }
    }

    setIsProcessing(false);
    
    if (importedCount > 0) {
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${importedCount} transaction${importedCount > 1 ? 's' : ''}${errors > 0 ? `. ${errors} failed.` : '.'}`,
      });
      
      onImportComplete?.(importedCount);
    } else {
      toast({
        title: 'Import Failed',
        description: 'No transactions were imported. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const selectedCount = importedTransactions.filter(t => t.selected && !t.processed).length;
  const processedCount = importedTransactions.filter(t => t.processed).length;

  // Prevent rendering during SSR
  if (!isMounted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading PDF import component...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bank Statement PDF
          </CardTitle>
          <CardDescription>
            Upload your bank statement PDF to automatically extract and import transactions. 
            Supports password-protected files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pdf-file">Select PDF File</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="mt-1"
              disabled={isProcessing}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {isPasswordRequired && (
            <div className="space-y-2">
              <Label htmlFor="pdf-password">PDF Password</Label>
              <div className="flex gap-2">
                <Input
                  id="pdf-password"
                  type="password"
                  placeholder="Enter PDF password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
                <Button onClick={handlePasswordSubmit} disabled={!password.trim()}>
                  Unlock
                </Button>
              </div>
            </div>
          )}

          {selectedFile && !isPasswordRequired && (
            <Button 
              onClick={processFile} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {processingStep}
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Process PDF
                </>
              )}
            </Button>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{processingStep}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Parsing Results
            </CardTitle>
            <CardDescription>
              Bank statement processed successfully. Review the extracted information below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {parsedData.bankName && (
                <div>
                  <Label className="text-sm font-medium">Bank</Label>
                  <p className="text-sm">{parsedData.bankName}</p>
                </div>
              )}
              {parsedData.accountNumber && (
                <div>
                  <Label className="text-sm font-medium">Account (Last 4 digits)</Label>
                  <p className="text-sm">****{parsedData.accountNumber}</p>
                </div>
              )}
              {parsedData.statementPeriod && (
                <div>
                  <Label className="text-sm font-medium">Statement Period</Label>
                  <p className="text-sm">{parsedData.statementPeriod}</p>
                </div>
              )}
            </div>
            
            {parsedData.parsingNotes && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{parsedData.parsingNotes}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawText(!showRawText)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showRawText ? 'Hide' : 'Show'} Raw Text
              </Button>
            </div>

            {showRawText && extractedText && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Extracted Text</Label>
                <div className="mt-1 p-3 bg-muted rounded-md text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {extractedText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Preview */}
      {isPreviewMode && importedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Import Transactions ({importedTransactions.length} found)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Review and select transactions to import. High-confidence transactions are pre-selected.
              {processedCount > 0 && (
                <span className="block text-green-600 mt-1">
                  ✓ {processedCount} transaction{processedCount > 1 ? 's' : ''} already imported
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {importedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    transaction.processed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                      : transaction.selected 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={transaction.selected}
                      onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                      disabled={transaction.processed || isProcessing}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{transaction.description}</span>
                        <Badge
                          variant={transaction.type === 'credit' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(transaction.confidence * 100)}% confidence
                        </Badge>
                        {transaction.processed && (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Imported
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(transaction.date), 'dd MMM yyyy')} • {transaction.category} 
                        {transaction.payee && ` • ${transaction.payee}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTransaction(transaction.id)}
                    disabled={transaction.processed || isProcessing}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} selected for import
              </p>
              <div className="flex gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={importSelectedTransactions}
                  disabled={selectedCount === 0 || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help/Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use clear, high-quality PDF bank statements for best results</li>
            <li>• Monthly statements typically work better than daily statements</li>
            <li>• Make sure the PDF contains transaction details, not just summaries</li>
            <li>• For password-protected PDFs, ensure you have the correct password</li>
            <li>• Review all transactions before importing - AI parsing may not be 100% accurate</li>
            <li>• Duplicate transactions will be added - you may need to manually remove them</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}