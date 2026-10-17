'use client';

import React, { useState, useMemo } from 'react';
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
  Check,
  ScanLine
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import {
  ShippingLabelModal,
  InvoiceModal,
} from '@/components/orders/lifecycle/OrderModals';

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
      {/* Top Lifecycle Navigation Tabs */}
      <OrderLifecycleTabs />

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header with Title and Tools */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  2. En préparation & Emballage
                </h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-200">
                  {processingCount} à emballer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Prélèvement des articles (Picking), scan code-barres de conformité, impression des bordereaux d'expédition Sendit et remise aux transporteurs.
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[240px]">
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
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les entrepôts</option>
              <option value="Hub Central Casablanca">Hub Central Casablanca</option>
              <option value="Hub Fès-Meknès">Hub Fès-Meknès</option>
            </select>
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
            <div className="overflow-x-auto">
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
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200/80 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-teal-600" />
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

                        {/* 6. Actions (Print Label + Ship -> Moves to In Transit) */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Print Shipping Label */}
                            <button
                              onClick={() => setLabelOrder(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                              title="Imprimer le bordereau d'expédition Sendit"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>Imprimer Bordereau</span>
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
    </div>
  );
}
