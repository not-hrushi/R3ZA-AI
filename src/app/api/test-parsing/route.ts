import { NextRequest, NextResponse } from 'next/server';
import { parseBankStatement } from '@/ai/flows/parse-bank-statement';

export async function POST(request: NextRequest) {
  try {
    const { testText } = await request.json();
    
    // Simple test input
    const sampleInput = {
      rawText: testText || `Date: 15/03/2024
UPI Payment to Zomato - Rs. 450.00 Dr
UPI Payment to Amazon Pay - Rs. 1200.00 Dr
Salary Credit - Rs. 50000.00 Cr`,
      userHints: {
        bankName: "Test Bank",
        accountType: "savings",
        expectedTransactions: 3
      }
    };
    
    console.log('Testing bank statement parsing with sample data...');
    
    const result = await parseBankStatement(sampleInput);
    
    return NextResponse.json({
      success: true,
      result,
      message: 'Parsing completed successfully'
    });
    
  } catch (error: any) {
    console.error('Test parsing failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Parsing failed'
    }, { status: 500 });
  }
}