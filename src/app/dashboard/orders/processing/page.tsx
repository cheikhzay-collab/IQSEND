'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Printer,
  Truck,
  CheckCircle2,
  FileText,
  Warehouse,
  Barcode,
  ArrowRight,
  Send,
  ScanLine,
  Phone,
  MessageSquare,
  Bot
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import {
  ShippingLabelModal,
  InvoiceModal,
} from '@/components/orders/lifecycle/OrderModals';
import { QuickCallModal } from '@/components/orders/QuickCallModal';
import { AgentInterventionModal } from '@/components/orders/AgentInterventionModal';
import { OrderItem } from '@/types/orders';
import { getStageMessageConfig, formatPhoneForWhatsApp, lifecycleToOrderItem } from '@/lib/order-stage-messages';
import { safeOpenExternalUrl } from '@/lib/navigation-utils';

const COURIER_OPTIONS = [
  'Sendit.ma Express',
  'Cathedis Maroc',
  'Amana Express',
  'DHL Morocco',
];

export default function ProcessingOrdersPage() {
  const {
    orders,
    assignCourier,
    shipOrder,
    processingCount,
  } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [scannedItems, setScannedItems] = useState<Record<string, boolean>>({});

  // Modals
  const [labelOrder, setLabelOrder] = useState<LifecycleOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<LifecycleOrder | null>(null);
  const [quickCallOrder, setQuickCallOrder] = useState<OrderItem | null>(null);
  const [agentInterventionOrder, setAgentInterventionOrder] = useState<OrderItem | null>(null);

  // Filter orders for Processing
  const processingOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'PROCESSING')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase()) ||
          (o.shipping?.courier && o.shipping.courier.toLowerCase().includes(search.toLowerCase()));

        const matchesWarehouse =
          selectedWarehouse === 'ALL' ||
          o.fulfillment?.warehouse === selectedWarehouse;

        return matchesSearch && matchesWarehouse;
      });
  }, [orders, search, selectedWarehouse]);

  const toggleScan = (orderId: string) => {
    setScannedItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Main Content Area */}

      {/* Main Content Area */}
      <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header with Title and Tools */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  2. En préparation & Emballage
                </h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-200">
                  {processingCount} à emballer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Prélèvement (Picking), scan code-barres de conformité, impression des bordereaux Sendit et expédition.
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher (Commande, article, ville)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              <option value="ALL">Tous les entrepôts</option>
              <option value="Hub Central Casablanca">Hub Central Casablanca</option>
              <option value="Hub Fès-Meknès">Hub Fès-Meknès</option>
            </select>

            <Link
              href="/dashboard/packing"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors shadow-xs shrink-0"
            >
              <span>Atelier d'Emballage (AWB)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Table / Cards View */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {processingOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">Aucune commande en préparation</p>
              <p className="text-xs text-slate-400 mt-1">
                Toutes les commandes ont été emballées et remises aux sociétés de livraison.
              </p>
            </div>
          ) : (
            <>
              {/* 1. MOBILE CARD VIEW (< MD) */}
              <div className="md:hidden divide-y divide-slate-100">
                {processingOrders.map((order) => {
                  const isScanned = !!scannedItems[order.id];
                  return (
                    <div key={order.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                      {/* Top Row: Order # + City + Bin */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-500">
                            Client : <strong className="text-slate-800">{order.customer.name}</strong> • {order.customer.city}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-800 font-bold border border-slate-200">
                          <Warehouse className="w-2.5 h-2.5 text-slate-500" />
                          <span>{order.items[0]?.binLocation || 'Bay A-01'}</span>
                        </div>
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
                            safeOpenExternalUrl(
                              `https://wa.me/${formatPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(conf.french(item))}`
                            );
                          }}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold transition-colors active:scale-95"
                          title="Message WhatsApp Préparation"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">Préparation</span>
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

                      {/* Items to pack */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 truncate">{item.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span>SKU : <strong className="text-slate-700">{item.sku}</strong></span>
                                <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                  Qté : {item.quantity}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Barcode scanner & Courier */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleScan(order.id)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors active:scale-95 ${
                            isScanned
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>{isScanned ? 'Code validé ✓' : 'Scanner barcode'}</span>
                        </button>

                        <select
                          value={order.shipping?.courier || 'Sendit.ma Express'}
                          onChange={(e) => assignCourier(order.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {COURIER_OPTIONS.map((courier) => (
                            <option key={courier} value={courier}>
                              {courier}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Documents Row: Invoice & Label */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 py-2 px-3 rounded-xl border border-emerald-200 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Facture ({order.payment.amount} DH)</span>
                        </button>

                        <button
                          onClick={() => setLabelOrder(order)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 py-2 px-3 rounded-xl border border-slate-200 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Bordereau</span>
                        </button>
                      </div>

                      {/* Primary Ship Action */}
                      <button
                        onClick={() => shipOrder(order.id)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>Expédier le colis ➔ En livraison</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 2. DESKTOP TABLE VIEW (MD & UP) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">N° Commande & Emplacement</th>
                      <th className="py-3.5 px-4">Articles à emballer</th>
                      <th className="py-3.5 px-4">Contrôle Code-barres</th>
                      <th className="py-3.5 px-4">Bordereau & Facture</th>
                      <th className="py-3.5 px-4">Transporteur</th>
                      <th className="py-3.5 px-4 text-right">Actions d'expédition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processingOrders.map((order) => {
                      const isScanned = !!scannedItems[order.id];

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* 1. Order & Warehouse Location */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="text-xs font-black text-slate-900 block">
                                {order.orderNumber}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Destination : <strong className="text-slate-800">{order.customer.city}</strong>
                              </span>
                              <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-800 font-bold border border-slate-200">
                                <Warehouse className="w-2.5 h-2.5 text-slate-500" />
                                Rayon : {order.items[0]?.binLocation || 'Bay A-01'}
                              </div>
                            </div>
                          </td>

                          {/* 2. Items to Pack */}
                          <td className="py-4 px-4">
                            <div className="space-y-2">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3">
                                  <img
                                    src={item.thumbnail}
                                    alt=""
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                  />
                                  <div>
                                    <p className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">
                                      {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                      <span>SKU : <strong className="text-slate-700">{item.sku}</strong></span>
                                      {item.size && <span>Taille : <strong>{item.size}</strong></span>}
                                      <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                        Qté : {item.quantity}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* 3. Barcode Verification Tool */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleScan(order.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors ${
                                isScanned
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Scanner pour valider la conformité du produit"
                            >
                              <ScanLine className="w-3 h-3" />
                              <span>{isScanned ? 'Code-barres validé ✓' : 'Scanner le produit'}</span>
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              {order.items[0]?.barcode || '611124901842'}
                            </span>
                          </td>

                          {/* 4. Packing Slip & Invoice Generation */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 items-start">
                              <button
                                onClick={() => setInvoiceOrder(order)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-colors"
                              >
                                <FileText className="w-3 h-3 text-emerald-600" />
                                <span>Facture {order.fulfillment?.invoiceNumber || '#INV'}</span>
                              </button>
                              <span className="text-[10px] text-slate-400">
                                Montant COD : {order.payment.amount} MAD
                              </span>
                            </div>
                          </td>

                          {/* 5. Assigned Courier Partner */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <select
                                value={order.shipping?.courier || 'Sendit.ma Express'}
                                onChange={(e) => assignCourier(order.id, e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {COURIER_OPTIONS.map((courier) => (
                                  <option key={courier} value={courier}>
                                    {courier}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                AWB : {order.shipping?.trackingNumber || 'SND-GÉNÉRÉ'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Actions (Quick Actions + Print Label + Ship -> Moves to In Transit) */}
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
                                  safeOpenExternalUrl(
                                    `https://wa.me/${formatPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(conf.french(item))}`
                                  );
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-colors"
                                title="Envoyer le message WhatsApp (En cours de préparation)"
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

                              {/* Print Shipping Label */}
                              <button
                                onClick={() => setLabelOrder(order)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                                title="Imprimer le bordereau d'expédition Sendit"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                <span>Bordereau</span>
                              </button>

                              {/* Mark Shipped (Primary Transition) */}
                              <button
                                onClick={() => shipOrder(order.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                                title="Confier au livreur et transférer en livraison"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Expédier ➔ En livraison</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ShippingLabelModal
        order={labelOrder}
        isOpen={!!labelOrder}
        onClose={() => setLabelOrder(null)}
      />

      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
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
    </div>
  );
}
