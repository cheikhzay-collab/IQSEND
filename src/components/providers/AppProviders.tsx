'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { OrderLifecycleProvider } from '@/context/OrderLifecycleContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrderLifecycleProvider>{children}</OrderLifecycleProvider>
    </AuthProvider>
  );
}
