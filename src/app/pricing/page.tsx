
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, TrendingUp, Goal, Lightbulb, LogIn, UserCheck, PlayCircle, Database, Cloud } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { FaqSection } from "@/components/common/faq-section";

const FeatureItem = ({ text, icon: Icon }: { text: string; icon: React.ElementType }) => (
  <li className="flex items-center space-x-3">
    <Icon className="h-5 w-5 text-primary flex-shrink-0" />
    <span className="text-foreground">{text}</span>
  </li>
);

const pricingFaqs = [
  {
    question: "What features are included with FinanceFlow?",
    answer: (
      <>
        <p>All FinanceFlow features are available for free upon creating an account. You can also try the app in Guest Mode.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Income and Expense Tracking</li>
          <li>Advanced Budgeting Tools</li>
          <li>Unlimited Custom Spending Categories</li>
          <li>Data Export (Conceptual)</li>
          <li>AI-Powered Spending Analysis</li>
          <li>AI Financial Goal Suggestions</li>
          <li>AI Future Expense Prediction</li>
          <li>Secure Account Management & Profile Customization (for registered users)</li>
          <li>Light and Dark Mode UI</li>
        </ul>
      </>
    ),
  },
  {
    question: "What is Guest Mode?",
    answer: "Guest Mode allows you to try all features of FinanceFlow without creating an account. Your data (transactions, budgets) will be stored temporarily in your web browser's local storage. This data is not saved to the cloud and will be lost if you clear your browser data or switch browsers/devices. To save your data permanently and access it anywhere, please sign up for a free account.",
  },
  {
    question: "What are the benefits of creating an account?",
    answer: "Creating a free account allows you to securely save your financial data in the cloud. This means you can access your information from any device, and your data is backed up. You also get access to profile customization and account management features.",
  },
  {
    question: "How do I access the AI features?",
    answer: "Navigate to the 'Insights' page. You'll find tools for spending analysis, goal suggestions, and expense prediction. Ensure you have some transaction data logged (either in guest mode or with your account) for the best results.",
  },
  {
    question: "Is my financial data secure if I create an account?",
    answer: "Yes. When you create an account, FinanceFlow uses Firebase, a secure platform by Google, for authentication and database management. Always use a strong, unique password for your account.",
  }
];

export default function PricingPage() {
  const { user, loading, isGuest, enterGuestMode } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-12 max-w-4xl mx-auto animate-fade-in">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline tracking-tight text-primary">
            Empowering Your Financial Journey
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            FinanceFlow offers a comprehensive suite of tools, available to all users. Try it out or sign up to save your progress!
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-xl rounded-xl border-2 border-primary/30 flex flex-col">
            <CardHeader className="text-center pb-4">
              <Cloud className="h-12 w-12 text-primary mx-auto mb-3" />
              <CardTitle className="text-3xl font-semibold">Registered Account</CardTitle>
              <CardDescription>Full Power & Peace of Mind - Free!</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 pt-4">
              <ul className="space-y-3 text-sm sm:text-base">
                <FeatureItem text="All Core Features Included" icon={CheckCircle} />
                <FeatureItem text="Secure Cloud Data Storage" icon={CheckCircle} />
                <FeatureItem text="Access Across Devices" icon={CheckCircle} />
                <FeatureItem text="Profile Customization" icon={CheckCircle} />
                <FeatureItem text="Permanent Data Record" icon={CheckCircle} />
              </ul>
              <p className="text-center text-muted-foreground text-sm pt-2">
                Sign up to securely save your financial data and access it anywhere.
              </p>
            </CardContent>
            <CardFooter className="pt-6">
              {loading ? (
                <Button className="w-full rounded-full shadow-lg" disabled>Loading...</Button>
              ) : user && !isGuest ? (
                <Button variant="outline" className="w-full rounded-full" asChild>
                  <Link href="/dashboard"><UserCheck className="mr-2 h-5 w-5" /> Go to Dashboard</Link>
                </Button>
              ) : (
                <Button className="w-full rounded-full shadow-lg hover:shadow-xl transition-shadow" asChild>
                  <Link href="/signup"><LogIn className="mr-2 h-5 w-5" /> Sign Up Free</Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card className="shadow-xl rounded-xl border-2 border-accent/30 flex flex-col">
            <CardHeader className="text-center pb-4">
              <Database className="h-12 w-12 text-accent mx-auto mb-3" />
              <CardTitle className="text-3xl font-semibold">Guest Mode (Try Demo)</CardTitle>
              <CardDescription>Explore Features, Data Stored Locally</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 pt-4">
              <ul className="space-y-3 text-sm sm:text-base">
                <FeatureItem text="All Core Features Included" icon={CheckCircle} />
                <FeatureItem text="Data Stored in Your Browser" icon={CheckCircle} />
                <FeatureItem text="No Account Needed to Start" icon={CheckCircle} />
                <FeatureItem text="Great for Quick Exploration" icon={CheckCircle} />
                <FeatureItem text="Data is Not Synced or Backed Up" icon={Zap} />
              </ul>
               <p className="text-center text-muted-foreground text-sm pt-2">
                Your data in guest mode is temporary and browser-specific.
              </p>
            </CardContent>
            <CardFooter className="pt-6">
               {loading ? (
                <Button className="w-full rounded-full shadow-lg" disabled>Loading...</Button>
              ) : isGuest ? (
                 <Button variant="outline" className="w-full rounded-full" asChild>
                  <Link href="/dashboard"><UserCheck className="mr-2 h-5 w-5" /> Continue as Guest</Link>
                </Button>
              ) : (
                <Button onClick={enterGuestMode} variant="outline" className="w-full rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  <PlayCircle className="mr-2 h-5 w-5" /> Try Demo Now
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <FaqSection items={pricingFaqs} title="Understanding FinanceFlow Access" />
      </div>
    </AppLayout>
  );
}
