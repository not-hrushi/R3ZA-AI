import { NextRequest, NextResponse } from 'next/server';

// Map to store conversation history for each user
// Export this so it can be accessed by the reset endpoint
export const userConversations = new Map<string, { role: string; content: string }[]>();

export async function POST(req: NextRequest) {
  try {
    // More robust JSON parsing
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error('[r3za-ai] JSON parse error:', e);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { prompt, userId, resetConversation } = reqData || {};

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
    
    // Dynamically import the AI flow to prevent issues during build time
    const { r3zaAIFlow } = await import('@/ai/flows/r3za-ai');
    
    // Call the AI flow with the complete conversation context
    const result = await r3zaAIFlow({ 
      prompt: prompt,
      userId: userId,
      previousMessages: conversationHistory
    });

    // Ensure we have a valid result before proceeding
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid result from AI flow');
    }

    // Make sure we have a response property or provide a default
    const response = result.response || 'I apologize, but I couldn\'t generate a response at this time.';
    
    // Add the AI's response to the conversation history
    conversationHistory.push({ role: 'assistant', content: response });
    
    // Update the conversation history
    userConversations.set(userId, conversationHistory);

    // Ensure we return a proper JSON serializable object
    return NextResponse.json({
      response: response,
      mutation: !!result.mutation
    });
  } catch (error: any) {
    console.error('[r3za-ai] API route error:', error);
    return NextResponse.json({ 
      error: `Internal Server Error: ${error?.message || 'Unknown error'}`,
      response: 'I apologize, but I encountered an error processing your request.'
    }, { status: 500 });
  }
}
