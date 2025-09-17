"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";

export default function FirebaseAuthDomainTest() {
  const [authDomain, setAuthDomain] = useState<string | undefined>(undefined);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAuthDomain(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    }
  }, []);

  const copyToClipboard = () => {
    if (authDomain && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(authDomain);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto my-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <h1 className="text-2xl font-bold mb-4">Firebase Auth Domain Test</h1>
      
      <div className="p-4 border rounded mb-4 bg-gray-50 dark:bg-gray-700">
        <p className="mb-2 font-semibold">Current Auth Domain:</p>
        <div className="flex items-center gap-2">
          <code className="bg-gray-200 dark:bg-gray-900 p-2 rounded text-sm flex-1 overflow-x-auto">
            {authDomain || "Not configured"}
          </code>
          <Button 
            onClick={copyToClipboard} 
            variant="outline" 
            size="sm"
            disabled={!authDomain}
          >
            {isCopied ? "✓ Copied" : "Copy"}
          </Button>
        </div>
      </div>
      
      <div className="p-4 border rounded mb-4 bg-orange-50 dark:bg-amber-900/30">
        <h2 className="text-lg font-semibold mb-2">Important Check:</h2>
        <p className="mb-2">
          Make sure your auth domain contains <strong>mindful</strong> (with the <strong>m</strong>) and not <strong>indful</strong>.
        </p>
        <p className="mb-2">
          The correct value should be: <code className="bg-gray-200 dark:bg-gray-900 p-1 rounded text-sm">mindful-syntax-433607-m3.firebaseapp.com</code>
        </p>
      </div>
      
      <div className="p-4 border rounded bg-blue-50 dark:bg-blue-900/30">
        <h2 className="text-lg font-semibold mb-2">Next Steps:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check your Vercel environment variables for <code className="bg-gray-200 dark:bg-gray-900 p-1 rounded text-xs">NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code></li>
          <li>Ensure it has the correct value (with the "m" in "mindful")</li>
          <li>Update it if necessary and redeploy your application</li>
          <li>Verify Google OAuth Client configuration in Google Cloud Console</li>
        </ol>
      </div>
    </div>
  );
}
