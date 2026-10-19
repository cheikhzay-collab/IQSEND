'use client';

import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import {
  EditOrderModal,
  CancelOrderModal,
} from '@/components/orders/lifecycle/OrderModals';
import { QuickCallModal } from '@/components/orders/QuickCallModal';
import { AgentInterventionModal } from '@/components/orders/AgentInterventionModal';
import { GoogleSheetsIntegrationModal } from '@/components/orders/lifecycle/GoogleSheetsIntegrationModal';
import { OrderItem } from '@/types/orders';
import { getStageMessageConfig, formatPhoneForWhatsApp, lifecycleToOrderItem } from '@/lib/order-stage-messages';

export default function PendingOrdersPage() {
  const { orders, confirmOrder, cancelOrder, editOrder, pendingCount } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');

  // Modals
  const [editingOrder, setEditingOrder] = useState<LifecycleOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<LifecycleOrder | null>(null);
  const [callingOrder, setCallingOrder] = useState<LifecycleOrder | null>(null);
  const [callOutcome, setCallOutcome] = useState('CONFIRMED');
  const [quickCallOrder, setQuickCallOrder] = useState<OrderItem | null>(null);
  const [agentInterventionOrder, setAgentInterventionOrder] = useState<OrderItem | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Filter orders for Pending Confirmation (Strictly COD)
  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'PENDING_CONFIRMATION')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase());

        const matchesCity = selectedCity === 'ALL' || o.customer.city === selectedCity;

        return matchesSearch && matchesCity;
      });
  }, [orders, search, selectedCity]);

  const cities = useMemo(() => {
    const allPending = orders.filter((o) => o.stage === 'PENDING_CONFIRMATION');
    return Array.from(new Set(allPending.map((o) => o.customer.city)));
  }, [orders]);

  // Handle Quick Call Result
  const handleLogCall = () => {
    if (!callingOrder) return;
    if (callOutcome === 'CONFIRMED') {
      confirmOrder(callingOrder.id);
    } else if (callOutcome === 'CANCELED') {
      cancelOrder(callingOrder.id, 'Annulé lors de l\'appel de confirmation');
    } else {
      editOrder(callingOrder.id, {
        customer: {
          ...callingOrder.customer,
          notes: `Appel: ${callOutcome} (${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`,
        },
      });
    }
    setCallingOrder(null);
  };
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Main Content View */}

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
                    1. En attente de confirmation
                  </h1>
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                    {pendingCount} à vérifier
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vérification des numéros et adresses, appels rapides et confirmation WhatsApp Darija automatique.
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
          </div>
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {order.aiVerification?.status === 'CONFIRMED_BY_AI' ? '✓ IA Confirmé' : `Risque ${order.aiVerification?.riskScore || 10}%`}
                      </span>
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
                          window.open(
                            `https://wa.me/${formatPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(conf.french(item))}`,
                            '_blank'
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmer ➔ Préparation</span>
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
                      <th className="py-3.5 px-4">N° Commande</th>
                      <th className="py-3.5 px-4">Client & Coordonnées</th>
                      <th className="py-3.5 px-4">Articles & Total (COD)</th>
                      <th className="py-3.5 px-4">Vérification Risque IA</th>
                      <th className="py-3.5 px-4 text-right">Actions & Transfert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Order ID */}
                        <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {order.createdAt}
                            </span>
                          </div>
                        </td>

                        {/* 2. Customer Info (Name, Phone, Address) */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{order.customer.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold">
                                {order.customer.city}
                              </span>
                            </div>

                            {/* Phone + Action buttons: Call / WhatsApp */}
                            <div className="flex items-center gap-2 text-[11px] font-medium">
                              <span className="text-slate-800 font-semibold">{order.customer.phone}</span>
                              
                              <a
                                href={`https://wa.me/212${order.customer.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                                  `Salam ${order.customer.name}, choukran 3la talab dialk mn lmetjar dialna. Bghina n-akkdo m3ak talab dial ${order.items[0]?.name} b mablagh ${order.payment.amount} DH w livraison l ${order.customer.city}. Wach l3onwan w talab s7i7?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                WhatsApp Darija
                              </a>

                              <button
                                onClick={() => setCallingOrder(order)}
                                className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors"
                                title="Enregistrer le résultat de l'appel"
                              >
                                <PhoneCall className="w-2.5 h-2.5" />
                                Appel
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                              {order.customer.address}
                            </p>
                            {order.customer.notes && (
                              <p className="text-[10px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 max-w-xs">
                                Note : {order.customer.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 3. Items / Total (Strictly COD) */}
                        <td className="py-4 px-4">
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 mt-0.5">
                                <Banknote className="w-2.5 h-2.5" />
                                Paiement à la livraison (COD)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. AI / Risk Verification */}
                        <td className="py-4 px-4">
                          {order.aiVerification ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                {order.aiVerification.status === 'CONFIRMED_BY_AI' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    Confirmé par IA
                                  </span>
                                ) : order.aiVerification.status === 'VERIFIED' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    <Check className="w-2.5 h-2.5 text-blue-600" />
                                    Coordonnées Validées
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                    Appel Recommandé
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Risque {order.aiVerification.riskScore}%
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
                                {order.aiVerification.notes}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Manuel</span>
                          )}
                        </td>

                        {/* 5. Actions with 3 Quick Buttons (Call, WhatsApp, Agent IA) */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Bouton Appel Rapide */}
                            <button
                              type="button"
                              onClick={() => setQuickCallOrder(lifecycleToOrderItem(order))}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                              title={`Appel téléphonique rapide à ${order.customer.name} (${order.customer.phone})`}
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-600" />
                            </button>

                            {/* 2. Bouton Message WhatsApp selon Statut */}
                            <button
                              type="button"
                              onClick={() => {
                                const item = lifecycleToOrderItem(order);
                                const conf = getStageMessageConfig(item.status);
                                window.open(
                                  `https://wa.me/${formatPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(conf.french(item))}`,
                                  '_blank'
                                );
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-colors"
                              title="Envoyer le message WhatsApp de confirmation (En attente)"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Bouton Intervention Agent IA */}
                            <button
                              type="button"
                              onClick={() => setAgentInterventionOrder(lifecycleToOrderItem(order))}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold transition-colors shadow-2xs"
                              title="Intervention Agent IA (Génération personnalisée & tonalités)"
                            >
                              <Bot className="w-3.5 h-3.5 text-violet-600" />
                              <span>Agent IA</span>
                            </button>

                            {/* Confirmer ➔ Préparation */}
                            <button
                              onClick={() => confirmOrder(order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                              title="Confirmer la commande et la transmettre en préparation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirmer ➔ Préparation</span>
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
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
              <p>Client : <strong>{callingOrder.customer.name}</strong></p>
              <p>Téléphone : <strong className="font-mono">{callingOrder.customer.phone}</strong></p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Résultat de la communication :</label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CONFIRMED">Commande Confirmée (Transférer immédiatement en préparation)</option>
                <option value="Injoignable (Tentative 1)">Injoignable (Tentative 1)</option>
                <option value="Injoignable (Tentative 2)">Injoignable (Tentative 2)</option>
                <option value="Demande de rappel plus tard">Demande de rappel plus tard</option>
                <option value="CANCELED">Le client a annulé lors de l'appel</option>
              </select>
            </div>

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
    </div>
  );
}
