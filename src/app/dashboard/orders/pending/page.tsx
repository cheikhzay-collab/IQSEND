'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Search,
  Check,
  Edit2,
  Trash2,
  Phone,
  MessageSquare,
  AlertCircle,
  MapPin,
  Banknote,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldAlert,
  ArrowRight,
  Bot,
  FileSpreadsheet,
  Headphones,
  PhoneMissed,
  Calendar,
  XCircle,
  Plus,
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder, LifecycleStage } from '@/context/OrderLifecycleContext';
import {
  EditOrderModal,
  CancelOrderModal,
} from '@/components/orders/lifecycle/OrderModals';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { QuickCallModal } from '@/components/orders/QuickCallModal';
import { AgentInterventionModal } from '@/components/orders/AgentInterventionModal';
import { GoogleSheetsIntegrationModal } from '@/components/orders/lifecycle/GoogleSheetsIntegrationModal';
import { OrderItem } from '@/types/orders';
import { getStageMessageConfig, formatPhoneForWhatsApp, lifecycleToOrderItem } from '@/lib/order-stage-messages';
import { safeOpenExternalUrl } from '@/lib/navigation-utils';
import { MOROCCAN_CITIES } from '@/lib/moroccan-cities';

type ConfirmationSubFilter = 'ALL' | 'NEW' | 'UNREACHABLE' | 'RESCHEDULED';

function isValidMoroccanPhone(phone?: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[^\d+]/g, '');
  return /^(?:0|\+?212)[5-7]\d{8}$/.test(clean);
}

function getConfirmationSubStatus(order: LifecycleOrder): 'NEW' | 'UNREACHABLE' | 'RESCHEDULED' {
  const notes = (order.customer.notes || '').toLowerCase();
  if (
    notes.includes('injoignable') ||
    notes.includes('tentative') ||
    notes.includes('pas de réponse') ||
    notes.includes('ne répond pas')
  ) {
    return 'UNREACHABLE';
  }
  if (
    notes.includes('rappeler') ||
    notes.includes('report') ||
    notes.includes('programm') ||
    notes.includes('demande de rappel')
  ) {
    return 'RESCHEDULED';
  }
  return 'NEW';
}

export default function PendingOrdersPage() {
  const { orders, confirmOrder, cancelOrder, editOrder, addOrder, pendingCount } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [subFilter, setSubFilter] = useState<ConfirmationSubFilter>('ALL');

  // Modals
  const [editingOrder, setEditingOrder] = useState<LifecycleOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<LifecycleOrder | null>(null);
  const [callingOrder, setCallingOrder] = useState<LifecycleOrder | null>(null);
  const [callOutcome, setCallOutcome] = useState('CONFIRMED');
  const [customCallNote, setCustomCallNote] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [callingCity, setCallingCity] = useState('');
  const [callingAddress, setCallingAddress] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle Manual Order Creation
  const handleCreateOrder = (newOrder: OrderItem & { notes?: string }) => {
    const newLifecycle: LifecycleOrder = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      stage: (newOrder.status as LifecycleStage) || 'PENDING_CONFIRMATION',
      createdAt: 'À l’instant',
      customer: {
        name: newOrder.customerName,
        phone: newOrder.phone,
        address: newOrder.address || '',
        city: newOrder.city,
        notes: newOrder.notes,
      },
      items: [
        {
          id: `item-${Date.now()}`,
          name: newOrder.productName,
          sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
          thumbnail: newOrder.productThumbnail,
          quantity: 1,
          price: newOrder.amount,
        },
      ],
      payment: {
        method: 'COD',
        amount: newOrder.amount,
        currency: newOrder.currency || 'MAD',
        status: 'PENDING',
      },
      aiVerification: {
        status: 'NEEDS_REVIEW',
        riskScore: 10,
        notes: 'Commande enregistrée manuellement depuis la confirmation.',
      },
    };
    addOrder(newLifecycle);
  };

  useEffect(() => {
    if (callingOrder) {
      setCallingCity(callingOrder.customer.city || '');
      setCallingAddress(callingOrder.customer.address || '');
    }
  }, [callingOrder]);
  const [quickCallOrder, setQuickCallOrder] = useState<OrderItem | null>(null);
  const [agentInterventionOrder, setAgentInterventionOrder] = useState<OrderItem | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // All pending orders (Stage 1: Only incoming leads awaiting phone confirmation, never Sendit logistics parcels)
  const allPendingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.stage === 'PENDING_CONFIRMATION' &&
        o.source?.name !== 'SENDIT_SYNC' &&
        !o.id.startsWith('snd-')
    );
  }, [orders]);

  // Counts by sub-state
  const subCounts = useMemo(() => {
    let newCount = 0;
    let unreachableCount = 0;
    let rescheduledCount = 0;
    allPendingOrders.forEach((o) => {
      const st = getConfirmationSubStatus(o);
      if (st === 'NEW') newCount++;
      else if (st === 'UNREACHABLE') unreachableCount++;
      else if (st === 'RESCHEDULED') rescheduledCount++;
    });
    return {
      all: allPendingOrders.length,
      new: newCount,
      unreachable: unreachableCount,
      rescheduled: rescheduledCount,
    };
  }, [allPendingOrders]);

  // Filtered orders for Pending Confirmation
  const pendingOrders = useMemo(() => {
    return allPendingOrders
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase());

        const matchesCity = selectedCity === 'ALL' || o.customer.city === selectedCity;

        const st = getConfirmationSubStatus(o);
        const matchesSub = subFilter === 'ALL' || st === subFilter;

        return matchesSearch && matchesCity && matchesSub;
      });
  }, [allPendingOrders, search, selectedCity, subFilter]);

  const cities = useMemo(() => {
    return Array.from(new Set(allPendingOrders.map((o) => o.customer.city)));
  }, [allPendingOrders]);

  // Handle Quick Call Result
  const handleLogCall = () => {
    if (!callingOrder) return;

    // Check if city or address was modified during the confirmation call
    const cityVal = callingCity.trim() || callingOrder.customer.city;
    const addressVal = callingAddress.trim() || callingOrder.customer.address;
    const wasUpdated = cityVal !== callingOrder.customer.city || addressVal !== callingOrder.customer.address;

    if (wasUpdated) {
      editOrder(callingOrder.id, {
        customer: {
          ...callingOrder.customer,
          city: cityVal,
          address: addressVal,
        },
      });
    }

    if (callOutcome === 'CONFIRMED') {
      confirmOrder(callingOrder.id);
    } else if (callOutcome === 'CANCELED') {
      cancelOrder(callingOrder.id, customCallNote || 'Annulé lors de l\'appel de confirmation');
    } else {
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      let noteText = '';
      if (callOutcome === 'Rappel programmé') {
        noteText = `Rappeler: ${scheduledDate || 'Date ultérieure'} (${timeStr})${customCallNote ? ` - ${customCallNote}` : ''}`;
      } else {
        noteText = `${callOutcome} (${timeStr})${customCallNote ? ` - ${customCallNote}` : ''}`;
      }

      editOrder(callingOrder.id, {
        customer: {
          ...callingOrder.customer,
          city: cityVal,
          address: addressVal,
          notes: noteText,
        },
      });
    }
    setCallingOrder(null);
    setCustomCallNote('');
    setScheduledDate('');
  };
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Main Content View */}
      <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* Header with Title, Counter and Tools */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    1. Confirmation des commandes
                  </h1>
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                    {pendingCount} à traiter
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appels de validation COD, gestion des relances (injoignables), programmation des rappels et transferts en préparation.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher (Nom, tél, ville)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* City Dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
            >
              <option value="ALL">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Google Sheets Sync Button */}
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs shrink-0 active:scale-95"
              title="Lier Google Sheets pour synchronisation automatique des commandes"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets</span>
            </button>

            {/* Manual New Order Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
              title="Ajouter manuellement une nouvelle commande COD"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Commande</span>
            </button>

            {/* Quick Link to Call Center */}
            <Link
              href="/dashboard/call-center"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs shrink-0 active:scale-95"
              title="Ouvrir le poste téléphonique pour appeler les clients"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Centre d'Appels</span>
            </Link>
          </div>
        </div>

        {/* Operational Confirmation Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSubFilter('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              subFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <span>Toutes les commandes</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                subFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {subCounts.all}
            </span>
          </button>

          <button
            onClick={() => setSubFilter('NEW')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              subFilter === 'NEW'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>À appeler (Nouveaux)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                subFilter === 'NEW' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {subCounts.new}
            </span>
          </button>

          <button
            onClick={() => setSubFilter('UNREACHABLE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              subFilter === 'UNREACHABLE'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white hover:bg-amber-50/50 text-slate-700 border-slate-200'
            }`}
          >
            <PhoneMissed className="w-3.5 h-3.5 text-amber-400" />
            <span>Injoignables (Relances)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                subFilter === 'UNREACHABLE' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {subCounts.unreachable}
            </span>
          </button>

          <button
            onClick={() => setSubFilter('RESCHEDULED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              subFilter === 'RESCHEDULED'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-blue-50/50 text-slate-700 border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Programmées / Reportées</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                subFilter === 'RESCHEDULED' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {subCounts.rescheduled}
            </span>
          </button>
        </div>

        {/* Content Container (Mobile Cards + Desktop Table) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {pendingOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">Aucune commande en attente de confirmation</p>
              <p className="text-xs text-slate-400 mt-1">
                Toutes les commandes ont été confirmées et transmises au centre d'emballage et d'expédition.
              </p>
            </div>
          ) : (
            <>
              {/* 1. MOBILE CARDS VIEW (< MD) */}
              <div className="md:hidden divide-y divide-slate-100">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{order.orderNumber}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{order.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getConfirmationSubStatus(order) === 'NEW' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            Nouveau
                          </span>
                        )}
                        {getConfirmationSubStatus(order) === 'UNREACHABLE' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <PhoneMissed className="w-2.5 h-2.5 text-amber-600" />
                            Injoignable
                          </span>
                        )}
                        {getConfirmationSubStatus(order) === 'RESCHEDULED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Calendar className="w-2.5 h-2.5 text-blue-600" />
                            Reporté
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {order.aiVerification?.status === 'CONFIRMED_BY_AI' ? '✓ IA' : `Risque ${order.aiVerification?.riskScore || 10}%`}
                        </span>
                      </div>
                    </div>

                    {/* Customer & City */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{order.customer.name}</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {order.customer.city}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{order.customer.address}</p>
                      {order.customer.notes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 font-medium">
                          Note : {order.customer.notes}
                        </p>
                      )}
                    </div>

                    {/* 3 Quick Action Buttons: Call, WhatsApp, Agent IA */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickCallOrder(lifecycleToOrderItem(order))}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-bold transition-colors active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Appeler</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const item = lifecycleToOrderItem(order);
                          const conf = getStageMessageConfig(item.status);
                          safeOpenExternalUrl(
                            `https://wa.me/${formatPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(conf.french(item))}`
                          );
                        }}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Confirmer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAgentInterventionOrder(lifecycleToOrderItem(order))}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-bold transition-colors active:scale-95"
                      >
                        <Bot className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                        <span className="truncate">Agent IA</span>
                      </button>
                    </div>

                    {/* Product & COD amount */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={order.items[0]?.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{order.items[0]?.name}</p>
                          <span className="text-[10px] text-slate-500">Qté : {order.items[0]?.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono block">{order.payment.amount} MAD</span>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded">COD</span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => confirmOrder(order.id)}
                        className="btn-primary flex-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmer</span>
                      </button>
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCancellingOrder(order)}
                        className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                        title="Annuler"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. DESKTOP TABLE VIEW (MD & UP) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">N° Commande</th>
                      <th className="py-3 px-4">Client & Coordonnées</th>
                      <th className="py-3 px-4">Article & Total</th>
                      <th className="py-3 px-4">Vérification IA</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Order ID & Date */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {order.orderNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {order.createdAt}
                              </span>
                            </div>
                            <div>
                              {getConfirmationSubStatus(order) === 'NEW' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  Nouveau lead
                                </span>
                              )}
                              {getConfirmationSubStatus(order) === 'UNREACHABLE' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <PhoneMissed className="w-2.5 h-2.5 text-amber-600" />
                                  Ne répond pas
                                </span>
                              )}
                              {getConfirmationSubStatus(order) === 'RESCHEDULED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Calendar className="w-2.5 h-2.5 text-blue-600" />
                                  Reporté
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Customer Info (Cleaned from clutter) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{order.customer.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                                {order.customer.city}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-medium">
                              <span className="text-slate-800 font-semibold">{order.customer.phone}</span>
                              {!isValidMoroccanPhone(order.customer.phone) && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Invalide ⚠️
                                </span>
                              )}
                              {(order.customer.notes || '').toUpperCase().includes('DOUBLON') && (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 animate-pulse">
                                  Doublon ⚠️
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                              {order.customer.address}
                            </p>
                            {order.customer.notes && (
                              <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 max-w-xs font-medium inline-block">
                                Note : {order.customer.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 3. Article & Total (Cleaned - Removed redundant COD banner) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={order.items[0]?.thumbnail}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1 max-w-[180px]">
                                {order.items[0]?.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Qté : <strong className="text-slate-800">{order.items[0]?.quantity}</strong> • Total :{' '}
                                <span className="font-black text-slate-900">
                                  {order.payment.amount} MAD
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 4. AI Risk Verification (Cleaned - Removed duplicate naked notes) */}
                        <td className="py-3.5 px-4">
                          {order.aiVerification ? (
                            <div className="flex items-center gap-1.5">
                              {order.aiVerification.status === 'CONFIRMED_BY_AI' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  Confirmé IA
                                </span>
                              ) : order.aiVerification.status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Check className="w-2.5 h-2.5 text-blue-600" />
                                  Coordonnées OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                  Appel Recommandé
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-slate-400">
                                {order.aiVerification.riskScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Manuel</span>
                          )}
                        </td>

                        {/* 5. Unified Actions (Call, WhatsApp, AI Agent, Confirm, Edit, Delete) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call button */}
                            <button
                              type="button"
                              onClick={() => setCallingOrder(order)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors"
                              title={`Appel téléphonique & enregistrement du résultat (${order.customer.phone})`}
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* WhatsApp button with Darija confirmation */}
                            <a
                              href={`https://wa.me/212${order.customer.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                                `Salam ${order.customer.name}, choukran 3la talab dialk mn lmetjar dialna. Bghina n-akkdo m3ak talab dial ${order.items[0]?.name} b mablagh ${order.payment.amount} DH w livraison l ${order.customer.city}. Wach l3onwan w talab s7i7?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-colors inline-flex items-center justify-center"
                              title="Message WhatsApp Darija"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>

                            {/* Bouton Intervention Agent IA */}
                            <button
                              type="button"
                              onClick={() => setAgentInterventionOrder(lifecycleToOrderItem(order))}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold transition-colors shadow-2xs"
                              title="Intervention Agent IA"
                            >
                              <Bot className="w-3.5 h-3.5 text-violet-600" />
                              <span>Agent IA</span>
                            </button>

                            {/* Confirmer */}
                            <button
                              onClick={() => confirmOrder(order.id)}
                              className="btn-primary btn-sm"
                              title="Confirmer la commande et la transmettre en préparation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirmer</span>
                            </button>

                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier les coordonnées du client"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setCancellingOrder(order)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Annuler la commande"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Call Outcome Modal */}
      {callingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <PhoneCall className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">
                Enregistrer l'appel — {callingOrder.orderNumber}
              </h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Client : <strong>{callingOrder.customer.name}</strong></span>
                <span className="font-mono font-bold text-emerald-700">{callingOrder.customer.phone}</span>
              </div>

              {/* Editable City & Address during confirmation call */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تعديل مدينة وعنوان التوصيل (Destination) :</span>
                  </label>
                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    تعديل فوري
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      list="moroccan-cities-call-list"
                      type="text"
                      value={callingCity}
                      onChange={(e) => setCallingCity(e.target.value)}
                      placeholder="المدينة..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                    <datalist id="moroccan-cities-call-list">
                      {MOROCCAN_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    type="text"
                    value={callingAddress}
                    onChange={(e) => setCallingAddress(e.target.value)}
                    placeholder="العنوان أو الحي بالتفصيل..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Résultat de la communication :</label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800"
              >
                <option value="CONFIRMED">✓ Commande Confirmée ➔ Envoi en préparation</option>
                <option value="Injoignable (Tentative 1/3)">📞 Injoignable (Tentative 1/3)</option>
                <option value="Injoignable (Tentative 2/3)">📞 Injoignable (Tentative 2/3)</option>
                <option value="Injoignable (Tentative 3/3)">⚠️ Injoignable (Tentative 3/3 - À clore)</option>
                <option value="Rappel programmé">⏰ Demande de rappel / Date ultérieure</option>
                <option value="CANCELED">✕ Annulé par le client (0 DH frais de livraison)</option>
              </select>
            </div>

            {callOutcome === 'CONFIRMED' && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Cette action valide la commande, réserve le stock et la transmet à l'étape <strong>2. En préparation</strong> pour emballage et expédition Sendit.
                </p>
              </div>
            )}

            {callOutcome.startsWith('Injoignable') && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1.5">
                    <PhoneMissed className="w-3.5 h-3.5 text-amber-600" />
                    Relance WhatsApp Darija conseillée
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">
                  Envoyez un message WhatsApp instantané pour inciter le client à confirmer par écrit :
                </p>
                <a
                  href={`https://wa.me/212${callingOrder.customer.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                    `Salam ${callingOrder.customer.name}, 7awlna ntaslo bik mn lmetjar dialna bach n-akkdo talab dial ${callingOrder.items[0]?.name} l ${callingOrder.customer.city} mais mal9inakch. 3afak jawbna hna wach l3onwan mazal s7i7 bach nsayfto lik commande?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-2xs transition-transform active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Envoyer message WhatsApp de relance</span>
                </a>
              </div>
            )}

            {callOutcome === 'Rappel programmé' && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <label className="block font-bold text-blue-900 text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Date / Heure de rappel convenue :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aujourd'hui à 18h30 ou Samedi matin"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            )}

            {callOutcome === 'CANCELED' && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px]">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Motif de l'annulation (0 MAD perte de livraison)</span>
                </div>
                <input
                  type="text"
                  placeholder="Motif: Prix trop cher, doublon, faux numéro, pas le temps..."
                  value={customCallNote}
                  onChange={(e) => setCustomCallNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-rose-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCallingOrder(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                onClick={handleLogCall}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditOrderModal
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={editOrder}
      />

      {/* Cancel Modal */}
      <CancelOrderModal
        order={cancellingOrder}
        isOpen={!!cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={cancelOrder}
      />

      {/* Quick Call Modal */}
      <QuickCallModal
        order={quickCallOrder}
        isOpen={!!quickCallOrder}
        onClose={() => setQuickCallOrder(null)}
        onOpenAgentIntervention={(ord) => setAgentInterventionOrder(ord)}
      />

      {/* Agent Intervention Modal */}
      <AgentInterventionModal
        order={agentInterventionOrder}
        isOpen={!!agentInterventionOrder}
        onClose={() => setAgentInterventionOrder(null)}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />

      {/* Manual Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOrder}
      />
    </div>
  );
}
