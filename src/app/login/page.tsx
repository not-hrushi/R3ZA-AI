
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, LogIn, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { FaqSection } from "@/components/common/faq-section";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), 
});

type LoginFormValues = z.infer<typeof loginSchema>;

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


const loginFaqs = [
  {
    question: "I forgot my password. What should I do?",
    answer: "Click the 'Forgot password?' link below the sign-in form. You'll be prompted to enter your email address, and we'll send you instructions to reset your password.",
  },
  {
    question: "What if I don't have an account yet?",
    answer: "Click the 'Sign Up' link below the sign-in form. Creating an account is free and gives you access to all FinanceFlow features.",
  },
  {
    question: "Is my login information secure?",
    answer: "Yes, we use Firebase Authentication, a secure service provided by Google, to handle all login processes. Ensure you use a strong, unique password for your account.",
  }
];

export default function LoginPage() {
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleEmailLogin = async (values: LoginFormValues) => {
    if (!signInWithEmail) return;
    setIsSubmittingForm(true);
    await signInWithEmail(values.email, values.password);
    setIsSubmittingForm(false); 
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmittingForm(true);
    await signInWithGoogle();
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
            <CardTitle className="text-3xl font-bold font-headline">Welcome Back!</CardTitle>
            <CardDescription>Sign in to continue to FinanceFlow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-6">
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
                            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-full shadow-lg hover:shadow-xl transition-shadow py-3 text-base" disabled={isSubmittingForm || loading}>
                  {isSubmittingForm && form.formState.isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                  Sign In
                </Button>
              </form>
            </Form>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={handleGoogleSignIn} className="w-full rounded-full shadow-md hover:shadow-lg transition-shadow py-3 text-base" disabled={isSubmittingForm || loading}>
              {isSubmittingForm ? <Loader2 className="animate-spin h-5 w-5" /> : <GoogleIcon />}
              Sign In with Google
            </Button>

          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 text-sm">
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </p>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
                Forgot password?
            </Link>
          </CardFooter>
        </Card>
        <FaqSection items={loginFaqs} title="Login Help" className="mt-8" />
      </div>
    </div>
  );
}
