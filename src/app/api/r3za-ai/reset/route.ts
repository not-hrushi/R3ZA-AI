import { NextRequest, NextResponse } from 'next/server';
// Use a dynamic import for userConversations to prevent build-time evaluation
// This will ensure it's only imported during runtime, not during build

export async function POST(req: NextRequest) {
  try {
    // Dynamic import of the user conversations map
    const { userConversations } = await import('../route');
    
    // Safely extract userId from query parameters
    let userId = null;
    try {
      const url = new URL(req.url);
      userId = url.searchParams.get('userId');
    } catch (e) {
      console.warn('[r3za-ai/reset] Error parsing URL:', e);
    }
    
    // Safety check on userConversations to ensure it exists
    if (!userConversations || typeof userConversations.delete !== 'function') {
      console.warn('[r3za-ai/reset] userConversations map not available');
      return NextResponse.json({ success: false, message: 'Conversation service not initialized' });
    }
    
    if (userId) {
      // Reset specific user's conversation
      userConversations.delete(userId);
      console.log(`[r3za-ai/reset] Reset conversation history for user: ${userId}`);
    } else {
      // Reset all conversations if no userId provided
      userConversations.clear();
      console.log('[r3za-ai/reset] Reset all conversation histories');
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[r3za-ai/reset] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Internal Server Error: ${error?.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
