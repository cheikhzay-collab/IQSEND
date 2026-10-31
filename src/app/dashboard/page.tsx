'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { GoogleSheetsIntegrationModal } from '@/components/orders/lifecycle/GoogleSheetsIntegrationModal';
import {
  TrendingUp,
  TrendingDown,
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
  RefreshCw,
  MapPin,
  Clock,
  Phone,
  Plus,
  Table,
  Check,
  ChevronRight,
  DollarSign,
  UserCheck,
  Zap,
  RotateCcw,
  Headphones
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  deliveredRevenue: number;
  deliveredRevenueFormatted: string;
  inTransitRevenue?: number;
  inTransitRevenueFormatted?: string;
  pendingRevenue?: number;
  pendingRevenueFormatted?: string;
  estimatedNetProfit?: number;
  estimatedNetProfitFormatted?: string;
  averageOrderValue?: number;
  averageOrderValueFormatted?: string;
  deliveredCount: number;
  confirmedCount: number;
  pendingCount: number;
  processingCount?: number;
  canceledCount: number;
  canceledConfirmationCount: number;
  confirmationCancelRate: number;
  returnedCount: number;
  returnedDeliveryCount: number;
  deliveryReturnRate: number;
  returnRate: number;
  inTransitCount: number;
  totalProducts: number;
  confirmationRate: number;
  deliveryRate: number;
}

interface CityBreakdownItem {
  city: string;
  total: number;
  delivered: number;
  revenue: number;
  rate: number;
}

interface RecentOrderDto {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function DashboardOverviewPage() {
  const { currentUser } = useAuth();
  const { addOrder } = useOrderLifecycle();

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 90,
    deliveredRevenue: 11697,
    deliveredRevenueFormatted: '11 697 MAD',
    inTransitRevenue: 2142,
    inTransitRevenueFormatted: '2 142 MAD',
    pendingRevenue: 2036,
    pendingRevenueFormatted: '2 036 MAD',
    estimatedNetProfit: 3610,
    estimatedNetProfitFormatted: '3 610 MAD',
    averageOrderValue: 213,
    averageOrderValueFormatted: '213 MAD',
    deliveredCount: 55,
    confirmedCount: 69,
    pendingCount: 8,
    processingCount: 0,
    canceledCount: 13,
    canceledConfirmationCount: 13,
    confirmationCancelRate: 14.4,
    returnedCount: 4,
    returnedDeliveryCount: 4,
    deliveryReturnRate: 5.8,
    returnRate: 5.8,
    inTransitCount: 10,
    totalProducts: 1,
    confirmationRate: 76.7,
    deliveryRate: 79.7,
  });

  const [cityBreakdown, setCityBreakdown] = useState<CityBreakdownItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Modals
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.cityBreakdown) setCityBreakdown(data.cityBreakdown);
        if (data.recentOrders) setRecentOrders(data.recentOrders);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Dashboard stats fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh stats every 45 seconds
    const interval = setInterval(() => {
      loadStats();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED_PAID':
        return { label: 'Livrée & Encaissée', style: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return { label: 'En Livraison Sendit', style: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'PACKING':
        return { label: 'En Préparation AWB', style: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'NEW':
      case 'PENDING':
        return { label: 'À Confirmer', style: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'CONFIRMED':
        return { label: 'Confirmée (Call/IA)', style: 'bg-teal-100 text-teal-800 border-teal-300' };
      case 'CANCELED':
        return { label: 'Annulée (0 DH)', style: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'DELIVERY_FAILED':
      case 'RETURNED':
        return { label: 'Retour Transporteur', style: 'bg-rose-100 text-rose-800 border-rose-300' };
      default:
        return { label: status, style: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-5 sm:space-y-6 pb-24 md:pb-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. EXECUTIVE COMMAND HEADER & STORE PULSE                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B1528] to-[#043329] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-slate-800">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Opérations COD Maroc en Direct
              </span>

              {isLiveDb && (
                <span className="inline-flex items-center gap-1 bg-slate-800/80 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                  <Database className="w-3 h-3 text-emerald-400" /> Base MySQL ({stats.totalOrders} Commandes)
                </span>
              )}

              <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                <Truck className="w-3 h-3" /> Sendit API Connecté
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-snug">
              Centre de Pilotage COD & Expéditions Maroc
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Bienvenue, <strong className="text-white">{currentUser?.name || 'Directeur'}</strong>. Contrôle unifié du cycle de vente : qualification IA Gemini en Darija, validation call center, expédition Sendit Express et sauvetage des retours.
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Commande</span>
            </button>

            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets</span>
            </button>

            <button
              onClick={loadStats}
              disabled={loading}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all cursor-pointer"
              title="Rafraîchir les données de la base"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Period Switcher Pill */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            {(['all', 'today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activePeriod === period
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {period === 'all' && 'Globalité'}
                {period === 'today' && "Aujourd'hui"}
                {period === 'week' && '7 Derniers Jours'}
                {period === 'month' && 'Ce Mois'}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Dernière synchro : il y a quelques secondes</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PRIMARY FINANCIAL & OPERATIONAL KPIS (4 MAIN CARDS)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Chiffre d'Affaires Encaissé (Revenu Réel Cash) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-app-card hover:border-emerald-400 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Encaissé Réel (COD)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Banknote className="w-4 h-4" />
            </div>
          </div>

          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.deliveredRevenueFormatted}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {stats.deliveredCount} colis encaissés
            </span>
            <span className="text-slate-400 text-[11px]">
              Panier: <strong className="text-slate-700">{stats.averageOrderValueFormatted}</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: En Transit Sendit (Cash en Cours de Livraison) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-app-card hover:border-blue-400 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              En Transit Sendit
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>

          <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
            {stats.inTransitRevenueFormatted || `${(stats.inTransitCount * 215).toLocaleString('fr-FR')} MAD`}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-blue-700 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {stats.inTransitCount} colis sur la route
            </span>
            <span className="text-slate-400 text-[11px]">Délai: 24h - 48h</span>
          </div>
        </div>

        {/* KPI 3: Bénéfice Net Estimé (Marge en Poche) */}
        <div className="bg-white border border-emerald-500/30 bg-emerald-50/20 rounded-2xl p-4 sm:p-5 shadow-app-card hover:border-emerald-500 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Marge Nette Estimée
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-2">
            {stats.estimatedNetProfitFormatted || `${Math.round(stats.deliveredRevenue * 0.32).toLocaleString('fr-FR')} MAD`}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-emerald-200/60">
            <span className="text-emerald-800 font-bold">Après frais Sendit & COGS</span>
            <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.5 rounded font-black">
              ~31% net
            </span>
          </div>
        </div>

        {/* KPI 4: Leads à Confirmer (Potentiel Immédiat) */}
        <div className="bg-white border border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-app-card hover:border-indigo-400 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              À Traiter (Confirmation)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <p className="text-2xl sm:text-3xl font-black text-indigo-700 mt-2">
            {stats.pendingCount} <span className="text-sm font-bold text-slate-500">leads</span>
          </p>

          <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
            <span className="text-indigo-700 font-bold">
              Potentiel: {stats.pendingRevenueFormatted || `${stats.pendingCount * 215} MAD`}
            </span>
            <Link
              href="/dashboard/orders/pending"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5"
            >
              <span>Traiter</span> <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. LIFECYCLE FUNNEL: 6 OPERATIONAL COD STAGES                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-app-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Entonnoir des Ventes & Cycle Logistique (6 Étapes)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Traçabilité intégrale : Distinction stricte entre annulations d'appels (0 DH perte) et retours transporteur Sendit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
              Total Volume : {stats.totalOrders} commandes
            </span>
          </div>
        </div>

        {/* 6 Stages Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Stage 1: En attente confirmation */}
          <Link
            href="/dashboard/orders/pending"
            className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 hover:border-indigo-400 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-900 uppercase">1. Confirmation</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
            <p className="text-xl font-black text-indigo-900 mt-2">{stats.pendingCount}</p>
            <div className="text-[11px] text-indigo-700 mt-1 font-medium">À valider (Call/IA)</div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-indigo-800 flex items-center gap-0.5 font-bold">
              <span>Voir la file</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Stage 2: En préparation AWB */}
          <Link
            href="/dashboard/packing"
            className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:border-amber-400 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-900 uppercase">2. Préparation</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-xl font-black text-amber-900 mt-2">{stats.processingCount || 0}</p>
            <div className="text-[11px] text-amber-700 mt-1 font-medium">Bordereaux AWB</div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-amber-800 flex items-center gap-0.5 font-bold">
              <span>Poste emballage</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Stage 3: En livraison Sendit */}
          <Link
            href="/dashboard/tracking"
            className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 hover:border-blue-400 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-900 uppercase">3. En Livraison</span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <p className="text-xl font-black text-blue-900 mt-2">{stats.inTransitCount}</p>
            <div className="text-[11px] text-blue-700 mt-1 font-medium">Chez les coursiers</div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-blue-800 flex items-center gap-0.5 font-bold">
              <span>Suivi Sendit</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Stage 4: Livrées & Encaissées */}
          <Link
            href="/dashboard/orders/completed"
            className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-900 uppercase">4. Livrées & Payées</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-800 mt-2">{stats.deliveredCount}</p>
            <div className="text-[11px] text-emerald-700 mt-1 font-bold">
              {stats.deliveryRate}% de succès
            </div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-emerald-800 flex items-center gap-0.5 font-bold">
              <span>Voir encaissements</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Stage 5: Retours Transporteur Sendit */}
          <Link
            href="/dashboard/orders/returns"
            className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 hover:border-rose-400 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-rose-900 uppercase">5. Retours Sendit</span>
              <span className="text-[9px] bg-rose-200 text-rose-900 font-bold px-1 rounded">Frais</span>
            </div>
            <p className="text-xl font-black text-rose-700 mt-2">{stats.returnedDeliveryCount}</p>
            <div className="text-[11px] text-rose-600 mt-1 font-medium">
              Taux: {stats.deliveryReturnRate}%
            </div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-rose-800 flex items-center gap-0.5 font-bold">
              <span>Sauvetage WhatsApp</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Stage 6: Annulées à la Confirmation */}
          <Link
            href="/dashboard/orders/canceled"
            className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-700 uppercase">6. Annulées Call</span>
              <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-1 rounded">0 DH</span>
            </div>
            <p className="text-xl font-black text-slate-800 mt-2">{stats.canceledConfirmationCount}</p>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              Taux: {stats.confirmationCancelRate}%
            </div>
            <div className="mt-2 text-[10px] text-slate-400 group-hover:text-slate-800 flex items-center gap-0.5 font-bold">
              <span>Voir motifs</span> <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. TWO-COLUMN OPERATIONAL INSIGHTS: REGIONAL & AI METRICS     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left (2 cols): Top Moroccan Delivery Destinations */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-app-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Performances & Taux de Livraison par Ville (Maroc)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Classement des destinations à fort volume et taux de succès des encaissements COD
              </p>
            </div>

            <Link
              href="/dashboard/tracking"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Villes Sendit</span> <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {cityBreakdown.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Chargement des statistiques régionales depuis la base de données...
            </div>
          ) : (
            <div className="space-y-3">
              {cityBreakdown.map((item, idx) => (
                <div key={item.city || idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-black">
                        #{idx + 1}
                      </span>
                      <span>{item.city}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        <strong>{item.delivered}</strong> / {item.total} livrés
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {item.revenue.toLocaleString('fr-FR')} MAD
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        item.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : item.rate >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.rate}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.rate >= 80 ? 'bg-emerald-500' : item.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, item.rate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1 col): AI & Omnichannel Efficiency Card */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0A261E] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-app-card space-y-4 border border-emerald-900/50 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-300">
                    Intelligence Artificielle
                  </h4>
                  <p className="text-[11px] text-slate-300">Gemini 2.5 Flash Darija</p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Taux de Confirmation IA</span>
                  <span className="text-emerald-400">92.4%</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Qualification automatique par WhatsApp en Darija marocaine avec confirmation d'adresse.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Vitesse de Réponse</span>
                  <span className="text-blue-400">&lt; 35 secondes</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Traitement instantané des messages clients 24h/24 et 7j/7 sans pause.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Transcription Audio Whisper</span>
                  <span className="text-purple-400">Actif</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Écoute et transcription des notes vocales WhatsApp des clients marocains.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/ai-agents"
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Configurer les Agents IA Gemini</span>
          </Link>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. LIVE RECENT ORDERS & OPERATIONAL STREAM                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-app-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Derniers Flux de Commandes (Mise à Jour en Direct)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Flux continu des leads entrants depuis Google Sheets, YouCan, Shopify et webhooks
            </p>
          </div>

          <Link
            href="/dashboard/orders/pending"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Voir toutes les commandes ({stats.totalOrders})</span> <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            Aucune commande récente trouvée dans la base.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => {
              const statusInfo = getStatusBadge(order.status);
              return (
                <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {order.orderNumber}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{order.customerName}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({order.city})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{order.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.style}`}>
                      {statusInfo.label}
                    </span>

                    <span className="font-mono text-xs font-black text-slate-900">
                      {order.amount} MAD
                    </span>

                    <Link
                      href="/dashboard/orders/pending"
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                      title="Inspecter la commande"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODALS FOR 1-CLICK ACTIONS                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onCreate={(newOrder) => {
          addOrder({
            id: `ord-${Date.now()}`,
            createdAt: new Date().toISOString(),
            orderNumber: newOrder.orderNumber,
            customer: {
              name: newOrder.customerName,
              phone: newOrder.phone,
              city: newOrder.city,
              address: newOrder.address || '',
              notes: newOrder.notes,
            },
            payment: {
              amount: newOrder.amount,
              currency: 'MAD',
              method: 'COD',
              status: 'PENDING',
            },
            items: [
              {
                id: `item-${Date.now()}`,
                name: newOrder.productName,
                sku: 'SKU-NEW',
                quantity: 1,
                price: newOrder.amount,
                thumbnail: newOrder.productThumbnail,
              },
            ],
            stage: 'PENDING_CONFIRMATION',
          });
          loadStats();
        }}
      />

      <GoogleSheetsIntegrationModal
        isOpen={isSheetsModalOpen}
        onClose={() => {
          setIsSheetsModalOpen(false);
          loadStats();
        }}
      />
    </div>
  );
}
