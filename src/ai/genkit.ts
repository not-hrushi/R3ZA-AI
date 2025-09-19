import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Fallback API key for production - you must set this in your Vercel environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY';

// Initialize Genkit with the Google AI plugin.
// Providing a fallback API key to ensure it works in production
export const ai = genkit({
  plugins: [googleAI({
    apiKey: GOOGLE_API_KEY
  })],
});
