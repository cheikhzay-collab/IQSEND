'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  Truck,
  Bot,
  AlertCircle,
  ChevronDown,
  Radio,
  Zap,
  WifiOff,
  Loader2,
  Kanban,
  Table,
  ShieldAlert,
  Calendar,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Filter,
} from 'lucide-react';
import { TrackingOrder, ShipmentStatus, TrackingKpis, DateFilterOption, TrackingSortOption } from '@/types';
import { KpiCards } from '@/components/tracking/KpiCards';
import { TrackingKanban } from '@/components/tracking/TrackingKanban';
import { OrderDrawer } from '@/components/tracking/OrderDrawer';
import { RescueInterventionModal } from '@/components/tracking/RescueInterventionModal';
import { OrderEditModal } from '@/components/tracking/OrderEditModal';
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
    case 'CANCELLED':        return 'RETURNED';
    default:                 return 'IN_TRANSIT';
  }
}

// ─────────────────────────────────────────────────────────────
//  Clean Connection Badge Component
// ─────────────────────────────────────────────────────────────
function LiveBadge({ state, eventCount }: { state: ConnectionState; eventCount: number }) {
  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live Sendit
        {eventCount > 0 && (
          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
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
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
      <span className="w-2 h-2 rounded-full bg-slate-400" />
      Synchronisé
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
//  Live Update Toast Notification
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
//  Main Tracking Page Component
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  Date Filter & Sort Helpers
// ─────────────────────────────────────────────────────────────
const STATUS_PRIORITY: Record<ShipmentStatus, number> = {
  READY_FOR_PICKUP: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERY_FAILED: 4,
  DELIVERED_PAID: 5,
  RETURNED: 6,
  CANCELED: 7,
};

function matchesDateFilter(
  orderDateStr: string | undefined,
  filter: DateFilterOption,
  customStart?: string,
  customEnd?: string
): boolean {
  if (filter === 'ALL') return true;
  if (!orderDateStr) return false;

  const orderDate = new Date(orderDateStr);
  if (isNaN(orderDate.getTime())) return false;

  const now = new Date();

  if (filter === 'TODAY') {
    return (
      orderDate.getFullYear() === now.getFullYear() &&
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getDate() === now.getDate()
    );
  }

  if (filter === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      orderDate.getFullYear() === yesterday.getFullYear() &&
      orderDate.getMonth() === yesterday.getMonth() &&
      orderDate.getDate() === yesterday.getDate()
    );
  }

  if (filter === 'LAST_7_DAYS') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return orderDate >= d;
  }

  if (filter === 'LAST_14_DAYS') {
    const d = new Date(now);
    d.setDate(d.getDate() - 14);
    d.setHours(0, 0, 0, 0);
    return orderDate >= d;
  }

  if (filter === 'LAST_30_DAYS') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return orderDate >= d;
  }

  if (filter === 'CUSTOM') {
    if (!customStart && !customEnd) return true;
    let match = true;
    if (customStart) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      match = match && orderDate >= start;
    }
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      match = match && orderDate <= end;
    }
    return match;
  }

  return true;
}

export default function TrackingPage() {
  const { markDelivered, showToast } = useOrderLifecycle();
  const [orders, setOrders]                 = useState<TrackingOrder[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCity, setSelectedCity]     = useState<string>('ALL');
  const [dateFilter, setDateFilter]         = useState<DateFilterOption>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate]   = useState<string>('');
  const [sortBy, setSortBy]                 = useState<TrackingSortOption>('DATE_DESC');
  const [isFilterOpen, setIsFilterOpen]     = useState(false);
  const filterRef                           = useRef<HTMLDivElement>(null);

  // Fermer la popover du filtre en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);
  const [pipelineMode, setPipelineMode]     = useState<'ACTIVE' | 'RESCUE' | 'ALL'>('ACTIVE');
  const [selectedOrder, setSelectedOrder]   = useState<TrackingOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen]     = useState(false);
  const [rescueOrder, setRescueOrder]       = useState<TrackingOrder | null>(null);
  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);
  const [editOrder, setEditOrder]           = useState<TrackingOrder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [isSyncing, setIsSyncing]           = useState(false);
  const [isBulkRescuing, setIsBulkRescuing] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<LiveTrackingUpdate | null>(null);


  // ── Ouverture de la modal de modification/annulation responsable ──
  const handleOpenEdit = (order: TrackingOrder) => {
    setEditOrder(order);
    setIsEditModalOpen(true);
  };
  // ── Synchronisation directe avec l'API Sendit.ma ──────────
  const syncWithSendit = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      showToast('Connexion à Sendit.ma et synchronisation des colis en cours...', 'info');
      const res = await fetch('/api/tracking/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `${data.syncedCount} colis synchronisés avec succès depuis Sendit.ma !`, 'success');
        await fetchOrders();
      } else {
        showToast(data.error || 'Impossible de finaliser la synchronisation avec Sendit.ma', 'error');
      }
    } catch (err: any) {
      showToast(`Erreur lors de la synchronisation : ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Campagne de relance WhatsApp groupée ──────────────────
  const handleBulkRescue = async () => {
    if (isBulkRescuing) return;
    setIsBulkRescuing(true);
    try {
      showToast('Envoi des messages de sauvetage WhatsApp en cours pour tous les colis en échec...', 'info');
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_RESCUE' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Messages de sauvetage envoyés avec succès à ${data.sentCount} clients !`, 'success');
        await fetchOrders();
      } else {
        showToast(`Échec de la relance groupée : ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Erreur : ${e.message}`, 'error');
    } finally {
      setIsBulkRescuing(false);
    }
  };

  // ── SSE: Mises à jour en direct depuis Sendit ─────────────
  const handleLiveUpdate = useCallback((update: LiveTrackingUpdate) => {
    setLastLiveUpdate(update);

    setOrders((prev) => {
      const idx = prev.findIndex(
        (o) =>
          o.trackingNumber === update.trackingCode ||
          o.orderNumber === update.trackingCode
      );
      if (idx === -1) return prev;

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

      if (newStatus === 'DELIVERED_PAID') {
        markDelivered(order.id);
      }

      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    showToast(
      `🔴 LIVE Sendit: ${update.trackingCode} → ${update.mappedStatus.replace(/_/g, ' ')}`,
      update.mappedStatus === 'DELIVERED_PAID' ? 'success' : 'info'
    );
  }, [markDelivered, showToast]);

  const { connectionState, lastEventAt, eventCount } = useLiveTracking({
    onUpdate: handleLiveUpdate,
    enabled: true,
  });

  // ── Chargement des commandes depuis la base MySQL ─────────
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tracking');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.warn('Erreur lors du chargement des commandes de suivi :', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ── Calcul des indicateurs clés (KPIs) ───────────────────
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

  // Commandes pré-filtrées par Date, Recherche et Ville pour alimenter les décomptes des onglets
  const dateAndSearchFilteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phoneNumber.includes(searchQuery) ||
        order.trackingNumber.toLowerCase().includes(q) ||
        order.city.toLowerCase().includes(q);
      if (!matchSearch) return false;

      const matchCity = selectedCity === 'ALL' || order.city === selectedCity;
      if (!matchCity) return false;

      return matchesDateFilter(order.createdAt, dateFilter, customStartDate, customEndDate);
    });
  }, [orders, searchQuery, selectedCity, dateFilter, customStartDate, customEndDate]);

  // Décomptes du pipeline opérationnel (dynamiques avec filtres de date)
  const activeDeliveriesCount = useMemo(
    () => dateAndSearchFilteredOrders.filter((o) =>
      o.shipmentStatus === 'READY_FOR_PICKUP' ||
      o.shipmentStatus === 'IN_TRANSIT' ||
      o.shipmentStatus === 'OUT_FOR_DELIVERY' ||
      o.shipmentStatus === 'DELIVERY_FAILED'
    ).length,
    [dateAndSearchFilteredOrders]
  );
  const failedAtRiskCount = useMemo(
    () => dateAndSearchFilteredOrders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED').length,
    [dateAndSearchFilteredOrders]
  );
  const closedOrdersCount = useMemo(
    () => dateAndSearchFilteredOrders.filter((o) => o.shipmentStatus === 'DELIVERED_PAID' || o.shipmentStatus === 'RETURNED' || o.shipmentStatus === 'CANCELED').length,
    [dateAndSearchFilteredOrders]
  );

  // ── Filtrage et Tri des commandes (Date, Mode, Ville, Recherche & Ordre) ────
  const filteredOrders = useMemo(() => {
    const list = orders.filter((order) => {
      if (pipelineMode === 'ACTIVE') {
        const isActive =
          order.shipmentStatus === 'READY_FOR_PICKUP' ||
          order.shipmentStatus === 'IN_TRANSIT' ||
          order.shipmentStatus === 'OUT_FOR_DELIVERY' ||
          order.shipmentStatus === 'DELIVERY_FAILED';
        if (!isActive) return false;
      } else if (pipelineMode === 'RESCUE') {
        if (order.shipmentStatus !== 'DELIVERY_FAILED') return false;
      } else if (pipelineMode === 'ALL') {
        const isClosed = order.shipmentStatus === 'DELIVERED_PAID' || order.shipmentStatus === 'RETURNED' || order.shipmentStatus === 'CANCELED';
        if (!isClosed) return false;
      }

      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.phoneNumber.includes(searchQuery) ||
        order.trackingNumber.toLowerCase().includes(q) ||
        order.city.toLowerCase().includes(q);
      if (!matchSearch) return false;

      const matchCity = selectedCity === 'ALL' || order.city === selectedCity;
      if (!matchCity) return false;

      const matchDate = matchesDateFilter(order.createdAt, dateFilter, customStartDate, customEndDate);
      if (!matchDate) return false;

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === 'DATE_ASC') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tA - tB;
      }
      if (sortBy === 'STATUS') {
        const pA = STATUS_PRIORITY[a.shipmentStatus] || 99;
        const pB = STATUS_PRIORITY[b.shipmentStatus] || 99;
        if (pA !== pB) return pA - pB;
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }
      if (sortBy === 'AMOUNT_DESC') {
        return b.totalAmount - a.totalAmount;
      }
      if (sortBy === 'AMOUNT_ASC') {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });
  }, [orders, pipelineMode, searchQuery, selectedCity, dateFilter, customStartDate, customEndDate, sortBy]);

  // ── Gestionnaires d'événements ───────────────────────────
  const handleSelectOrder = (order: TrackingOrder) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleOpenRescue = (order: TrackingOrder) => {
    setRescueOrder(order);
    setIsRescueModalOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: ShipmentStatus) => {
    fetch('/api/tracking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, shipmentStatus: newStatus }),
    }).catch((err) => console.warn('[Tracking Page] Erreur PATCH DB :', err));

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
          title: `Statut changé vers : ${newStatus}`,
          description: 'Mise à jour via le tableau de bord',
          actor: 'AGENT' as const,
        };
        return { ...order, shipmentStatus: newStatus, lastUpdatedAt: 'À l\'instant', timeline: [ev, ...order.timeline] };
      })
    );
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">

      {/* ── 1. En-tête épuré et sans distraction ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">

          {/* Titre & Statut Live */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  3. En cours de livraison — Suivi Sendit.ma
                </h1>
                <LiveBadge state={connectionState} eventCount={eventCount} />
              </div>
              <p className="text-[11px] text-slate-500">
                Pipeline COD en direct • {orders.length} colis enregistrés
                {lastEventAt && (
                  <span className="ml-1 text-emerald-600 font-semibold">
                    · Dernier événement : {new Date(lastEventAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions & Filtres */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Bascule Vue : Kanban vs Tableau */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-950 text-xs font-bold shadow-2xs">
                <Kanban className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kanban</span>
              </span>
              <Link
                href="/dashboard/orders/in-transit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
                title="Basculer vers la vue tableau des commandes"
              >
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>Tableau</span>
              </Link>
            </div>

            {/* Champ de recherche */}
            <div className="relative flex-1 sm:min-w-[190px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (Client, Tél, Code Sendit)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Sélecteur de ville */}
            <div className="relative shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Toutes les villes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* ── Bouton Icône Filtres & Tri (En haut dans l'en-tête) ── */}
            <div className="relative shrink-0" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  dateFilter !== 'ALL' || sortBy !== 'DATE_DESC'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Filtrer par date (Aujourd'hui, Hier, 7j, 14j, 30j, personnalisé) et options de tri"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {dateFilter === 'TODAY'
                    ? "Aujourd'hui"
                    : dateFilter === 'YESTERDAY'
                    ? 'Hier'
                    : dateFilter === 'LAST_7_DAYS'
                    ? '7 jours'
                    : dateFilter === 'LAST_14_DAYS'
                    ? '14 jours'
                    : dateFilter === 'LAST_30_DAYS'
                    ? '30 jours'
                    : dateFilter === 'CUSTOM'
                    ? 'Période'
                    : 'Filtres'}
                </span>
                {(dateFilter !== 'ALL' || sortBy !== 'DATE_DESC') ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {/* Popover Dropdown Flottante */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* En-tête de la Popover */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-900">Filtres de Date & Tri</span>
                    </div>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Section 1 : Période / Date */}
                  <div className="space-y-2 mb-4">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Période de Commande</span>
                    </label>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setDateFilter('ALL')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'ALL'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Toutes les dates
                      </button>
                      <button
                        onClick={() => setDateFilter('TODAY')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'TODAY'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Aujourd'hui
                      </button>
                      <button
                        onClick={() => setDateFilter('YESTERDAY')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'YESTERDAY'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Hier
                      </button>
                      <button
                        onClick={() => setDateFilter('LAST_7_DAYS')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'LAST_7_DAYS'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        7 derniers jours
                      </button>
                      <button
                        onClick={() => setDateFilter('LAST_14_DAYS')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'LAST_14_DAYS'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        14 derniers jours
                      </button>
                      <button
                        onClick={() => setDateFilter('LAST_30_DAYS')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all border ${
                          dateFilter === 'LAST_30_DAYS'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        30 jours (Mois)
                      </button>
                    </div>

                    <button
                      onClick={() => setDateFilter('CUSTOM')}
                      className={`w-full mt-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                        dateFilter === 'CUSTOM'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Intervalle Personnalisé...</span>
                      <Calendar className="w-3.5 h-3.5" />
                    </button>

                    {/* Inputs Date Début et Fin */}
                    {dateFilter === 'CUSTOM' && (
                      <div className="pt-2 grid grid-cols-2 gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 animate-in fade-in-50">
                        <div>
                          <label className="text-[10px] font-bold text-indigo-900 block mb-1">Du :</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-900 block mb-1">Au :</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2 : Ordre de Tri */}
                  <div className="space-y-2 border-t border-slate-100 pt-3 mb-4">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ordre de Tri</span>
                    </label>

                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as TrackingSortOption)}
                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
                      >
                        <option value="DATE_DESC">📅 Date : Plus récent d'abord (Défaut)</option>
                        <option value="DATE_ASC">📅 Date : Plus ancien d'abord</option>
                        <option value="STATUS">🏷️ Statut logistique (Flux COD)</option>
                        <option value="AMOUNT_DESC">💰 Montant COD : Élevé → Faible</option>
                        <option value="AMOUNT_ASC">💰 Montant COD : Faible → Élevé</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Pied de la Popover : Résultats & Réinitialisation */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {filteredOrders.length} colis trouvés
                    </span>

                    <div className="flex items-center gap-2">
                      {(dateFilter !== 'ALL' || sortBy !== 'DATE_DESC') && (
                        <button
                          onClick={() => {
                            setDateFilter('ALL');
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setSortBy('DATE_DESC');
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1"
                        >
                          Effacer
                        </button>
                      )}
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bouton Synchroniser Sendit */}
            <button
              onClick={syncWithSendit}
              disabled={isSyncing || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all shrink-0 disabled:opacity-50"
              title="Synchroniser et actualiser les colis directement depuis Sendit.ma"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation…' : '🔄 Synchroniser Sendit'}</span>
            </button>

            {/* Actualiser depuis la base */}
            <button
              onClick={fetchOrders}
              disabled={isLoading || isSyncing}
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              title="Actualiser depuis la base de données"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Corps Principal ── */}
      <main className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-400 mx-auto pb-20 md:pb-6">

        {/* Ligne des KPIs compacts */}
        <KpiCards kpis={kpis} onFilterRescue={() => setPipelineMode('RESCUE')} />

        {/* ── Bandeau d'intervention d'urgence (remplace l'ancien pavé rouge encombrant) ── */}
        {kpis.failedAtRiskCount > 0 && (
          <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-rose-50 border border-rose-300 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <AlertCircle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    🚨 Cellule d'Intervention Rapide : {kpis.failedAtRiskCount} colis en échec de livraison
                  </h3>
                  <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase">
                    Délai Sendit &lt; 24h
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Cliquez sur un colis pour ouvrir les outils d'intervention : WhatsApp Darija, appel direct, reprogrammation de date ou mise à jour GPS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setPipelineMode('RESCUE')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  pipelineMode === 'RESCUE'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200 shadow-2xs'
                }`}
              >
                Isoler les colis en échec ({kpis.failedAtRiskCount})
              </button>

              <button
                onClick={handleBulkRescue}
                disabled={isBulkRescuing}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Envoyer un message WhatsApp de sauvetage en Darija à tous les clients en échec de livraison"
              >
                {isBulkRescuing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
                <span>{isBulkRescuing ? 'Envoi en cours…' : '📢 Relance WhatsApp groupée'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 3. Onglets de filtrage des étapes ordonnées ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {/* Onglet 1: Pipeline Actif complet */}
            <button
              onClick={() => setPipelineMode('ACTIVE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                pipelineMode === 'ACTIVE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>🚚 1. Pipeline Actif ({activeDeliveriesCount})</span>
            </button>

            {/* Onglet 2: Cellule de Sauvetage */}
            <button
              onClick={() => setPipelineMode('RESCUE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                pipelineMode === 'RESCUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>🚨 2. Cellule Sauvetage ({failedAtRiskCount})</span>
            </button>

            {/* Onglet 3: Commandes Clôturées (Livrées, Refusées, Annulées) */}
            <button
              onClick={() => setPipelineMode('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                pipelineMode === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>📁 3. Clôturées : Livrées, Refusées & Annulées ({closedOrdersCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Badge discret du filtre actif avec bouton d'annulation */}
            {(dateFilter !== 'ALL' || sortBy !== 'DATE_DESC') && (
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-xl font-bold shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {dateFilter === 'TODAY'
                    ? "Aujourd'hui"
                    : dateFilter === 'YESTERDAY'
                    ? 'Hier'
                    : dateFilter === 'LAST_7_DAYS'
                    ? '7 derniers jours'
                    : dateFilter === 'LAST_14_DAYS'
                    ? '14 derniers jours'
                    : dateFilter === 'LAST_30_DAYS'
                    ? '30 derniers jours'
                    : dateFilter === 'CUSTOM'
                    ? 'Période personnalisée'
                    : ''}
                </span>
                <span className="text-indigo-400">•</span>
                <span className="text-[11px] font-mono">{filteredOrders.length} colis</span>
                <button
                  onClick={() => {
                    setDateFilter('ALL');
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setSortBy('DATE_DESC');
                  }}
                  className="hover:text-rose-600 transition-colors ml-0.5 p-0.5"
                  title="Effacer le filtre"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="text-xs text-slate-400">— Résultats pour "{searchQuery}"</span>
            )}
            {connectionState === 'connected' && (
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                Mises à jour Sendit en temps réel actives
              </span>
            )}
          </div>
        </div>

        {/* ── 4. Tableau Kanban ── */}
        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200/90 shadow-2xs gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-bold text-slate-800">Chargement du pipeline Sendit depuis la base de données…</p>
            <p className="text-xs text-slate-400">Synchronisation en direct avec Sendit Express</p>
          </div>
        ) : (
          <TrackingKanban
            orders={filteredOrders}
            onSelectOrder={handleSelectOrder}
            onStatusChange={handleStatusChange}
            onOpenRescue={handleOpenRescue}
            onEditOrder={handleOpenEdit}
            mode={pipelineMode}
          />
        )}
      </main>

      {/* ── 5. Modal du Centre d'Intervention et de Sauvetage ── */}
      <RescueInterventionModal
        order={rescueOrder}
        isOpen={isRescueModalOpen}
        onClose={() => {
          setIsRescueModalOpen(false);
          setRescueOrder(null);
        }}
        onSuccess={async (action) => {
          await fetchOrders();
          if (action === 'WHATSAPP_SENT') {
            showToast('Message WhatsApp envoyé au client avec succès !', 'success');
          } else if (action === 'REPROGRAMMED') {
            showToast('Livraison reprogrammée et instructions transmises au livreur !', 'success');
          } else if (action === 'ADDRESS_UPDATED') {
            showToast('Adresse mise à jour et coordonnées GPS transmises au livreur !', 'success');
          } else if (action === 'RESOLVE_SAVED') {
            showToast('Colis sauvé avec succès et réintégré dans le circuit de distribution !', 'success');
          } else if (action === 'CONFIRM_RETURN') {
            showToast('Refus client confirmé. Colis classé en retour et stock libéré.', 'info');
          }
        }}
      />

      {/* ── 6. Tiroir latéral des détails de la commande ── */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onToggleAi={handleToggleAi}
        onSendMessage={handleSendMessage}
        onOpenEdit={handleOpenEdit}
      />

      {/* ── 7. Notification Toast lors des événements SSE en direct ── */}
      <LiveUpdateFlash update={lastLiveUpdate} />

      {/* ── 8. Modal Responsable: Modification et Annulation avant ramassage ── */}
      <OrderEditModal
        order={editOrder}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditOrder(null);
        }}
        onSuccess={async (action, message) => {
          await fetchOrders();
          showToast(message, action === 'DELETE' ? 'info' : 'success');
          if (selectedOrder && selectedOrder.id === editOrder?.id) {
            setIsDrawerOpen(false);
          }
        }}
      />
    </div>
  );
}
