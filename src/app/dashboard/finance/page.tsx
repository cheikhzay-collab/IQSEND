'use client';

import React from 'react';
import {
  BadgePercent,
  Banknote,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';

export default function FinanceReconciliationPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <BadgePercent className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Finances & Rapprochement Bancaire Sendit (COD)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des fonds encaissés en espèces, déduction automatique des frais de livraison et lettrage des virements
          </p>
        </div>

        <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Exporter le Relevé de Rapprochement
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Total Encaissé (Livré)</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">184,520 MAD</p>
          <span className="text-[11px] text-emerald-600 font-medium">92.4% de taux de collecte</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Virements Reçus de Sendit</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">156,200 MAD</p>
          <span className="text-[11px] text-slate-400">Compte Attijariwafa Bank</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>En Cours de Règlement</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">28,320 MAD</p>
          <span className="text-[11px] text-slate-400">Virement prévu sous 48h</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Économies Bot Sauvetage</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">+14,600 MAD</p>
          <span className="text-[11px] text-emerald-700 font-medium">42 colis sauvés ce mois</span>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">
            Historique des Factures de Reversement Sendit.ma
          </h2>
          <span className="text-xs text-slate-400">Synchronisé automatiquement</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5">Bordereau / Référence</th>
                <th className="p-3.5">Période</th>
                <th className="p-3.5">Colis Livrés</th>
                <th className="p-3.5">Frais Sendit Déduits</th>
                <th className="p-3.5">Montant Net Versé</th>
                <th className="p-3.5">Statut Banque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-mono font-bold text-blue-600">SND-PAY-2026-41</td>
                <td className="p-3.5">07 Oct - 13 Oct 2026</td>
                <td className="p-3.5 font-bold">142 colis</td>
                <td className="p-3.5 text-rose-600 font-semibold">-4,970 MAD</td>
                <td className="p-3.5 font-extrabold text-emerald-600">48,250 MAD</td>
                <td className="p-3.5">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold">
                    Viré sur compte ✓
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3.5 font-mono font-bold text-blue-600">SND-PAY-2026-42</td>
                <td className="p-3.5">14 Oct - 20 Oct 2026</td>
                <td className="p-3.5 font-bold">89 colis</td>
                <td className="p-3.5 text-rose-600 font-semibold">-3,115 MAD</td>
                <td className="p-3.5 font-extrabold text-amber-600">28,320 MAD</td>
                <td className="p-3.5">
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-bold">
                    En attente de virement
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
