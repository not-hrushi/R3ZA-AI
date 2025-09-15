'use client';

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp, Zap, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the PDF import component to avoid SSR issues
const PDFImportComponent = dynamic(
  () => import("@/components/transactions/pdf-import").then(mod => ({ default: mod.PDFImportComponent })),
  { 
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading PDF import component...</p>
        </CardContent>
      </Card>
    )
  }
);

export default function ImportTransactionsPage() {
  const router = useRouter();

  const handleImportComplete = (importedCount: number) => {
    // Redirect to transactions page after successful import
    setTimeout(() => {
      router.push('/transactions');
    }, 2000);
  };

  const handleCancel = () => {
    router.push('/transactions');
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Import Transactions</h1>
            <p className="text-muted-foreground mt-2">
              Automatically extract and import transactions from your bank statement PDFs
            </p>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/transactions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Transactions
            </Link>
          </Button>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <FileUp className="h-10 w-10 mx-auto text-primary" />
              <CardTitle className="text-lg">PDF Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Upload bank statement PDFs with support for password-protected files
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Zap className="h-10 w-10 mx-auto text-primary" />
              <CardTitle className="text-lg">AI-Powered Parsing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Advanced AI automatically extracts transaction data, categories, and payees
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="h-10 w-10 mx-auto text-primary" />
              <CardTitle className="text-lg">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                All processing happens locally in your browser for maximum security
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Main Import Component */}
        <PDFImportComponent 
          onImportComplete={handleImportComplete}
          onCancel={handleCancel}
        />

        {/* Subscription Detection Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Smart Subscription Detection
            </CardTitle>
            <CardDescription>
              After importing your transactions, automatically detect recurring subscriptions and create budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you've imported your transaction data, visit the <strong>Budgets</strong> page and use the 
                <strong> "Detect Subscriptions"</strong> feature to automatically:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Identify recurring payment patterns</li>
                <li>• Detect active subscriptions and services</li>
                <li>• Calculate monthly spending on subscriptions</li>
                <li>• Suggest budget allocations automatically</li>
                <li>• Find potentially unused subscriptions</li>
              </ul>
              <div className="flex gap-2 pt-2">
                <Link href="/budgets">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Go to Budgets
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supported Banks Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Supported Bank Formats
            </CardTitle>
            <CardDescription>
              This feature works best with statements from these popular Indian banks:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <h4 className="font-medium">Public Sector</h4>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• State Bank of India</li>
                  <li>• Bank of Baroda</li>
                  <li>• Punjab National Bank</li>
                  <li>• Canara Bank</li>
                </ul>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Private Banks</h4>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• HDFC Bank</li>
                  <li>• ICICI Bank</li>
                  <li>• Axis Bank</li>
                  <li>• Kotak Mahindra</li>
                </ul>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Digital Banks</h4>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Paytm Payments Bank</li>
                  <li>• Airtel Payments Bank</li>
                  <li>• India Post Bank</li>
                  <li>• Fino Payments Bank</li>
                </ul>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Other Formats</h4>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Standard CSV exports</li>
                  <li>• Account statements</li>
                  <li>• Transaction reports</li>
                  <li>• Mini statements</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              * While optimized for Indian banks, the system can process most PDF bank statements with standard formatting.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}