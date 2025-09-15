
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Loader2 } from "lucide-react";
import Link from "next/link"; 

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isGuest } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isGuest) { 
      router.push("/");
    }
  }, [user, loading, isGuest, router]); 

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isGuest) { 
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* 
        Mobile header: h-16 (4rem). pt-16 ensures content starts below.
        Desktop pill header: h-12 (3rem) + sticky top-2 (0.5rem) = 3.5rem from viewport top.
        md:pt-[4.5rem] (or md:pt-18) provides a 1rem buffer below the desktop pill.
      */}
      <main className="flex-grow pt-16 md:pt-[4.5rem] pb-8 px-4 sm:px-6 lg:px-8"> 
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} FinanceFlow. All rights reserved. Made by Souvik Bagchi.
      </footer>
    </div>
  );
}
