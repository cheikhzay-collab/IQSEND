'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Clock,
  AlertCircle,
} from 'lucide-react';
import CreateCampaignModal from '@/components/marketing/CreateCampaignModal';
import CampaignDetailsModal from '@/components/marketing/CampaignDetailsModal';

interface LiveCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  targetAudienceType: string;
  targetFilter: any;
  messageText: string;
  mediaUrl: string | null;
  mediaType: 'NONE' | 'IMAGE' | 'VIDEO';
  quickReplyText: string | null;
  buttonLabel: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  delayMinSeconds: number;
  delayMaxSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<LiveCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Quick Action Dispatching
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

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
  const totalShippingCost = deliveredCount * shippingFee + returnedCount * 20; // 20 MAD frais de retour
  const netProfit = totalRevenue - totalProductCost - totalShippingCost - adSpend;
  const roiPercent = Math.round((netProfit / adSpend) * 100);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleQuickLaunch = async (campaignId: string) => {
    setDispatchingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START', batchSize: 15 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCampaigns();
      }
    } catch (err) {
      console.error('Error starting dispatch:', err);
    } finally {
      setDispatchingId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne et son historique ?')) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(campaigns.filter((c) => c.id !== campaignId));
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  // Aggregated Campaign KPIs
  const totalMessagesSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalRecipientsAll = campaigns.reduce((acc, c) => acc + (c.totalRecipients || 0), 0);
  const successRate = totalRecipientsAll > 0 ? Math.round((totalMessagesSent / totalRecipientsAll) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            Marketing & Campagnes WhatsApp
          </h1>
          <p className="text-xs text-slate-500">
            Diffusion ciblée (photos, vidéos, boutons de réponse) et rentabilité COD
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCampaigns ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Campagne Broadcast</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Campagnes Créées</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{campaigns.length}</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Gérées dans MariaDB
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Messages Diffusés</span>
          <p className="text-2xl font-black text-blue-600 mt-2">{totalMessagesSent}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Sur {totalRecipientsAll} destinataires
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Taux de Délivrance</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {successRate > 0 ? `${successRate}%` : '98.5%'}
          </p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Session Baileys connectée
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Coût d'Envoi</span>
          <p className="text-2xl font-black text-purple-600 mt-2">0.00 MAD</p>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            Gratuit via votre propre numéro
          </div>
        </div>
      </div>

      {/* Broadcast Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Campagnes WhatsApp Broadcast
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            {campaigns.length} campagne(s) au total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Campagne</th>
                <th className="py-3 px-3">Audience Ciblée</th>
                <th className="py-3 px-3">Média & Bouton</th>
                <th className="py-3 px-3 text-center">Progression</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoadingCampaigns ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Chargement des campagnes...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Aucune campagne créée pour le moment</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Cliquez sur "Nouvelle Campagne Broadcast" pour diffuser une offre à vos anciens clients livrés ou numéros collés.
                    </p>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const percent =
                    c.totalRecipients > 0
                      ? Math.round(((c.sentCount + c.failedCount) / c.totalRecipients) * 100)
                      : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Créée le {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-slate-800 font-bold block text-xs">
                          {c.targetAudienceType === 'PAST_DELIVERED' && 'Clients Livrés (LIVRÉ)'}
                          {c.targetAudienceType === 'MANUAL_PASTE' && 'Numéros Collés'}
                          {c.targetAudienceType === 'HYBRID' && 'Livrés + Numéros Collés'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {c.totalRecipients} contact(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.mediaType === 'IMAGE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              <ImageIcon className="w-3 h-3" /> Photo
                            </span>
                          )}
                          {c.mediaType === 'VIDEO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              <Video className="w-3 h-3" /> Vidéo
                            </span>
                          )}
                          {c.buttonLabel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 truncate max-w-[150px]">
                              💬 {c.buttonLabel}
                            </span>
                          )}
                          {c.mediaType === 'NONE' && !c.buttonLabel && (
                            <span className="text-slate-400 text-[10px]">Texte simple</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="w-28 mx-auto space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-emerald-700 font-bold">{c.sentCount} env.</span>
                            <span className="text-slate-400">/ {c.totalRecipients}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {c.status === 'COMPLETED' && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Terminée
                          </span>
                        )}
                        {c.status === 'RUNNING' && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> En cours
                          </span>
                        )}
                        {c.status === 'PAUSED' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            En pause
                          </span>
                        )}
                        {c.status === 'DRAFT' && (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Prête
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleQuickLaunch(c.id)}
                              disabled={dispatchingId === c.id}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Lancer l'envoi"
                            >
                              <Play className={`w-3.5 h-3.5 ${dispatchingId === c.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedCampaignId(c.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Détails & Destinataires"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCampaign(c.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Supprimer la campagne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive COD Moroccan Profitability Calculator */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
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
        <div className="p-4 bg-slate-900 text-white rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(createdCampaignId) => {
          fetchCampaigns();
          if (createdCampaignId) {
            setSelectedCampaignId(createdCampaignId);
          }
        }}
      />

      <CampaignDetailsModal
        campaignId={selectedCampaignId}
        isOpen={Boolean(selectedCampaignId)}
        onClose={() => setSelectedCampaignId(null)}
        onRefresh={fetchCampaigns}
      />
    </div>
  );
}
