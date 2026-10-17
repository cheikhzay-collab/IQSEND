'use client';

import React from 'react';
import {
  Phone,
  MessageSquare,
  FileText,
  Copy,
  ChevronDown,
  Truck,
  Star,
  CheckCircle2,
  Bot
} from 'lucide-react';
import { OrderItem } from '@/types/orders';

interface OrderCardProps {
  order: OrderItem;
  isGhost?: boolean;
  isFloating?: boolean;
  onSelect?: (order: OrderItem) => void;
  onQuickWhatsApp?: (order: OrderItem, e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, order: OrderItem) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function OrderCard({
  order,
  isGhost = false,
  isFloating = false,
  onSelect,
  onQuickWhatsApp,
  onDragStart,
  onDragEnd,
}: OrderCardProps) {
  if (isGhost) {
    return (
      <div className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-3.5 opacity-50 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{order.orderNumber}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
              {order.badgeLabel || order.badgeType}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {order.amount} {order.currency}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 truncate">{order.productName}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {order.customerName} • {order.city}, {order.countryCode}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Payment badge styles
  const getBadgeStyle = () => {
    if (order.badgeType === 'PAID') {
      return 'bg-[#edf9f0] text-[#15803d] border border-[#bbf7d0]';
    }
    if (order.badgeLabel?.includes('Callback')) {
      return 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]';
    }
    return 'bg-[#fef9c3] text-[#a16207] border border-[#fef08a]'; // COD PENDING
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, order)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect?.(order)}
      className={`group relative w-full bg-white rounded-2xl border border-slate-200/90 p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-md ${
        isFloating
          ? 'shadow-xl border-teal-400/80 z-30 ring-2 ring-teal-400/20'
          : 'shadow-2xs'
      }`}
    >
      {/* Floating corner badge if present */}
      {order.floatingBadge && (
        <div className="absolute -top-3 -right-2 z-20">
          {order.floatingBadge.type === 'agent' && (
            <div className="w-7 h-7 rounded-full bg-[#0d9488] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
              G+
            </div>
          )}
          {order.floatingBadge.type === 'photo' && order.floatingBadge.imageUrl && (
            <img
              src={order.floatingBadge.imageUrl}
              alt="Assigned agent"
              className="w-7 h-7 rounded-full object-cover shadow-md border-2 border-white"
            />
          )}
          {order.floatingBadge.type === 'delivery' && (
            <div className="w-7 h-7 rounded-full bg-[#135d54] text-white flex items-center justify-center shadow-md border-2 border-white">
              <Truck className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}

      {/* Header Row: Order Number + Badge + Price */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-800 tracking-tight">
            {order.orderNumber}
          </span>
          <span
            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${getBadgeStyle()}`}
          >
            {order.badgeLabel?.includes('Callback')
              ? 'Rappel 16h'
              : order.badgeType === 'PAID'
              ? 'Encaissé'
              : 'COD'}
          </span>
        </div>

        <span className="text-xs font-black text-slate-900 tracking-tight shrink-0">
          {order.amount} {order.currency}
        </span>
      </div>

      {/* Middle Row: Product Image + Title + Customer / City */}
      <div className="mt-2.5 flex items-center gap-3">
        {/* Product Thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shrink-0 relative">
          <img
            src={order.productThumbnail}
            alt={order.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Product Details & Customer */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-slate-900 font-bold text-xs hover:text-teal-700 transition-colors">
            <span className="truncate">{order.productName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </div>

          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
            {order.customerName} • {order.city}, {order.countryCode}
          </p>
        </div>
      </div>

      {/* Bottom Footer: Quick Action Icons & Meta */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        {/* Left Action Icons */}
        <div className="flex items-center gap-2 text-slate-400">
          {/* Phone */}
          <a
            href={`tel:${order.phone}`}
            onClick={(e) => e.stopPropagation()}
            title={`Appeler ${order.customerName} (${order.phone})`}
            className="hover:text-slate-700 transition-colors"
          >
            <Phone className="w-3 h-3" />
          </a>

          {/* WhatsApp */}
          <button
            onClick={(e) => onQuickWhatsApp?.(order, e)}
            title="Envoyer WhatsApp"
            className="hover:text-emerald-600 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5 fill-current text-[#25D366] hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.529 1.838.805 2.791.805h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.767-5.769-5.767zm3.364 8.204c-.14.394-.809.734-1.121.78-.31.047-.704.067-1.139-.074-.27-.087-.621-.202-1.071-.399-1.905-.829-3.14-2.76-3.235-2.888-.094-.128-.775-1.03-.775-1.964 0-.935.49-1.393.664-1.583.174-.19.38-.238.507-.238.127 0 .254.002.364.007.117.006.273-.044.428.328.16.38.547 1.332.595 1.429.047.097.079.21.016.335-.063.125-.095.203-.189.314-.094.111-.198.247-.283.332-.095.095-.194.198-.083.388.111.19.493.813 1.057 1.315.727.646 1.34.846 1.53.941.19.095.301.079.412-.048.111-.127.476-.554.603-.744.127-.19.254-.159.428-.095.174.063 1.109.523 1.299.618.19.095.317.143.364.222.048.079.048.459-.092.853z" />
            </svg>
          </button>

          {/* Chat bubble */}
          <button
            onClick={() => onSelect?.(order)}
            title="Historique discussion"
            className="hover:text-slate-700 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
          </button>

          {/* Note or copy */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(order.orderNumber);
            }}
            title="Copier le numéro"
            className="hover:text-slate-700 transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>

          {/* Review star if delivered */}
          {order.hasReview && (
            <div className="flex items-center text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          )}

          {/* Special metadata badge: AI call or DHL tracking */}
          {order.metaBadge && (
            <div className="flex items-center gap-1 bg-[#ecfdf5] text-[#0f766e] px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#a7f3d0]">
              {order.metaBadge.type === 'ai-call' ? (
                <>
                  <Bot className="w-2.5 h-2.5" />
                  <span>AI call</span>
                </>
              ) : (
                <span className="font-mono text-[9px] text-slate-700">
                  {order.metaBadge.text}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Info: Time Ago + Assigned Agent */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {order.timeAgo}
          </span>

          {order.assignedAgent?.type === 'initial' && (
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-2xs ${
                order.assignedAgent.bgClass || 'bg-[#7c3aed]'
              }`}
            >
              {order.assignedAgent.value}
            </div>
          )}

          {order.assignedAgent?.type === 'avatar' && (
            <img
              src={order.assignedAgent.value}
              alt="Agent"
              className="w-5 h-5 rounded-full object-cover shadow-2xs border border-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
