import React from 'react';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export const metadata = {
  title: 'Orders | SENDIT - COD Management Platform',
  description: 'Gestion complète des commandes COD en Kanban interactif',
};

export default function OrdersPage() {
  return <OrdersBoard />;
}

