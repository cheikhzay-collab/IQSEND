'use client';

import React from 'react';
import { OrderLifecycleProvider } from '@/context/OrderLifecycleContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <OrderLifecycleProvider>{children}</OrderLifecycleProvider>;
}
