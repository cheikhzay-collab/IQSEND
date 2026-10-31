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
  ChevronRight,
  Flame,
  Sparkles,
  Ban,
  CheckCircle2,
  FileText,
  BadgeCheck,
  Edit3,
  Calendar,
} from 'lucide-react';
import { TrackingOrder, ShipmentStatus } from '@/types';

interface TrackingKanbanProps {
  orders: TrackingOrder[];
  onSelectOrder: (order: TrackingOrder) => void;
  onStatusChange: (orderId: string, newStatus: ShipmentStatus) => void;
  onOpenRescue?: (order: TrackingOrder) => void;
  onEditOrder?: (order: TrackingOrder) => void;
  mode?: 'ACTIVE' | 'RESCUE' | 'ALL';
}

interface KanbanColumnConfig {
  id: ShipmentStatus;
  title: string;
  badgeColor: string;
  dotColor: string;
  headerBg?: string;
}

const ALL_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'READY_FOR_PICKUP',
    title: '📦 1. Prêt pour Ramassage (AWB)',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    dotColor: 'bg-slate-500',
  },
  {
    id: 'IN_TRANSIT',
    title: '🚚 2. En Cours de Transfert (Hubs)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'OUT_FOR_DELIVERY',
    title: '🛵 3. En Cours de Distribution (Livreur)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'DELIVERY_FAILED',
    title: '🚨 4. Échec / À Sauver (<24h)',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-black',
    dotColor: 'bg-rose-600 animate-ping',
    headerBg: 'bg-rose-50/60',
  },
  {
    id: 'DELIVERED_PAID',
    title: '✅ 1. Livrées & Encaissées',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
    dotColor: 'bg-emerald-600',
    headerBg: 'bg-emerald-50/50',
  },
  {
    id: 'RETURNED',
    title: '📦 2. Retours & Refusées',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 font-black',
    dotColor: 'bg-purple-600',
    headerBg: 'bg-purple-50/50',
  },
  {
    id: 'CANCELED',
    title: '🚫 3. Commandes Annulées',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300 font-black',
    dotColor: 'bg-slate-600',
    headerBg: 'bg-slate-100/60',
  },
];

function formatOrderDate(dateStr?: string): string {
  if (!dateStr) return 'Date récente';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Date récente';
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Aujourd'hui à ${time}`;
  if (isYesterday) return `Hier à ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${time}`;
}

export function TrackingKanban({
  orders,
  onSelectOrder,
  onStatusChange,
  onOpenRescue,
  onEditOrder,
  mode = 'ACTIVE',
}: TrackingKanbanProps) {
  const visibleColumns = React.useMemo(() => {
    if (mode === 'ACTIVE') {
      return ALL_COLUMNS.filter(
        (c) =>
          c.id === 'READY_FOR_PICKUP' ||
          c.id === 'IN_TRANSIT' ||
          c.id === 'OUT_FOR_DELIVERY' ||
          c.id === 'DELIVERY_FAILED'
      );
    }
    if (mode === 'RESCUE') {
      return ALL_COLUMNS.filter((c) => c.id === 'DELIVERY_FAILED');
    }
    // mode === 'ALL' (Commandes Clôturées: Livrées, Refusées, Annulées)
    return ALL_COLUMNS.filter(
      (c) => c.id === 'DELIVERED_PAID' || c.id === 'RETURNED' || c.id === 'CANCELED'
    );
  }, [mode]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[calc(100vh-280px)] select-none">
      {visibleColumns.map((column) => {
        const columnOrders = orders.filter((o) => o.shipmentStatus === column.id);
        const isRescueCol = column.id === 'DELIVERY_FAILED';
        const isDeliveredCol = column.id === 'DELIVERED_PAID';
        const isReturnedCol = column.id === 'RETURNED';
        const isCanceledCol = column.id === 'CANCELED';

        return (
          <div
            key={column.id}
            className={`w-80 shrink-0 border rounded-2xl flex flex-col max-h-[82vh] transition-all ${
              isRescueCol
                ? 'bg-rose-50/30 border-rose-300 shadow-sm'
                : isDeliveredCol
                ? 'bg-emerald-50/20 border-emerald-200 shadow-2xs'
                : isReturnedCol
                ? 'bg-purple-50/20 border-purple-200 shadow-2xs'
                : isCanceledCol
                ? 'bg-slate-50/60 border-slate-200 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/90 shadow-2xs'
            }`}
          >
            {/* Column Header */}
            <div
              className={`p-3.5 border-b flex items-center justify-between rounded-t-2xl ${
                isRescueCol
                  ? 'bg-gradient-to-r from-rose-50 to-amber-50/60 border-rose-200'
                  : isDeliveredCol
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                  : isReturnedCol
                  ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
                  : isCanceledCol
                  ? 'bg-slate-100/80 border-slate-200'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                <h3 className="font-bold text-xs text-slate-900">{column.title}</h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${column.badgeColor}`}
              >
                {columnOrders.length}
              </span>
            </div>

            {/* Column Body / Cards List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {columnOrders.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                  Aucune commande dans cette étape
                </div>
              ) : (
                columnOrders.map((order) => {
                  const isFailed = order.shipmentStatus === 'DELIVERY_FAILED';
                  const isDelivered = order.shipmentStatus === 'DELIVERED_PAID';
                  const isReturned = order.shipmentStatus === 'RETURNED';
                  const isCanceled = order.shipmentStatus === 'CANCELED';

                  // Moroccan Darija pre-filled rescue link for direct WhatsApp outreach
                  const rawPhone = order.phoneNumber.replace(/\s+/g, '');
                  const cleanPhone = rawPhone.startsWith('+212')
                    ? rawPhone.slice(1)
                    : rawPhone.startsWith('0')
                    ? `212${rawPhone.slice(1)}`
                    : `212${rawPhone}`;

                  const darijaMsg = `السلام عليكم خويا/أختي ${order.customerName}، معكم مصلحة الزبناء بخصوص طلبيتكم رقم ${order.orderNumber} (${order.productName} - ${order.totalAmount} درهم). الموزع ديال شركة التوصيل حاول يتصل بك اليوم ولكن ما شدش الخط. واش ممكن تأكد لينا الوقت المناسب للتوصيل غداً إن شاء الله؟ شكراً لك! 🚚`;
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(darijaMsg)}`;

                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`rounded-2xl border p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group relative ${
                        isFailed
                          ? 'bg-white border-rose-300 ring-1 ring-rose-200/50 hover:border-rose-400'
                          : isDelivered
                          ? 'bg-white border-emerald-200 hover:border-emerald-300'
                          : isReturned
                          ? 'bg-white border-purple-200 hover:border-purple-300'
                          : isCanceled
                          ? 'bg-white border-slate-300/80 hover:border-slate-400'
                          : 'bg-white border-slate-200/80 hover:border-blue-300'
                      }`}
                    >
                      {/* Top Row: Order Number + COD Amount */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-md ${
                            isDelivered
                              ? 'text-emerald-700 bg-emerald-100'
                              : isReturned
                              ? 'text-purple-700 bg-purple-100 line-through'
                              : isCanceled
                              ? 'text-slate-500 bg-slate-100 line-through'
                              : 'text-emerald-600 bg-emerald-50'
                          }`}
                        >
                          {order.totalAmount} MAD
                        </span>
                      </div>

                      {/* Date de commande & Historique Sendit */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pb-1 border-b border-slate-100/80">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatOrderDate(order.createdAt)}</span>
                        </span>
                        {order.timeline && order.timeline.length > 0 && (
                          <span className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200/90 transition-colors" title="Événements enregistrés par Sendit.ma">
                            {order.timeline.length} màj Sendit
                          </span>
                        )}
                      </div>

                      {/* Customer Info */}
                      <div className="mt-2">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {order.customerName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-700">{order.city}</span>
                          </span>
                          <span>•</span>
                          <span className="font-mono font-medium">{order.phoneNumber}</span>
                        </div>
                      </div>

                      {/* Product & Attribute */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="truncate max-w-[160px] font-medium text-slate-700">
                          {order.productName}
                        </span>
                        <span className="text-slate-400">
                          Qté : {order.productQuantity}
                        </span>
                      </div>

                      {/* Sendit Barcode & Delivery Info */}
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 font-bold">
                          {order.trackingNumber}
                        </span>

                        {order.deliveryAttempts > 0 && (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {order.deliveryAttempts} tentative(s)
                          </span>
                        )}
                      </div>

                      {/* ── 1. ÉCHEC / À SAUVER STATUS & ACTIONS ── */}
                      {isFailed && (
                        <>
                          <div className="mt-2.5 bg-rose-50 border border-rose-200 rounded-xl p-2 text-[11px] text-rose-800 space-y-1">
                            <div className="flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate">
                                {order.failedReason || 'Client Injoignable / Tentative infructueuse'}
                              </span>
                            </div>
                            <p className="text-[10px] text-rose-600 font-semibold">
                              ⏳ Délai d'intervention Sendit : moins de 24h
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-rose-100 flex flex-col gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenRescue) onOpenRescue(order);
                                else onSelectOrder(order);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-rose-600 to-indigo-700 hover:from-rose-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>🚨 Intervenir & Sauver le colis</span>
                            </button>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
                                title="Ouvrir WhatsApp avec message de sauvetage en Darija"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>WhatsApp Darija</span>
                              </a>

                              <a
                                href={`tel:${order.phoneNumber}`}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
                                title="Appel téléphonique direct"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => {
                                  if (onOpenRescue) onOpenRescue(order);
                                  else onStatusChange(order.id, 'OUT_FOR_DELIVERY');
                                }}
                                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                                title="Reprogrammer la date de livraison"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>Reprogrammer</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── 2. LIVRÉE & ENCAISSÉE STATUS BADGE (و حالتها) ── */}
                      {isDelivered && (
                        <div className="mt-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <BadgeCheck className="w-4 h-4 text-emerald-600" />
                              <span>Livré & Encaissé</span>
                            </span>
                            <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded">
                              COD Payé
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            Fonds collectés : {order.totalAmount} MAD • Virement Sendit en attente de réconciliation
                          </p>
                        </div>
                      )}

                      {/* ── 3. RETOURNÉE & REFUSÉE STATUS BADGE (و حالتها) ── */}
                      {isReturned && (
                        <div className="mt-2.5 bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-[11px] text-purple-900 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                              <span>Colis Retourné & Refusé</span>
                            </span>
                            <span className="text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded">
                              Stock Réintégré
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-700 font-medium truncate">
                            Motif : {order.failedReason || 'Client absent / Colis refusé à la livraison'}
                          </p>
                        </div>
                      )}

                      {/* ── 4. ANNULÉE STATUS BADGE (و حالتها) ── */}
                      {isCanceled && (
                        <div className="mt-2.5 bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-[11px] text-slate-800 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                              <span>Commande Annulée</span>
                            </span>
                            <span className="text-[10px] bg-slate-600 text-white font-bold px-1.5 py-0.5 rounded">
                              Stock Débloqué
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 font-medium truncate">
                            Motif : {order.failedReason || 'Annulé avant expédition (Doublon ou faux numéro)'}
                          </p>
                        </div>
                      )}

                      {/* Standard Card Actions Footer */}
                      {!isFailed && (
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
                            {/* Actions for closed orders */}
                            {(isDelivered || isReturned || isCanceled) && (
                              <button
                                onClick={() => onSelectOrder(order)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3 text-slate-500" />
                                <span>Détails</span>
                              </button>
                            )}

                            {/* Active Pipeline Stage Movers */}
                            {column.id === 'READY_FOR_PICKUP' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditOrder?.(order);
                                  }}
                                  className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-lg transition-colors border border-amber-200 flex items-center gap-1"
                                  title="Modifier les coordonnées du client ou annuler avant expédition"
                                >
                                  <Edit3 className="w-3 h-3 text-amber-600" />
                                  <span>Modifier</span>
                                </button>
                                <button
                                  onClick={() => onStatusChange(order.id, 'IN_TRANSIT')}
                                  className="text-[10px] bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-semibold px-2 py-1 rounded-lg transition-colors border border-slate-200"
                                >
                                  Expédier →
                                </button>
                              </>
                            )}
                            {column.id === 'OUT_FOR_DELIVERY' && (
                              <button
                                onClick={() => onStatusChange(order.id, 'DELIVERED_PAID')}
                                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg transition-colors border border-emerald-200"
                              >
                                Livré ✓
                              </button>
                            )}
                            {column.id === 'IN_TRANSIT' && (
                              <button
                                onClick={() => onStatusChange(order.id, 'OUT_FOR_DELIVERY')}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-lg transition-colors border border-amber-200"
                              >
                                Livreur →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
