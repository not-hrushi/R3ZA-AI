import { NextRequest, NextResponse } from 'next/server';
import { userConversations } from '../route';

export async function POST(req: NextRequest) {
  try {
    // Get the userId from the request body if available
    let userId = null;
    
    // Only try to parse JSON if the request has content
    if (req.body) {
      try {
        const body = await req.json();
        userId = body?.userId;
      } catch (e) {
        console.log('[r3za-ai/reset] No valid JSON body provided or empty request');
        // Continue with userId as null
      }
    }
    
    if (userId) {
      // Reset specific user's conversation
      userConversations.delete(userId);
      console.log(`[r3za-ai/reset] Reset conversation history for user: ${userId}`);
    } else {
      // Reset all conversations if no userId provided
      // This is useful when the user closes the chat window without being logged in
      userConversations.clear();
      console.log('[r3za-ai/reset] Reset all conversation histories');
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[r3za-ai/reset] Error:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
