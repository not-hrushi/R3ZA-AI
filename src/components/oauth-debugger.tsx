"use client";

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function OAuthDebugger() {
  const [showDetails, setShowDetails] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    currentUrl: string;
    firebaseAuthDomain: string | undefined;
    googleClientId: string | undefined;
  }>({
    currentUrl: '',
    firebaseAuthDomain: undefined,
    googleClientId: undefined
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugInfo({
        currentUrl: window.location.origin,
        firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        googleClientId: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID || "Not configured"
      });
    }
  }, []);

  // Function to extract project ID from client ID
  const extractProjectId = (clientId: string | undefined) => {
    if (!clientId || clientId === "Not configured") return "Not available";
    const parts = clientId.split('-');
    if (parts.length > 0) {
      return parts[0];
    }
    return "Unknown format";
  };

  return (
    <Alert variant="destructive" className="my-4">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <AlertTitle>OAuth Redirect URI Mismatch</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          <strong>Error:</strong> The redirect URI is missing the 'm' in "mindful"
        </p>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="mb-2"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </Button>
        
        {showDetails && (
          <div className="text-sm mt-2 p-2 bg-destructive/10 rounded">
            <p><strong>Current Domain:</strong> {debugInfo.currentUrl}</p>
            <p><strong>Firebase Auth Domain:</strong> {debugInfo.firebaseAuthDomain || "Not configured"}</p>
            <p><strong>Google Client ID:</strong> {debugInfo.googleClientId}</p>
            <p><strong>Project Number:</strong> {extractProjectId(debugInfo.googleClientId)}</p>
            <p><strong>Current Error:</strong> Redirect URI is <code className="bg-black/20 px-1 rounded">indful-syntax-433607-m3.firebaseapp.com</code> (missing the <strong>m</strong> in "mindful")</p>
            
            <div className="mt-4">
              <p className="font-bold">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Vercel Dashboard</a> and select your project</li>
                <li>Go to the "Settings" tab and then "Environment Variables"</li>
                <li>Find <code className="bg-black/20 px-1 rounded">NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code> and verify it says: <code className="bg-black/20 px-1 rounded">mindful-syntax-433607-m3.firebaseapp.com</code> (with the "m")</li>
                <li>If not, update it to the correct value and redeploy</li>
                <li>Also check <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> to ensure redirect URIs use the correct domain</li>
              </ol>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
