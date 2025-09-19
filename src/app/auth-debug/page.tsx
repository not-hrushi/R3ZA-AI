'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthDebugPage() {
  const [domains, setDomains] = useState<{
    current: string;
    firebaseAuthDomain: string | null;
    authorized: string[];
  }>({
    current: '',
    firebaseAuthDomain: null,
    authorized: []
  });

  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
  const [authErrors, setAuthErrors] = useState<string[]>([]);

  // Helper to safely get Firebase info
  const getFirebaseInfo = () => {
    if (typeof window === 'undefined') return;
    
    // Basic info
    const currentUrl = window.location.origin;
    const currentDomain = window.location.hostname;
    const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || null;
    
    setDomains({
      current: currentDomain,
      firebaseAuthDomain,
      authorized: [
        'localhost', 
        '127.0.0.1',
        firebaseAuthDomain || '',
      ]
    });
    
    // Log for debugging
    console.log('Firebase Auth Debug Info:', {
      currentUrl,
      currentDomain,
      firebaseAuthDomain,
      envVars: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
      }
    });
  };

  useEffect(() => {
    getFirebaseInfo();
  }, []);

  const checkAuthDomain = async () => {
    setHasAttemptedAuth(true);
    const errors = [];
    
    try {
      // Try to fetch the Firebase Auth domain to see if CORS is properly set up
      const response = await fetch(`https://${domains.firebaseAuthDomain}/__/auth/handler`, {
        mode: 'no-cors',
      });
      console.log('Auth domain check response:', response);
    } catch (error) {
      console.error('Auth domain check error:', error);
      errors.push(`Failed to connect to Firebase Auth domain: ${error}`);
    }
    
    // Check if the current domain is actually in the authorized list in Firebase
    if (domains.current && !domains.authorized.includes(domains.current)) {
      errors.push(`Your current domain (${domains.current}) is not in the authorized domains list`);
    }
    
    setAuthErrors(errors);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Firebase Authentication Domain Debugger</CardTitle>
          <CardDescription>
            Use this tool to diagnose issues with Firebase Authentication domains
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <h3 className="font-semibold mb-2">Current Domain</h3>
              <p className="font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded">{domains.current}</p>
            </div>
            
            <div className="p-4 border rounded">
              <h3 className="font-semibold mb-2">Firebase Auth Domain</h3>
              <p className="font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded">{domains.firebaseAuthDomain || 'Not configured'}</p>
            </div>
          </div>
          
          <div className="p-4 border rounded mt-4">
            <h3 className="font-semibold mb-2">Domain Status</h3>
            <p>
              {domains.current && domains.authorized.includes(domains.current) 
                ? '✅ Your domain appears to be authorized' 
                : '❌ Your domain does not appear to be authorized'}
            </p>
          </div>
          
          {hasAttemptedAuth && (
            <div className={`p-4 border rounded mt-4 ${authErrors.length > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-green-300 bg-green-50 dark:bg-green-900/20'}`}>
              <h3 className="font-semibold mb-2">Authentication Check Results</h3>
              
              {authErrors.length > 0 ? (
                <>
                  <p className="text-red-600 dark:text-red-400">Found {authErrors.length} issue(s):</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {authErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-green-600 dark:text-green-400">
                  No obvious issues detected! If you're still having problems, check the console for more details.
                </p>
              )}
            </div>
          )}
          
          <div className="p-4 border rounded bg-amber-50 dark:bg-amber-900/20">
            <h3 className="font-semibold mb-2">How to Fix</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a>
              </li>
              <li>Select your project</li>
              <li>Go to Authentication → Settings</li>
              <li>Scroll down to "Authorized domains"</li>
              <li>Make sure <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{domains.current}</code> is in the list</li>
              <li>If using www subdomain, add both versions</li>
              <li>Save and wait a few minutes for changes to take effect</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={getFirebaseInfo}>Refresh Info</Button>
          <Button onClick={checkAuthDomain}>Run Authentication Check</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
