
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, TrendingUp, ShieldCheck, Zap, UserPlus, PlayCircle } from "lucide-react";
import Link from "next/link";
import { FaqSection } from "@/components/common/faq-section";

const FinanceFlowLogoLarge = () => (
  <div className="flex items-center justify-center gap-3 text-primary font-bold text-4xl sm:text-5xl mb-6">
     <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
    <span className="font-headline">FinanceFlow</span>
  </div>
);

const homeFaqs = [
  {
    question: "What is FinanceFlow?",
    answer: "FinanceFlow is a modern web application designed to help you take control of your personal finances. It allows you to track income and expenses, set budgets, and gain AI-powered insights to make smarter financial decisions.",
  },
  {
    question: "Who is FinanceFlow for?",
    answer: "FinanceFlow is for anyone looking for an intuitive and powerful tool to manage their money, understand their spending habits, and work towards financial goals, from students to seasoned professionals.",
  },
  {
    question: "Can I try FinanceFlow without creating an account?",
    answer: "Yes! Click the 'Try Demo' button. You can explore all features using local storage in your browser. Your data won't be saved permanently or synced across devices unless you sign up for a free account.",
  },
  {
    question: "What are the key benefits of using FinanceFlow?",
    answer: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Clarity:</strong> Visualize your financial health with interactive charts and summaries.</li>
          <li><strong>Control:</strong> Set budgets for different categories and track your progress in real-time.</li>
          <li><strong>Insights:</strong> Leverage AI to analyze spending, predict future expenses, and get personalized financial goal suggestions.</li>
          <li><strong>Accessibility:</strong> Access your financial data from anywhere by signing up for a free account.</li>
        </ul>
      </>
    ),
  },
  {
    question: "Is it secure to manage my financial data with FinanceFlow?",
    answer: "Yes, when you sign up, FinanceFlow is built on Firebase, a secure platform from Google, for authentication and data storage. We recommend using a strong, unique password for your account to further enhance security. Data in Guest Mode is stored locally in your browser and is not transmitted.",
  },
  {
    question: "How do I get started with an account?",
    answer: "Click the 'Get Started' button! You can easily sign up for a free account. Once logged in, you can start adding transactions, setting budgets, and exploring the AI-driven insights, with your data securely saved.",
  }
];


export default function HomePage() {
  const { user, loading, isGuest, enterGuestMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if logged in or already in guest mode
    if (!loading && (user || isGuest)) {
      router.push("/dashboard");
    }
  }, [user, loading, isGuest, router]);

  if (loading || (!loading && (user || isGuest))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Outermost container with the primary background for the entire page
    <div className="flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section - Designed to be centered in the initial viewport */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-500">
        <div className="w-full max-w-2xl text-center animate-fade-in">
          <FinanceFlowLogoLarge />
          <h1 className="text-4xl sm:text-5xl font-extrabold font-headline mb-6 text-foreground">
            Take Control of Your Finances
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            FinanceFlow helps you track spending, manage budgets, and gain AI-powered insights to achieve your financial goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow py-7 px-10 text-lg group">
              <Link href="/signup">
                <UserPlus className="mr-2 h-5 w-5"/> Get Started Free
              </Link>
            </Button>
            <Button onClick={enterGuestMode} variant="outline" size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow py-7 px-10 text-lg group">
               <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Try Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Container for ALL content BELOW the hero */}
      <div className="px-4 sm:px-6"> {/* Horizontal padding only for this wrapper */}
        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl w-full mx-auto mt-12 sm:mt-16 mb-10 sm:mb-14">
          {[
            { icon: TrendingUp, title: "Smart Tracking", description: "Visualize income and expenses with interactive charts." },
            { icon: ShieldCheck, title: "AI Insights", description: "Get personalized suggestions to optimize your budget." },
            { icon: Zap, title: "Effortless Budgeting", description: "Set goals and track progress with ease." },
          ].map((feature, index) => (
            <div key={index} className="bg-card p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1 animate-fade-in" style={{animationDelay: `${0.2 * (index + 1)}s`}}>
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold font-headline text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
        
        {/* FAQ Section Wrapper*/}
        <div className="max-w-4xl w-full mx-auto mb-10 sm:mb-14">
          <FaqSection items={homeFaqs} />
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-muted-foreground max-w-4xl w-full mx-auto">
          <p>&copy; {new Date().getFullYear()} FinanceFlow. Secure and Smart Financial Management. Made by Souvik Bagchi.</p>
        </footer>
      </div>
    </div>
  );
}
