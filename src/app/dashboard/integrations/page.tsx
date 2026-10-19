'use client';

import React, { useState } from 'react';
import {
  Puzzle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Key,
  FileSpreadsheet,
  Truck,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Sliders
} from 'lucide-react';

export default function IntegrationsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  const [senditToken, setSenditToken] = useState('snd_live_948293104829103982');
  const [geminiKey, setGeminiKey] = useState('AIzaSyD-7389204918230918230');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-2">
            <Puzzle className="w-3.5 h-3.5 text-teal-600" />
            Écosystème Connecteurs & Passerelles API
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Intégrations & Webhooks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connexion directe avec Google Sheets, Sendit.ma, Meta WhatsApp Cloud API et Google Gemini 1.5 Flash.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestSync}
            disabled={syncStatus === 'syncing'}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing' ? 'Test de synchronisation...' : syncStatus === 'success' ? 'Synchronisé avec succès !' : 'Tester Toutes les API'}
          </button>
        </div>
      </div>

      {/* Primary Integration 1: Google Sheets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Google Sheets Direct Sync</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connecté & Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque ligne ajoutée dans votre feuille Google Sheet tombe instantanément dans le statut "En attente".
              </p>
            </div>
          </div>

          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ouvrir la feuille
          </a>
        </div>

        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Lien partagé de votre feuille Google Sheet (Accès en lecture publique ou avec lien)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-slate-50/50 focus:outline-teal-600"
            />
            <button
              onClick={() => copyToClipboard(googleSheetUrl, 'gsheet')}
              className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5"
            >
              {copiedKey === 'gsheet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'gsheet' ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">
            <strong>Colonnes reconnues :</strong> Nom Client, Téléphone (06...), Ville, Adresse, Produit, Prix (MAD).
          </span>
          <span className="text-teal-700 font-bold shrink-0">
            Dernière vérification: il y a 2 min (4 nouveaux leads traités)
          </span>
        </div>
      </div>

      {/* Integration 2: Sendit.ma Logistics API */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Passerelle Sendit.ma Express</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Création automatique de colis, ramassage dans vos hubs et synchronisation des statuts de livraison.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Token d'accès Sendit API (Bearer)
            </label>
            <input
              type="password"
              value={senditToken}
              onChange={(e) => setSenditToken(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-slate-50/50 focus:outline-teal-600"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              URL Webhook de Réception des Événements
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="https://sendit.ma/api/webhooks/sendit"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-slate-100 text-slate-600"
              />
              <button
                onClick={() => copyToClipboard('https://sendit.ma/api/webhooks/sendit', 'webhook')}
                className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0"
              >
                {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration 3: Meta WhatsApp Cloud API */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">WhatsApp Cloud API (Meta Business)</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Boutons Interactifs Approuvés
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Numéro d’expéditeur officiel certifié pour l'envoi des messages de confirmation et de géolocalisation.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            ID: +212 654-998877
          </span>
        </div>
      </div>

      {/* Integration 4: Google Gemini 1.5 Flash */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Intelligence Artificielle Gemini 1.5 Flash</h3>
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" /> Prompt Darija Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compréhension du dialecte marocain (Darija), négociation d'upsell et transcription audio par Whisper.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Clé API Google AI Studio / Gemini
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-slate-50/50 focus:outline-teal-600"
          />
        </div>
      </div>
    </div>
  );
}
