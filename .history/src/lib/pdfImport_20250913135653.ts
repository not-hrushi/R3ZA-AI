'use client';

// Note: This module is designed to work in the browser environment
// PDF processing will be done client-side for security and privacy

export interface PDFImportResult {
  success: boolean;
  text?: string;
  error?: string;
  requiresPassword?: boolean;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  payee?: string;
  category?: string;
  confidence: number; // 0-1 score for parsing confidence
}

export interface BankStatementData {
  transactions: ParsedTransaction[];
  accountNumber?: string;
  statementPeriod?: string;
  bankName?: string;
}

/**
 * Extract text from PDF file with optional password support
 */
export async function extractTextFromPDF(file: File, password?: string): Promise<PDFImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    try {
      // Load PDF document with PDF.js
      const loadingTask = getDocument({
        data: arrayBuffer,
        password: password || undefined
      });
      
      const pdfDocument = await loadingTask.promise;
      let fullText = '';

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        return {
          success: false,
          error: 'No text content found in PDF. The file might be image-based or corrupted.'
        };
      }

      return {
        success: true,
        text: fullText
      };

    } catch (error: any) {
      console.error('PDF parsing error:', error);
      
      // Check if it's a password-related error
      if (error.name === 'PasswordException' || 
          error.message?.includes('password') || 
          error.message?.includes('encrypted')) {
        if (!password) {
          return {
            success: false,
            requiresPassword: true,
            error: 'This PDF is password protected. Please provide the password.'
          };
        } else {
          return {
            success: false,
            error: 'Incorrect password provided.'
          };
        }
      }

      // For other errors, try using pdf-lib for basic validation
      try {
        await PDFDocument.load(arrayBuffer);
        
        // PDF-lib doesn't have built-in text extraction, so we'll return a message
        return {
          success: false,
          error: 'This PDF format is not supported for text extraction. Please try a different PDF or convert it to a standard format.'
        };
      } catch (pdfLibError: any) {
        if (pdfLibError.message?.includes('password') || pdfLibError.message?.includes('encrypted')) {
          return {
            success: false,
            requiresPassword: true,
            error: 'This PDF is password protected. Please provide the password.'
          };
        }
        
        return {
          success: false,
          error: `Unable to process PDF: ${error.message || 'Unknown error occurred'}`
        };
      }
    }

  } catch (error: any) {
    console.error('File processing error:', error);
    return {
      success: false,
      error: `File processing failed: ${error.message || 'Unknown error occurred'}`
    };
  }
}

/**
 * Clean and preprocess extracted PDF text for better parsing
 */
export function preprocessBankStatementText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page headers/footers that might contain account numbers
    .replace(/Page \d+ of \d+/gi, '')
    // Remove common bank statement headers
    .replace(/Statement of Account|Account Statement|Transaction History/gi, '')
    // Normalize date formats
    .replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g, '$1/$2/$3')
    // Clean up currency symbols and amounts
    .replace(/Rs\.?\s*/gi, '₹')
    .replace(/INR\s*/gi, '₹')
    // Remove extra spaces around currency
    .replace(/\s+₹\s*/g, ' ₹')
    .trim();
}

/**
 * Validate if the text looks like a bank statement
 */
export function validateBankStatement(text: string): { isValid: boolean; reason?: string } {
  const indicators = [
    /balance|transaction|credit|debit|statement/i,
    /₹|rs\.?|inr|\$|amount/i,
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, // Date patterns
    /account|bank|branch/i
  ];

  const foundIndicators = indicators.filter(pattern => pattern.test(text));
  
  if (foundIndicators.length < 2) {
    return {
      isValid: false,
      reason: 'Document does not appear to contain bank transaction data'
    };
  }

  if (text.length < 100) {
    return {
      isValid: false,
      reason: 'Document appears to be too short for a bank statement'
    };
  }

  return { isValid: true };
}

/**
 * Extract basic transaction patterns from text using regex
 * This is a fallback method before AI processing
 */
export function extractBasicTransactionPatterns(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Look for patterns like: Date Description Amount
    const transactionMatch = line.match(
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+₹?\s*([+-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    );

    if (transactionMatch) {
      const [, date, description, amountStr] = transactionMatch;
      const amount = parseFloat(amountStr.replace(/[,₹]/g, ''));
      
      if (!isNaN(amount) && Math.abs(amount) > 0) {
        transactions.push({
          date: date,
          description: description.trim(),
          amount: Math.abs(amount),
          type: amount >= 0 ? 'credit' : 'debit',
          confidence: 0.6 // Basic regex parsing has medium confidence
        });
      }
    }
  }

  return transactions;
}

/**
 * Auto-categorize transactions based on description
 */
export function categorizeTransaction(description: string): string {
  const categories = {
    'Food & Dining': [
      'restaurant', 'cafe', 'pizza', 'burger', 'food', 'dining', 'zomato', 'swiggy',
      'mcdonald', 'kfc', 'subway', 'dominos', 'starbucks'
    ],
    'Transportation': [
      'uber', 'ola', 'taxi', 'fuel', 'petrol', 'diesel', 'gas', 'parking',
      'metro', 'bus', 'train', 'flight', 'airline'
    ],
    'Shopping': [
      'amazon', 'flipkart', 'mall', 'store', 'shopping', 'purchase', 'buy',
      'market', 'bazaar', 'retail'
    ],
    'Entertainment': [
      'movie', 'cinema', 'netflix', 'prime', 'spotify', 'youtube', 'game',
      'entertainment', 'theater', 'concert'
    ],
    'Utilities': [
      'electricity', 'water', 'gas', 'internet', 'broadband', 'wifi',
      'mobile', 'phone', 'recharge', 'bill', 'utility'
    ],
    'Healthcare': [
      'hospital', 'clinic', 'doctor', 'pharmacy', 'medicine', 'medical',
      'health', 'insurance'
    ],
    'Education': [
      'school', 'college', 'university', 'course', 'education', 'tuition',
      'book', 'library'
    ],
    'Subscriptions': [
      'subscription', 'monthly', 'annual', 'premium', 'netflix', 'prime',
      'spotify', 'microsoft', 'adobe', 'office'
    ]
  };

  const descLower = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Detect potential subscription transactions
 */
export function detectSubscriptions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const subscriptionKeywords = [
    'netflix', 'prime', 'spotify', 'youtube', 'microsoft', 'adobe',
    'subscription', 'monthly', 'annual', 'premium', 'plan',
    'google', 'apple', 'dropbox', 'zoom', 'office365'
  ];

  return transactions.filter(transaction => {
    const descLower = transaction.description.toLowerCase();
    return subscriptionKeywords.some(keyword => descLower.includes(keyword));
  });
}