
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, UserPlus, Mail, KeyRound, User, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { FaqSection } from "@/components/common/faq-section";

const signUpSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

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

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" className="mr-2">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l0.002-0.001l6.19,5.238C39.988,36.057,44,30.454,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

const signupFaqs = [
  {
    question: "What information do I need to sign up?",
    answer: "You'll need to provide your email address and create a password. A display name is optional but recommended for a personalized experience.",
  },
  {
    question: "Why do I need a strong password?",
    answer: "A strong password (at least 6 characters, ideally with a mix of letters, numbers, and symbols) helps protect your financial data. Ensure your passwords match in both fields.",
  },
  {
    question: "Is signing up for FinanceFlow free?",
    answer: "Yes, creating an account with FinanceFlow is completely free and gives you access to all its features for managing your personal finances.",
  },
  {
    question: "What happens after I sign up?",
    answer: "After successfully signing up, you'll be automatically logged in and redirected to your dashboard, where you can start adding transactions, setting budgets, and exploring AI insights.",
  },
  {
    question: "I already have an account. How do I sign in?",
    answer: "If you already have an account, click the 'Sign In' link below the sign-up form.",
  }
];

export default function SignUpPage() {
  const { user, loading, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleEmailSignUp = async (values: SignUpFormValues) => {
    if (!signUpWithEmail) return;
    setIsSubmittingForm(true);
    await signUpWithEmail(values.email, values.password, values.displayName);
    setIsSubmittingForm(false);
  };

  const handleGoogleSignUp = async () => {
    setIsSubmittingForm(true);
    await signInWithGoogle(); // Same function handles sign-up for new Google users
    setIsSubmittingForm(false);
  }

  if (loading || (!loading && user)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md animate-fade-in">
        <FinanceFlowLogoSmall />
        <Card className="shadow-2xl rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-headline">Create Account</CardTitle>
            <CardDescription>Join FinanceFlow and start managing your finances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailSignUp)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground"/> Display Name (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} className="rounded-full text-base" disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground"/> Email
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} className="rounded-full text-base" disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" /> Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                            className="rounded-full text-base pr-10"
                            disabled={isSubmittingForm}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full" 
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isSubmittingForm}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" /> Confirm Password
                      </FormLabel>
                      <FormControl>
                         <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                            className="rounded-full text-base pr-10"
                            disabled={isSubmittingForm}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isSubmittingForm}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-full shadow-lg hover:shadow-xl transition-shadow py-3 text-base" disabled={isSubmittingForm || loading}>
                  {isSubmittingForm ? <Loader2 className="animate-spin h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  Sign Up
                </Button>
              </form>
            </Form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={handleGoogleSignUp} className="w-full rounded-full shadow-md hover:shadow-lg transition-shadow py-3 text-base" disabled={isSubmittingForm || loading}>
              {isSubmittingForm ? <Loader2 className="animate-spin h-5 w-5" /> : <GoogleIcon />}
              Sign Up with Google
            </Button>

          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 text-sm">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
        <FaqSection items={signupFaqs} title="Sign Up Help" className="mt-8" />
      </div>
    </div>
  );
}
