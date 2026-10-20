'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  XCircle,
  Search,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  PiggyBank,
  PhoneCall,
  ArrowRight,
  ExternalLink,
  Filter
} from 'lucide-react';

import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';

export default function CanceledOrdersPage() {
  const { orders, reactivateOrder, canceledCount } = useOrderLifecycle();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Filter only CANCELED orders (pre-shipping)
  const canceledOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'CANCELED')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase()) ||
          (o.customer.notes && o.customer.notes.toLowerCase().includes(search.toLowerCase()));

        const matchesCity = selectedCity === 'ALL' || o.customer.city === selectedCity;

        const matchesReason =
          reasonFilter === 'ALL' ||
          (o.customer.notes && o.customer.notes.toLowerCase().includes(reasonFilter.toLowerCase()));

        return matchesSearch && matchesCity && matchesReason;
      });
  }, [orders, search, selectedCity, reasonFilter]);

  const cities = useMemo(() => {
    const list = orders.filter((o) => o.stage === 'CANCELED').map((o) => o.customer.city);
    return Array.from(new Set(list));
  }, [orders]);

  // Statistics
  const totalLostAmount = useMemo(() => {
    return canceledOrders.reduce((acc, o) => acc + o.payment.amount, 0);
  }, [canceledOrders]);

  const savedShippingFees = useMemo(() => {
    // Each pre-shipping cancellation saves ~35 MAD of courier shipping fee
    return canceledOrders.length * 35;
  }, [canceledOrders]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">


      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Annulations (Confirmation)
                </h1>
                <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                  {canceledOrders.length} annulées
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Frais Sendit : 0 MAD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Commandes annulées au stade de la confirmation téléphonique ou WhatsApp avant expédition physique.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/orders/pending"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <span>Voir commandes à confirmer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Annulées</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{canceledOrders.length}</span>
              <span className="text-xs text-slate-400">avant préparation</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Valeur Ventes Perdues</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalLostAmount.toLocaleString('fr-FR')} MAD</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Frais de Port Économisés</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">+{savedShippingFees} MAD</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Évités</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Protection Stock</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700">100%</span>
              <span className="text-xs text-slate-400">Stock non bloqué</span>
            </div>
          </div>
        </div>

        {/* 3. Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par client, téléphone (#AT...), ville ou motif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="ALL">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="ALL">Tous les motifs</option>
              <option value="avis">Changement d'avis</option>
              <option value="injoignable">Injoignable / Sans réponse</option>
              <option value="cher">Prix / Cher</option>
              <option value="doublon">Doublon / Erreur</option>
            </select>
          </div>
        </div>

        {/* 4. Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Commande</th>
                  <th className="py-3.5 px-4">Client & Contact</th>
                  <th className="py-3.5 px-4">Ville</th>
                  <th className="py-3.5 px-4">Articles & Montant</th>
                  <th className="py-3.5 px-4">Motif d'Annulation</th>
                  <th className="py-3.5 px-4">Impact Frais</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {canceledOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">Aucune commande annulée trouvée</p>
                      <p className="text-xs text-slate-400 mt-0.5">Toutes vos commandes en cours sont confirmées ou actives.</p>
                    </td>
                  </tr>
                ) : (
                  canceledOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{order.orderNumber}</span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Annulée
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{order.createdAt}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{order.customer.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{order.customer.phone}</p>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {order.customer.city}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{order.payment.amount} MAD</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-[11px] font-medium leading-relaxed">
                          {order.customer.notes || 'Annulé lors de l\'appel de confirmation (Demande client)'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          0 MAD (Non expédié)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reactivate Button */}
                          <button
                            onClick={() => reactivateOrder(order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
                            title="Réactiver cette commande et la replacer dans la file de confirmation"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                            <span>Réactiver</span>
                          </button>

                          {/* WhatsApp Outreach */}
                          <a
                            href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Contacter le client sur WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
