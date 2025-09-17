import { NextRequest, NextResponse } from 'next/server';
import { userConversations } from '../route';

export async function POST(req: NextRequest) {
  try {
    // Extract userId from query parameters instead of body to avoid JSON parsing issues
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
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
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
