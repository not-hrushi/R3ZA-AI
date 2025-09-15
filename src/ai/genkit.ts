import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit with the Google AI plugin.
// The GOOGLE_API_KEY environment variable should be set for this plugin to work.
// Model selection will occur within individual flow definitions or generate calls.
export const ai = genkit({
  plugins: [googleAI()],
});
