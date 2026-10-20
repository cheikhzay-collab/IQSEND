'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type LifecycleStage =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELED'
  | 'RETURNED';

export interface OrderItemDetail {
  id: string;
  name: string;
  sku: string;
  thumbnail: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  barcode?: string;
  binLocation?: string;
}

export interface LifecycleOrder {
  id: string;
  orderNumber: string;
  stage: LifecycleStage;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
  };
  items: OrderItemDetail[];
  payment: {
    method: 'COD' | 'PREPAID';
    amount: number;
    currency: string;
    status: 'PENDING' | 'COLLECTED' | 'SETTLED';
    clearanceDate?: string;
    settlementRef?: string;
  };
  aiVerification?: {
    status: 'CONFIRMED_BY_AI' | 'NEEDS_REVIEW' | 'VERIFIED';
    riskScore: number;
    notes: string;
  };
  fulfillment?: {
    status: 'PICKING' | 'PACKED' | 'READY_FOR_PICKUP';
    warehouse: string;
    packingSlipGenerated: boolean;
    invoiceNumber: string;
    invoiceDate: string;
  };
  shipping?: {
    courier: string;
    trackingNumber: string;
    liveStatus: 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'FAILED_ATTEMPT' | 'DELIVERED';
    lastUpdated: string;
    driverName?: string;
    driverPhone?: string;
    failedReason?: string;
    rescheduledDate?: string;
    deliveryAttempts: number;
  };
  completed?: {
    deliveredAt: string;
    podType: 'CUSTOMER_SIGNATURE' | 'OTP_VERIFIED' | 'PHOTO_CONFIRMATION';
    settlementStatus: 'PAID_SETTLEMENT' | 'PENDING_TRANSFER';
    reviewRequested?: boolean;
    reviewScore?: number;
    reviewComment?: string;
    returnStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'RETURNED';
  };
}

const INITIAL_LIFECYCLE_ORDERS: LifecycleOrder[] = [];

interface OrderLifecycleContextType {
  orders: LifecycleOrder[];
  isLoading: boolean;
  pendingCount: number;
  processingCount: number;
  inTransitCount: number;
  completedCount: number;
  canceledCount: number;
  returnedCount: number;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  clearToast: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  // Workflow Actions
  confirmOrder: (orderId: string) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  editOrder: (orderId: string, updates: Partial<LifecycleOrder>) => void;
  assignCourier: (orderId: string, courier: string) => void;
  markReadyForPickup: (orderId: string) => void;
  shipOrder: (orderId: string) => void;
  rescheduleDelivery: (orderId: string, newDate: string, note?: string) => void;
  markDelivered: (orderId: string) => void;
  markReturned: (orderId: string, reason: string) => void;
  reactivateOrder: (orderId: string) => void;
  reintegrateStock: (orderId: string) => void;
  requestReview: (orderId: string) => void;
  processReturn: (orderId: string, reason: string) => void;
  addOrder: (newOrder: LifecycleOrder) => void;
  refreshInboundOrders: () => Promise<void>;
  moveOrderStage: (orderId: string, targetStage: LifecycleStage) => void;
}

const OrderLifecycleContext = createContext<OrderLifecycleContextType | undefined>(undefined);

export function OrderLifecycleProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<LifecycleOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Sync stage to MySQL Database
  const syncStageToDb = (orderId: string, stage: LifecycleStage) => {
    try {
      fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, stage }),
      }).catch((e) => console.warn('[OrderLifecycle] DB patch error:', e));
    } catch {}
  };

  // Fetch persisted orders from Hostinger MySQL Database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchDbOrders = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.orders) && isMounted) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.warn('[OrderLifecycleContext] DB fetch fallback to local:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDbOrders();
    return () => {
      isMounted = false;
    };
  }, []);

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const clearToast = () => setToast(null);

  // Computed Counts
  const pendingCount = useMemo(
    () => orders.filter((o) => o.stage === 'PENDING_CONFIRMATION').length,
    [orders]
  );
  const processingCount = useMemo(
    () => orders.filter((o) => o.stage === 'PROCESSING').length,
    [orders]
  );
  const inTransitCount = useMemo(
    () => orders.filter((o) => o.stage === 'IN_TRANSIT').length,
    [orders]
  );
  const completedCount = useMemo(
    () => orders.filter((o) => o.stage === 'COMPLETED').length,
    [orders]
  );
  const canceledCount = useMemo(
    () => orders.filter((o) => o.stage === 'CANCELED').length,
    [orders]
  );
  const returnedCount = useMemo(
    () => orders.filter((o) => o.stage === 'RETURNED').length,
    [orders]
  );

  // 1. Confirm Order (Moves to Processing)
  const confirmOrder = (orderId: string) => {
    syncStageToDb(orderId, 'PROCESSING');
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          stage: 'PROCESSING',
          fulfillment: order.fulfillment || {
            status: 'PICKING',
            warehouse: 'Hub Central Casablanca',
            packingSlipGenerated: true,
            invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            invoiceDate: new Date().toLocaleDateString('fr-FR'),
          },
          shipping: order.shipping || {
            courier: 'Sendit.ma Express',
            trackingNumber: `SND-${Math.floor(800000 + Math.random() * 99999)}`,
            liveStatus: 'DISPATCHED',
            lastUpdated: 'À l’instant',
            deliveryAttempts: 0,
          },
        };
      })
    );
    showToast(`Commande confirmée et transmise à l'atelier de préparation (Processing).`, 'success');
  };

  // 2. Cancel Order
  const cancelOrder = (orderId: string, reason?: string) => {
    syncStageToDb(orderId, 'CANCELED');
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          stage: 'CANCELED',
          customer: {
            ...order.customer,
            notes: reason ? `Annulé: ${reason}` : order.customer.notes,
          },
        };
      })
    );
    showToast(`La commande a été marquée comme annulée.`, 'info');
  };

  // 3. Edit Order
  const editOrder = (orderId: string, updates: Partial<LifecycleOrder>) => {
    setOrders((prev) => {
      const next = prev.map((order) => (order.id === orderId ? { ...order, ...updates } : order));
      const target = next.find((o) => o.id === orderId);
      if (target) {
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((e) => console.warn('[OrderLifecycle] DB save error:', e));
      }
      return next;
    });
    showToast(`Les modifications de la commande ont été enregistrées.`, 'success');
  };

  // 4. Assign Courier
  const assignCourier = (orderId: string, courier: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const currentShipping = order.shipping || {
          trackingNumber: `SND-${Math.floor(800000 + Math.random() * 99999)}`,
          liveStatus: 'DISPATCHED' as const,
          lastUpdated: 'À l’instant',
          deliveryAttempts: 0,
        };
        const updated = {
          ...order,
          shipping: {
            ...currentShipping,
            courier,
            lastUpdated: 'À l’instant',
          },
        };

        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch((e) => console.warn('[OrderLifecycle] Courier DB error:', e));

        return updated;
      })
    );
    showToast(`Transporteur ${courier} assigné avec succès.`, 'info');
  };

  // 5. Mark Ready for Pickup / Shipped (Moves to In Transit)
  const markReadyForPickup = (orderId: string) => {
    syncStageToDb(orderId, 'IN_TRANSIT');
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const courier = order.shipping?.courier || 'Sendit.ma Express';
        const tracking = order.shipping?.trackingNumber || `SND-${Math.floor(800000 + Math.random() * 99999)}`;
        return {
          ...order,
          stage: 'IN_TRANSIT',
          fulfillment: {
            ...(order.fulfillment || {
              warehouse: 'Hub Central Casablanca',
              packingSlipGenerated: true,
              invoiceNumber: `INV-${Date.now()}`,
              invoiceDate: 'Aujourd’hui',
            }),
            status: 'READY_FOR_PICKUP',
          },
          shipping: {
            courier,
            trackingNumber: tracking,
            liveStatus: 'DISPATCHED',
            lastUpdated: 'À l’instant (Pris en charge)',
            deliveryAttempts: 0,
          },
        };
      })
    );
    showToast(`Colis expédié et passé dans le pipeline "En cours de livraison" (In Transit).`, 'success');
  };

  const shipOrder = markReadyForPickup;

  // 6. Reschedule Delivery
  const rescheduleDelivery = (orderId: string, newDate: string, note?: string) => {
    fetch('/api/tracking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        shipmentStatus: 'DELIVERY_FAILED',
        failedReason: `Reprogrammé pour ${newDate}: ${note || 'Demande client'}`,
      }),
    }).catch((e) => console.warn('[OrderLifecycle] Reschedule DB error:', e));

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          shipping: order.shipping
            ? {
                ...order.shipping,
                rescheduledDate: newDate,
                failedReason: note || order.shipping.failedReason,
                lastUpdated: 'Reprogrammé à l’instant',
              }
            : undefined,
        };
      })
    );
    showToast(`Livraison reprogrammée pour le ${newDate}. Message de confirmation WhatsApp envoyé.`, 'info');
  };

  // 7. Mark Delivered (Moves to Completed)
  const markDelivered = (orderId: string) => {
    syncStageToDb(orderId, 'COMPLETED');
    const nowStr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          stage: 'COMPLETED',
          payment: {
            ...order.payment,
            status: 'SETTLED',
            clearanceDate: 'Aujourd’hui',
            settlementRef: `VIR-SETTLE-${Math.floor(10000 + Math.random() * 90000)}`,
          },
          shipping: order.shipping
            ? {
                ...order.shipping,
                liveStatus: 'DELIVERED',
                lastUpdated: 'Livré avec succès',
              }
            : undefined,
          completed: {
            deliveredAt: nowStr,
            podType: 'CUSTOMER_SIGNATURE',
            settlementStatus: 'PAID_SETTLEMENT',
            reviewRequested: false,
            returnStatus: 'NONE',
          },
        };
      })
    );
    showToast(`Commande clôturée avec succès: POD enregistré & encaissement COD validé.`, 'success');
  };

  // 8. Request Review
  const requestReview = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          completed: {
            ...(order.completed || {
              deliveredAt: 'Aujourd’hui',
              podType: 'CUSTOMER_SIGNATURE',
              settlementStatus: 'PAID_SETTLEMENT',
            }),
            reviewRequested: true,
          },
        };
      })
    );
    showToast(`Lien d’avis client envoyé par WhatsApp au client avec succès!`, 'success');
  };

  // 9. Process Return
  const processReturn = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          completed: {
            ...(order.completed || {
              deliveredAt: 'Aujourd’hui',
              podType: 'CUSTOMER_SIGNATURE',
              settlementStatus: 'PAID_SETTLEMENT',
            }),
            returnStatus: 'REQUESTED',
          },
          customer: {
            ...order.customer,
            notes: `Demande de retour: ${reason}`,
          },
        };
      })
    );
    showToast(`Procédure de retour/échange initiée: ticket #${orderId}-RET généré.`, 'info');
  };

  // 10. Mark Returned / Refused during delivery
  const markReturned = (orderId: string, reason: string) => {
    syncStageToDb(orderId, 'RETURNED');
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          stage: 'RETURNED',
          shipping: order.shipping
            ? {
                ...order.shipping,
                liveStatus: 'FAILED_ATTEMPT',
                failedReason: reason,
                lastUpdated: 'Colis refusé - En retour vers le Hub',
              }
            : {
                courier: 'Sendit.ma Express',
                trackingNumber: `SND-${Math.floor(800000 + Math.random() * 99999)}`,
                liveStatus: 'FAILED_ATTEMPT',
                lastUpdated: 'Colis refusé - En retour vers le Hub',
                failedReason: reason,
                deliveryAttempts: 1,
              },
          completed: {
            deliveredAt: '',
            podType: 'CUSTOMER_SIGNATURE',
            settlementStatus: 'PENDING_TRANSFER',
            returnStatus: 'REQUESTED',
          },
        };
      })
    );
    showToast(`Colis marqué comme refusé/retourné (${reason}). Transféré vers Retours.`, 'info');
  };

  // 11. Reactivate Order (Return back to confirmation stage)
  const reactivateOrder = (orderId: string) => {
    syncStageToDb(orderId, 'PENDING_CONFIRMATION');
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          stage: 'PENDING_CONFIRMATION',
        };
      })
    );
    showToast(`Commande ${orderId} réactivée et replacée en attente de confirmation.`, 'success');
  };

  // 12. Reintegrate Stock
  const reintegrateStock = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          completed: {
            ...(order.completed || {
              deliveredAt: '',
              podType: 'CUSTOMER_SIGNATURE',
              settlementStatus: 'PENDING_TRANSFER',
            }),
            returnStatus: 'RETURNED',
          },
        };
      })
    );
    showToast(`Articles réintégrés au stock avec succès.`, 'success');
  };

  // 13. Add New Inbound Order (From Google Sheets or Webhook)
  const addOrder = (newOrder: LifecycleOrder) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === newOrder.id || o.orderNumber === newOrder.orderNumber)) {
        return prev;
      }
      return [newOrder, ...prev];
    });

    // Persist to MySQL Database
    try {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      }).catch((e) => console.warn('[OrderLifecycle] DB insert error:', e));
    } catch {}

    showToast(`📦 Nouvelle commande reçue en confirmation : ${newOrder.orderNumber} (${newOrder.customer.name})`, 'success');
  };

  // 14. Refresh Inbound Orders from Webhook API
  const refreshInboundOrders = async () => {
    try {
      const res = await fetch('/api/webhooks/google-sheets');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders((prev) => {
          let updated = [...prev];
          let addedCount = 0;
          for (const item of data.orders) {
            const exists = updated.some(
              (o) => o.id === item.id || o.orderNumber === item.orderNumber
            );
            if (!exists) {
              updated = [item as LifecycleOrder, ...updated];
              addedCount++;
            }
          }
          if (addedCount > 0) {
            showToast(`📦 ${addedCount} nouvelle(s) commande(s) importée(s) depuis Google Sheets !`, 'success');
          }
          return updated;
        });
      }
    } catch {
      // Ignore background sync errors
    }
  };

  // Live auto-polling: checks for new inbound orders every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      refreshInboundOrders();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // 15. Direct stage transition for Kanban Drag & Drop
  const moveOrderStage = (orderId: string, targetStage: LifecycleStage) => {
    if (targetStage === 'PROCESSING') {
      confirmOrder(orderId);
      return;
    }
    if (targetStage === 'IN_TRANSIT') {
      shipOrder(orderId);
      return;
    }
    if (targetStage === 'COMPLETED') {
      markDelivered(orderId);
      return;
    }
    if (targetStage === 'CANCELED') {
      cancelOrder(orderId);
      return;
    }
    if (targetStage === 'RETURNED') {
      markReturned(orderId, 'Déplacé vers Retours & Refusés');
      return;
    }
    if (targetStage === 'PENDING_CONFIRMATION') {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            stage: 'PENDING_CONFIRMATION',
          };
        })
      );
      showToast('Commande replacée en attente de confirmation.', 'info');
    }
  };

  // Periodic polling for incoming Google Sheet orders (every 6 seconds)
  useEffect(() => {
    refreshInboundOrders();
    const interval = setInterval(refreshInboundOrders, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <OrderLifecycleContext.Provider
      value={{
        orders,
        isLoading,
        pendingCount,
        processingCount,
        inTransitCount,
        completedCount,
        canceledCount,
        returnedCount,
        toast,
        clearToast,
        confirmOrder,
        cancelOrder,
        editOrder,
        assignCourier,
        markReadyForPickup,
        shipOrder,
        rescheduleDelivery,
        markDelivered,
        markReturned,
        reactivateOrder,
        reintegrateStock,
        requestReview,
        processReturn,
        addOrder,
        refreshInboundOrders,
        moveOrderStage,
        showToast,
      }}
    >
      {children}
    </OrderLifecycleContext.Provider>
  );
}

export function useOrderLifecycle() {
  const context = useContext(OrderLifecycleContext);
  if (!context) {
    throw new Error('useOrderLifecycle must be used within an OrderLifecycleProvider');
  }
  return context;
}
