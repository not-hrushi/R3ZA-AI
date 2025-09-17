'use client';

import { AuthProvider } from '@/hooks/use-auth';

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
