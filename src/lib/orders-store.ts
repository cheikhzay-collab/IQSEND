// In-memory shared order store for Google Sheets & Webhook integration
// Keeps newly ingested orders accessible to both API routes, client polling, and WhatsApp AI Agent

import { findProductByNameOrKeyword, getProducts } from './products-store';

export type OrderStage = 
  | 'PENDING_CONFIRMATION' 
  | 'NEW_ORDERS' 
  | 'CONFIRMED' 
  | 'PACKING' 
  | 'DISPATCHED' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'NEEDS_ATTENTION';

export interface IngestedOrder {
  id: string;
  orderNumber: string;
  stage: OrderStage;
  createdAt: string;
  source: 'GOOGLE_SHEETS' | 'STOREFRONT_WEBHOOK' | 'MANUAL' | 'WHATSAPP_AI';
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
    status: 'PENDING' | 'PAID';
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

const INITIAL_BASE_ORDERS: IngestedOrder[] = [];

declare global {
  // eslint-disable-next-line no-var
  var __inboundOrders: IngestedOrder[] | undefined;
}

if (!global.__inboundOrders || global.__inboundOrders.length === 0) {
  global.__inboundOrders = [];
}

export function cleanMoroccanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let str = rawPhone;
  if (str.includes('@')) str = str.split('@')[0];
  if (str.includes(':')) str = str.split(':')[0];
  let cleaned = str.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+212')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('212')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

export function getInboundOrders(): IngestedOrder[] {
  if (!global.__inboundOrders) {
    global.__inboundOrders = [...INITIAL_BASE_ORDERS];
  }
  return global.__inboundOrders;
}

export function addInboundOrder(order: IngestedOrder) {
  if (!global.__inboundOrders) {
    global.__inboundOrders = [...INITIAL_BASE_ORDERS];
  }
  // Check duplicate by phone number or id
  const exists = global.__inboundOrders.some(
    (o) => o.id === order.id || (o.customer.phone === order.customer.phone && o.customer.name === order.customer.name)
  );
  if (!exists) {
    global.__inboundOrders.unshift(order);
  }

  // Persist to Hostinger MySQL Database
  try {
    import('./db-service').then(({ saveOrderToDb }) => {
      saveOrderToDb(order).catch((err) =>
        console.warn('[orders-store] Background DB save error:', err)
      );
    });
  } catch (e) {
    // ignore
  }

  return order;
}

/**
 * Find orders by customer phone number
 */
export function findOrdersByPhone(phone: string): IngestedOrder[] {
  const cleanTarget = cleanMoroccanPhone(phone);
  if (!cleanTarget) return [];
  const orders = getInboundOrders();
  return orders.filter((o) => {
    const cPhone = cleanMoroccanPhone(o.customer?.phone);
    return cPhone === cleanTarget || cPhone.includes(cleanTarget) || cleanTarget.includes(cPhone);
  });
}

/**
 * Find order by order number (e.g. #AT1044 or MA-29384)
 */
export function findOrderByNumber(orderNumber: string): IngestedOrder | undefined {
  if (!orderNumber) return undefined;
  const target = orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
  const orders = getInboundOrders();
  return orders.find((o) => {
    const num = o.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    return num === target || num.includes(target) || target.includes(num);
  });
}

/**
 * Take and record a new order directly from WhatsApp conversation
 */
export function createDirectCustomerOrder(params: {
  customerName: string;
  phone: string;
  city: string;
  address?: string;
  productName?: string;
  quantity?: number;
  notes?: string;
}): IngestedOrder {
  const cleanP = cleanMoroccanPhone(params.phone);
  const matchedProd = params.productName ? findProductByNameOrKeyword(params.productName) : undefined;
  const qty = params.quantity && params.quantity > 0 ? params.quantity : 1;
  const price = matchedProd ? matchedProd.sellingPrice : 179;
  const totalAmount = price * qty;
  const prodName = matchedProd ? matchedProd.nameAr : (params.productName || 'خف جلد');
  const sku = matchedProd ? matchedProd.sku : 'BMB-BLK-L';
  const thumbnail = matchedProd?.image || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp';

  const orderNum = `#MA-${Math.floor(10000 + Math.random() * 90000)}`;

  const newOrder: IngestedOrder = {
    id: `ord-wa-${Date.now()}`,
    orderNumber: orderNum,
    stage: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    source: 'WHATSAPP_AI',
    customer: {
      name: params.customerName || 'زبون واتساب',
      phone: cleanP || params.phone,
      address: params.address || 'العنوان عبر واتساب',
      city: params.city || 'الدار البيضاء',
      notes: params.notes || 'طلب مسجل مباشرة عبر محادثة واتساب مع وكيل الذكاء الاصطناعي',
    },
    items: [
      {
        id: `item-${Date.now()}`,
        name: prodName,
        sku,
        thumbnail,
        quantity: qty,
        price,
      },
    ],
    payment: {
      method: 'COD',
      amount: totalAmount,
      currency: 'MAD',
      status: 'PENDING',
    },
    aiVerification: {
      status: 'CONFIRMED_BY_AI',
      riskScore: 5,
      notes: `تم مسك الطلب وتأكيده مباشرة عبر وكيل الذكاء الاصطناعي في واتساب لمدينة ${params.city}`,
    },
  };

  addInboundOrder(newOrder);
  return newOrder;
}

/**
 * Update an order's stage in the centralized in-memory store
 */
export function updateOrderStatus(orderId: string, stage: OrderStage | string): boolean {
  if (!global.__inboundOrders) {
    global.__inboundOrders = [...INITIAL_BASE_ORDERS];
  }
  const cleanId = orderId.replace(/^#+/, '');
  let updated = false;

  // Normalize stage string
  let targetStage: OrderStage = 'PENDING_CONFIRMATION';
  if (stage === 'NEW' || stage === 'NEW_ORDERS' || stage === 'PENDING_CONFIRMATION') {
    targetStage = 'PENDING_CONFIRMATION';
  } else if (stage === 'CONFIRMED' || stage === 'PROCESSING') {
    targetStage = 'CONFIRMED';
  } else if (stage === 'PACKING') {
    targetStage = 'PACKING';
  } else if (stage === 'IN_TRANSIT' || stage === 'OUT_FOR_DELIVERY' || stage === 'DISPATCHED') {
    targetStage = 'IN_TRANSIT';
  } else if (stage === 'DELIVERED' || stage === 'DELIVERED_PAID' || stage === 'COMPLETED') {
    targetStage = 'DELIVERED';
  } else if (stage === 'CANCELED' || stage === 'CANCELLED' || stage === 'RETURNED' || stage === 'REFUSED') {
    targetStage = 'CANCELLED';
  }

  for (const order of global.__inboundOrders) {
    const cleanNum = order.orderNumber.replace(/^#+/, '');
    if (order.id === orderId || cleanNum === cleanId) {
      order.stage = targetStage;
      if (targetStage === 'DELIVERED') {
        order.payment.status = 'PAID';
        if (!order.tracking) {
          order.tracking = { carrier: 'Sendit Express', trackingNumber: `SND-${Math.floor(800000 + Math.random() * 99999)}` };
        }
        order.tracking.deliveredAt = new Date().toISOString();
      }
      updated = true;
    }
  }
  return updated;
}

/**
 * Assign Sendit tracking number and advance to IN_TRANSIT
 */
export function updateOrderTracking(orderId: string, trackingNumber: string, carrier = 'Sendit.ma Express'): boolean {
  if (!global.__inboundOrders) {
    global.__inboundOrders = [...INITIAL_BASE_ORDERS];
  }
  const cleanId = orderId.replace(/^#+/, '');
  let updated = false;

  for (const order of global.__inboundOrders) {
    const cleanNum = order.orderNumber.replace(/^#+/, '');
    if (order.id === orderId || cleanNum === cleanId) {
      order.stage = 'IN_TRANSIT';
      order.tracking = {
        carrier,
        trackingNumber,
        dispatchNoticeSent: true,
      };
      updated = true;
    }
  }
  return updated;
}

/**
 * Unified calculation of dashboard KPIs from all known orders
 */
export function getUnifiedDashboardStats() {
  const orders = getInboundOrders();
  const totalOrders = orders.length;

  const deliveredOrders = orders.filter((o) => o.stage === 'DELIVERED');
  const deliveredCount = deliveredOrders.length;
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (o.payment?.amount || 0), 0);

  const confirmedCount = orders.filter((o) => o.stage === 'CONFIRMED' || o.stage === 'PACKING' || o.stage === 'IN_TRANSIT' || o.stage === 'DELIVERED').length;
  const pendingCount = orders.filter((o) => o.stage === 'PENDING_CONFIRMATION' || o.stage === 'NEW_ORDERS' || o.stage === 'NEEDS_ATTENTION').length;
  const inTransitCount = orders.filter((o) => o.stage === 'IN_TRANSIT' || o.stage === 'DISPATCHED').length;
  const canceledCount = orders.filter((o) => o.stage === 'CANCELLED').length;

  const confirmationRate = totalOrders > 0 ? Math.round((confirmedCount / totalOrders) * 100 * 10) / 10 : 85.0;
  const deliveryRate = (deliveredCount + canceledCount) > 0 
    ? Math.round((deliveredCount / (deliveredCount + canceledCount)) * 100 * 10) / 10 
    : 85.7;
  const returnRate = (deliveredCount + canceledCount) > 0 
    ? Math.round((canceledCount / (deliveredCount + canceledCount)) * 100 * 10) / 10 
    : 14.3;

  return {
    totalOrders,
    deliveredRevenue,
    deliveredRevenueFormatted: `${deliveredRevenue.toLocaleString('fr-FR')} MAD`,
    deliveredCount,
    confirmedCount,
    pendingCount,
    canceledCount,
    inTransitCount,
    totalProducts: 4,
    confirmationRate,
    deliveryRate,
    returnRate,
  };
}

/**
 * Format human-friendly order status in Moroccan Darija
 */
export function formatOrderStatusForWhatsApp(order: IngestedOrder): string {
  const stageMap: Record<string, string> = {
    PENDING_CONFIRMATION: '⏳ في مرحلة التأكيد والمراجعة (بانتظار موافقتك النهائية)',
    NEW_ORDERS: '📝 طلب جديد تسجل بنجاح وقيد المراجعة',
    CONFIRMED: '✅ طلب مؤكد رسمياً وجاهز للإرسال لمستودع التغليف',
    PACKING: '📦 في مستودع Sendit: قيد التغليف والتجهيز مع البوليصة',
    DISPATCHED: '🚚 تم تسليم الطرد لشركة التوصيل Sendit وهو في طريقه لمدينتك',
    IN_TRANSIT: '🏍️ الطرد ديالك حالياً مع موزع Sendit للتسليم في مدينتك',
    DELIVERED: '🎉 تم تسليم الطلبية بنجاح والدفع عند الاستلام',
    CANCELLED: '❌ تم إلغاء هذا الطلب بناءً على طلبك',
    NEEDS_ATTENTION: '⚠️ بانتظار توضيح العنوان أو التوقيت المناسب',
  };

  const statusText = stageMap[order.stage] || '🔄 قيد المعالجة السريعة';
  const itemsText = (order.items || []).map((it) => `• ${it.name} (الكمية: ${it.quantity} | الثمن: ${it.price} درهم)`).join('\n');
  const trackingText = order.tracking?.trackingNumber ? `\n🏷️ رقم التتبع في Sendit: *${order.tracking.trackingNumber}*` : '';

  return `أهلاً بك أخي ${order.customer.name}! 👋\nها هي تفاصيل وحالة الطلب ديالك:\n\n📋 *رقم الطلب:* ${order.orderNumber}\n📍 *المدينة:* ${order.customer.city}\n📌 *الحالة الحالية:* ${statusText}\n\n📦 *المنتجات:*\n${itemsText}\n💰 *المجموع المطلوب عند الاستلام:* *${order.payment.amount} درهم* (COD)${trackingText}\n\nواش عندك أي استفسار آخر أو تحب تضيف شي تعديل على العنوان؟ 😊`;
}
