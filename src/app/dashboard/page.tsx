'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  Truck,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowRight,
  ShieldAlert,
  Banknote,
  Bot,
  Database,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  deliveredRevenue: number;
  deliveredRevenueFormatted: string;
  deliveredCount: number;
  confirmedCount: number;
  pendingCount: number;
  canceledCount: number;
  inTransitCount: number;
  totalProducts: number;
  confirmationRate: number;
  deliveryRate: number;
  returnRate: number;
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('sendit_cached_dashboard_stats');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}
    }
    return {
      totalOrders: 22,
      deliveredRevenue: 6450,
      deliveredRevenueFormatted: '6,450 MAD',
      deliveredCount: 18,
      confirmedCount: 19,
      pendingCount: 2,
      canceledCount: 3,
      inTransitCount: 1,
      totalProducts: 1,
      confirmationRate: 86.4,
      deliveryRate: 85.7,
      returnRate: 14.3,
    };
  });
  const [loading, setLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);

  const loadStats = async (silent?: boolean | unknown) => {
    const isSilent = typeof silent === 'boolean' ? silent : false;
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        setIsLiveDb(true);
        try {
          sessionStorage.setItem('sendit_cached_dashboard_stats', JSON.stringify(data.stats));
        } catch {}
      }
    } catch (e) {
      console.warn('Dashboard stats fallback:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const hasCache = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('sendit_cached_dashboard_stats'));
    if (hasCache) setIsLiveDb(true);
    loadStats(!hasCache ? false : true);
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 pb-20 md:pb-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-app-card relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold mb-3 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Opérations COD Maroc en direct
            {isLiveDb && (
              <span className="ml-1 text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Database className="w-2.5 h-2.5" /> Base MySQL Connectée ({stats.totalOrders} Commandes)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Plateforme Unifiée: Qualification IA & Logistique Sendit.ma
          </h1>
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">
            Automatisation complète du cycle de vente : de la capture du lead à la confirmation en Darija par Gemini, en passant par le ramassage Sendit et le sauvetage des échecs de livraison.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <Link
              href="/dashboard/leads"
              className="bg-white text-slate-900 hover:bg-blue-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              Gérer les Leads IA ({stats.pendingCount} en attente)
            </Link>
            <Link
              href="/dashboard/tracking"
              className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Truck className="w-4 h-4" />
              Pipeline Sendit Express ({stats.inTransitCount} en transit)
            </Link>
            <button
              onClick={loadStats}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs px-3 py-2 rounded-xl transition-all inline-flex items-center justify-center gap-1.5"
              title="Rafraîchir depuis la base de données"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (2 cols on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-app-card">
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block truncate">Revenu Total (Livré & Encaissé)</span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{stats.deliveredRevenueFormatted}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3 h-3" /> {stats.deliveredCount} colis encaissés
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-app-card">
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block truncate">Taux de Confirmation IA</span>
          <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">{stats.confirmationRate}%</p>
          <div className="mt-2 text-[10px] sm:text-xs text-slate-500 truncate">
            Confirmés: <strong className="text-slate-800">{stats.confirmedCount} leads</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-app-card">
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block truncate">Taux de Livraison Sendit</span>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">{stats.deliveryRate}%</p>
          <div className="mt-2 text-[10px] sm:text-xs text-emerald-700 font-medium truncate">
            {stats.deliveredCount} livrés avec succès
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 sm:p-4 rounded-2xl shadow-app-card">
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block truncate">Taux d'Annulation / Retour</span>
          <p className="text-lg sm:text-2xl font-black text-rose-600 mt-1">{stats.returnRate}%</p>
          <div className="mt-2 text-[10px] sm:text-xs text-slate-500 truncate">
            {stats.canceledCount} annulés / refusés
          </div>
        </div>
      </div>

      {/* Operational Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
        
        {/* Module 1: Leads */}
        <Link
          href="/dashboard/leads"
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
            Qualification & Confirmation IA
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Inbound webhooks YouCan/Shopify, détection anti-doublon en 72h et bot WhatsApp Darija avec Function Calling.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
            Voir le tableau Kanban <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Module 2: Tracking */}
        <Link
          href="/dashboard/tracking"
          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
            Sendit.ma Suivi & Sauvetage
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Synchronisation des événements de livraison par webhooks, alertes pré-livraison et bot de récupération d'échec.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600">
            Consulter le pipeline logistique <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Module 3: WhatsApp Omnichannel */}
        <Link
          href="/dashboard/inbox"
          className="bg-white border border-slate-200 hover:border-purple-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
            Boîte de Réception Omnicanale
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Vue centralisée des conversations WhatsApp, transcription des vocaux par Whisper et bascule manuelle en un clic.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-600">
            Ouvrir la boîte de réception <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
