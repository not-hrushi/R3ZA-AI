'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { runFinanceFlowDemo, type DemoResults } from '@/demo/financeflow-enhanced-demo';

export function DemoComponent() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DemoResults | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runDemo = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);

    // Capture console logs
    const originalLog = console.log;
    const capturedLogs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      capturedLogs.push(message);
      setLogs([...capturedLogs]);
      originalLog(...args);
    };

    try {
      const demoResults = await runFinanceFlowDemo();
      setResults(demoResults);
    } catch (error) {
      console.error('Demo failed:', error);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🚀 FinanceFlow Enhanced Features Demo
            </CardTitle>
            <CardDescription>
              Test the new AI-powered subscription detection and reminder system
            </CardDescription>
          </div>
          <Button 
            onClick={runDemo} 
            disabled={isRunning}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Demo...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Demo
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Demo Results Summary */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {results.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {results.success ? 'Success' : 'Failed'}
                </div>
              </CardContent>
            </Card>

            {results.success && results.aiAnalysis && (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-muted-foreground">Subscriptions Detected</div>
                    <div className="text-2xl font-bold">
                      {results.aiAnalysis.detectedSubscriptions?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      AI-powered detection
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-muted-foreground">Reminders Created</div>
                    <div className="text-2xl font-bold">
                      {results.reminders?.reminders?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Payment notifications
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <h3 className="font-semibold">🔍 AI Features</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Smart subscription detection</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Payment pattern analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Spending insights & recommendations</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Automation opportunities</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">🔔 Reminder Features</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Automatic reminder creation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Browser notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Payment tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">NEW</Badge>
                <span>Subscription management</span>
              </div>
            </div>
          </div>
        </div>

        {/* Console Output */}
        {logs.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Demo Output:</h3>
            <div className="bg-black text-green-400 p-4 rounded-lg text-xs font-mono max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Data Info */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">🧪 Demo Data</h4>
          <p className="text-sm text-muted-foreground">
            This demo uses sample transaction data including Netflix, Spotify, Amazon Prime, 
            Jio mobile recharge, and gym membership payments to demonstrate the AI's ability 
            to detect recurring payment patterns and create automatic reminders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
