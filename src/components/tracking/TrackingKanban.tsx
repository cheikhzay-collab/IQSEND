'use client';

import React from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  RotateCcw,
  ShieldAlert,
  Bot,
  ExternalLink,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { TrackingOrder, ShipmentStatus } from '@/types';

interface TrackingKanbanProps {
  orders: TrackingOrder[];
  onSelectOrder: (order: TrackingOrder) => void;
  onStatusChange: (orderId: string, newStatus: ShipmentStatus) => void;
}

interface KanbanColumnConfig {
  id: ShipmentStatus;
  title: string;
  badgeColor: string;
  dotColor: string;
}

const COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'READY_FOR_PICKUP',
    title: 'Prêt Ramassage',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'IN_TRANSIT',
    title: 'En Cours de Transfert',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'OUT_FOR_DELIVERY',
    title: 'En Cours de Livraison',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'DELIVERY_FAILED',
    title: 'Échec / Injoignable',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'DELIVERED_PAID',
    title: 'Livré & Encaissé',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'RETURNED',
    title: 'Retourné au Stock',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
];

export function TrackingKanban({
  orders,
  onSelectOrder,
  onStatusChange,
}: TrackingKanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[calc(100vh-280px)] select-none">
      {COLUMNS.map((column) => {
        const columnOrders = orders.filter((o) => o.shipmentStatus === column.id);

        return (
          <div
            key={column.id}
            className="w-80 shrink-0 bg-slate-50/70 border border-slate-200/90 rounded-2xl flex flex-col max-h-[82vh]"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                <h3 className="font-semibold text-xs text-slate-800">{column.title}</h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${column.badgeColor}`}
              >
                {columnOrders.length}
              </span>
            </div>

            {/* Column Body / Cards List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {columnOrders.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                  Aucun colis dans cette étape
                </div>
              ) : (
                columnOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative"
                  >
                    {/* Top Row: Order Number + COD Amount */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {order.totalAmount} MAD
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {order.customerName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-600">{order.city}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono">{order.phoneNumber}</span>
                      </div>
                    </div>

                    {/* Product & Attribute */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[160px] font-medium">
                        {order.productName}
                      </span>
                      <span className="text-slate-400">
                        Qté: {order.productQuantity}
                        {order.productAttributes?.size ? ` (${order.productAttributes.size})` : ''}
                      </span>
                    </div>

                    {/* Sendit Barcode & Attempt Tags */}
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {order.trackingNumber}
                      </span>

                      {order.deliveryAttempts > 0 && (
                        <span className="font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {order.deliveryAttempts} tentative(s)
                        </span>
                      )}
                    </div>

                    {/* Delivery Failure Notice if present */}
                    {order.failedReason && (
                      <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg p-1.5 text-[11px] text-rose-700 flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="truncate font-medium">{order.failedReason}</span>
                      </div>
                    )}

                    {/* Live Badges (AI Bot, Risk, Takeover) */}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {order.aiConversationEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          <Bot className="w-3 h-3" /> AI Bot Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                          Agent Humain
                        </span>
                      )}

                      {order.gpsLocationUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                          <MapPin className="w-3 h-3" /> GPS Reçu
                        </span>
                      )}

                      {order.riskScore >= 60 && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold">
                          <ShieldAlert className="w-3 h-3" /> Risque
                        </span>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`tel:${order.phoneNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Appel direct"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp ({order.chatMessages.length})
                      </button>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        {/* Quick next stage mover */}
                        {column.id === 'READY_FOR_PICKUP' && (
                          <button
                            onClick={() => onStatusChange(order.id, 'IN_TRANSIT')}
                            className="text-[10px] bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 font-medium px-2 py-0.5 rounded transition-colors"
                          >
                            Expédier →
                          </button>
                        )}
                        {column.id === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => onStatusChange(order.id, 'DELIVERED_PAID')}
                            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded transition-colors"
                          >
                            Marquer Livré ✓
                          </button>
                        )}
                        {column.id === 'DELIVERY_FAILED' && (
                          <button
                            onClick={() => onStatusChange(order.id, 'OUT_FOR_DELIVERY')}
                            className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded transition-colors"
                          >
                            Reprogrammer ↺
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
