import { NextRequest, NextResponse } from 'next/server';
import { testGoogleAIConnection } from '@/ai/test-connection';

export async function GET() {
  try {
    // Ensure we have a valid result before proceeding
    const result = await testGoogleAIConnection();
    
    // Verify result is a valid object before returning
    if (typeof result !== 'object' || result === null) {
      throw new Error('Invalid result from AI connection test');
    }
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 500 
    });
  } catch (error: any) {
    console.error('Test AI route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${error.message}` 
      },
      { status: 500 }
    );
  }
}