'use client';

import { SessionProvider } from 'next-auth/react';

import { ThemeProvider } from 'next-themes';
import AdminGuard from '@/components/AdminGuard';
import PwaRegistrar from '@/components/PwaRegistrar';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SessionProvider>
        <PwaRegistrar />
        <AdminGuard />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
