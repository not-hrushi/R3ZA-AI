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
    
    // Get current domain
    setCurrentDomain(window.location.hostname);
    
    // Get configured auth domain
    const configuredDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    setAuthDomain(configuredDomain || null);
    
    // Auto-show if there's a domain mismatch and not localhost
    const currentHostname = window.location.hostname;
    if (
      configuredDomain && 
      currentHostname !== 'localhost' && 
      currentHostname !== '127.0.0.1' &&
      !configuredDomain.includes(currentHostname)
    ) {
      setShowInfo(true);
    }
  }, []);

  if (!showInfo) return null;

  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 max-w-md z-50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Authentication Domain Mismatch</AlertTitle>
      <AlertDescription className="mt-2">
        <p>Your app is running on <strong>{currentDomain}</strong> but Firebase is configured for <strong>{authDomain}</strong>.</p>
        
        <p className="mt-2">To fix this:</p>
        <ol className="list-decimal ml-5 mt-1 space-y-1">
          <li>Go to Firebase Console &gt; Authentication &gt; Settings</li>
          <li>Add <strong>{currentDomain}</strong> to Authorized Domains</li>
        </ol>
        
        <Button 
          variant="outline" 
          className="mt-3"
          onClick={() => setShowInfo(false)}
        >
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>
  );
}
