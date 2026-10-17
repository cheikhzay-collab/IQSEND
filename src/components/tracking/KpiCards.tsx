'use client';

import React from 'react';
import { Package, Truck, CheckCircle2, AlertTriangle, Banknote, ShieldAlert } from 'lucide-react';
import { TrackingKpis } from '@/types';

interface KpiCardsProps {
  kpis: TrackingKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Dispatched */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Expédiés
          </span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{kpis.totalShipments}</span>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            +12% hier
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Via Sendit.ma Express</p>
      </div>

      {/* 2. Out For Delivery */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            En Cours de Livraison
          </span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{kpis.outForDeliveryCount}</span>
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            Aujourd'hui
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Alertes WhatsApp envoyées</p>
      </div>

      {/* 3. Delivery Rate (Taux de Livraison) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Taux de Livraison (COD)
          </span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">{kpis.deliveryRate}%</span>
          <span className="text-xs font-medium text-slate-500">
            ({kpis.deliveredCount} colis livrés)
          </span>
        </div>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(kpis.deliveryRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Delivery Failures (Échecs à sauver) */}
      <div className="bg-white rounded-xl border border-rose-200/90 p-4 shadow-xs bg-rose-50/20 hover:border-rose-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-rose-700">
            Échecs / Injoignables
          </span>
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-rose-600">{kpis.failedAtRiskCount}</span>
          <span className="text-xs font-medium text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
            Action urgente
          </span>
        </div>
        <p className="mt-1 text-xs text-rose-500">Bot de récupération actif</p>
      </div>

      {/* 5. COD Cash Collection */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Montant COD Encaissé
          </span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-900">
            {kpis.totalCodCollected.toLocaleString('fr-FR')}
          </span>
          <span className="text-xs font-semibold text-slate-500">MAD</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          En attente: {kpis.pendingCodAmount.toLocaleString('fr-FR')} MAD
        </p>
      </div>
    </div>
  );
}
