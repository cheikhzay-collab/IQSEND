'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  Truck,
  PackageCheck,
  AlertOctagon,
  TrendingDown,
  Warehouse,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  XCircle
} from 'lucide-react';

import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { PhysicalReturnModal } from '@/components/orders/PhysicalReturnModal';

export default function ReturnsOrdersPage() {
  const { orders, reintegrateStock, reactivateOrder, returnedCount, showToast } = useOrderLifecycle();
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [returnStatusFilter, setReturnStatusFilter] = useState('ALL');
  const [inspectReturnOrder, setInspectReturnOrder] = useState<LifecycleOrder | null>(null);

  // Filter orders in RETURNED stage or with delivery failures
  const returnedOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'RETURNED' || (o.stage === 'IN_TRANSIT' && o.shipping?.liveStatus === 'FAILED_ATTEMPT'))
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase()) ||
          (o.shipping?.trackingNumber && o.shipping.trackingNumber.toLowerCase().includes(search.toLowerCase())) ||
          (o.shipping?.failedReason && o.shipping.failedReason.toLowerCase().includes(search.toLowerCase()));

        const matchesCarrier = carrierFilter === 'ALL' || o.shipping?.courier === carrierFilter;

        const matchesProduct =
          selectedProduct === 'ALL' ||
          (o.items || []).some(
            (it) =>
              (it.name || '').toLowerCase().includes(selectedProduct.toLowerCase()) ||
              (it.sku || '').toLowerCase().includes(selectedProduct.toLowerCase())
          );

        const currentReturnStatus = o.completed?.returnStatus || 'REQUESTED';
        const matchesStatus = returnStatusFilter === 'ALL' || currentReturnStatus === returnStatusFilter;

        return matchesSearch && matchesCarrier && matchesProduct && matchesStatus;
      });
  }, [orders, search, carrierFilter, selectedProduct, returnStatusFilter]);

  const productsList = useMemo(() => {
    const prods = new Set<string>();
    orders
      .filter((o) => o.stage === 'RETURNED' || (o.stage === 'IN_TRANSIT' && o.shipping?.liveStatus === 'FAILED_ATTEMPT'))
      .forEach((o) => {
        (o.items || []).forEach((it) => {
          if (it.name) prods.add(it.name);
        });
      });
    return Array.from(prods);
  }, [orders]);

  // Statistics
  const totalUncollectedCod = useMemo(() => {
    return returnedOrders.reduce((acc, o) => acc + o.payment.amount, 0);
  }, [returnedOrders]);

  const inReturnTransitCount = useMemo(() => {
    return returnedOrders.filter((o) => !o.stockReintegrated && (o.completed?.returnStatus || 'REQUESTED') !== 'RETURNED').length;
  }, [returnedOrders]);

  const stockReintegratedCount = useMemo(() => {
    return returnedOrders.filter((o) => o.stockReintegrated || o.completed?.returnStatus === 'RETURNED').length;
  }, [returnedOrders]);

  const handleRescueWhatsApp = (order: LifecycleOrder) => {
    const text = encodeURIComponent(
      `Bonjour ${order.customer.name}, le livreur Sendit s'est présenté pour votre commande ${order.orderNumber} (${order.payment.amount} MAD). Souhaitez-vous reprogrammer votre livraison ou modifier l'adresse ?`
    );
    window.open(`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    showToast(`Fenêtre WhatsApp ouverte pour le sauvetage du colis ${order.orderNumber}.`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">


      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Retours & Colis Refusés (Livraison)
                </h1>
                <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                  {returnedOrders.length} colis concernés
                </span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Chez transporteur / Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Colis expédiés auprès de Sendit.ma mais refusés à la porte ou non livrés après plusieurs passages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/orders/canceled"
              className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 hover:bg-rose-100 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Voir Annulations Confirmation (0 DH)</span>
            </Link>
            <Link
              href="/dashboard/tracking"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Expéditions en cours</span>
            </Link>
          </div>
        </div>

        {/* Distinction Banner: Retours Transporteur vs Annulations Confirmation */}
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/60 to-slate-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-amber-950">
                الطرود المرجعة عند شركة التوصيل (بعد الشحن الفعلي - Sendit Express)
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                هذه الطرود خرجت مع الموزع ورُفضت عند التسليم أو تعذر الوصول للزبون. يتم احتساب مصاريف الإرجاع وتتطلب فحصاً لإعادة السلعة إلى رفوف المستودع. للطلبيات الملغاة قبل الشحن (0 درهم)، راجع قسم Annulations.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/orders/canceled"
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 shrink-0"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>انتقل إلى ملغيات التأكيد (0 DH)</span>
          </Link>
        </div>

        {/* 2. Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Colis Refusés / Retours</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{returnedOrders.length}</span>
              <span className="text-xs text-slate-400">colis expédiés</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Montant COD Non Encaissé</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{totalUncollectedCod.toLocaleString('fr-FR')} MAD</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">En Transit Retour (Hub)</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">{inReturnTransitCount}</span>
              <span className="text-xs text-slate-400">en route vers l'entrepôt</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Stock Réintégré au Magasin</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{stockReintegratedCount}</span>
              <span className="text-xs text-slate-400">articles remis en vente</span>
            </div>
          </div>
        </div>

        {/* 3. Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par bordereau Sendit (SND-...), client, téléphone ou cause..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">Tous les produits</option>
              {productsList.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>

            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">Tous les transporteurs</option>
              <option value="Sendit.ma Express">Sendit.ma Express</option>
              <option value="Amana Express">Amana Express</option>
            </select>

            <select
              value={returnStatusFilter}
              onChange={(e) => setReturnStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ALL">Tous les statuts de retour</option>
              <option value="REQUESTED">En transit retour vers Hub</option>
              <option value="RETURNED">Reçu au Hub & Stock réintégré</option>
            </select>
          </div>
        </div>

        {/* 4. Returns Table & Mobile Cards */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Mobile View: High-Touch App Cards (md:hidden) */}
          <div className="md:hidden divide-y divide-slate-100">
            {returnedOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 p-4">
                <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-600 text-xs">Aucun colis retourné ou refusé</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Toutes vos expéditions en cours sont en bonne voie.</p>
              </div>
            ) : (
              returnedOrders.map((order) => {
                const isStockRestored = Boolean(order.stockReintegrated) || order.completed?.returnStatus === 'RETURNED';

                return (
                  <div key={order.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Top: Order & Tracking */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900">{order.orderNumber}</span>
                        {order.shipping?.trackingNumber && (
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {order.shipping.trackingNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{order.createdAt}</span>
                    </div>

                    {/* Customer & City */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{order.customer.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.customer.phone}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {order.customer.city}
                      </span>
                    </div>

                    {/* Sendit Courier attempts & Amount */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] block">{order.shipping?.courier || 'Sendit Express'}</span>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          {order.shipping?.deliveryAttempts || 1} tentative(s) de livraison
                        </span>
                      </div>
                      <span className="font-black text-slate-900 font-mono text-sm">{order.payment.amount} MAD</span>
                    </div>

                    {/* Refusal Reason */}
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs leading-relaxed">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block mb-0.5">Motif Refus :</span>
                      {order.shipping?.failedReason || order.customer.notes || 'Colis refusé par le client à la livraison.'}
                    </div>

                    {/* Return Status & Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <div>
                        {isStockRestored ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Stock Réintégré au Hub
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Truck className="w-3 h-3 text-amber-600" />
                            En transit retour (~35 DH Frais)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 justify-end">
                        {!isStockRestored ? (
                          <button
                            onClick={() => setInspectReturnOrder(order)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs active:scale-95 transition-all shadow-xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Inspecter Stock</span>
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleRescueWhatsApp(order)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs active:scale-95 transition-all"
                          title="Sauvetage WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => reactivateOrder(order.id)}
                          className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          title="Replacer en confirmation"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Commande & Bordereau AWB</th>
                  <th className="py-3.5 px-4">Client & Destination</th>
                  <th className="py-3.5 px-4">Livreur & Tentatives</th>
                  <th className="py-3.5 px-4">Motif du Refus / Échec</th>
                  <th className="py-3.5 px-4">Montant COD</th>
                  <th className="py-3.5 px-4">Statut Logistique</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">Aucun colis retourné ou refusé</p>
                      <p className="text-xs text-slate-400 mt-0.5">Toutes vos expéditions en cours sont en bonne voie de livraison.</p>
                    </td>
                  </tr>
                ) : (
                  returnedOrders.map((order) => {
                    const isStockRestored = Boolean(order.stockReintegrated) || order.completed?.returnStatus === 'RETURNED';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900">{order.orderNumber}</span>
                          </div>
                          {order.shipping?.trackingNumber && (
                            <span className="inline-block mt-1 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {order.shipping.trackingNumber}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">{order.createdAt}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">{order.customer.city}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.customer.phone}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{order.shipping?.courier || 'Sendit.ma Express'}</p>
                          <p className="text-[11px] text-slate-500">
                            {order.shipping?.driverName ? `Livreur: ${order.shipping.driverName}` : 'Agence Sendit'}
                          </p>
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {order.shipping?.deliveryAttempts || 1} tentative(s)
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-[11px] font-semibold leading-relaxed">
                            {order.shipping?.failedReason || order.customer.notes || 'Colis refusé par le client à la livraison.'}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {order.shipping?.lastUpdated}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 text-sm">{order.payment.amount} MAD</span>
                          <span className="text-[10px] text-rose-500 font-bold block">Non encaissé</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isStockRestored ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Stock réintégré</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded-full border border-amber-300 animate-pulse">
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              <span>En retour vers Hub</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reintegrate Stock Button */}
                            {!isStockRestored && (
                              <button
                                onClick={() => setInspectReturnOrder(order)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
                                title="Valider la réception du colis au hub et remettre les articles en stock"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Remettre en Stock</span>
                              </button>
                            )}

                            {/* Rescue on WhatsApp */}
                            <button
                              onClick={() => handleRescueWhatsApp(order)}
                              className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Sauvetage WhatsApp (Proposer une remise ou un créneau de livraison)"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Reactivate if client re-confirms */}
                            <button
                              onClick={() => reactivateOrder(order.id)}
                              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              title="Replacer en attente de confirmation"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    
      <PhysicalReturnModal
        order={inspectReturnOrder}
        isOpen={!!inspectReturnOrder}
        onClose={() => setInspectReturnOrder(null)}
        onReceived={(orderId) => {
          reintegrateStock(orderId);
          showToast('Colis inspecté et articles réintégrés au stock avec succès!', 'success');
        }}
      />
</div>
  );
}
