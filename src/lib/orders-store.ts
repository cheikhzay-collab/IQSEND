// In-memory shared order store for Google Sheets & Webhook integration
// Keeps newly ingested orders accessible to both API routes and client polling

export interface IngestedOrder {
  id: string;
  orderNumber: string;
  stage: 'PENDING_CONFIRMATION';
  createdAt: string;
  source: 'GOOGLE_SHEETS' | 'STOREFRONT_WEBHOOK' | 'MANUAL';
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    thumbnail: string;
    quantity: number;
    price: number;
  }>;
  payment: {
    method: 'COD' | 'PREPAID';
    amount: number;
    currency: string;
    status: 'PENDING';
  };
  aiVerification?: {
    status: 'CONFIRMED_BY_AI' | 'NEEDS_REVIEW' | 'VERIFIED';
    riskScore: number;
    notes: string;
  };
  gpsLocationUrl?: string;
  preferredDeliveryTime?: string;
  upsellOffer?: {
    offered: boolean;
    accepted: boolean;
    newQuantity?: number;
    extraPriceMad?: number;
    discountPercent?: number;
    bundleTitle?: string;
  };
  rescue?: {
    status: 'NONE' | 'NEEDS_ATTENTION' | 'OUTREACH_SENT' | 'RESCHEDULED' | 'ADDRESS_UPDATED' | 'ESCALATED' | 'RETURNED';
    failureReason?: string;
    outreachCount: number;
    lastOutreachAt?: string;
    notes?: string;
  };
  tracking?: {
    carrier: string;
    trackingNumber?: string;
    dispatchNoticeSent?: boolean;
    morningReminderSent?: boolean;
    deliveredAt?: string;
  };
  review?: {
    rating?: number;
    comment?: string;
    submittedAt?: string;
  };
}

// Global reference across serverless warm invokes
declare global {
  // eslint-disable-next-line no-var
  var __inboundOrders: IngestedOrder[] | undefined;
}

if (!global.__inboundOrders) {
  global.__inboundOrders = [];
}

export function getInboundOrders(): IngestedOrder[] {
  return global.__inboundOrders || [];
}

export function addInboundOrder(order: IngestedOrder) {
  if (!global.__inboundOrders) {
    global.__inboundOrders = [];
  }
  // Check duplicate by phone number or id
  const exists = global.__inboundOrders.some(
    (o) => o.id === order.id || (o.customer.phone === order.customer.phone && o.customer.name === order.customer.name)
  );
  if (!exists) {
    global.__inboundOrders.unshift(order);
  }
  return order;
}

export function cleanMoroccanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+212')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('212')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}
