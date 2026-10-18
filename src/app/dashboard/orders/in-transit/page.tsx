'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  MessageSquare,
  Clock,
  Phone,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Copy,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Navigation,
  Sparkles,
  User
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import { RescheduleModal } from '@/components/orders/lifecycle/OrderModals';

export default function InTransitOrdersPage() {
  const {
    orders,
    markDelivered,
    rescheduleDelivery,
    inTransitCount,
  } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courierFilter, setCourierFilter] = useState('ALL');

  // Modals & States
  const [reschedulingOrder, setReschedulingOrder] = useState<LifecycleOrder | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<LifecycleOrder | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [rescueToast, setRescueToast] = useState<string | null>(null);

  // Filter orders for In Transit
  const inTransitOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'IN_TRANSIT')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          (o.shipping?.trackingNumber && o.shipping.trackingNumber.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus =
          statusFilter === 'ALL' || o.shipping?.liveStatus === statusFilter;

        const matchesCourier =
          courierFilter === 'ALL' || o.shipping?.courier === courierFilter;

        return matchesSearch && matchesStatus && matchesCourier;
      });
  }, [orders, search, statusFilter, courierFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRescueWhatsApp = (order: LifecycleOrder) => {
    setRescueToast(`Message de sauvetage WhatsApp envoyé au client ${order.customer.name}`);
    setTimeout(() => setRescueToast(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Lifecycle Navigation Tabs (Mobile only - on desktop it is in the top header) */}
      <div className="md:hidden">
        <OrderLifecycleTabs />
      </div>

      {/* Main Content Area */}
      <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">

        {rescueToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{rescueToast}</span>
          </div>
        )}

        {/* Header with Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  3. En cours de livraison
                </h1>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {inTransitCount} colis en route
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi livreurs en direct, sauvetage WhatsApp et reprogrammation jusqu'à encaissement COD.
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher (AWB, client, tél)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="OUT_FOR_DELIVERY">En cours de distribution</option>
              <option value="DISPATCHED">En transit hub</option>
              <option value="FAILED_ATTEMPT">Injoignable / Échoué</option>
            </select>

            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
            >
              <option value="ALL">Tous les transporteurs</option>
              <option value="Sendit.ma Express">Sendit.ma Express</option>
              <option value="Cathedis Maroc">Cathedis Maroc</option>
              <option value="Amana Express">Amana Express</option>
              <option value="DHL Morocco">DHL Morocco</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {inTransitOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">Aucun colis en cours de livraison</p>
              <p className="text-xs text-slate-400 mt-1">
                Les colis emballés dans l'entrepôt s'afficheront ici dès leur remise aux livreurs.
              </p>
            </div>
          ) : (
            <>
              {/* 1. MOBILE CARDS VIEW (< MD) */}
              <div className="md:hidden divide-y divide-slate-100">
                {inTransitOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{order.orderNumber}</span>
                        <span className="text-sm font-bold text-slate-900">{order.customer.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 font-mono block">{order.payment.amount} MAD</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {order.customer.city}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.shipping?.liveStatus === 'OUT_FOR_DELIVERY' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          En tournée de livraison
                        </span>
                      ) : order.shipping?.liveStatus === 'FAILED_ATTEMPT' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Client Injoignable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          En transit hub
                        </span>
                      )}

                      <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-800 font-bold border border-slate-200">
                        <span>{order.shipping?.courier} : {order.shipping?.trackingNumber}</span>
                      </div>
                    </div>

                    {order.shipping?.driverName && (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">Livreur : {order.shipping.driverName}</span>
                        </div>
                        {order.shipping.driverPhone && (
                          <a
                            href={`tel:${order.shipping.driverPhone}`}
                            className="text-blue-700 font-bold flex items-center gap-1 text-[11px] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Appeler</span>
                          </a>
                        )}
                      </div>
                    )}

                    {order.shipping?.liveStatus === 'FAILED_ATTEMPT' && (
                      <button
                        onClick={() => handleRescueWhatsApp(order)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                        <span>🤖 Sauvetage WhatsApp Darija (Relancer)</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setTrackingModalOrder(order)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Suivi Sendit</span>
                      </button>

                      <button
                        onClick={() => setReschedulingOrder(order)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Reprogrammer</span>
                      </button>
                    </div>

                    <button
                      onClick={() => markDelivered(order.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Livré & Encaissé ({order.payment.amount} MAD)</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* 2. DESKTOP TABLE VIEW (MD & UP) */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Commande & Destinataire</th>
                    <th className="py-3.5 px-4">Transporteur & Suivi AWB</th>
                    <th className="py-3.5 px-4">Statut Terrain & Montant COD</th>
                    <th className="py-3.5 px-4">Livreur Affecté</th>
                    <th className="py-3.5 px-4">Dernière Mise à Jour</th>
                    <th className="py-3.5 px-4 text-right">Actions de livraison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inTransitOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Order & Destinataire */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            {order.orderNumber}
                          </span>
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <span className="text-slate-700">{order.customer.phone}</span>
                            <span>•</span>
                            <span className="text-slate-900 font-bold">{order.customer.city}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Courier & Tracking AWB */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 block">
                            {order.shipping?.courier || 'Sendit.ma'}
                          </span>
                          <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-800 font-bold border border-slate-200">
                            <span>{order.shipping?.trackingNumber || 'SND-PENDING'}</span>
                            <button
                              onClick={() => copyToClipboard(order.shipping?.trackingNumber || '')}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copier le numéro de suivi"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          {copiedCode === order.shipping?.trackingNumber && (
                            <span className="text-[9px] text-emerald-600 font-bold block">
                              Copié !
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Live Status (Dispatched, Out for Delivery, Failed Attempt) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {order.shipping?.liveStatus === 'OUT_FOR_DELIVERY' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              <span>En cours de distribution</span>
                            </div>
                          ) : order.shipping?.liveStatus === 'FAILED_ATTEMPT' ? (
                            <div className="space-y-1.5">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Injoignable / Tentative échouée</span>
                              </div>
                              {/* One-click WhatsApp Rescue Button */}
                              <div>
                                <a
                                  href={`https://wa.me/212${order.customer.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                                    `Salam ${order.customer.name}, l-livreur ttasl bik bach isllm lik talabia ${order.orderNumber} walakin t3ddar l-wosol ilaik. Fou9ach katfddal irj3 3ndk lyouma?`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleRescueWhatsApp(order)}
                                  className="inline-flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg shadow-2xs"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>Sauvetage WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span>En transit régional (Dispatched)</span>
                            </div>
                          )}

                          <div className="text-[10px] font-bold text-amber-800 bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200 inline-block">
                            Montant COD : {order.payment.amount} MAD
                          </div>
                        </div>
                      </td>

                      {/* 4. Driver & Dispatch */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {order.shipping?.driverName ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">{order.shipping.driverName}</p>
                            {order.shipping.driverPhone && (
                              <a
                                href={`tel:${order.shipping.driverPhone}`}
                                className="text-[10px] text-blue-600 hover:underline font-mono flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                {order.shipping.driverPhone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Hub logistique</span>
                        )}
                      </td>

                      {/* 5. Last Updated Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.shipping?.lastUpdated || 'Récemment'}</span>
                        </div>
                        {order.shipping?.rescheduledDate && (
                          <span className="text-[10px] text-indigo-700 font-bold block mt-0.5 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            Reporté au : {order.shipping.rescheduledDate}
                          </span>
                        )}
                      </td>

                      {/* 6. Actions (Track Link, Reschedule, Mark Delivered -> Moves to Completed) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Track Modal */}
                          <button
                            onClick={() => setTrackingModalOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                            title="Consulter le suivi Sendit"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                            <span>Suivi Sendit</span>
                          </button>

                          {/* Reschedule */}
                          <button
                            onClick={() => setReschedulingOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                            title="Reprogrammer la date de livraison"
                          >
                            <Calendar className="w-3 h-3 text-indigo-600" />
                            <span>Reprogrammer</span>
                          </button>

                          {/* Mark Delivered (Primary Completion Action) */}
                          <button
                            onClick={() => markDelivered(order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                            title="Confirmer la livraison et l'encaissement des fonds COD"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Livré & Encaissé ➔ Clôture</span>
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

      {/* Reschedule Modal */}
      <RescheduleModal
        order={reschedulingOrder}
        isOpen={!!reschedulingOrder}
        onClose={() => setReschedulingOrder(null)}
        onReschedule={rescheduleDelivery}
      />

      {/* Live Tracking Timeline Modal */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Suivi d'expédition Sendit — {trackingModalOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">N° de Bordereau (AWB) :</span>
                <span className="font-mono font-bold text-slate-900">
                  {trackingModalOrder.shipping?.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transporteur :</span>
                <span className="font-bold text-slate-900">
                  {trackingModalOrder.shipping?.courier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client & Destination :</span>
                <span className="font-bold text-slate-900">
                  {trackingModalOrder.customer.name} ({trackingModalOrder.customer.city})
                </span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Montant COD à encaisser :</span>
                <span>{trackingModalOrder.payment.amount} MAD</span>
              </div>
            </div>

            {/* Timeline Milestones */}
            <div className="space-y-4 relative pl-6 text-xs before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-emerald-500 absolute -left-5 top-0.5 ring-4 ring-white" />
                <p className="font-bold text-slate-900">1. Commande confirmée et emballée</p>
                <p className="text-[11px] text-slate-400">Hub Central Casablanca • Bordereau AWB généré</p>
              </div>
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-indigo-500 absolute -left-5 top-0.5 ring-4 ring-white" />
                <p className="font-bold text-slate-900">2. Pris en charge par le transporteur</p>
                <p className="text-[11px] text-slate-400">Transfert vers le hub de distribution ({trackingModalOrder.customer.city})</p>
              </div>
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse absolute -left-5 top-0.5 ring-4 ring-white" />
                <p className="font-bold text-blue-700">3. En cours de distribution auprès du client</p>
                <p className="text-[11px] text-slate-500">
                  Livreur : {trackingModalOrder.shipping?.driverName || 'Agent de livraison Sendit'} • {trackingModalOrder.shipping?.lastUpdated}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
