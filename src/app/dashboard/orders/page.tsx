import React from 'react';
import { OrdersBoard } from '@/components/orders/OrdersBoard';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';

export const metadata = {
  title: 'Orders | SENDIT - COD Management Platform',
  description: 'Gestion complète des commandes COD en Kanban interactif',
};

export default function OrdersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="md:hidden">
        <OrderLifecycleTabs />
      </div>
      <OrdersBoard />
    </div>
  );
}

