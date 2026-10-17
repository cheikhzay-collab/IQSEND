export type ShipmentStatus =
  | 'READY_FOR_PICKUP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_FAILED'
  | 'DELIVERED_PAID'
  | 'RETURNED';

export type LeadStatus =
  | 'NEW'
  | 'AI_CHATTING'
  | 'CONFIRMED'
  | 'PACKING'
  | 'CANCELED'
  | 'DUPLICATE';

export interface TrackingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  address: string;
  gpsLocationUrl?: string;
  totalAmount: number;
  productName: string;
  productQuantity: number;
  productAttributes?: { size?: string; color?: string };
  productImage?: string;
  leadStatus: LeadStatus;
  shipmentStatus: ShipmentStatus;
  trackingNumber: string;
  waybillUrl?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAttempts: number;
  failedReason?: string;
  aiHandoverRequired: boolean;
  aiConversationEnabled: boolean;
  riskScore: number; // 0 to 100
  createdAt: string;
  lastUpdatedAt: string;
  timeline: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
    actor: 'SYSTEM' | 'AI_BOT' | 'SENDIT' | 'AGENT';
  }>;
  chatMessages: Array<{
    id: string;
    sender: 'CUSTOMER' | 'AI_BOT' | 'AGENT';
    text: string;
    time: string;
    isAudio?: boolean;
  }>;
}

export interface TrackingKpis {
  totalShipments: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  deliveryRate: number; // percentage
  failedAtRiskCount: number;
  totalCodCollected: number; // in MAD
  pendingCodAmount: number; // in MAD
}
