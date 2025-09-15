
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqSectionProps {
  title?: string;
  items: FaqItem[];
  className?: string;
}

export function FaqSection({ title = "Frequently Asked Questions", items, className }: FaqSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className={cn("mt-12 shadow-lg rounded-xl animate-fade-in", className)}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold font-headline flex items-center">
          <HelpCircle className="mr-3 h-7 w-7 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {items.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-b-0">
              <AccordionTrigger className="text-left hover:no-underline text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                {typeof item.answer === 'string' ? <p>{item.answer}</p> : item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Helper function to create cn if not already available in this context (e.g. if utils isn't imported)
// However, it's better to ensure cn is available from "@/lib/utils" in actual project structure
const cn = (...inputs: any[]) => {
  return inputs.filter(Boolean).join(' ');
}
