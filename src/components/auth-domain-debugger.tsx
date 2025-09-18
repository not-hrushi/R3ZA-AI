'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return '';
  }
}

export default function AuthDomainDebugger() {
  const [authDomain, setAuthDomain] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    // Check if debugger should be disabled
    if (window.localStorage.getItem('disableAuthDomainDebugger') === 'true') {
      return;
    }
    
    // Get current domain
    const hostname = window.location.hostname;
    setCurrentDomain(hostname);
    
    // Get configured auth domain
    const configuredDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    setAuthDomain(configuredDomain || null);
    
    // Log debug info
    console.log("Auth Domain Debug:", {
      currentDomain: hostname,
      authDomain: configuredDomain,
      fullUrl: window.location.href,
      isProd: hostname.includes('vercel.app'),
      hasWWW: hostname.startsWith('www.')
    });
    
    // Auto-show if there's a domain mismatch and not localhost
    if (
      configuredDomain && 
      hostname !== 'localhost' && 
      hostname !== '127.0.0.1' &&
      !configuredDomain.includes(hostname)
    ) {
      setShowInfo(true);
    }
  }, []);

  if (!showInfo) return null;

  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 max-w-md z-50 shadow-lg">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-lg font-bold">Authentication Domain Mismatch</AlertTitle>
      <AlertDescription className="mt-2">
        <p>Your app is running on <strong>{currentDomain}</strong> but Firebase is configured for <strong>{authDomain}</strong>.</p>
        
        <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
          <p className="font-medium text-sm">Check cache and refresh:</p>
          <p className="text-xs">Try a hard refresh (Ctrl+F5) or clearing your browser cache.</p>
        </div>
        
        <p className="mt-2">To fix this:</p>
        <ol className="list-decimal ml-5 mt-1 space-y-1">
          <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a> &gt; Authentication &gt; Settings</li>
          <li>Scroll down to "Authorized domains"</li> 
          <li>Click "Add domain" and add <strong>{currentDomain}</strong></li>
          <li>Click "Add" to save the changes</li>
        </ol>
        
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs">
          <p className="font-medium">Important:</p>
          <p>This error means Firebase Authentication is rejecting requests from this domain.</p>
          <p>This is different from the OAuth redirect URI issue - both need to be fixed separately.</p>
          
          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
            <p className="font-medium">Troubleshooting:</p>
            <ul className="list-disc ml-4 mt-1">
              <li>Ensure you added <strong>exactly</strong> "{currentDomain}" (case sensitive)</li>
              <li>Try adding both www and non-www versions: "{currentDomain.startsWith('www.') ? currentDomain.substring(4) : `www.${currentDomain}`}"</li>
              <li>Refresh the page after adding the domain</li>
              <li>Changes can take a few minutes to propagate</li>
            </ul>
          </div>
          
          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
            <p className="font-medium">For debugging only:</p>
            <button 
              className="text-xs underline" 
              onClick={() => {
                window.localStorage.setItem('disableAuthDomainDebugger', 'true');
                setShowInfo(false);
              }}
            >
              Temporarily disable this alert
            </button>
            <p className="text-xs mt-1">Visit <a href="/auth-debug" className="underline">Auth Debug Page</a> for more detailed diagnostics.</p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            onClick={() => setShowInfo(false)}
          >
            Dismiss
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => window.open('https://console.firebase.google.com/project/_/authentication/settings', '_blank')}
          >
            Open Firebase Console
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
