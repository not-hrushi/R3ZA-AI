import { NextRequest, NextResponse } from 'next/server';
import { r3zaAIFlow } from '@/ai/flows/r3za-ai';

// Map to store conversation history for each user
// Export this so it can be accessed by the reset endpoint
export const userConversations = new Map<string, { role: string; content: string }[]>();

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId, resetConversation } = await req.json();

    if (!prompt || !userId) {
      return NextResponse.json({ error: 'Missing prompt or userId' }, { status: 400 });
    }

    // Initialize or reset conversation history if needed
    if (resetConversation || !userConversations.has(userId)) {
      userConversations.set(userId, []);
    }

    // Get current conversation history
    const conversationHistory = userConversations.get(userId) || [];
    
    // Add the user's new message to history
    conversationHistory.push({ role: 'user', content: prompt });
    
    // Call the AI flow with the complete conversation context
    const result = await r3zaAIFlow({ 
      prompt: prompt,
      userId: userId,
      previousMessages: conversationHistory
    });

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: 'assistant', content: result.response });
    
    // Update the conversation history
    userConversations.set(userId, conversationHistory);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
