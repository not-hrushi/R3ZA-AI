'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellRing, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Calendar,
  DollarSign,
  Repeat,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

import { getTransactions, type Transaction } from '@/services/transactionService';
import { analyzeExpensesAdvanced, type AdvancedExpenseAnalysisOutput } from '@/ai/flows/analyze-expenses-advanced';
import { useSubscriptionReminders } from '@/hooks/use-subscription-reminders';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface InsightMetrics {
  totalSubscriptionValue: number;
  detectableSubscriptions: number;
  riskAlerts: number;
  potentialSavings: number;
  automationOpportunities: number;
}

export default function EnhancedInsightsPage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const { 
    reminders, 
    addReminder, 
    updateReminderStatus,
    deleteReminder,
    createReminderFromTransaction 
  } = useSubscriptionReminders();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AdvancedExpenseAnalysisOutput | null>(null);
  const [metrics, setMetrics] = useState<InsightMetrics>({
    totalSubscriptionValue: 0,
    detectableSubscriptions: 0,
    riskAlerts: 0,
    potentialSavings: 0,
    automationOpportunities: 0,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const userId = isGuest ? 'guest' : user?.uid;
        if (!userId) return;

        const allTransactions = await transactionService.getTransactions(userId);
        
        // Filter for last 6 months for better analysis
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const recentTransactions = allTransactions.filter(t => 
          new Date(t.date) >= sixMonthsAgo
        );
        
        setTransactions(recentTransactions);
      } catch (error) {
        console.error('Error loading transactions:', error);
        toast({
          title: "Error",
          description: "Failed to load transactions for analysis",
          variant: "destructive",
        });
      }
    };

    loadTransactions();
  }, [user, isGuest, toast]);

  // Run AI analysis
  const runAIAnalysis = async () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "Add some transactions first to get AI insights",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Prepare transaction data for AI analysis
      const transactionData = JSON.stringify(
        transactions
          .filter(t => t.type === 'expense') // Only analyze expenses
          .map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            payee: t.payee || 'Unknown',
          }))
      );

      const results = await analyzeExpensesAdvanced({
        transactions: transactionData,
        timeframeDays: 180,
      });

      setAnalysisResults(results);
      setLastAnalysis(new Date().toISOString());

      // Calculate metrics
      const newMetrics: InsightMetrics = {
        totalSubscriptionValue: results.detectedSubscriptions.reduce(
          (sum, sub) => sum + sub.estimatedMonthlyAmount, 0
        ),
        detectableSubscriptions: results.detectedSubscriptions.length,
        riskAlerts: results.riskAlerts.length,
        potentialSavings: results.spendingInsights.reduce(
          (sum, insight) => sum + (insight.potentialSavings || 0), 0
        ),
        automationOpportunities: results.automationSuggestions.length,
      };
      setMetrics(newMetrics);

      toast({
        title: "Analysis Complete",
        description: `Found ${newMetrics.detectableSubscriptions} potential subscriptions and ${newMetrics.riskAlerts} alerts`,
      });

    } catch (error) {
      console.error('Error during AI analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze your expenses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle subscription reminder creation
  const handleCreateReminder = (subscription: any) => {
    try {
      createReminderFromTransaction(
        subscription.serviceName,
        subscription.estimatedMonthlyAmount,
        subscription.nextEstimatedPaymentDate,
        subscription.reminderDaysBeforePayment || 3
      );
      
      toast({
        title: "Reminder Created",
        description: `Payment reminder set for ${subscription.serviceName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
    }
  };

  // Auto-create all recommended reminders
  const handleCreateAllReminders = () => {
    if (!analysisResults) return;

    let created = 0;
    analysisResults.detectedSubscriptions.forEach(subscription => {
      if (subscription.shouldCreateReminder) {
        const success = createReminderFromTransaction(
          subscription.serviceName,
          subscription.estimatedMonthlyAmount,
          subscription.nextEstimatedPaymentDate,
          subscription.reminderDaysBeforePayment || 3
        );
        if (success) created++;
      }
    });

    toast({
      title: "Reminders Created",
      description: `Created ${created} new payment reminders`,
    });
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Financial Insights</h1>
          <p className="text-muted-foreground">
            AI-powered analysis of your spending patterns, subscriptions, and automation opportunities
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={runAIAnalysis} 
            disabled={isAnalyzing || transactions.length === 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
          
          {lastAnalysis && (
            <div className="text-sm text-muted-foreground flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Last: {formatDate(lastAnalysis)}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.detectableSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.totalSubscriptionValue)}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reminders.length}</div>
            <p className="text-xs text-muted-foreground">
              Payment notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.potentialSavings)}</div>
            <p className="text-xs text-muted-foreground">
              Per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Ideas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.automationOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              Opportunities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="insights">Smart Insights</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Detected Subscriptions</h2>
            {analysisResults?.detectedSubscriptions.some(s => s.shouldCreateReminder) && (
              <Button onClick={handleCreateAllReminders} variant="outline">
                <BellRing className="w-4 h-4 mr-2" />
                Create All Reminders
              </Button>
            )}
          </div>

          {analysisResults?.detectedSubscriptions.length ? (
            <div className="grid gap-4">
              {analysisResults.detectedSubscriptions.map((subscription, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          {subscription.serviceName}
                          <Badge 
                            variant={subscription.confidence > 0.8 ? "default" : "secondary"} 
                            className="ml-2"
                          >
                            {Math.round(subscription.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {subscription.category} • {subscription.paymentPattern}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatCurrency(subscription.estimatedMonthlyAmount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Next: {formatDate(subscription.nextEstimatedPaymentDate)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm">{subscription.suggestedAction}</p>
                      
                      <div className="flex space-x-2">
                        {subscription.shouldCreateReminder && (
                          <Button 
                            onClick={() => handleCreateReminder(subscription)}
                            size="sm"
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Set Reminder
                          </Button>
                        )}
                        
                        <Badge variant="outline">
                          Remind {subscription.reminderDaysBeforePayment} days before
                        </Badge>
                      </div>

                      {subscription.transactionExamples.length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground">
                            View transaction examples ({subscription.transactionExamples.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {subscription.transactionExamples.slice(0, 3).map((example, i) => (
                              <li key={i}>• {example}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Subscriptions Detected</h3>
                <p className="text-muted-foreground text-center">
                  Run AI analysis to automatically detect recurring payments and subscriptions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <h2 className="text-xl font-semibold">Smart Spending Insights</h2>
          
          {analysisResults?.spendingInsights.length ? (
            <div className="space-y-4">
              {analysisResults.spendingInsights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2" />
                          {insight.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={
                              insight.urgency === 'high' ? 'destructive' : 
                              insight.urgency === 'medium' ? 'default' : 
                              'secondary'
                            }
                          >
                            {insight.urgency} priority
                          </Badge>
                          <Badge variant="outline">
                            {insight.insightType.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      {insight.potentialSavings && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            -{formatCurrency(insight.potentialSavings)}
                          </div>
                          <div className="text-sm text-muted-foreground">potential savings</div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{insight.description}</p>
                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Recommendation:</h4>
                      <p className="text-sm">{insight.recommendation}</p>
                    </div>
                    {insight.categories.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm text-muted-foreground">Affected categories: </span>
                        {insight.categories.map((category, i) => (
                          <Badge key={i} variant="outline" className="mr-1">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
                <p className="text-muted-foreground text-center">
                  Run AI analysis to get personalized spending insights and recommendations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <h2 className="text-xl font-semibold">Payment Reminders</h2>
          
          {reminders.length ? (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <Card key={reminder.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{reminder.serviceName}</CardTitle>
                        <CardDescription>
                          Next payment: {formatDate(reminder.nextPaymentDate)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatCurrency(reminder.amount)}
                        </div>
                        <Badge variant={
                          reminder.status === 'pending' ? 'default' :
                          reminder.status === 'notified' ? 'secondary' :
                          'outline'
                        }>
                          {reminder.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Remind {reminder.reminderDays} days before payment
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReminderStatus(reminder.id, 'paid')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteReminder(reminder.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Reminders</h3>
                <p className="text-muted-foreground text-center">
                  Create reminders from detected subscriptions to get notified before payments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <h2 className="text-xl font-semibold">Automation Opportunities</h2>
          
          {analysisResults?.automationSuggestions.length ? (
            <div className="space-y-4">
              {analysisResults.automationSuggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {analysisResults.overallSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysisResults.overallSummary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Automation Ideas</h3>
                <p className="text-muted-foreground text-center">
                  Run AI analysis to discover ways to automate your financial management
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Risk Alerts */}
      {analysisResults?.riskAlerts.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-red-600">⚠️ Risk Alerts</h2>
          {analysisResults.riskAlerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}
    </div>
  );
}
