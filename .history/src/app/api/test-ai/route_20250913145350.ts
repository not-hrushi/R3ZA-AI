import { NextRequest, NextResponse } from 'next/server';
import { testGoogleAIConnection } from '@/ai/test-connection';

export async function GET() {
  try {
    const result = await testGoogleAIConnection();
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 500 
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${error.message}` 
      },
      { status: 500 }
    );
  }
}