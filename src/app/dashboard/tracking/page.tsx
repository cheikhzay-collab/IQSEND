'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  Truck,
  Bot,
  AlertCircle,
  Layers,
  FileSpreadsheet,
  ChevronDown,
  Radio,
  Zap,
  WifiOff,
  Loader2,
  Kanban,
  Table,
} from 'lucide-react';
import { TrackingOrder, ShipmentStatus, TrackingKpis } from '@/types';
import { KpiCards } from '@/components/tracking/KpiCards';
import { TrackingKanban } from '@/components/tracking/TrackingKanban';
import { OrderDrawer } from '@/components/tracking/OrderDrawer';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';
import { useLiveTracking, LiveTrackingUpdate, ConnectionState } from '@/hooks/useLiveTracking';

// ─────────────────────────────────────────────────────────────
//  Status mapping helper
// ─────────────────────────────────────────────────────────────
function mapMappedStatusToShipment(mappedStatus: string): ShipmentStatus {
  switch (mappedStatus) {
    case 'READY_FOR_PICKUP': return 'READY_FOR_PICKUP';
    case 'IN_TRANSIT':       return 'IN_TRANSIT';
    case 'OUT_FOR_DELIVERY': return 'OUT_FOR_DELIVERY';
    case 'DELIVERY_FAILED':  return 'DELIVERY_FAILED';
    case 'DELIVERED_PAID':   return 'DELIVERED_PAID';
    case 'RETURNED':         return 'RETURNED';
    case 'CANCELLED':        return 'RETURNED'; // map to RETURNED in UI
    default:                 return 'IN_TRANSIT';
  }
}

// ─────────────────────────────────────────────────────────────
//  Connection Badge Component
// ─────────────────────────────────────────────────────────────
function LiveBadge({ state, eventCount, lastEventAt }: {
  state: ConnectionState;
  eventCount: number;
  lastEventAt: string | null;
}) {
  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live Sendit
        {eventCount > 0 && (
          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {eventCount}
          </span>
        )}
      </span>
    );
  }
  if (state === 'reconnecting') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-200">
        <Loader2 className="w-3 h-3 animate-spin" />
        Reconnexion…
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs px-2.5 py-1 rounded-full font-medium border border-rose-200">
        <WifiOff className="w-3 h-3" />
        Hors ligne
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
      <Loader2 className="w-3 h-3 animate-spin" />
      Connexion…
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
//  Live Update Toast
// ─────────────────────────────────────────────────────────────
function LiveUpdateFlash({ update }: { update: LiveTrackingUpdate | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!update) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [update]);

  if (!update || !visible) return null;

  const colors: Record<string, string> = {
    OUT_FOR_DELIVERY: 'bg-blue-600',
    DELIVERED_PAID:   'bg-emerald-600',
    DELIVERY_FAILED:  'bg-rose-600',
    IN_TRANSIT:       'bg-indigo-600',
    RETURNED:         'bg-slate-600',
  };
  const bg = colors[update.mappedStatus] || 'bg-slate-700';

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 ${bg} text-white px-4 py-3 rounded-2xl shadow-2xl max-w-sm
        transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Zap className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-bold">🔴 Mise à jour Sendit en direct</p>
        <p className="text-[11px] opacity-90 mt-0.5">
          <strong>{update.trackingCode}</strong> → {update.mappedStatus.replace(/_/g, ' ')}
          {update.message && <span className="ml-1 opacity-75">({update.message})</span>}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { markDelivered, showToast } = useOrderLifecycle();
  const [orders, setOrders]           = useState<TrackingOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<TrackingOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [isLiveDb, setIsLiveDb]           = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<LiveTrackingUpdate | null>(null);
  // Track which order ids just got a live update (for animation)
  const [flashedOrders, setFlashedOrders]  = useState<Set<string>>(new Set());

  // ── مزامنة الطلبات مباشرة من حساب Sendit.ma ─────────────────
  const syncWithSendit = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      showToast('جاري الاتصال بـ Sendit.ma ومزامنة الكوليات...', 'info');
      const res = await fetch('/api/tracking/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `تم جلب ${data.syncedCount} طلب من Sendit.ma بنجاح!`, 'success');
        await fetchOrders();
      } else {
        showToast(data.error || 'تعذر استكمال المزامنة مع Sendit.ma', 'error');
      }
    } catch (err: any) {
      showToast(`خطأ في المزامنة: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── SSE: real-time Sendit updates ──────────────────────────
  const handleLiveUpdate = useCallback((update: LiveTrackingUpdate) => {
    setLastLiveUpdate(update);

    setOrders((prev) => {
      const idx = prev.findIndex(
        (o) =>
          o.trackingNumber === update.trackingCode ||
          o.orderNumber === update.trackingCode
      );
      if (idx === -1) return prev; // Pas de colis correspondant

      const order = prev[idx];
      const newStatus = mapMappedStatusToShipment(update.mappedStatus);

      const newTimelineEvent = {
        id: `live-${Date.now()}`,
        timestamp: new Date(update.timestamp).toLocaleString('fr-FR', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }),
        title: `🔴 Sendit LIVE: ${update.senditStatus}`,
        description: update.message || `Statut mis à jour automatiquement via Webhook`,
        actor: 'SENDIT' as const,
      };

      const updated: TrackingOrder = {
        ...order,
        shipmentStatus: newStatus,
        lastUpdatedAt: 'À l\'instant (Live)',
        failedReason: update.mappedStatus === 'DELIVERY_FAILED'
          ? (update.message || 'Client Injoignable')
          : order.failedReason,
        timeline: [newTimelineEvent, ...order.timeline],
      };

      // Déclencher le lifecycle si livré
      if (newStatus === 'DELIVERED_PAID') {
        markDelivered(order.id);
      }

      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    // Flash animation sur la carte
    setFlashedOrders((prev) => {
      const next = new Set(prev);
      next.add(update.trackingCode);
      return next;
    });
    setTimeout(() => {
      setFlashedOrders((prev) => {
        const next = new Set(prev);
        next.delete(update.trackingCode);
        return next;
      });
    }, 3000);

    showToast(
      `🔴 LIVE: ${update.trackingCode} → ${update.mappedStatus.replace(/_/g, ' ')}`,
      update.mappedStatus === 'DELIVERED_PAID' ? 'success' : 'info'
    );
  }, [markDelivered, showToast]);

  const { connectionState, lastEventAt, eventCount } = useLiveTracking({
    onUpdate: handleLiveUpdate,
    enabled: true,
  });

  // ── Chargement initial depuis DB ───────────────────────────
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch('/api/tracking');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Error fetching tracking orders from DB:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ── KPIs ───────────────────────────────────────────────────
  const kpis: TrackingKpis = useMemo(() => {
    const totalShipments     = orders.length;
    const outForDelivery     = orders.filter((o) => o.shipmentStatus === 'OUT_FOR_DELIVERY').length;
    const deliveredCount     = orders.filter((o) => o.shipmentStatus === 'DELIVERED_PAID').length;
    const failedAtRiskCount  = orders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED').length;
    const totalCodCollected  = orders.filter((o) => o.shipmentStatus === 'DELIVERED_PAID').reduce((s, o) => s + o.totalAmount, 0);
    const pendingCodAmount   = orders.filter((o) => o.shipmentStatus !== 'DELIVERED_PAID' && o.shipmentStatus !== 'RETURNED').reduce((s, o) => s + o.totalAmount, 0);
    const deliveryRate       = totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 100) : 0;
    return { totalShipments, outForDeliveryCount: outForDelivery, deliveredCount, deliveryRate, failedAtRiskCount, totalCodCollected, pendingCodAmount };
  }, [orders]);

  const cities = useMemo(() => Array.from(new Set(orders.map((o) => o.city))), [orders]);

  const filteredOrders = useMemo(() =>
    orders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phoneNumber.includes(searchQuery) ||
        order.trackingNumber.toLowerCase().includes(q) ||
        order.city.toLowerCase().includes(q);
      const matchCity = selectedCity === 'ALL' || order.city === selectedCity;
      return matchSearch && matchCity;
    }),
    [orders, searchQuery, selectedCity]
  );

  // ── Handlers ───────────────────────────────────────────────
  const handleSelectOrder = (order: TrackingOrder) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: ShipmentStatus) => {
    fetch('/api/tracking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, shipmentStatus: newStatus }),
    }).catch((err) => console.warn('[Tracking Page] DB PATCH error:', err));

    if (newStatus === 'DELIVERED_PAID') {
      markDelivered(orderId);
      showToast('Colis marqué Livré & Encaissé ! Fonds COD lettrés en comptabilité.', 'success');
    }

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const ev = {
          id: `t-${Date.now()}`,
          timestamp: 'À l\'instant',
          title: `Statut changé vers: ${newStatus}`,
          description: 'Mise à jour manuelle via le tableau de bord',
          actor: 'AGENT' as const,
        };
        return { ...order, shipmentStatus: newStatus, lastUpdatedAt: 'À l\'instant', timeline: [ev, ...order.timeline] };
      })
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, shipmentStatus: newStatus } : null));
    }
  };

  const handleToggleAi = (orderId: string, enabled: boolean) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, aiConversationEnabled: enabled } : o)));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, aiConversationEnabled: enabled } : null));
    }
  };

  const handleSendMessage = (orderId: string, text: string) => {
    const msg = {
      id: `msg-${Date.now()}`,
      sender: 'AGENT' as const,
      text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, chatMessages: [...o.chatMessages, msg], aiConversationEnabled: false } : o)
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, aiConversationEnabled: false, chatMessages: [...prev.chatMessages, msg] } : null);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">

      {/* ── 1. Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">

          {/* Title & Live badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  3. En cours de livraison — Suivi Sendit.ma
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Pipeline COD en temps réel •{' '}
                  {connectionState === 'connected'
                    ? `Flux temps réel actif${eventCount > 0 ? ` · ${eventCount} màj live` : ''}`
                    : connectionState === 'reconnecting'
                    ? 'Reconnexion en cours…'
                    : 'Connexion SSE…'}
                  {lastEventAt && (
                    <span className="ml-1 text-emerald-600 font-semibold">
                      · Dernière màj: {new Date(lastEventAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
              <LiveBadge state={connectionState} eventCount={eventCount} lastEventAt={lastEventAt} />
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-200">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
                Gemini 1.5 Flash
              </span>
              {isLiveDb && (
                <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-200">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  MySQL ({orders.length} colis)
                </span>
              )}
            </div>
          </div>

          {/* Actions & View Switcher */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher: Kanban vs Tableau */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-900 text-xs font-bold shadow-2xs">
                <Kanban className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kanban Sendit</span>
              </span>
              <Link
                href="/dashboard/orders/in-transit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
                title="Basculer vers la vue tableau des commandes"
              >
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>Vue Tableau</span>
              </Link>
            </div>

            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (Client, Tél, Code Sendit)..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Villes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={syncWithSendit}
              disabled={isSyncing || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all shrink-0 disabled:opacity-50"
              title="جلب ومزامنة كافة الطلبات والكوليات الحية مباشرة من حساب Sendit.ma"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة…' : '🔄 مزامنة Sendit.ma'}</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={isLoading || isSyncing}
              className="p-2 border border-slate-200/90 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              title="Actualiser depuis la base de données"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              className="p-2 border border-slate-200/90 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              title="Exporter rapport de bord"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Main ── */}
      <main className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-400 mx-auto pb-20 md:pb-6">

        {/* KPIs */}
        <KpiCards kpis={kpis} />

        {/* Emergency Rescue Panel */}
        {kpis.failedAtRiskCount > 0 && (
          <div className="bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 border-2 border-rose-200/90 rounded-2xl p-4.5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-600/30">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      🚨 Cellule Urgence Sauvetage : {kpis.failedAtRiskCount} colis en risque
                    </h3>
                    <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Délai Sendit &lt; 24h
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Ces colis sont en échec de livraison. Déclenchez l'assistance WhatsApp pour éviter le retour.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const atRisk = orders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED');
                  atRisk.forEach((ord) =>
                    handleSendMessage(ord.id, `مرحباً ${ord.customerName}، لاحظنا أن الموزع واجه صعوبة في تسليم طلبك. كيفاش تفضل نكملوا التوصيل؟`)
                  );
                  showToast(`Message de sauvetage envoyé à ${atRisk.length} clients`, 'success');
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <Bot className="w-3.5 h-3.5" /> Relancer tout par Bot WhatsApp
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {orders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED').map((o) => (
                <div key={o.id} className="bg-white border border-rose-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-rose-400 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{o.orderNumber}</span>
                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                      {o.city} · {o.totalAmount} MAD
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>{o.customerName}</strong> ({o.phoneNumber})
                    <div className="text-[11px] text-rose-600 font-medium mt-0.5 truncate">
                      ⚠️ {o.failedReason || 'Client Injoignable'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        handleSendMessage(o.id, `مرحباً ${o.customerName}، حاول موزع Sendit يتصل بك اليوم. هل تفضل استلام طلبك غداً؟ 🚚`);
                        showToast(`Sauvetage envoyé à ${o.customerName}`, 'success');
                      }}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold py-1.5 rounded-lg text-center transition-colors"
                    >
                      📱 Sauvetage WhatsApp
                    </button>
                    <button
                      onClick={() => handleSelectOrder(o)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
                    >
                      Détails
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Pipeline des Colis ({filteredOrders.length})</span>
            {searchQuery && (
              <span className="text-slate-400">— Résultats pour "{searchQuery}"</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {connectionState === 'connected' && (
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                Mises à jour en temps réel actives
              </span>
            )}
          </div>
        </div>

        {/* Kanban */}
        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-2xs gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-700">Chargement du pipeline Sendit…</p>
            <p className="text-xs text-slate-400">Synchronisation en direct avec la base de données</p>
          </div>
        ) : (
          <TrackingKanban
            orders={filteredOrders}
            onSelectOrder={handleSelectOrder}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* Order Drawer */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onToggleAi={handleToggleAi}
        onSendMessage={handleSendMessage}
      />

      {/* Live update toast */}
      <LiveUpdateFlash update={lastLiveUpdate} />
    </div>
  );
}
