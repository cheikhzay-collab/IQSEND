'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  FileText,
  Star,
  Banknote,
  Calendar,
  Check,
  ShieldCheck,
  ExternalLink,
  Phone,
  MessageSquare,
  Bot,
  RotateCcw
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import { InvoiceModal } from '@/components/orders/lifecycle/OrderModals';
import { QuickCallModal } from '@/components/orders/QuickCallModal';
import { AgentInterventionModal } from '@/components/orders/AgentInterventionModal';
import { OrderItem } from '@/types/orders';
import { getStageMessageConfig, formatPhoneForWhatsApp, lifecycleToOrderItem } from '@/lib/order-stage-messages';

export default function CompletedOrdersPage() {
  const {
    orders,
    requestReview,
    processReturn,
    completedCount,
  } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState<LifecycleOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<LifecycleOrder | null>(null);
  const [returnReason, setReturnReason] = useState('Changement de taille souhaité');
  const [quickCallOrder, setQuickCallOrder] = useState<OrderItem | null>(null);
  const [agentInterventionOrder, setAgentInterventionOrder] = useState<OrderItem | null>(null);

  // Filter orders for Completed
  const completedOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'COMPLETED')
      .filter((o) => {
        return (
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase()) ||
          (o.fulfillment?.invoiceNumber && o.fulfillment.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
          (o.shipping?.trackingNumber && o.shipping.trackingNumber.toLowerCase().includes(search.toLowerCase()))
        );
      });
  }, [orders, search]);

  const totalSettledMAD = useMemo(() => {
    return completedOrders.reduce((acc, o) => acc + o.payment.amount, 0);
  }, [completedOrders]);

  const handleConfirmReturn = () => {
    if (!returnOrder) return;
    processReturn(returnOrder.id, returnReason);
    setReturnOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Main Content Area */}

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header with Title and Financial Clearance Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  4. Commandes Livrées & Encaissées
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {completedCount} commandes clôturées
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Preuves de livraison (POD), réconciliation des fonds COD encaissés, factures commerciales et collecte des avis clients.
              </p>
            </div>
          </div>

          {/* Quick Stats Pill & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Total COD Encaissé : {totalSettledMAD} MAD</span>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher (Client, facture, AWB)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Mobile View: High-Touch App Cards (md:hidden) */}
        <div className="space-y-3.5 md:hidden">
          {completedOrders.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center px-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-xs text-slate-700">Aucune commande clôturée</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Les commandes livrées et encaissées apparaîtront ici.
              </p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-app-card p-4 space-y-3"
              >
                {/* Header: Order ID & Financial Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Virement Encaissé
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-700">
                    {order.payment.amount} MAD
                  </span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{order.customer.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      📍 {order.customer.city} • 📞 {order.customer.phone}
                    </p>
                  </div>
                </div>

                {/* Article Info */}
                <div className="flex items-center gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <img
                    src={order.items[0]?.thumbnail}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">
                      {order.items[0]?.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Qté: {order.items[0]?.quantity} • Livré le {order.completed?.deliveredAt || '16 Oct 2026 à 14:32'}
                    </p>
                  </div>
                </div>

                {/* POD & Settlement Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                  <div>
                    {order.completed?.podType === 'OTP_VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        Code OTP Validé
                      </span>
                    ) : order.completed?.podType === 'PHOTO_CONFIRMATION' ? (
                      <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        Bon Signé (Photo)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Signature Client
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono">
                    {order.payment.settlementRef || 'VIR-SENDIT-89410'}
                  </span>
                </div>

                {/* 3 Quick Action Buttons: Call, WhatsApp, Agent IA */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickCallOrder(lifecycleToOrderItem(order))}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-bold transition-colors active:scale-95"
                    title="Appel rapide"
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
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors active:scale-95"
                    title="Message WhatsApp Avis"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Avis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAgentInterventionOrder(lifecycleToOrderItem(order))}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-bold transition-colors active:scale-95"
                    title="Intervention Agent IA"
                  >
                    <Bot className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="truncate">Agent IA</span>
                  </button>
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setInvoiceOrder(order)}
                    className="py-2.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Facture</span>
                  </button>

                  <button
                    onClick={() => requestReview(order.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
                      order.completed?.reviewRequested
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-amber-500 text-white shadow-xs'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{order.completed?.reviewRequested ? 'Avis ✓' : 'Avis WA'}</span>
                  </button>

                  <button
                    onClick={() => setReturnOrder(order)}
                    className="py-2.5 px-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Retour</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Data Table (hidden on mobile, visible md:block) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {completedOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">Aucune commande clôturée pour le moment</p>
              <p className="text-xs text-slate-400 mt-1">
                Dès que le transporteur livre le colis et encaisse les fonds COD, les commandes apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">N° Commande & Client</th>
                    <th className="py-3.5 px-4">Article & Montant COD Encaissé</th>
                    <th className="py-3.5 px-4">Date de Livraison</th>
                    <th className="py-3.5 px-4">Preuve de Livraison (POD)</th>
                    <th className="py-3.5 px-4">Virement Sendit</th>
                    <th className="py-3.5 px-4 text-right">Actions & Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Order & Customer */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            {order.orderNumber}
                          </span>
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {order.customer.city} • {order.customer.phone}
                          </span>
                        </div>
                      </td>

                      {/* 2. Article & Total Paid (COD) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={order.items[0]?.thumbnail}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1 max-w-[170px]">
                              {order.items[0]?.name}
                            </p>
                            <p className="text-[11px] font-black text-emerald-700">
                              {order.payment.amount} MAD (Encaissé en espèces)
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Delivery Timestamp */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{order.completed?.deliveredAt || '16 Oct 2026 à 14:32'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Transporteur : {order.shipping?.courier}
                          </span>
                        </div>
                      </td>

                      {/* 4. Proof of Delivery Confirmation (POD) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {order.completed?.podType === 'OTP_VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Validé par Code OTP SMS
                            </span>
                          ) : order.completed?.podType === 'PHOTO_CONFIRMATION' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              Photo Bon d'Émargement
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Signature Manuscrite
                            </span>
                          )}

                          {order.completed?.reviewScore && (
                            <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                              {'★'.repeat(order.completed.reviewScore)}
                              <span className="text-slate-500 font-normal">Avis 5/5</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Financial Clearance Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Virement Sendit Effectué</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Réf : {order.payment.settlementRef || 'VIR-SENDIT-89410'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions (Quick Actions + Invoice, Review, Return) */}
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
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors"
                            title="Envoyer le message WhatsApp de satisfaction & avis (Livré)"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Bouton Intervention Agent IA */}
                          <button
                            type="button"
                            onClick={() => setAgentInterventionOrder(lifecycleToOrderItem(order))}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold transition-colors shadow-2xs"
                            title="Intervention Agent IA (Collecte avis, upsell post-achat)"
                          >
                            <Bot className="w-3.5 h-3.5 text-violet-600" />
                            <span>Agent IA</span>
                          </button>

                          {/* View Invoice */}
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                            title="Consulter et imprimer la facture commerciale"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Facture</span>
                          </button>

                          {/* Request Review via WhatsApp */}
                          <button
                            onClick={() => requestReview(order.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              order.completed?.reviewRequested
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 cursor-default'
                                : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                            title="Envoyer une demande d'avis WhatsApp"
                          >
                            <Star className="w-3 h-3 text-amber-500" />
                            <span>
                              {order.completed?.reviewRequested ? 'Avis demandé ✓' : 'Avis'}
                            </span>
                          </button>

                          {/* Process Return */}
                          <button
                            onClick={() => setReturnOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                            title="Créer un retour ou un échange"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>Retour</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Return Workflow Modal */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900">
                Demande de retour — {returnOrder.orderNumber}
              </h3>
            </div>
            <p className="text-slate-600">
              Précisez le motif du retour pour générer un bordereau de retour Sendit.ma et envoyer un livreur récupérer le colis :
            </p>

            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="Changement de taille souhaité">Échange de taille</option>
              <option value="Article non conforme à la description">Produit non conforme</option>
              <option value="Défaut de fabrication / Endommagé">Défaut de fabrication / Endommagé</option>
              <option value="Rétractation client dans les 7 jours">Droit de rétractation (7 jours)</option>
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnOrder(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Générer Bon de Retour
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
