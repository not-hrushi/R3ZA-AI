'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { r3zaAIFlow } from '@/ai/flows/r3za-ai';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

export function R3zaAIChat() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize with welcome message when component mounts
  useEffect(() => {
    setMessages([{ 
      text: "Hi! I'm R3ZA AI. How can I help with your finances today?", 
      sender: 'ai' 
    }]);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const requestBody = { prompt: input, userId: user.uid };
    console.log('Sending request to /api/r3za-ai:', requestBody);

    try {
      const response = await fetch('/api/r3za-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('Received response from API. Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Parsed API response:', result);
      
      const aiMessage: Message = { text: result.response, sender: 'ai' };
      setMessages((prev) => [...prev, aiMessage]);

      if (result.mutation) {
        // A transaction was added, updated, or deleted.
        // Refresh the page to show the latest data.
        router.refresh();
      }
    } catch (error) {
      console.error('Error calling AI flow:', error);
      const errorMessage: Message = {
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="/logo.svg" alt="R3ZA AI" />
            <AvatarFallback>RA</AvatarFallback>
          </Avatar>
          R3ZA AI
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/logo.svg" alt="R3ZA AI" />
                    <AvatarFallback>RA</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/logo.svg" alt="R3ZA AI" />
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <div className="max-w-xs rounded-lg px-4 py-2 bg-muted">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            id="message"
            placeholder={user ? "Ask about your finances..." : "Please sign in to use the AI"}
            className="flex-1"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !user}
          />
          <Button type="submit" size="icon" disabled={isLoading || !user}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
