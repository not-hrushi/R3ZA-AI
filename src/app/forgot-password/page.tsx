
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Send, Loader2 } from "lucide-react"; // Added Loader2
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from "firebase/auth"; // Import if using Firebase
import { auth } from "@/lib/firebase"; // Import if using Firebase


const FinanceFlowLogoSmall = () => (
  <Link href="/" className="flex items-center justify-center gap-2 text-primary font-semibold text-2xl mb-4">
     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
    <span className="font-headline">FinanceFlow</span>
  </Link>
);

const forgotPasswordFaqs = [
  {
    question: "How does the password reset process work?",
    answer: "Enter the email address associated with your FinanceFlow account. If an account exists for that email, we will send a password reset link to your inbox. Follow the instructions in the email to create a new password.",
  },
  {
    question: "I entered my email but didn't receive a reset link. What should I do?",
    answer: "First, check your spam or junk folder. If it's not there, ensure you entered the correct email address associated with your account. If you're still having trouble, it's possible no account is registered with that email.",
  },
  {
    question: "How long is the password reset link valid?",
    answer: "Password reset links are typically time-sensitive for security reasons. Please use the link as soon as you receive it. If it expires, you can request a new one.",
  },
  {
    question: "Can I use my old password when resetting?",
    answer: "For security best practices, it's generally recommended to choose a new, unique password that you haven't used before for your FinanceFlow account.",
  }
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions to reset your password." });
      setEmail("");
    } catch (error: any) {
      // Firebase's sendPasswordResetEmail doesn't throw an error if the email doesn't exist to prevent email enumeration.
      // So, we generally show a success message regardless, unless a specific error occurs (like invalid email format).
      if (error.code === 'auth/invalid-email') {
        toast({ title: "Error", description: "The email address is not valid.", variant: "destructive" });
      } else if (error.code === 'auth/too-many-requests') {
         toast({ title: "Too Many Requests", description: "Please wait a while before trying again.", variant: "destructive" });
      }
      else {
        // For other errors or if email does not exist, Firebase doesn't explicitly fail.
        // We still show a positive message to avoid user enumeration.
        toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, you will receive an email with reset instructions.` });
        setEmail(""); // Clear email even on generic "success"
      }
      console.error("Password reset error:", error.message, error.code);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md animate-fade-in">
        <FinanceFlowLogoSmall />
        <Card className="shadow-2xl rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-headline">Forgot Password?</CardTitle>
            <CardDescription>Enter your email address and we&apos;ll send you a link to reset your password.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="email" className="flex items-center mb-1">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground"/> Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-full text-base"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full rounded-full shadow-lg hover:shadow-xl transition-shadow py-3 text-base" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                Send Reset Link
              </Button>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col items-center text-sm">
            <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
              </Link>
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
