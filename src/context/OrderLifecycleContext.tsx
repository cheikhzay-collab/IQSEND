'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type LifecycleStage =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELED';

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

const INITIAL_LIFECYCLE_ORDERS: LifecycleOrder[] = [
  // ── 1. PENDING CONFIRMATION ────────────────────────────
  {
    id: 'ord-1044',
    orderNumber: '#AT1044',
    stage: 'PENDING_CONFIRMATION',
    createdAt: 'Il y a 25 min',
    customer: {
      name: 'Omar El Amrani',
      phone: '0661223344',
      address: 'Boulevard Pasteur, Tanger Centre, Résidence Al Majd Appt 4',
      city: 'Tanger',
      notes: 'Rappeler vers 16h pour confirmer la taille L',
    },
    items: [
      {
        id: 'it-1',
        name: 'Black Bomber Jacket Luxury',
        sku: 'BMB-BLK-L',
        thumbnail: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&auto=format&fit=crop&q=80',
        size: 'L',
        color: 'Noir Mat',
        quantity: 1,
        price: 349,
        barcode: '611124901842',
        binLocation: 'A-12',
      },
    ],
    payment: {
      method: 'COD',
      amount: 349,
      currency: 'MAD',
      status: 'PENDING',
    },
    aiVerification: {
      status: 'NEEDS_REVIEW',
      riskScore: 18,
      notes: 'Client a répondu au WhatsApp Gemini en Darija: demande confirmation d’horaire.',
    },
  },
  {
    id: 'ord-1047',
    orderNumber: '#AT1047',
    stage: 'PENDING_CONFIRMATION',
    createdAt: 'Il y a 45 min',
    customer: {
      name: 'Fatima Zahra Idrissi',
      phone: '0663889900',
      address: 'Corniche Ain Diab, Villa 12, Casablanca',
      city: 'Casablanca',
      notes: 'Livraison express demandée',
    },
    items: [
      {
        id: 'it-2',
        name: 'Robe Traditionnelle Soie Brodée',
        sku: 'ROB-SOIE-M',
        thumbnail: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=300&auto=format&fit=crop&q=80',
        size: 'M',
        color: 'Émeraude & Or',
        quantity: 1,
        price: 490,
        barcode: '611124901859',
        binLocation: 'B-04',
      },
    ],
    payment: {
      method: 'COD',
      amount: 490,
      currency: 'MAD',
      status: 'PENDING',
    },
    aiVerification: {
      status: 'CONFIRMED_BY_AI',
      riskScore: 12,
      notes: 'Adresse validée automatiquement par GPS WhatsApp.',
    },
  },
  {
    id: 'ord-1049',
    orderNumber: '#AT1049',
    stage: 'PENDING_CONFIRMATION',
    createdAt: 'Il y a 1h',
    customer: {
      name: 'Mehdi Bennani',
      phone: '0670114455',
      address: 'Avenue de France, Agdal, Rabat',
      city: 'Rabat',
    },
    items: [
      {
        id: 'it-3',
        name: 'Montre Chronographe Homme',
        sku: 'WTC-CHRONO-SLV',
        thumbnail: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=300&auto=format&fit=crop&q=80',
        color: 'Argent brossé',
        quantity: 1,
        price: 650,
        barcode: '611124901866',
        binLocation: 'C-09',
      },
    ],
    payment: {
      method: 'PREPAID',
      amount: 650,
      currency: 'MAD',
      status: 'COLLECTED',
      clearanceDate: '17 Oct 2026',
    },
    aiVerification: {
      status: 'VERIFIED',
      riskScore: 4,
      notes: 'Paiement CMI prépayé en ligne vérifié avec succès.',
    },
  },
  {
    id: 'ord-1052',
    orderNumber: '#AT1052',
    stage: 'PENDING_CONFIRMATION',
    createdAt: 'Il y a 2h',
    customer: {
      name: 'Soukaina Tazi',
      phone: '0655443322',
      address: 'Rue Mohammed El Beqal, Gueliz, Marrakech',
      city: 'Marrakech',
    },
    items: [
      {
        id: 'it-4',
        name: 'Pack Soins Visage Huile d’Argan Pure',
        sku: 'ARG-CARE-PK',
        thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
        quantity: 2,
        price: 299,
        barcode: '611124901873',
        binLocation: 'D-02',
      },
    ],
    payment: {
      method: 'COD',
      amount: 598,
      currency: 'MAD',
      status: 'PENDING',
    },
    aiVerification: {
      status: 'NEEDS_REVIEW',
      riskScore: 28,
      notes: 'Premier achat - Appel de courtoisie suggéré.',
    },
  },

  // ── 2. PROCESSING ──────────────────────────────────────
  {
    id: 'ord-1045',
    orderNumber: '#AT1045',
    stage: 'PROCESSING',
    createdAt: '16 Oct 18:30',
    customer: {
      name: 'Noura Sbihi',
      phone: '0677112299',
      address: 'Avenue Hassan II, Immeuble Al Amal, Agadir',
      city: 'Agadir',
    },
    items: [
      {
        id: 'it-5',
        name: 'Amber Perfume Intense 50ml',
        sku: 'PRF-AMB-50',
        thumbnail: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=300&auto=format&fit=crop&q=80',
        quantity: 1,
        price: 299,
        barcode: '611124901880',
        binLocation: 'Bay B-08',
      },
    ],
    payment: {
      method: 'COD',
      amount: 299,
      currency: 'MAD',
      status: 'PENDING',
    },
    fulfillment: {
      status: 'PACKED',
      warehouse: 'Hub Central Casablanca',
      packingSlipGenerated: true,
      invoiceNumber: 'INV-2026-0891',
      invoiceDate: '17 Oct 2026',
    },
    shipping: {
      courier: 'Sendit.ma Express',
      trackingNumber: 'SND-819210',
      liveStatus: 'DISPATCHED',
      lastUpdated: '17 Oct 09:15',
      deliveryAttempts: 0,
    },
  },
  {
    id: 'ord-1046',
    orderNumber: '#AT1046',
    stage: 'PROCESSING',
    createdAt: '16 Oct 19:10',
    customer: {
      name: 'Salma Razzouki',
      phone: '0654998877',
      address: 'Gueliz, Rue Tarik Ibn Ziad, Marrakech',
      city: 'Marrakech',
    },
    items: [
      {
        id: 'it-6',
        name: 'Smart Watch S2 Pro Retina',
        sku: 'SW2-PRO-BLK',
        thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
        color: 'Midnight Black',
        quantity: 1,
        price: 599,
        barcode: '611124901897',
        binLocation: 'Bay A-14',
      },
    ],
    payment: {
      method: 'COD',
      amount: 599,
      currency: 'MAD',
      status: 'PENDING',
    },
    fulfillment: {
      status: 'PICKING',
      warehouse: 'Hub Central Casablanca',
      packingSlipGenerated: false,
      invoiceNumber: 'INV-2026-0892',
      invoiceDate: '17 Oct 2026',
    },
    shipping: {
      courier: 'Cathedis Maroc',
      trackingNumber: 'CAT-490214',
      liveStatus: 'DISPATCHED',
      lastUpdated: '17 Oct 08:30',
      deliveryAttempts: 0,
    },
  },
  {
    id: 'ord-1041-p',
    orderNumber: '#AT1041',
    stage: 'PROCESSING',
    createdAt: '16 Oct 20:00',
    customer: {
      name: 'Rachid El Fassi',
      phone: '0671882233',
      address: 'Quartier Hamria, Av. des FAR, Meknès',
      city: 'Meknès',
    },
    items: [
      {
        id: 'it-7',
        name: 'Baggy Denim Jeans Vintage Wash',
        sku: 'JNS-BGY-32',
        thumbnail: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80',
        size: '32',
        color: 'Bleu Dégradé',
        quantity: 1,
        price: 249,
        barcode: '611124901903',
        binLocation: 'Bay C-03',
      },
    ],
    payment: {
      method: 'COD',
      amount: 249,
      currency: 'MAD',
      status: 'PENDING',
    },
    fulfillment: {
      status: 'READY_FOR_PICKUP',
      warehouse: 'Hub Fès-Meknès',
      packingSlipGenerated: true,
      invoiceNumber: 'INV-2026-0893',
      invoiceDate: '17 Oct 2026',
    },
    shipping: {
      courier: 'Amana Express',
      trackingNumber: 'AMN-773901',
      liveStatus: 'DISPATCHED',
      lastUpdated: '17 Oct 07:45',
      deliveryAttempts: 0,
    },
  },

  // ── 3. IN TRANSIT ──────────────────────────────────────
  {
    id: 'ord-1038',
    orderNumber: '#AT1038',
    stage: 'IN_TRANSIT',
    createdAt: '15 Oct 14:20',
    customer: {
      name: 'Amine Tahiri',
      phone: '0661123456',
      address: '24 Rue Abou Al Alaa, Maarif, Casablanca',
      city: 'Casablanca',
    },
    items: [
      {
        id: 'it-8',
        name: 'White Leather Sneakers Classic',
        sku: 'SNK-WHT-42',
        thumbnail: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
        size: '42',
        quantity: 1,
        price: 399,
        barcode: '611124901910',
      },
    ],
    payment: {
      method: 'COD',
      amount: 399,
      currency: 'MAD',
      status: 'PENDING',
    },
    shipping: {
      courier: 'Sendit.ma Express',
      trackingNumber: 'SND-819204',
      liveStatus: 'OUT_FOR_DELIVERY',
      driverName: 'Mohamed Tazi',
      driverPhone: '0670112233',
      lastUpdated: 'Il y a 18 min (Près de Zerktouni)',
      deliveryAttempts: 1,
    },
  },
  {
    id: 'ord-1039',
    orderNumber: '#AT1039',
    stage: 'IN_TRANSIT',
    createdAt: '15 Oct 11:10',
    customer: {
      name: 'Khadija El Amrani',
      phone: '0655819033',
      address: 'Résidence Jnane Gueliz, Appt 14, Marrakech',
      city: 'Marrakech',
    },
    items: [
      {
        id: 'it-9',
        name: 'Robe Brodée Traditionnelle',
        sku: 'ROB-BRD-BLU',
        thumbnail: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=300&auto=format&fit=crop&q=80',
        size: 'M',
        quantity: 1,
        price: 249,
      },
    ],
    payment: {
      method: 'COD',
      amount: 249,
      currency: 'MAD',
      status: 'PENDING',
    },
    shipping: {
      courier: 'Sendit.ma Express',
      trackingNumber: 'SND-819205',
      liveStatus: 'FAILED_ATTEMPT',
      driverName: 'Hamid Mansour',
      driverPhone: '0662884411',
      failedReason: 'Client Injoignable au 1er passage (WhatsApp envoyé)',
      lastUpdated: '17 Oct 11:20',
      rescheduledDate: 'Aujourd’hui après 15h30',
      deliveryAttempts: 1,
    },
  },
  {
    id: 'ord-1040',
    orderNumber: '#AT1040',
    stage: 'IN_TRANSIT',
    createdAt: '15 Oct 18:20',
    customer: {
      name: 'Othmane Jabri',
      phone: '0612398471',
      address: 'Quartier Malabata, En face Hôtel Tarik, Tanger',
      city: 'Tanger',
    },
    items: [
      {
        id: 'it-10',
        name: 'Survêtement Sport Performance XL',
        sku: 'SRV-SPT-GRS',
        thumbnail: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
        size: 'XL',
        quantity: 1,
        price: 320,
      },
    ],
    payment: {
      method: 'COD',
      amount: 320,
      currency: 'MAD',
      status: 'PENDING',
    },
    shipping: {
      courier: 'Amana Express',
      trackingNumber: 'AMN-994102',
      liveStatus: 'DISPATCHED',
      driverName: 'Hub Tanger Centre',
      lastUpdated: '17 Oct 06:10 (En transit vers Agence)',
      deliveryAttempts: 0,
    },
  },
  {
    id: 'ord-1043',
    orderNumber: '#AT1043',
    stage: 'IN_TRANSIT',
    createdAt: '16 Oct 07:15',
    customer: {
      name: 'Hamza Chraibi',
      phone: '0678239014',
      address: 'Quartier Narjiss, Bd Allal Ben Abdellah, Fès',
      city: 'Fès',
    },
    items: [
      {
        id: 'it-11',
        name: 'Chaussures Cuir Véritable Derby 43',
        sku: 'CHS-DRB-43',
        thumbnail: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=300&auto=format&fit=crop&q=80',
        size: '43',
        quantity: 1,
        price: 550,
      },
    ],
    payment: {
      method: 'COD',
      amount: 550,
      currency: 'MAD',
      status: 'PENDING',
    },
    shipping: {
      courier: 'DHL Morocco',
      trackingNumber: 'DHL-48293170',
      liveStatus: 'OUT_FOR_DELIVERY',
      driverName: 'Yassine Drissi',
      driverPhone: '0665991122',
      lastUpdated: '17 Oct 10:05',
      deliveryAttempts: 1,
    },
  },

  // ── 4. COMPLETED ───────────────────────────────────────
  {
    id: 'ord-1033',
    orderNumber: '#AT1033',
    stage: 'COMPLETED',
    createdAt: '14 Oct 16:30',
    customer: {
      name: 'Samira Belkacem',
      phone: '0663412099',
      address: 'Avenue Fal Ould Oumeir, Agdal, Rabat',
      city: 'Rabat',
    },
    items: [
      {
        id: 'it-12',
        name: 'Montre Automatique Édition Noire',
        sku: 'WTC-AUTO-BLK',
        thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=80',
        quantity: 1,
        price: 450,
      },
    ],
    payment: {
      method: 'COD',
      amount: 450,
      currency: 'MAD',
      status: 'SETTLED',
      clearanceDate: '17 Oct 2026',
      settlementRef: 'VIR-SENDIT-89410',
    },
    shipping: {
      courier: 'Sendit.ma Express',
      trackingNumber: 'SND-819207',
      liveStatus: 'DELIVERED',
      lastUpdated: '16 Oct 14:32',
      deliveryAttempts: 1,
    },
    completed: {
      deliveredAt: '16 Oct 2026 à 14:32',
      podType: 'CUSTOMER_SIGNATURE',
      settlementStatus: 'PAID_SETTLEMENT',
      reviewRequested: true,
      reviewScore: 5,
      reviewComment: 'Très satisfaite de la rapidité de livraison et de la qualité !',
      returnStatus: 'NONE',
    },
  },
  {
    id: 'ord-1035',
    orderNumber: '#AT1035',
    stage: 'COMPLETED',
    createdAt: '14 Oct 11:15',
    customer: {
      name: 'Hassan Alami',
      phone: '0661994433',
      address: 'Boulevard d’Anfa, Résidence Les Palmiers, Casablanca',
      city: 'Casablanca',
    },
    items: [
      {
        id: 'it-13',
        name: 'Pack 2x Baskets Cuir Urbain',
        sku: 'BSK-URB-2PK',
        thumbnail: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=80',
        quantity: 2,
        price: 780,
      },
    ],
    payment: {
      method: 'COD',
      amount: 780,
      currency: 'MAD',
      status: 'SETTLED',
      clearanceDate: '16 Oct 2026',
      settlementRef: 'VIR-SENDIT-89392',
    },
    shipping: {
      courier: 'Sendit.ma Express',
      trackingNumber: 'SND-819201',
      liveStatus: 'DELIVERED',
      lastUpdated: '15 Oct 16:15',
      deliveryAttempts: 1,
    },
    completed: {
      deliveredAt: '15 Oct 2026 à 16:15',
      podType: 'OTP_VERIFIED',
      settlementStatus: 'PAID_SETTLEMENT',
      reviewRequested: false,
      returnStatus: 'NONE',
    },
  },
  {
    id: 'ord-1036',
    orderNumber: '#AT1036',
    stage: 'COMPLETED',
    createdAt: '13 Oct 09:20',
    customer: {
      name: 'Ibtissam Berrada',
      phone: '0662771199',
      address: 'Route d’Ain Chkef, Fès',
      city: 'Fès',
    },
    items: [
      {
        id: 'it-14',
        name: 'Sac à Main Artisanal en Cuir Maroquin',
        sku: 'SAC-CUIR-BRN',
        thumbnail: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80',
        quantity: 1,
        price: 310,
      },
    ],
    payment: {
      method: 'COD',
      amount: 310,
      currency: 'MAD',
      status: 'SETTLED',
      clearanceDate: '15 Oct 2026',
      settlementRef: 'VIR-SENDIT-89281',
    },
    shipping: {
      courier: 'Cathedis Maroc',
      trackingNumber: 'CAT-481902',
      liveStatus: 'DELIVERED',
      lastUpdated: '14 Oct 18:40',
      deliveryAttempts: 1,
    },
    completed: {
      deliveredAt: '14 Oct 2026 à 18:40',
      podType: 'PHOTO_CONFIRMATION',
      settlementStatus: 'PAID_SETTLEMENT',
      reviewRequested: true,
      reviewScore: 5,
      reviewComment: 'Magnifique finition artisanale, emballage très soigné.',
      returnStatus: 'NONE',
    },
  },
];

interface OrderLifecycleContextType {
  orders: LifecycleOrder[];
  pendingCount: number;
  processingCount: number;
  inTransitCount: number;
  completedCount: number;
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
  requestReview: (orderId: string) => void;
  processReturn: (orderId: string, reason: string) => void;
  addOrder: (newOrder: LifecycleOrder) => void;
  refreshInboundOrders: () => Promise<void>;
  moveOrderStage: (orderId: string, targetStage: LifecycleStage) => void;
}

const OrderLifecycleContext = createContext<OrderLifecycleContextType | undefined>(undefined);

export function OrderLifecycleProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<LifecycleOrder[]>(INITIAL_LIFECYCLE_ORDERS);
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
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.orders) && data.orders.length > 0 && isMounted) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.warn('[OrderLifecycleContext] DB fetch fallback to local:', err);
      }
    };

    fetchDbOrders();
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
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, ...updates } : order))
    );
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
        return {
          ...order,
          shipping: {
            ...currentShipping,
            courier,
            lastUpdated: 'À l’instant',
          },
        };
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

  // 10. Add New Inbound Order (From Google Sheets or Webhook)
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

    showToast(`📦 طلب جديد سقط في مرحلة التأكيد: ${newOrder.orderNumber} (${newOrder.customer.name})`, 'success');
  };

  // 11. Refresh Inbound Orders from Webhook API
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
            showToast(`📦 تم جلب ${addedCount} طلب جديد مباشرة من Google Sheets!`, 'success');
          }
          return updated;
        });
      }
    } catch {
      // Ignore background sync errors
    }
  };

  // 12. Direct stage transition for Kanban Drag & Drop
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
        pendingCount,
        processingCount,
        inTransitCount,
        completedCount,
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
