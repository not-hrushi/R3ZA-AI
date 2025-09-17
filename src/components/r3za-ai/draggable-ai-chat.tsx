
'use client';

import { useState, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { R3zaAIChat } from './r3za-ai-chat';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function DraggableAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRefButton = useRef(null);
  const nodeRefCard = useRef(null);
  const { user } = useAuth();
  
  // Handle closing the chat - will trigger conversation reset
  const handleClose = useCallback(() => {
    setIsOpen(false);
    
    // Reset AI conversation history by sending a reset signal to the API
    // Include user ID if available to only reset that user's conversation
    const resetUrl = user?.uid 
      ? `/api/r3za-ai/reset?userId=${user.uid}`
      : '/api/r3za-ai/reset';
      
    fetch(resetUrl, {
      method: 'POST',
    }).catch(err => console.error('Failed to reset AI conversation:', err));
  }, [user]);

  return (
    <>
      {!isOpen && (
        <Draggable nodeRef={nodeRefButton}>
          <div ref={nodeRefButton} className="fixed bottom-4 right-4" style={{ zIndex: 1000 }}>
            <Button
              className="w-16 h-16 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle size={32} />
            </Button>
          </div>
        </Draggable>
      )}

      {isOpen && (
        <Draggable handle=".handle" nodeRef={nodeRefCard}>
          <div ref={nodeRefCard} style={{ zIndex: 1000 }}>
            <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-lg flex flex-col">
              <CardHeader className="handle cursor-move flex flex-row items-center justify-between">
                <CardTitle>R3ZA AI</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-grow p-0">
                <R3zaAIChat />
              </CardContent>
            </Card>
          </div>
        </Draggable>
      )}
    </>
  );
}
