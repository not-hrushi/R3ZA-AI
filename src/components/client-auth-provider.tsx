'use client';

import { AuthProvider } from '@/hooks/use-auth';
import AuthDomainDebugger from './auth-domain-debugger';

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthDomainDebugger />
    </AuthProvider>
  );
}
