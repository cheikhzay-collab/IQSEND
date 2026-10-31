'use client';

import React from 'react';
import { Package, Truck, CheckCircle2, ShieldAlert, Banknote } from 'lucide-react';
import { TrackingKpis } from '@/types';

interface KpiCardsProps {
  kpis: TrackingKpis;
  onFilterRescue?: () => void;
}

export function KpiCards({ kpis, onFilterRescue }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
      {/* 1. Total Dispatched */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Expédiés
          </span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Package className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-slate-900">{kpis.totalShipments}</span>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            +12% hier
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">Via Sendit.ma Express</p>
      </div>

      {/* 2. Out For Delivery */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            En Cours de Livraison
          </span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Truck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-slate-900">{kpis.outForDeliveryCount}</span>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
            Aujourd'hui
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">Alertes WhatsApp actives</p>
      </div>

      {/* 3. Delivery Rate (Taux de Livraison) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Taux de Livraison (COD)
          </span>
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-emerald-600">{kpis.deliveryRate}%</span>
          <span className="text-[11px] font-semibold text-slate-500">
            ({kpis.deliveredCount} colis livrés)
          </span>
        </div>
        <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(kpis.deliveryRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Delivery Failures (Échecs à sauver) */}
      <div
        onClick={onFilterRescue}
        className={`rounded-2xl border p-3 sm:p-3.5 shadow-2xs transition-all cursor-pointer ${
          kpis.failedAtRiskCount > 0
            ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400 hover:bg-rose-50'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
        title={kpis.failedAtRiskCount > 0 ? 'Cliquer pour filtrer les colis à sauver en urgence' : undefined}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
            Échecs / Injoignables
          </span>
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-rose-600">{kpis.failedAtRiskCount}</span>
          {kpis.failedAtRiskCount > 0 && (
            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md animate-pulse">
              Sauvetage &lt; 24h
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-rose-600 font-medium">
          {kpis.failedAtRiskCount > 0 ? '⚡ Cliquez pour intervenir' : 'Aucun colis en risque'}
        </p>
      </div>

      {/* 5. COD Cash Collection */}
      <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Montant COD Encaissé
          </span>
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Banknote className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-black text-slate-900">
            {kpis.totalCodCollected.toLocaleString('fr-FR')}
          </span>
          <span className="text-xs font-bold text-slate-500">MAD</span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">
          En attente: {kpis.pendingCodAmount.toLocaleString('fr-FR')} MAD
        </p>
      </div>
    </div>
  );
}
