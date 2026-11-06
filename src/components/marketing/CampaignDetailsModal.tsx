'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Users,
  Image as ImageIcon,
  MessageSquare,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface CampaignDetailsModalProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CampaignDetailsModal({
  campaignId,
  isOpen,
  onClose,
  onRefresh,
}: CampaignDetailsModalProps) {
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING'>('ALL');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !campaignId) return;
    fetchDetails();
  }, [isOpen, campaignId]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.success) {
        setCampaign(data.campaign);
        setRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDispatch = async () => {
    if (!campaignId) return;
    setIsDispatching(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START', batchSize: 15 }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice({
          type: 'success',
          message: `Lot traité : ${data.batchSuccess} envoyés, ${data.batchFailed} échoués. Restants : ${data.remainingCount}`,
        });
        await fetchDetails();
        onRefresh();
      } else {
        setNotice({ type: 'error', message: data.error || 'Erreur lors de l\'envoi' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Erreur réseau' });
    } finally {
      setIsDispatching(false);
    }
  };

  const handlePauseDispatch = async () => {
    if (!campaignId) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PAUSE' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: 'Campagne mise en pause' });
        await fetchDetails();
        onRefresh();
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  const handleResetDispatch = async () => {
    if (!campaignId) return;
    try {
      setIsDispatching(true);
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: 'Campagne réinitialisée. Vous pouvez relancer l\'envoi !' });
        await fetchDetails();
        onRefresh();
      } else {
        setNotice({ type: 'error', message: data.error || 'Erreur' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Erreur' });
    } finally {
      setIsDispatching(false);
    }
  };

  if (!isOpen || !campaignId) return null;

  const total = campaign?.totalRecipients || recipients.length || 0;
  const sent = recipients.filter((r) => r.status === 'SENT').length;
  const failed = recipients.filter((r) => r.status === 'FAILED' || r.status === 'SKIPPED_NO_WHATSAPP').length;
  const pending = recipients.filter((r) => r.status === 'PENDING').length;
  const progressPercent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  const filteredRecipients = recipients.filter((r) => {
    if (activeFilter === 'SENT') return r.status === 'SENT';
    if (activeFilter === 'FAILED') return r.status === 'FAILED' || r.status === 'SKIPPED_NO_WHATSAPP';
    if (activeFilter === 'PENDING') return r.status === 'PENDING';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800">
        
        {/* Modal Header */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {campaign?.name || 'Détails de la Campagne'}
              </h3>
              <p className="text-[10px] text-slate-400">
                Créée le {campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString('fr-FR') : '...'} • Statut: {campaign?.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Notification Alert */}
          {notice && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notice.message}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Destinataires</span>
              <strong className="text-lg font-black text-slate-900">{total}</strong>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase">Envoyés avec succès</span>
              <strong className="text-lg font-black text-emerald-700">{sent}</strong>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-[10px] text-rose-700 font-bold block uppercase">Échecs / Sans WA</span>
              <strong className="text-lg font-black text-rose-700">{failed}</strong>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">En attente</span>
              <strong className="text-lg font-black text-amber-700">{pending}</strong>
            </div>
          </div>

          {/* Progress Bar & Dispatch Controls */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-bold">Progression de l'Envoi</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">{progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Délai anti-ban actif : {campaign?.delayMinSeconds}s - {campaign?.delayMaxSeconds}s
              </span>

              <div className="flex items-center gap-2">
                {pending > 0 && campaign?.status !== 'RUNNING' && (
                  <button
                    onClick={handleStartDispatch}
                    disabled={isDispatching}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Lancer l'Envoi ({pending} restants)</span>
                      </>
                    )}
                  </button>
                )}

                {campaign?.status === 'RUNNING' && (
                  <button
                    onClick={handlePauseDispatch}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Mettre en Pause</span>
                  </button>
                )}

                {pending === 0 && total > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terminée</span>
                    </span>
                    <button
                      onClick={handleResetDispatch}
                      disabled={isDispatching}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl text-xs flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                      title="Réinitialiser tous les destinataires pour renvoyer la campagne"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réinitialiser & Relancer</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 text-xs">
              Liste des Destinataires ({filteredRecipients.length})
            </span>
            <div className="flex items-center gap-1">
              {(['ALL', 'SENT', 'FAILED', 'PENDING'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    activeFilter === filter
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'ALL' && 'Tous'}
                  {filter === 'SENT' && `Envoyés (${sent})`}
                  {filter === 'FAILED' && `Échecs (${failed})`}
                  {filter === 'PENDING' && `En attente (${pending})`}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Nom</th>
                  <th className="py-2.5 px-3">Téléphone</th>
                  <th className="py-2.5 px-3">Ville</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3">Date d'Envoi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Aucun destinataire dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{r.customer_name || 'Client'}</td>
                      <td className="py-2 px-3 font-mono">{r.phone}</td>
                      <td className="py-2 px-3">{r.city || 'Maroc'}</td>
                      <td className="py-2 px-3 text-center">
                        {r.status === 'SENT' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Envoyé ✓
                          </span>
                        )}
                        {r.status === 'FAILED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title={r.error_message}>
                            Échec
                          </span>
                        )}
                        {r.status === 'SKIPPED_NO_WHATSAPP' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Sans WhatsApp
                          </span>
                        )}
                        {r.status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-400">
                        {r.sent_at ? new Date(r.sent_at).toLocaleTimeString('fr-FR') : '—'}
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

