export type OrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELED'
  | 'RETURNED'
  | 'NEW_ORDERS'
  | 'CONFIRMED'
  | 'PACKING'
  | 'SHIPPED'
  | 'DELIVERED';

export type PaymentBadge = 'COD PENDING' | 'PAID' | 'CALLBACK';

export interface OrderItem {
  id: string;
  orderNumber: string; // e.g., "#AT1044", "#AT1046"
  status: OrderStatus;
  badgeType: PaymentBadge;
  badgeLabel?: string; // e.g., "Callback - 4pm"
  amount: number; // e.g., 599
  currency: string; // "MAD"
  productName: string; // e.g., "Smart Watch S2"
  productThumbnail: string;
  customerName: string; // e.g., "Salma R."
  city: string; // e.g., "Marrakech"
  countryCode: string; // "MA"
  phone: string;
  timeAgo: string; // e.g., "6h AGO", "• NOW"
  assignedAgent?: {
    type: 'initial' | 'avatar';
    value: string; // "A" or image URL
    bgClass?: string;
  };
  floatingBadge?: {
    type: 'agent' | 'delivery' | 'photo';
    text?: string;
    imageUrl?: string;
    colorClass: string;
  };
  metaBadge?: {
    type: 'ai-call' | 'tracking';
    text: string;
  };
  hasWhatsapp?: boolean;
  hasCall?: boolean;
  hasChat?: boolean;
  hasNote?: boolean;
  hasReview?: boolean;
  address?: string;
  size?: string;
  color?: string;
  quantity?: number;
  trackingCode?: string;
  waybillUrl?: string;
  isFloatingDemo?: boolean; // For initial demonstration tilt like the screenshot
}
