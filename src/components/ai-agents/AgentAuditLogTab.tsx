'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Ban,
  XCircle,
  Eye,
  Clock,
  Phone,
  Package,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';

interface LogEntry {
  id: string;
  order_id: string | null;
  order_number: string | null;
  customer_phone: string;
  customer_name: string | null;
  action_type: string;
  status: 'EXECUTED' | 'SKIPPED_COOLDOWN' | 'SKIPPED_QUIET_HOURS' | 'BLOCKED_DND' | 'SKIPPED_DAILY_CAP' | 'FAILED' | 'PENDING_APPROVAL' | 'NO_WHATSAPP';
  reason_details: string | null;
  channel: string;
  payload: string | null;
  created_at: string;
}

interface StatsData {
  totalToday: number;
  executedToday: number;
  cooldownPreventedToday: number;
  quietHoursSkippedToday: number;
  dndBlockedToday: number;
}

export default function AgentAuditLogTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalToday: 0,
    executedToday: 0,
    cooldownPreventedToday: 0,
    quietHoursSkippedToday: 0,
    dndBlockedToday: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inspectModalLog, setInspectModalLog] = useState<LogEntry | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('limit', '80');

      const res = await fetch(`/api/ai-agents/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
        setLastRefreshedAt(
          new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch (err) {
      console.error('Error loading agent audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'OUT_FOR_DELIVERY_NOTICE':
        return { label: 'Colis en cours de livraison 🚚', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'MORNING_COD_REMINDER':
        return { label: 'Rappel paiement COD 💵', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ORDER_CONFIRMATION':
        return { label: 'Confirmation de commande 📋', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'DELIVERY_RESCUE':
        return { label: 'Sauvetage livraison échouée 🛟', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'POST_DELIVERY_REVIEW':
        return { label: 'Invitation avis client ⭐', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'TOOL_CONFIRM_ORDER':
        return { label: 'Validation auto (Outil IA)', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'TOOL_SAVE_GPS':
        return { label: 'Enregistrement position GPS 📍', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'TOOL_UPDATE_DETAILS':
        return { label: 'Modification commande ✍️', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'TOOL_CANCEL_ORDER':
        return { label: 'Annulation commande 🚫', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'OWNER_CONFIRM_ALERT':
        return { label: 'Alerte Propriétaire: Commande confirmée 🔔', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'OWNER_HANDOVER_ALERT':
        return { label: 'Alerte Propriétaire: Intervention requise 🚨', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      default:
        return { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getStatusBadge = (status: LogEntry['status']) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Envoyé avec succès
          </span>
        );
      case 'NO_WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Phone className="w-3 h-3 text-amber-700" />
            Sans WhatsApp (Appel GSM)
          </span>
        );
      case 'SKIPPED_COOLDOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            Anti-Spam (Délai d'attente)
          </span>
        );
      case 'SKIPPED_QUIET_HOURS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Moon className="w-3 h-3 text-purple-600" />
            Heures de silence (Nuit)
          </span>
        );
      case 'SKIPPED_DAILY_CAP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            Plafond journalier atteint
          </span>
        );
      case 'BLOCKED_DND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3 text-rose-600" />
            Bloqué (Liste Noire / DND)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Échec technique
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            En attente d'approbation
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Opérations aujourd'hui</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalToday}</div>
          <div className="text-[10px] text-slate-400 mt-1">Interactions & rappels planifiés</div>
        </div>

        {/* Executed Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700">Envoyées & Exécutées</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.executedToday}</div>
          <div className="text-[10px] text-emerald-600/70 mt-1">Messages conformes aux règles</div>
        </div>

        {/* Cooldown Prevented Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700">Doublons évités (Anti-Spam)</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.cooldownPreventedToday}</div>
          <div className="text-[10px] text-amber-600/70 mt-1">Envois répétés bloqués le même jour</div>
        </div>

        {/* Quiet Hours Skipped Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700">Heures de silence respectées</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">{stats.quietHoursSkippedToday}</div>
          <div className="text-[10px] text-purple-600/70 mt-1">Reporté pour préserver le client</div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH BAR ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'EXECUTED', label: '✅ Envoyés' },
              { id: 'NO_WHATSAPP', label: '⚠️ Sans WhatsApp (GSM)' },
              { id: 'SKIPPED_COOLDOWN', label: '🛡️ Anti-Spam' },
              { id: 'SKIPPED_QUIET_HOURS', label: '🌙 Heures de silence' },
              { id: 'BLOCKED_DND', label: '🚫 Bloqués' },
              { id: 'FAILED', label: '❌ Échecs' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par téléphone, client ou commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              title="Actualiser le journal"
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {lastRefreshedAt && (
          <div className="text-[11px] text-slate-400">
            Dernière mise à jour : {lastRefreshedAt}
          </div>
        )}
      </div>

      {/* ── 3. AUDIT LOGS TABLE ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Heure</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Commande</th>
                <th className="py-3 px-4">Type d'action</th>
                <th className="py-3 px-4">Statut & Décision</th>
                <th className="py-3 px-4">Détail de la décision</th>
                <th className="py-3 px-4 text-center">Aperçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Chargement du journal d'audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucune opération enregistrée pour ces filtres
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionBadge = getActionLabel(log.action_type);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Created At */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {log.customer_name || 'Client'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {log.customer_phone}
                        </div>
                      </td>

                      {/* Order */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.order_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Package className="w-3 h-3 text-slate-500" />
                            #{log.order_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Action Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${actionBadge.bg}`}
                        >
                          {actionBadge.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Reason Details */}
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600" title={log.reason_details || ''}>
                        {log.reason_details || 'Règles satisfaites.'}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setInspectModalLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Voir les détails et le message"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. INSPECTION MODAL ─────────────────────────────────── */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="font-black text-sm text-slate-900">Détails de l'opération de l'Agent IA</span>
              </div>
              <button
                onClick={() => setInspectModalLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Client :</span>
                  <strong className="text-slate-800 font-bold">{inspectModalLog.customer_name || 'Client'}</strong>
                  <div className="text-slate-500 font-mono text-[11px]">{inspectModalLog.customer_phone}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Commande liée :</span>
                  <strong className="text-slate-800 font-bold">
                    {inspectModalLog.order_number ? `#${inspectModalLog.order_number}` : 'Non spécifié'}
                  </strong>
                  <div className="text-slate-400 text-[10px]">
                    Canal : {inspectModalLog.channel || 'WHATSAPP'}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Décision & Statut :</span>
                {getStatusBadge(inspectModalLog.status)}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Justification & Audit :</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 font-medium text-xs leading-relaxed">
                  {inspectModalLog.reason_details || 'Toutes les conditions ont été remplies.'}
                </div>
              </div>

              {inspectModalLog.payload && (
                <div>
                  <span className="text-slate-400 block text-[10px] mb-1">Message envoyé / Données (Payload) :</span>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {inspectModalLog.payload}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectModalLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
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
