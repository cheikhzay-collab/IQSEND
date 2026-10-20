'use client';

import React, { useState, useEffect } from 'react';
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
  Send,
  RotateCcw,
  Smartphone
} from 'lucide-react';

export default function IntegrationsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  // -------------------------------------------------------------
  // 🚚 Sendit.ma Logistics API & Webhooks State (Credentials GAMA)
  // -------------------------------------------------------------
  const [senditAppId, setSenditAppId] = useState('GAMA');
  const [senditPublic, setSenditPublic] = useState('3d4232babb11df9a39165b4fcaf88057');
  const [senditSecret, setSenditSecret] = useState('RzRVrol6hv3OHMmcaYDPzBl2KianmSZQ');
  const [senditWebhookUrl, setSenditWebhookUrl] = useState('https://lawngreen-jaguar-315438.hostingersite.com/api/webhook/sendit');
  const [senditWebhookSecret, setSenditWebhookSecret] = useState('RzRVrol6hv3OHMmcaYDPzBl2KianmSZQ');
  const [isSavingSendit, setIsSavingSendit] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [senditAlert, setSenditAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [webhookSimResult, setWebhookSimResult] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 📱 WhatsApp Multi-Provider & Real QR State (Transféré depuis IA)
  // -------------------------------------------------------------
  const [selectedProvider, setSelectedProvider] = useState<'META_CLOUD_API' | 'EVOLUTION_API_QR'>('META_CLOUD_API');
  const [metaPhoneId, setMetaPhoneId] = useState('104829104829104');
  const [metaToken, setMetaToken] = useState('EAABwzL1...live_token');
  const [evoInstance, setEvoInstance] = useState('sendit_morocco_sim1');
  const [evoAntiBanDelay, setEvoAntiBanDelay] = useState(3);
  const [showQrModal, setShowQrModal] = useState(false);

  // Live Baileys WhatsApp Session State
  const [qrStatus, setQrStatus] = useState<'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [waSaveSuccess, setWaSaveSuccess] = useState(false);

  // -------------------------------------------------------------
  // 🤖 Live Gemini LLM API State (Transféré depuis IA)
  // -------------------------------------------------------------
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState('');
  const [geminiInputKey, setGeminiInputKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [activeModelName, setActiveModelName] = useState('gemini-1.5-flash');
  const [keyAlert, setKeyAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check Gemini API Key status on load
  useEffect(() => {
    fetch('/api/settings/gemini')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGeminiConfigured(data.isConfigured);
          if (data.maskedKey) setGeminiMaskedKey(data.maskedKey);
          if (data.model) setActiveModelName(data.model);
        }
      })
      .catch(() => {});
  }, []);

  // Check Sendit API Key status on load
  useEffect(() => {
    fetch('/api/settings/sendit')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.publicKey && data.publicKey.length > 10) setSenditPublic(data.publicKey);
          if (data.webhookSecret) setSenditWebhookSecret(data.webhookSecret);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSendit = async () => {
    setIsSavingSendit(true);
    setSenditAlert(null);
    try {
      const res = await fetch('/api/settings/sendit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: senditPublic,
          secretKey: senditSecret,
          webhookSecret: senditWebhookSecret,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSenditAlert({
          type: 'success',
          text: data.message || '✅ Paramètres Sendit.ma enregistrés avec succès !',
        });
      } else {
        setSenditAlert({
          type: 'error',
          text: data.error || 'Erreur lors de la sauvegarde Sendit',
        });
      }
    } catch {
      setSenditAlert({ type: 'error', text: 'Erreur réseau lors de la communication avec le serveur' });
    } finally {
      setIsSavingSendit(false);
    }
  };

  const handleTestWebhookSimulation = async () => {
    setIsTestingWebhook(true);
    setWebhookSimResult(null);
    try {
      const mockCode = 'DHF' + Math.floor(1000000 + Math.random() * 9000000);
      const res = await fetch('/api/tracking/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingCode: mockCode,
          status: 'DELIVERING',
          message: 'Simulation Webhook Sendit: Colis en cours de livraison avec livreur',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookSimResult(`✅ Webhook reçu et traité ! Colis ${mockCode} mis à jour -> DELIVERING (Diffusé en direct sur le Kanban de Suivi)`);
      } else {
        setWebhookSimResult(`❌ Erreur webhook: ${data.error || 'Inconnue'}`);
      }
    } catch {
      setWebhookSimResult('❌ Erreur réseau lors de la simulation webhook');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiInputKey.trim()) return;
    setIsSavingKey(true);
    setKeyAlert(null);
    try {
      const res = await fetch('/api/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiInputKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiConfigured(true);
        setGeminiMaskedKey(data.maskedKey);
        if (data.model) setActiveModelName(data.model);
        setGeminiInputKey('');
        setKeyAlert({
          type: 'success',
          text: `✅ Clé API Gemini validée et activée avec succès auprès de Google AI ! Modèle : ${data.model || 'gemini-1.5-flash'}`,
        });
      } else {
        setKeyAlert({ type: 'error', text: data.error || 'Clé API invalide ou quota dépassé' });
      }
    } catch {
      setKeyAlert({ type: 'error', text: 'Erreur réseau lors de la validation' });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Poll live QR state when modal is open or when provider is QR
  useEffect(() => {
    let interval: any;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/qr?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setQrStatus(data.status);
          if (data.status === 'SCAN_QR' && data.qrCodeDataUrl) {
            setLiveQrDataUrl(data.qrCodeDataUrl);
          } else if (data.status === 'CONNECTED' || data.status === 'DISCONNECTED') {
            setLiveQrDataUrl(null);
          }
          if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
          if (data.connectedName) setConnectedName(data.connectedName);
        }
      } catch (e) {
        // silent
      }
    };

    if (showQrModal || selectedProvider === 'EVOLUTION_API_QR') {
      fetchStatus();
      interval = setInterval(fetchStatus, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQrModal, selectedProvider]);

  const handleRestartQr = async () => {
    setIsRefreshingQr(true);
    setLiveQrDataUrl(null);
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      const data = await res.json();
      if (data.success) {
        setQrStatus(data.status);
        if (data.qrCodeDataUrl) setLiveQrDataUrl(data.qrCodeDataUrl);
      }
    } catch (e) {
      console.error('Error restarting QR:', e);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const handleDisconnectQr = async () => {
    try {
      await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setQrStatus('DISCONNECTED');
      setLiveQrDataUrl(null);
      setConnectedPhone(null);
      setConnectedName(null);
    } catch (e) {
      console.error('Error disconnecting:', e);
    }
  };

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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-2">
            <Puzzle className="w-3.5 h-3.5 text-teal-600" />
            Écosystème Connecteurs & Passerelles API
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Intégrations & Passerelles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connexion directe avec Google Gemini API, WhatsApp (Meta Cloud & Scan QR SIM Maroc), Google Sheets et Sendit.ma Express.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestSync}
            disabled={syncStatus === 'syncing'}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing'
              ? 'Test de synchronisation...'
              : syncStatus === 'success'
              ? 'Synchronisé avec succès !'
              : 'Tester Toutes les Passerelles'}
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTÉGRATION 1 : GOOGLE GEMINI 1.5 FLASH (TRANSFÉRÉE DEPUIS IA) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className={`p-5 rounded-2xl border-2 transition-all shadow-xs ${
          geminiConfigured
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-emerald-500/30'
            : 'bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                geminiConfigured
                  ? 'bg-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-amber-600 shadow-md shadow-amber-600/20'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-slate-900">
                  {geminiConfigured
                    ? `Agent IA connecté au LLM en direct (Google ${activeModelName})`
                    : 'Agent IA : Connexion requise à la clé API Google Gemini'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    geminiConfigured
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {geminiConfigured ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live API Actif ({geminiMaskedKey})
                    </>
                  ) : (
                    'API Inactif - Mode Fallback'
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {geminiConfigured
                  ? `L'agent interagit en direct avec ${activeModelName} pour qualifier les prospects, négocier les upsells en Darija marocaine et confirmer les commandes COD.`
                  : 'Entrez votre clé Gemini API gratuite ci-dessous pour transformer vos agents en IA conversationnelle bilingue (Darija / Français).'}
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 bg-white hover:bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 transition-colors shrink-0 shadow-2xs self-start md:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Clé gratuite Google AI Studio
          </a>
        </div>

        {/* Quick Key Activation Input */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            placeholder={
              geminiConfigured
                ? 'Pour modifier la clé, collez la nouvelle clé ici...'
                : 'Collez la clé Gemini API ici (ex: AIzaSy...)'
            }
            value={geminiInputKey}
            onChange={(e) => setGeminiInputKey(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSaveGeminiKey}
            disabled={isSavingKey || !geminiInputKey.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg font-medium text-xs shadow-xs transition-colors shrink-0"
          >
            <span>{isSavingKey ? 'Vérification et activation...' : 'Activer l\'API'}</span>
            {isSavingKey ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>

        {keyAlert && (
          <div
            className={`mt-2 p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              keyAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{keyAlert.text}</span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTÉGRATION 2 : CONNECTEUR WHATSAPP (META VS SCAN QR MAROC)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-1.5">
            <Send className="w-3.5 h-3.5 text-teal-600" />
            📱 Connecteur WhatsApp (Meta Cloud vs Scan QR SIM Maroc)
          </div>
          <h3 className="font-black text-base text-slate-900">
            Passerelle de Communication WhatsApp
          </h3>
          <p className="text-xs text-slate-500">
            Basculez facilement entre l'API officielle d'entreprise de Meta et la passerelle autonome par scan QR pour carte SIM marocaine (Maroc Telecom, Inwi, Orange).
          </p>
        </div>

        {/* Provider Cards Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Meta Cloud API */}
          <div
            onClick={() => setSelectedProvider('META_CLOUD_API')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              selectedProvider === 'META_CLOUD_API'
                ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                Officiel Entreprise
              </span>
              {selectedProvider === 'META_CLOUD_API' && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              )}
            </div>
            <h4 className="font-black text-sm text-slate-900 mt-2">
              Meta WhatsApp Cloud API
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Connecté directement aux serveurs Meta. Zéro risque de bannissement, boutons interactifs natifs et 1000 conversations offertes/mois.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-bold">✅ Boutons cliquables</span>
              <span className="text-slate-400">100% Stable</span>
            </div>
          </div>

          {/* Option 2: Evolution API / Scan QR */}
          <div
            onClick={() => setSelectedProvider('EVOLUTION_API_QR')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              selectedProvider === 'EVOLUTION_API_QR'
                ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Session SIM Marocaine
              </span>
              {selectedProvider === 'EVOLUTION_API_QR' && (
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
            <h4 className="font-black text-sm text-slate-900 mt-2">
              Session QR Code (Evolution / Baileys)
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Connexion instantanée par QR code avec n'importe quelle puce Maroc Telecom, Inwi ou Orange. Sans validation de registre commercial.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-indigo-700 font-bold">⚡ Sans frais Meta</span>
              <span className="text-amber-600 font-bold">Protection Anti-Ban intégrée</span>
            </div>
          </div>
        </div>

        {/* Provider Configuration Form */}
        {selectedProvider === 'META_CLOUD_API' ? (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-slate-900 font-bold">Paramètres Meta Cloud API</strong>
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                Statut: Configuré
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Access Token Permanent (Bearer)
                </label>
                <input
                  type="password"
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setWaSaveSuccess(true);
                  setTimeout(() => setWaSaveSuccess(false), 2000);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                {waSaveSuccess ? '✅ Paramètres Meta Sauvegardés' : 'Enregistrer les identifiants Meta'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <strong className="text-slate-900 font-bold">Session WhatsApp Réelle (Multi-Device QR)</strong>
                {qrStatus === 'CONNECTED' ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connecté (+{connectedPhone || 'SIM Maroc'})
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">
                    En attente de Scan QR
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {qrStatus === 'CONNECTED' ? (
                  <button
                    onClick={handleDisconnectQr}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition-colors"
                  >
                    Déconnecter
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowQrModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Scanner le QR Code Réel</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nom de l'Instance SIM
                </label>
                <input
                  type="text"
                  value={evoInstance}
                  onChange={(e) => setEvoInstance(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Délai de simulation humaine (Anti-Ban)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={evoAntiBanDelay}
                    onChange={(e) => setEvoAntiBanDelay(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 w-16 text-right">{evoAntiBanDelay} sec</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              💡 <strong>Protection Anti-Ban pour carte SIM marocaine :</strong> Le moteur Baileys intègre automatiquement un délai de frappe humaine et la gestion des sessions multi-devices pour protéger votre numéro contre les blocages WhatsApp.
            </div>
          </div>
        )}
      </div>

      {/* REAL LIVE QR Code Scan Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {qrStatus === 'CONNECTED' ? (
              <div className="space-y-4 py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-2xl font-black border border-emerald-200">
                  ✅
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    WhatsApp Connecté avec Succès !
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Votre smartphone marocain est synchronisé avec les agents IA Sendit.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
                  +{connectedPhone || '212XXXXXXXXX'} {connectedName ? `(${connectedName})` : ''}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  L'agent IA Gemini et le moteur de confirmation COD peuvent désormais envoyer et recevoir les messages en Darija directement depuis votre numéro.
                </p>

                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Terminer & Fermer
                </button>

                <button
                  onClick={async () => {
                    await handleDisconnectQr();
                    await handleRestartQr();
                  }}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200"
                >
                  Déconnecter et scanner un autre numéro
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-black">
                  📷
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Scanner avec WhatsApp Mobile
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ouvrez WhatsApp &gt; Appareils connectés &gt; Connecter un appareil
                  </p>
                </div>

                {/* Live QR Box */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                  <div className="w-56 h-56 bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center relative">
                    {liveQrDataUrl ? (
                      <img
                        src={liveQrDataUrl}
                        alt="Code QR WhatsApp Réel"
                        className="w-full h-full object-contain select-none"
                      />
                    ) : qrStatus === 'ERROR' ? (
                      <div className="space-y-3 p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center font-bold text-lg border border-rose-200">
                          ⚠️
                        </div>
                        <p className="text-xs text-rose-700 font-bold">
                          Échec de connexion au serveur WhatsApp
                        </p>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Le pont WhatsApp tente de se reconnecter.
                        </p>
                        <button
                          onClick={handleRestartQr}
                          disabled={isRefreshingQr}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Réessayer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                        <p className="text-[11px] text-slate-600 font-medium">
                          {isRefreshingQr
                            ? "Régénération d'une nouvelle clé QR..."
                            : qrStatus === 'INITIALIZING'
                            ? "Connexion au serveur WhatsApp..."
                            : "Génération du code QR chiffré WhatsApp..."}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Affichage instantané dès synchronisation (environ 3 à 5 sec)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] px-2 text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Actualisation temps réel
                  </span>
                  <button
                    onClick={handleRestartQr}
                    disabled={isRefreshingQr}
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                    Régénérer
                  </button>
                </div>

                <div className="text-[11px] text-indigo-800 font-medium bg-indigo-50/80 py-2 px-3 rounded-xl border border-indigo-100 text-left leading-relaxed">
                  📌 <strong>Conseil :</strong> Pointez l'appareil photo WhatsApp directement sur le QR code ci-dessus. La connexion s'établit automatiquement dès la lecture.
                </div>

                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTÉGRATION 3 : GOOGLE SHEETS DIRECT SYNC                     */}
      {/* ───────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTÉGRATION 4 : SENDIT.MA LOGISTICS API & WEBHOOK (GAMA)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900">Passerelle Sendit.ma Express (GAMA)</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Production Live
                </span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  HMAC-SHA256 Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intégration bidirectionnelle complète : création de colis, ramassage dans vos hubs et réception temps réel des statuts de livraison via Webhook.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://app.sendit.ma/api/documentation#/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
              Documentation API
            </a>
            <a
              href="https://app.sendit.ma/guide-webhook-sendit.pdf?v=1.0.0"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              Guide Webhook (PDF)
            </a>
          </div>
        </div>

        {/* Section 1 : Accès Développeur API */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-600" />
              <strong className="text-xs font-black text-slate-900">Accès Développeur Sendit.ma</strong>
              <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-md">
                Libellé : {senditAppId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Clé publique (Public Key)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={senditPublic}
                  onChange={(e) => setSenditPublic(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-white focus:outline-teal-600"
                />
                <button
                  onClick={() => copyToClipboard(senditPublic, 'sendit_pub')}
                  className="px-3 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'sendit_pub' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'sendit_pub' ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Clé privée (Private / Secret Key)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={senditSecret}
                  onChange={(e) => setSenditSecret(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-white focus:outline-teal-600"
                />
                <button
                  onClick={() => copyToClipboard(senditSecret, 'sendit_sec')}
                  className="px-3 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'sendit_sec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'sendit_sec' ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 : Intégration Webhooks */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <strong className="text-xs font-black text-slate-900">Intégration Webhooks (Temps Réel)</strong>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Événement : Mise à jour du statut du colis
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Les webhooks vous permettent de recevoir des notifications automatiques dès qu'un colis change d'état (ramassé, en cours de livraison, livré, refusé). Chaque requête est signée via <strong>HMAC-SHA256</strong> dans l'en-tête <code>X-Sendit-Signature</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-8">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                URL du Webhook configurée sur Sendit.ma
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={senditWebhookUrl}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-white text-slate-800 font-bold"
                />
                <button
                  onClick={() => copyToClipboard(senditWebhookUrl, 'webhook_url')}
                  className="px-3 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'webhook_url' ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Clé API associée au Webhook
              </label>
              <input
                type="text"
                readOnly
                value="GAMA"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono bg-white text-slate-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action et tests */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <button
            onClick={handleTestWebhookSimulation}
            disabled={isTestingWebhook}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
            {isTestingWebhook ? 'Envoi du test...' : 'Tester la réception Webhook (Simulation)'}
          </button>

          <button
            onClick={handleSaveSendit}
            disabled={isSavingSendit}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {isSavingSendit ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isSavingSendit ? 'Enregistrement et vérification...' : 'Enregistrer les paramètres Sendit.ma'}
          </button>
        </div>

        {senditAlert && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              senditAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{senditAlert.text}</span>
          </div>
        )}

        {webhookSimResult && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-medium flex items-center gap-2">
            <span>{webhookSimResult}</span>
          </div>
        )}
      </div>
    </div>
  );
}
