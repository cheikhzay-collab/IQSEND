'use client';

import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet,
  RefreshCw,
  Database
} from 'lucide-react';

export default function FinanceReconciliationPage() {
  const [data, setData] = useState<any>({
    kpis: {
      totalDeliveredFormatted: '7 104 MAD',
      deliveredCount: 18,
      shippingFeesFormatted: '630 MAD',
      netPayoutFormatted: '6 474 MAD',
      inTransitRevenue: 349,
      inTransitCount: 1,
      recoverySavingsFormatted: '+14,600 MAD',
    },
    settlements: [
      {
        ref: 'SND-PAY-2026-LIVE',
        period: 'Semaine en cours (14 Oct - 20 Oct 2026)',
        colisCount: 18,
        feesDeducted: 630,
        netAmount: 6474,
        status: 'En cours de virement',
      },
    ],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);

  const fetchFinance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Finance fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <BadgePercent className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Finances & Rapprochement Bancaire Sendit (COD)
            </h1>
            {isLiveDb && (
              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 font-bold">
                <Database className="w-2.5 h-2.5" /> Base MySQL Connectée
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des fonds encaissés en espèces, déduction automatique des frais de livraison et lettrage des virements en direct
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFinance}
            disabled={isLoading}
            className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs"
            title="Actualiser depuis la base de données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exporter le Relevé (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Total Encaissé (Livré)</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{data.kpis?.totalDeliveredFormatted}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{data.kpis?.deliveredCount} colis encaissés en espèces</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Frais Livraison Déduits</span>
            <CheckCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">-{data.kpis?.shippingFeesFormatted}</p>
          <span className="text-[11px] text-slate-400">35 MAD / expédition Sendit</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Montant Net à Reverser</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{data.kpis?.netPayoutFormatted}</p>
          <span className="text-[11px] text-slate-400">Virement sous 48h Attijariwafa</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Économies Bot Sauvetage</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{data.kpis?.recoverySavingsFormatted}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Récupération d'échecs IA</span>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">
            Historique des Factures de Reversement Sendit.ma
          </h2>
          <span className="text-xs text-slate-400">Calculé en direct depuis les commandes livrées</span>
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
              {data.settlements?.map((s: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3.5 font-mono font-bold text-blue-600">{s.ref}</td>
                  <td className="p-3.5">{s.period}</td>
                  <td className="p-3.5 font-bold">{s.colisCount} colis</td>
                  <td className="p-3.5 text-rose-600 font-semibold">-{s.feesDeducted?.toLocaleString('fr-FR')} MAD</td>
                  <td className="p-3.5 font-extrabold text-emerald-600">{s.netAmount?.toLocaleString('fr-FR')} MAD</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      s.status?.includes('Viré') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.status}
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

