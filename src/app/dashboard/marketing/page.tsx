'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Users,
  Send,
  Plus,
  Percent,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  targetAudience: string;
  sentCount: number;
  openRate: number;
  ordersGenerated: number;
  revenue: number;
  status: 'TERMINÉE' | 'EN_COURS' | 'PLANIFIÉE';
}

const CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Offre Fin de Semaine Casablanca & Rabat',
    targetAudience: 'Clients ayant commandé il y a +30 jours (Casa/Rabat)',
    sentCount: 1250,
    openRate: 94.2,
    ordersGenerated: 86,
    revenue: 25714,
    status: 'TERMINÉE',
  },
  {
    id: 'camp-2',
    name: 'Lancement Kaftan Lin Pur (Clients VIP)',
    targetAudience: 'Top 500 acheteurs VIP marocains',
    sentCount: 500,
    openRate: 98.0,
    ordersGenerated: 64,
    revenue: 29376,
    status: 'TERMINÉE',
  },
  {
    id: 'camp-3',
    name: 'Relance Paniers Abandonnés Flash 24h',
    targetAudience: 'Visiteurs avec checkout incomplet',
    sentCount: 180,
    openRate: 89.5,
    ordersGenerated: 32,
    revenue: 9568,
    status: 'EN_COURS',
  },
];

export default function MarketingPage() {
  // Ads COD ROI Calculator state
  const [adSpend, setAdSpend] = useState(5000); // 5000 MAD Ads
  const [cpl, setCpl] = useState(25); // 25 MAD par lead
  const [confirmRate, setConfirmRate] = useState(80); // 80% confirmation
  const [deliveryRate, setDeliveryRate] = useState(82); // 82% livraison Sendit
  const [aov, setAov] = useState(299); // Panier moyen 299 MAD
  const [productCost, setProductCost] = useState(85); // Coût produit 85 MAD
  const [shippingFee, setShippingFee] = useState(35); // Frais Sendit 35 MAD

  // Calculations
  const leadsCount = Math.round(adSpend / cpl);
  const confirmedCount = Math.round(leadsCount * (confirmRate / 100));
  const deliveredCount = Math.round(confirmedCount * (deliveryRate / 100));
  const returnedCount = confirmedCount - deliveredCount;

  const totalRevenue = deliveredCount * aov;
  const totalProductCost = deliveredCount * productCost;
  const totalShippingCost = (deliveredCount * shippingFee) + (returnedCount * 20); // 20 MAD frais de retour
  const netProfit = totalRevenue - totalProductCost - totalShippingCost - adSpend;
  const roiPercent = Math.round((netProfit / adSpend) * 100);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
            <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
            Marketing WhatsApp Broadcast & Rentabilité COD
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing & Acquisition
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Campagnes groupées WhatsApp, simulateur de rentabilité publicitaire et fidélisation client.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            Nouvelle Campagne Broadcast
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Revenu des Campagnes</span>
          <p className="text-2xl font-black text-slate-900 mt-2">64,658 MAD</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Généré via WhatsApp direct
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Taux d'Ouverture Moyen</span>
          <p className="text-2xl font-black text-blue-600 mt-2">94.8%</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Format interactif WhatsApp
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Commandes Récidives</span>
          <p className="text-2xl font-black text-purple-600 mt-2">182</p>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            Clients ayant racheté
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Coût d'Envoi Moyen</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">0.25 MAD</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Par message WhatsApp officiel
          </div>
        </div>
      </div>

      {/* Interactive COD Moroccan Profitability Calculator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Calculateur de Rentabilité COD Maroc (Facebook/TikTok Ads + Sendit)
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            Simulation en direct
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Budget Publicitaire (MAD)
            </label>
            <input
              type="number"
              value={adSpend}
              onChange={(e) => setAdSpend(parseFloat(e.target.value) || 0)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Coût par Lead (MAD)
            </label>
            <input
              type="number"
              value={cpl}
              onChange={(e) => setCpl(parseFloat(e.target.value) || 1)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Taux de Confirmation IA (%)
            </label>
            <input
              type="number"
              value={confirmRate}
              onChange={(e) => setConfirmRate(parseFloat(e.target.value) || 0)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Taux de Livraison Sendit (%)
            </label>
            <input
              type="number"
              value={deliveryRate}
              onChange={(e) => setDeliveryRate(parseFloat(e.target.value) || 0)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Results Strip */}
        <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Leads Générés</span>
            <strong className="text-lg font-black">{leadsCount}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Colis Livrés & Payés</span>
            <strong className="text-lg font-black text-emerald-400">{deliveredCount}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Bénéfice Net Réel</span>
            <strong className="text-lg font-black text-emerald-400">
              +{netProfit.toLocaleString()} MAD
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Retour sur Dépense (ROI)</span>
            <strong className="text-lg font-black text-emerald-300">+{roiPercent}%</strong>
          </div>
        </div>
      </div>

      {/* Broadcast Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Campagnes WhatsApp Actives & Archivées
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Nom de la Campagne</th>
                <th className="py-3 px-3">Audience Ciblée</th>
                <th className="py-3 px-3 text-center">Envoyés</th>
                <th className="py-3 px-3 text-center">Taux d'Ouverture</th>
                <th className="py-3 px-3 text-center">Commandes</th>
                <th className="py-3 px-3">Chiffre d'Affaires</th>
                <th className="py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {CAMPAIGNS.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3.5 px-3 text-slate-500">{c.targetAudience}</td>
                  <td className="py-3.5 px-3 text-center font-bold">{c.sentCount}</td>
                  <td className="py-3.5 px-3 text-center text-blue-600 font-bold">{c.openRate}%</td>
                  <td className="py-3.5 px-3 text-center font-bold text-emerald-600">{c.ordersGenerated}</td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">{c.revenue.toLocaleString()} MAD</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
