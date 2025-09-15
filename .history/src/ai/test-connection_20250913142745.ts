// Simple test to verify Google AI API connectivity
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const testPrompt = ai.definePrompt({
  name: 'testConnection',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: z.object({ message: z.string() }) },
  output: { schema: z.object({ response: z.string() }) },
  prompt: 'Respond with "Connection successful" to this message: {{message}}'
});

export async function testGoogleAIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Testing Google AI API connection...');
    
    const { output } = await testPrompt({ message: "test" });
    
    if (output?.response) {
      console.log('API test successful:', output.response);
      return { 
        success: true, 
        message: `API connection successful. Response: ${output.response}` 
      };
    } else {
      return { 
        success: false, 
        message: 'API responded but no output received' 
      };
    }
  } catch (error: any) {
    console.error('API test failed:', error);
    return { 
      success: false, 
      message: `API test failed: ${error.message}` 
    };
  }
}