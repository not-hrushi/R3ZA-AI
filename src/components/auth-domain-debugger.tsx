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
  // We'll disable this completely as it's causing confusion
  return null;
}
