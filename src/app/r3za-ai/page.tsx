
'use client';

import { R3zaAIChat } from '@/components/r3za-ai/r3za-ai-chat';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function R3zaAIPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">R3ZA AI Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Chat with your personal finance assistant to get insights, analyze spending, manage expenses, and more.
          </p>
        </div>
        
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle>Ask R3ZA AI</CardTitle>
            <CardDescription>
              I can help with analyzing expenses, budgeting advice, financial goals, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px]">
              <R3zaAIChat />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
