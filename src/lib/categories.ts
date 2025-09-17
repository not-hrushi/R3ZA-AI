'use server';

// Standard transaction categories
export const STANDARD_CATEGORIES = [
    'Food',
    'Groceries',
    'Dining',
    'Entertainment',
    'Transport',
    'Shopping',
    'Utilities',
    'Housing',
    'Healthcare',
    'Education',
    'Personal',
    'Travel',
    'Subscription',
    'Income',
    'Investment',
    'Transfer',
    'Other'
];

// Maps common variations to standard categories
export const CATEGORY_ALIASES: Record<string, string> = {
    // Food related
    'restaurant': 'Food',
    'lunch': 'Food',
    'dinner': 'Food',
    'breakfast': 'Food',
    'meal': 'Food',
    'snack': 'Food',
    'takeout': 'Food',
    'takeaway': 'Food',

    // Entertainment
    'movie': 'Entertainment',
    'game': 'Entertainment',
    'music': 'Entertainment',
    'concert': 'Entertainment',
    'streaming': 'Entertainment',

    // Transport
    'uber': 'Transport',
    'ola': 'Transport',
    'taxi': 'Transport',
    'cab': 'Transport',
    'transportation': 'Transport',
    'gas': 'Transport',
    'petrol': 'Transport',
    'fuel': 'Transport',
    'metro': 'Transport',
    'bus': 'Transport',
    'train': 'Transport',

    // Shopping
    'clothes': 'Shopping',
    'clothing': 'Shopping',
    'shoes': 'Shopping',
    'apparel': 'Shopping',
    'amazon': 'Shopping',
    'online shopping': 'Shopping',
    
    // Utilities
    'electricity': 'Utilities',
    'water': 'Utilities',
    'gas bill': 'Utilities',
    'internet': 'Utilities',
    'phone': 'Utilities',
    'mobile': 'Utilities',
    
    // Housing
    'rent': 'Housing',
    'mortgage': 'Housing',
    
    // Subscriptions
    'netflix': 'Subscription',
    'amazon prime': 'Subscription',
    'spotify': 'Subscription',
    'hbo': 'Subscription',
    'disney+': 'Subscription',
    'hotstar': 'Subscription',
};

/**
 * Normalizes a category string to a standard category
 * @param categoryInput User input that might refer to a category
 * @returns Standardized category name or null if no match
 */
export async function normalizeCategory(categoryInput: string): Promise<string | null> {
    if (!categoryInput) return null;
    
    // Normalize to lowercase for comparison
    const input = categoryInput.toLowerCase().trim();
    
    // Check if it's already a standard category (case insensitive)
    const directMatch = STANDARD_CATEGORIES.find(
        category => category.toLowerCase() === input
    );
    
    if (directMatch) {
        return directMatch; // Return with proper casing
    }
    
    // Check for aliases
    if (CATEGORY_ALIASES[input]) {
        return CATEGORY_ALIASES[input];
    }
    
    // Check for partial matches in aliases
    for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
        if (input.includes(alias) || alias.includes(input)) {
            return category;
        }
    }
    
    // If no matches found but input exactly matches a standard category in any case,
    // return the properly cased version
    for (const category of STANDARD_CATEGORIES) {
        if (category.toLowerCase() === input) {
            return category;
        }
    }
    
    // If input is a close match to a standard category (case insensitive partial match)
    for (const category of STANDARD_CATEGORIES) {
        if (category.toLowerCase().includes(input) || input.includes(category.toLowerCase())) {
            return category;
        }
    }
    
    // Return the original input if we couldn't find a match
    // This handles custom categories
    return categoryInput;
}
