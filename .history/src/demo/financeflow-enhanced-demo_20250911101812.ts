/**
 * @fileOverview Test script to demonstrate the enhanced AI analysis and subscription reminder features
 * This script shows how the new functionality works with sample data
 */

import { analyzeExpensesAdvanced } from '@/ai/flows/analyze-expenses-advanced';
import { 
  createReminder, 
  getActiveReminders, 
  createRemindersFromAIDetection,
  getReminderStats 
} from '@/services/reminderServiceSimple';

// Sample transaction data for testing
const sampleTransactions = [
  {
    date: "2024-09-01",
    description: "Netflix Subscription",
    amount: 199,
    category: "Entertainment",
    payee: "Netflix",
  },
  {
    date: "2024-08-01", 
    description: "Netflix Monthly",
    amount: 199,
    category: "Entertainment",
    payee: "Netflix",
  },
  {
    date: "2024-07-01",
    description: "Netflix Payment",
    amount: 199,
    category: "Entertainment", 
    payee: "Netflix",
  },
  {
    date: "2024-09-05",
    description: "Spotify Premium",
    amount: 119,
    category: "Entertainment",
    payee: "Spotify",
  },
  {
    date: "2024-08-05",
    description: "Spotify Premium",
    amount: 119,
    category: "Entertainment",
    payee: "Spotify",
  },
  {
    date: "2024-09-15",
    description: "Amazon Prime Membership",
    amount: 999,
    category: "Other",
    payee: "Amazon",
  },
  {
    date: "2024-09-10",
    description: "Mobile Recharge Jio",
    amount: 349,
    category: "Utilities",
    payee: "Jio",
  },
  {
    date: "2024-08-10",
    description: "Mobile Recharge Jio",
    amount: 349,
    category: "Utilities",
    payee: "Jio",
  },
  {
    date: "2024-07-10", 
    description: "Mobile Recharge Jio",
    amount: 349,
    category: "Utilities",
    payee: "Jio",
  },
  {
    date: "2024-09-20",
    description: "Gym Membership Gold's",
    amount: 1500,
    category: "Health",
    payee: "Gold's Gym",
  },
  {
    date: "2024-08-20",
    description: "Gym Membership Gold's",
    amount: 1500,
    category: "Health",
    payee: "Gold's Gym",
  },
];

/**
 * Demonstrates the AI-powered subscription detection feature
 */
async function demonstrateAIAnalysis() {
  console.log("🔍 Starting AI Analysis of Sample Transactions...\n");
  
  try {
    // Prepare transaction data for AI analysis
    const transactionData = JSON.stringify(sampleTransactions);
    
    // Run the advanced expense analysis
    const results = await analyzeExpensesAdvanced({
      transactions: transactionData,
      timeframeDays: 90,
    });
    
    console.log("✅ AI Analysis Complete!\n");
    
    // Display detected subscriptions
    console.log("📊 DETECTED SUBSCRIPTIONS:");
    console.log("=" .repeat(50));
    
    results.detectedSubscriptions.forEach((subscription, index) => {
      console.log(`${index + 1}. ${subscription.serviceName}`);
      console.log(`   💰 Amount: ₹${subscription.estimatedMonthlyAmount}/month`);
      console.log(`   📅 Pattern: ${subscription.paymentPattern}`);
      console.log(`   🎯 Confidence: ${Math.round(subscription.confidence * 100)}%`);
      console.log(`   📋 Category: ${subscription.category}`);
      console.log(`   🔔 Next Payment: ${subscription.nextEstimatedPaymentDate}`);
      console.log(`   💡 Action: ${subscription.suggestedAction}`);
      console.log(`   🔔 Create Reminder: ${subscription.shouldCreateReminder ? 'Yes' : 'No'}`);
      console.log("");
    });
    
    // Display spending insights
    console.log("💡 SMART INSIGHTS:");
    console.log("=" .repeat(50));
    
    results.spendingInsights.forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.title} (${insight.urgency} priority)`);
      console.log(`   📖 ${insight.description}`);
      console.log(`   💰 Potential Savings: ₹${insight.potentialSavings || 0}`);
      console.log(`   💡 Recommendation: ${insight.recommendation}`);
      console.log("");
    });
    
    // Display automation suggestions
    console.log("🤖 AUTOMATION SUGGESTIONS:");
    console.log("=" .repeat(50));
    
    results.automationSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
    console.log("");
    
    // Display risk alerts
    if (results.riskAlerts.length > 0) {
      console.log("⚠️  RISK ALERTS:");
      console.log("=" .repeat(50));
      
      results.riskAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert}`);
      });
      console.log("");
    }
    
    // Display overall summary
    console.log("📋 OVERALL SUMMARY:");
    console.log("=" .repeat(50));
    console.log(results.overallSummary);
    console.log("");
    
    return results;
    
  } catch (error) {
    console.error("❌ Error during AI analysis:", error);
    throw error;
  }
}

/**
 * Demonstrates the subscription reminder functionality
 */
async function demonstrateReminderSystem(aiResults: any) {
  console.log("🔔 Creating Payment Reminders...\n");
  
  try {
    // Create reminders from AI detection results
    const createdReminders = createRemindersFromAIDetection(aiResults.detectedSubscriptions);
    
    console.log(`✅ Created ${createdReminders.length} reminders automatically!\n`);
    
    // Show current reminders
    const activeReminders = getActiveReminders();
    
    console.log("📅 ACTIVE REMINDERS:");
    console.log("=" .repeat(50));
    
    activeReminders.forEach((reminder, index) => {
      console.log(`${index + 1}. ${reminder.subscriptionName}`);
      console.log(`   💰 Amount: ₹${reminder.amount}`);
      console.log(`   📅 Next Payment: ${reminder.nextPaymentDate}`);
      console.log(`   🔔 Reminder: ${reminder.reminderDaysBeforePayment} days before`);
      console.log(`   🤖 Auto-detected: ${reminder.autoDetected ? 'Yes' : 'No'}`);
      console.log(`   📬 Notifications: ${reminder.notificationEnabled ? 'Enabled' : 'Disabled'}`);
      console.log("");
    });
    
    // Show reminder statistics
    const stats = getReminderStats();
    
    console.log("📈 REMINDER STATISTICS:");
    console.log("=" .repeat(50));
    console.log(`Total Reminders: ${stats.total}`);
    console.log(`Active Reminders: ${stats.active}`);
    console.log(`Auto-detected: ${stats.autoDetected}`);
    console.log(`Total Monthly Cost: ₹${stats.totalMonthlyAmount}`);
    console.log(`Upcoming This Week: ${stats.upcomingThisWeek}`);
    console.log("");
    
    return { reminders: createdReminders, stats };
    
  } catch (error) {
    console.error("❌ Error creating reminders:", error);
    throw error;
  }
}

/**
 * Main demonstration function
 */
export async function runFinanceFlowDemo() {
  console.log("🚀 FinanceFlow Enhanced AI & Reminder System Demo");
  console.log("=" .repeat(60));
  console.log("");
  
  try {
    // Step 1: Run AI Analysis
    const aiResults = await demonstrateAIAnalysis();
    
    // Step 2: Create Reminders
    const reminderResults = await demonstrateReminderSystem(aiResults);
    
    // Step 3: Show Summary
    console.log("🎉 DEMO SUMMARY:");
    console.log("=" .repeat(50));
    console.log(`✅ Detected ${aiResults.detectedSubscriptions.length} subscriptions`);
    console.log(`✅ Created ${reminderResults.reminders.length} payment reminders`);
    console.log(`✅ Identified ₹${aiResults.spendingInsights.reduce((sum: number, insight: any) => sum + (insight.potentialSavings || 0), 0)} in potential savings`);
    console.log(`✅ Generated ${aiResults.automationSuggestions.length} automation ideas`);
    console.log("");
    console.log("💡 Key Features Demonstrated:");
    console.log("   • AI-powered subscription detection");
    console.log("   • Automatic payment reminder creation");
    console.log("   • Smart spending insights and recommendations");
    console.log("   • Financial automation opportunities");
    console.log("   • Risk pattern detection");
    console.log("");
    console.log("🎯 Next Steps:");
    console.log("   1. Enable browser notifications for payment reminders");
    console.log("   2. Review and implement automation suggestions");
    console.log("   3. Set up budget categories for detected subscriptions");
    console.log("   4. Schedule regular subscription audits");
    console.log("");
    
    return {
      aiAnalysis: aiResults,
      reminders: reminderResults,
      success: true,
    };
    
  } catch (error) {
    console.error("💥 Demo failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export types and functions for use in components
export type DemoResults = Awaited<ReturnType<typeof runFinanceFlowDemo>>;

export {
  demonstrateAIAnalysis,
  demonstrateReminderSystem,
  sampleTransactions,
};
