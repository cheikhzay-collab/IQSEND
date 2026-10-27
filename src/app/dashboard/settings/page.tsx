'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Key,
  Shield,
  Smartphone,
  Webhook,
  Bot,
  Truck,
  CheckCircle,
  Copy,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Check,
  AlertTriangle,
  Play,
  Database,
  Server,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  Send,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  X
} from 'lucide-react';

export default function SettingsPage() {
  // Sendit.ma Logistics State
  const [senditPublicKey, setSenditPublicKey] = useState('');
  const [senditSecretKey, setSenditSecretKey] = useState('');
  const [senditWebhookSecret, setSenditWebhookSecret] = useState('iqsend_webhook_secret_2025');
  const [isSenditConfigured, setIsSenditConfigured] = useState(false);
  const [maskedSenditKey, setMaskedSenditKey] = useState('');
  const [isTestingSendit, setIsTestingSendit] = useState(false);
  const [isSavingSendit, setIsSavingSendit] = useState(false);
  const [senditMessage, setSenditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [originUrl, setOriginUrl] = useState('');

  const [geminiKey, setGeminiKey] = useState('');
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [evolutionUrl, setEvolutionUrl] = useState('https://whatsapp.yourdomain.com');
  const [rotationActive, setRotationActive] = useState(true);

  // Hostinger MySQL Database state
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [dbMessage, setDbMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Sara Live WhatsApp Integration state
  const [saraWaConfig, setSaraWaConfig] = useState<{
    enabled: boolean;
    mode: 'sara_live' | 'classic_agent' | 'disabled';
    voiceEnabled: boolean;
    visionEnabled: boolean;
    autoConfirmOrders: boolean;
    autoSendProductImages: boolean;
  }>({
    enabled: true,
    mode: 'sara_live',
    voiceEnabled: true,
    visionEnabled: true,
    autoConfirmOrders: true,
    autoSendProductImages: true,
  });
  const [isUpdatingSaraWa, setIsUpdatingSaraWa] = useState(false);

  useEffect(() => {
    fetch('/api/sara-live/settings')
      .then(r => r.json())
      .then(d => { if (d.success && d.config) setSaraWaConfig(d.config); })
      .catch(() => {});
  }, []);

  const handleToggleSaraWa = async (patch: Partial<typeof saraWaConfig>) => {
    setIsUpdatingSaraWa(true);
    try {
      const res = await fetch('/api/sara-live/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setSaraWaConfig(data.config);
        showToast('Paramètres Sara Live WhatsApp mis à jour avec succès !');
      }
    } catch {
      showToast('Erreur lors de la mise à jour des paramètres Sara WhatsApp');
    } finally {
      setIsUpdatingSaraWa(false);
    }
  };

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  const fetchDbStatus = () => {
    fetch('/api/database/init')
      .then((res) => res.json())
      .then((data) => setDbStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleInitDb = async (reset = false) => {
    setIsInitializingDb(true);
    setDbMessage(null);
    try {
      const res = await fetch('/api/database/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset }),
      });
      const data = await res.json();
      if (data.success) {
        setDbMessage({
          type: 'success',
          text: reset
            ? '✅ Jeu de données COD rechargé avec succès sur Hostinger Cloud MySQL (15 commandes réparties sur les 4 étapes du cycle) !'
            : '✅ Base de données Hostinger MySQL initialisée avec succès ! Toutes les tables COD et données sont prêtes.',
        });
        fetchDbStatus();
      } else {
        setDbMessage({
          type: 'error',
          text: data.error || 'Échec de l initialisation de la base de données',
        });
      }
    } catch (e: any) {
      setDbMessage({ type: 'error', text: 'Erreur réseau lors de l initialisation de la base' });
    } finally {
      setIsInitializingDb(false);
    }
  };

  // Database Wipe State & Handlers
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipeTarget, setWipeTarget] = useState<'OPERATIONAL' | 'FULL' | 'CATALOG'>('OPERATIONAL');
  const [wipeConfirmationInput, setWipeConfirmationInput] = useState('');
  const [isWipingDb, setIsWipingDb] = useState(false);
  const [wipeSummary, setWipeSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const openWipeModal = (target: 'OPERATIONAL' | 'FULL' | 'CATALOG') => {
    setWipeTarget(target);
    setWipeConfirmationInput('');
    setWipeModalOpen(true);
    setIsLoadingSummary(true);
    fetch('/api/database/wipe')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWipeSummary(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSummary(false));
  };

  const handleExecuteWipe = async () => {
    setIsWipingDb(true);
    try {
      const res = await fetch('/api/database/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: wipeTarget,
          confirmation: wipeConfirmationInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || '✅ تم مسح وتفريغ قاعدة البيانات بنجاح!');
        setDbMessage({
          type: 'success',
          text: data.message,
        });
        setWipeModalOpen(false);
        fetchDbStatus();
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch {
      alert('Erreur réseau lors de la suppression de la base');
    } finally {
      setIsWipingDb(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings/gemini')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsGeminiConfigured(data.isConfigured);
          if (data.maskedKey) setMaskedKey(data.maskedKey);
        }
      })
      .catch(() => {});

    // Charger les paramètres Sendit
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
    fetch('/api/settings/sendit')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsSenditConfigured(data.isConfigured);
          if (data.publicKey) setMaskedSenditKey(data.publicKey);
          if (data.webhookSecret) setSenditWebhookSecret(data.webhookSecret);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSendit = async () => {
    if (!senditPublicKey.trim() || !senditSecretKey.trim()) {
      setSenditMessage({
        type: 'error',
        text: 'Veuillez saisir la Clé Publique (Public Key) et la Clé Secrète (Secret Key) fournies par Sendit.ma.',
      });
      return;
    }
    setIsSavingSendit(true);
    setSenditMessage(null);
    try {
      const res = await fetch('/api/settings/sendit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: senditPublicKey.trim(),
          secretKey: senditSecretKey.trim(),
          webhookSecret: senditWebhookSecret.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSenditConfigured(true);
        setMaskedSenditKey(data.maskedKey);
        setSenditSecretKey('');
        setSenditMessage({
          type: 'success',
          text: data.message || '✅ Paramètres Sendit.ma enregistrés et validés avec succès !',
        });
        showToast('Configuration Sendit.ma enregistrée !');
      } else {
        setSenditMessage({
          type: 'error',
          text: data.error || 'Échec de la validation des identifiants Sendit',
        });
      }
    } catch {
      setSenditMessage({ type: 'error', text: 'Erreur réseau lors de la communication avec Sendit' });
    } finally {
      setIsSavingSendit(false);
    }
  };

  const handleTestSendit = async () => {
    if (!isSenditConfigured && (!senditPublicKey.trim() || !senditSecretKey.trim())) {
      setSenditMessage({
        type: 'error',
        text: 'Remplissez la Clé Publique et la Clé Secrète pour lancer le test de connexion.',
      });
      return;
    }
    setIsTestingSendit(true);
    setSenditMessage(null);
    try {
      const res = await fetch('/api/settings/sendit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: senditPublicKey.trim(),
          secretKey: senditSecretKey.trim(),
          testOnly: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSenditMessage({
          type: 'success',
          text: data.message || '✅ Test réussi ! Connexion active avec l\'API Sendit.ma.',
        });
      } else {
        setSenditMessage({
          type: 'error',
          text: data.error || 'Échec du test de connexion Sendit',
        });
      }
    } catch {
      setSenditMessage({ type: 'error', text: 'Erreur réseau lors du test' });
    } finally {
      setIsTestingSendit(false);
    }
  };

  const handleSimulateWebhook = async (status: string) => {
    try {
      const res = await fetch('/api/tracking/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Événement Sendit "${status}" diffusé en direct !`);
      }
    } catch {
      showToast('Erreur lors de la simulation webhook');
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setGeminiMessage({ type: 'error', text: 'Veuillez saisir votre clé API Google Gemini (commence par AIza...)' });
      return;
    }
    setIsSavingGemini(true);
    setGeminiMessage(null);
    try {
      const res = await fetch('/api/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsGeminiConfigured(true);
        setMaskedKey(data.maskedKey);
        setGeminiKey('');
        setGeminiMessage({
          type: 'success',
          text: '✅ Clé API Gemini validée avec succès ! Le bot utilise désormais le modèle LLM en direct.',
        });
      } else {
        setGeminiMessage({
          type: 'error',
          text: data.error || 'Échec de la validation de la clé API',
        });
      }
    } catch (err: any) {
      setGeminiMessage({ type: 'error', text: 'Erreur réseau lors de la validation' });
    } finally {
      setIsSavingGemini(false);
    }
  };

  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleSaveAllSettings = async () => {
    setIsSavingAll(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SENDIT_WEBHOOK_SECRET: senditWebhookSecret,
          WHATSAPP_ROTATION_ACTIVE: String(rotationActive),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Tous les paramètres de la plateforme sont enregistrés dans MySQL !');
      }
    } catch {
      showToast('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl relative">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Paramètres & Intégrations</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connexions Google Sheets, Sendit.ma, Google Gemini, passerelle WhatsApp et gestion COD
          </p>
        </div>

        <button
          onClick={handleSaveAllSettings}
          disabled={isSavingAll}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          {isSavingAll ? 'Enregistrement...' : 'Enregistrer les Paramètres'}
        </button>
      </div>

      {/* 0. GOOGLE SHEETS AUTOMATIC INTEGRATION */}
      <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm bg-gradient-to-br from-white via-white to-emerald-50/20">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                Intégration Google Sheets
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Actif • Réception directe en confirmation
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Chaque commande ajoutée à votre Google Sheet arrive automatiquement dans l'étape 1 (En attente de confirmation).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Webhook Endpoint */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              URL Webhook de Réception (Google Sheets Webhook URL) :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value="https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets"
                className="flex-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets');
                  showToast("URL Webhook copiée dans le presse-papier !");
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copier l'URL
              </button>
            </div>
          </div>

          {/* Apps Script Guide & Code */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Script Google Apps Script (Extensions &gt; Apps Script) :
              </span>
              <button
                onClick={() => {
                  const script = `function onEdit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e ? e.range.getRow() : sheet.getLastRow();
  if (row <= 1) return;

  var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var payload = {
    name: data[1] || data[0],
    phone: data[2] || "",
    city: data[3] || "Casablanca",
    address: data[4] || "",
    product: data[5] || "Pack COD",
    quantity: data[6] || 1,
    price: data[7] || 299,
    notes: data[8] || "Google Sheets"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch("https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets", options);
  } catch (err) {
    Logger.log(err.toString());
  }
}`;
                  navigator.clipboard.writeText(script);
                  showToast('Code Apps Script copié dans le presse-papier !');
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copier le script Code.gs
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ouvrez votre feuille Google Sheets &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong>, collez ce code et ajoutez un déclencheur (Trigger) sur modification ou soumission de formulaire.
            </p>
          </div>

          {/* Test Simulation Button */}
          <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <div>
              <span className="font-bold text-emerald-950 block">Tester la Réception d'une Commande Test</span>
              <span className="text-[11px] text-emerald-700">
                Simule l'arrivée instantanée d'une commande COD depuis Google Sheets vers l'étape de confirmation.
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  const testOrder = {
                    name: 'Youssef El Amrani',
                    phone: '0661998877',
                    city: 'Marrakech',
                    address: 'Gueliz, Imm. Atlas 6',
                    product: 'Montre Homme Chrono Luxe',
                    quantity: 1,
                    price: 349,
                    notes: 'Test Google Sheets'
                  };
                  const res = await fetch('/api/webhooks/google-sheets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testOrder)
                  });
                  const json = await res.json();
                  if (json.success) {
                    showToast(`Commande test ${json.orderNumber} créée avec succès dans "En attente de confirmation" !`);
                  }
                } catch {
                  showToast('Erreur lors de la simulation de commande Google Sheets');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Simuler un envoi Test
            </button>
          </div>
        </div>
      </div>

      {/* 1. SENDIT.MA LOGISTICS SUMMARY CARD (DÉDOUBLONNÉ) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs bg-gradient-to-br from-white via-white to-blue-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-900">Passerelle Logistique Sendit.ma</h2>
                {isSenditConfigured ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connectée (517 Villes)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Non configurée
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                La configuration des clés API, Webhooks et tests est désormais centralisée dans la page <strong>Intégrations</strong>.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/integrations#sendit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs shrink-0"
          >
            <span>Gérer l'intégration Sendit</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. GOOGLE GEMINI AI CONFIG */}
      <div className="bg-white border-2 border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-sm bg-gradient-to-br from-white via-white to-purple-50/20">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                Intelligence Artificielle Google Gemini 1.5 Flash (API)
                {isGeminiConfigured ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    API Active en Direct
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Clé API Requise
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                Gère les réponses intelligentes en Darija, le catalogue produits, le suivi des colis par téléphone et la création de commandes.
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 bg-purple-100/70 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Obtenir une clé gratuite (Google AI Studio)
          </a>
        </div>

        <div className="space-y-3 text-xs">
          {/* Current Status Info */}
          {isGeminiConfigured && (
            <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Clé API enregistrée et opérationnelle : <strong className="font-mono text-emerald-800">{maskedKey}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                gemini-1.5-flash
              </span>
            </div>
          )}

          {/* Key Input */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isGeminiConfigured ? 'Remplacer ou mettre à jour la clé API Gemini :' : 'Collez votre clé API Google Gemini :'}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Ex: AIzaSyD39kL89_Z1xxxxxxxxxxxxxxxxxxxxxx"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              <button
                onClick={handleSaveGeminiKey}
                disabled={isSavingGemini}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-xs"
              >
                {isSavingGemini ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Validation Google AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Valider & Activer l'API
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alert Message */}
          {geminiMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                geminiMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {geminiMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{geminiMessage.text}</span>
            </div>
          )}

          {/* Features Enabled by Gemini API */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                📦 Catalogue Produits
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Présente les prix, photos, offres bundle et détails en Darija fluide.
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                🔍 Suivi par Téléphone
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Vérifie l'état d'expédition dès que le client donne son numéro de téléphone.
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                ✍️ Prise de Commandes
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Enregistre automatiquement les nouvelles commandes en direct dans le tableau de bord.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 SARA LIVE — ROBOT COMMERCIAL WHATSAPP & PARAMÈTRES ACTIVATION */}
      <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm bg-gradient-to-br from-white via-white to-emerald-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs text-lg">
              🤖
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                سارة لايف — ربط الواتساب وإعدادات التشغيل والإيقاف (Sara Live WhatsApp Bot)
                {saraWaConfig.enabled && saraWaConfig.mode === 'sara_live' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    مربوطة ونشطة بالواتساب ⚡
                  </span>
                ) : saraWaConfig.enabled && saraWaConfig.mode === 'classic_agent' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    الوكيل الكلاسيكي مفعل
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    ⏸️ الرد الآلي متوقف (يدوي)
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                التحكم في تفعيل أو إيقاف استجابة سارة لايف الآلية للرسائل، الصور، والملاحظات الصوتية الواردة عبر واتساب.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleSaraWa({ enabled: !saraWaConfig.enabled })}
              disabled={isUpdatingSaraWa}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 ${
                saraWaConfig.enabled
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isUpdatingSaraWa ? '⏳ جاري الحفظ...' : saraWaConfig.enabled ? '⏸️ إيقاف الربط بالواتساب' : '▶️ تشغيل سارة على الواتساب'}
            </button>
            <Link
              href="/dashboard/sara-live"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              تجربة المحادثة ↗
            </Link>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            وضع الذكاء الاصطناعي النشط للرد على رسائل الواتساب:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleToggleSaraWa({ mode: 'sara_live', enabled: true })}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                saraWaConfig.mode === 'sara_live' && saraWaConfig.enabled
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>⚡ سارة لايف المتكاملة (موصى به)</span>
                {saraWaConfig.mode === 'sara_live' && saraWaConfig.enabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                صوت + صورة + بيع وإقناع بالدارجة + كتالوج المنتجات وتتبع الطلبات مباشرة.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleToggleSaraWa({ mode: 'classic_agent', enabled: true })}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                saraWaConfig.mode === 'classic_agent' && saraWaConfig.enabled
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>🤖 الوكيل الكلاسيكي (Sarah)</span>
                {saraWaConfig.mode === 'classic_agent' && saraWaConfig.enabled && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                تأكيد الطلبيات والعناوين السابقة فقط دون تصفح الكتالوج الشامل.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleToggleSaraWa({ mode: 'disabled', enabled: false })}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                !saraWaConfig.enabled || saraWaConfig.mode === 'disabled'
                  ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>⏸️ إيقاف الردود الآلية</span>
                {(!saraWaConfig.enabled || saraWaConfig.mode === 'disabled') && <Check className="w-3.5 h-3.5 text-rose-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                الرسائل تصل لصندوق الوارد دون رد تلقائي (مخصص للتدخل البشري اليدوي).
              </p>
            </button>
          </div>
        </div>

        {/* Multimodal Options Toggles */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <span className="font-bold text-slate-800 text-[11px]">🎙️ الرد الصوتي (Audio)</span>
            <input
              type="checkbox"
              checked={saraWaConfig.voiceEnabled}
              onChange={e => handleToggleSaraWa({ voiceEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <span className="font-bold text-slate-800 text-[11px]">📷 تحليل الصور (Vision)</span>
            <input
              type="checkbox"
              checked={saraWaConfig.visionEnabled}
              onChange={e => handleToggleSaraWa({ visionEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
            <span className="font-bold text-slate-800 text-[11px]">🖼️ إرسال صور المنتجات</span>
            <input
              type="checkbox"
              checked={saraWaConfig.autoSendProductImages}
              onChange={e => handleToggleSaraWa({ autoSendProductImages: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 3. BASE DE DONNÉES HOSTINGER MYSQL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Base de Données Hostinger MySQL (Officielle)
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    dbStatus?.connected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {dbStatus?.connected ? 'Connectée (MySQL v8)' : 'En attente de connexion'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gestionnaire de stockage persistant : Clients, Commandes COD, Produits, Suivis Sendit et Logs WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleInitDb(false)}
              disabled={isInitializingDb}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Vérifier Schéma
            </button>
            <button
              onClick={() => handleInitDb(true)}
              disabled={isInitializingDb}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {isInitializingDb ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recharger les 4 Étapes
                </>
              )}
            </button>
            <button
              onClick={() => openWipeModal('OPERATIONAL')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="مسح وتفريغ قاعدة البيانات"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>مسح قاعدة البيانات</span>
            </button>
          </div>
        </div>

        {/* Database Alert Message */}
        {dbMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              dbMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {dbMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{dbMessage.text}</span>
          </div>
        )}

        {/* Database Metrics and Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Serveur & Hôte
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
              srv977.hstgr.io : 3306
            </span>
            <span className="text-[10px] text-slate-500">Hostinger Cloud MySQL</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nom de la Base & Utilisateur
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 mt-1 block truncate">
              {dbStatus?.database || 'u663560985_sendit'}
            </span>
            <span className="text-[10px] text-slate-500">User: u663560985_sendit_usr</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tables Créées & Actives
            </span>
            <span className="text-xs font-mono font-bold text-blue-600 mt-1 block">
              {dbStatus?.tablesCount ?? 22} Tables COD Actives
            </span>
            <span className="text-[10px] text-slate-500">Prisma Client & MySQL2 Pool</span>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="pt-1">
          <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            Schéma complet de la plateforme SENDIT :
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
            {[
              { name: 'users', desc: 'Gestionnaires & Agents' },
              { name: 'products', desc: 'Catalogue & Knowledge AI' },
              { name: 'order_leads', desc: 'Commandes & Cycle COD' },
              { name: 'order_items', desc: 'Articles & Tailles/Couleurs' },
              { name: 'shipment_details', desc: 'Suivis Sendit.ma & AWB' },
              { name: 'whatsapp_messages', desc: 'Historique des conversations' },
              { name: 'call_logs', desc: 'Logs du Call Center' },
              { name: 'order_timelines', desc: 'Audit des événements' },
              { name: 'store_settings', desc: 'Configuration de la boutique' },
              { name: 'google_sheets_sync_logs', desc: 'Synchronisation Sheets' },
            ].map((t) => (
              <div
                key={t.name}
                className="p-2 bg-slate-50/70 border border-slate-200 rounded-lg flex flex-col justify-between"
              >
                <span className="font-mono font-bold text-slate-800 truncate">{t.name}</span>
                <span className="text-[9px] text-slate-500 mt-0.5">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DANGER ZONE : PURGE & RÉINITIALISATION DE LA BASE DE DONNÉES */}
        <div className="mt-4 pt-4 border-t border-rose-100 bg-gradient-to-br from-rose-50/50 via-white to-rose-50/20 p-4 rounded-xl border border-rose-200">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <span>منطقة الخطر : مسح وتفريغ قاعدة البيانات</span>
                  <span className="text-[10px] font-normal text-rose-600">(Zone de Danger : Purge MySQL)</span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  إمكانية مسح سجلات قاعدة البيانات لتنظيف المنصة، إزالة البيانات التجريبية، أو البدء من الصفر.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              عمليات لا رجعة فيها
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Option 1: Operational wipe */}
            <div className="p-3 bg-white rounded-xl border border-rose-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>مسح الطلبات والعمليات</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  يمسح كافة الطلبات، الزبائن، الشحنات، سجلات المكالمات، الرسائل، والتنبيهات (15 جدول). مع الحفاظ الكامل على المنتجات والمستخدمين والإعدادات.
                </p>
              </div>
              <button
                onClick={() => openWipeModal('OPERATIONAL')}
                className="mt-3 w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح سجلات الطلبات</span>
              </button>
            </div>

            {/* Option 2: Catalog wipe */}
            <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                  <span>مسح كتالوج المنتجات</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  يمسح كافة المنتجات في الكتالوج، تفرعاتها (Variants)، وأرصدة حركات المخزون، مع بقاء الطلبات السابقة كما هي.
                </p>
              </div>
              <button
                onClick={() => openWipeModal('CATALOG')}
                className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح المنتجات والمخزون</span>
              </button>
            </div>

            {/* Option 3: Full wipe */}
            <div className="p-3 bg-white rounded-xl border border-red-300 shadow-2xs flex flex-col justify-between bg-gradient-to-b from-white to-red-50/30">
              <div>
                <div className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>إعادة ضبط المصنع الكاملة</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  مسح شامل وتفريغ كامل لجميع جداول قاعدة البيانات وإعادة تهيئتها نظيفة مع الحفاظ على حساب المدير الافتراضي (admin@sendit.ma).
                </p>
              </div>
              <button
                onClick={() => openWipeModal('FULL')}
                className="mt-3 w-full py-1.5 px-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <AlertOctagon className="w-3 h-3" />
                <span>مسح شامل (Reset Factory)</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* 4. WHATSAPP ROTATION & ANTI-BAN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900">
              Système de Rotation des Numéros WhatsApp (Anti-Ban)
            </h2>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <span>Rotation Active</span>
            <input
              type="checkbox"
              checked={rotationActive}
              onChange={() => setRotationActive(!rotationActive)}
              className="w-4 h-4 accent-emerald-600"
            />
          </label>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">+212 6 61 22 33 44 (Ligne 1 - Casablanca)</span>
              <span className="text-[10px] text-slate-400">Limite quotidienne: 120 / 150 conversations</span>
            </div>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
              Connecté
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">+212 6 78 55 66 77 (Ligne 2 - Marrakech)</span>
              <span className="text-[10px] text-slate-400">Limite quotidienne: 45 / 150 conversations</span>
            </div>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
              Connecté
            </span>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMATION DE PURGE DE LA BASE DE DONNÉES */}
      {wipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-rose-200 shadow-2xl overflow-hidden animate-in zoom-in-95 text-slate-800">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <AlertOctagon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {wipeTarget === 'OPERATIONAL'
                      ? 'تأكيد مسح الطلبات والبيانات التشغيلية'
                      : wipeTarget === 'CATALOG'
                      ? 'تأكيد مسح كتالوج المنتجات والمخزون'
                      : 'تأكيد المسح الشامل وإعادة ضبط المصنع'}
                  </h3>
                  <p className="text-[10px] text-white/80">
                    Hostinger Cloud MySQL • {dbStatus?.database || 'u663560985_sendit'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWipeModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Alert Warning */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block font-bold">⚠️ تنبيه خطير ولا يمكن التراجع عنه :</strong>
                  <span>
                    هذه العملية ستقوم بحذف السجلات المحددة نهائياً من قاعدة بيانات MySQL. لا يمكن استرجاع هذه البيانات بعد الضغط على تأكيد المسح.
                  </span>
                </div>
              </div>

              {/* Scope & Counts Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px]">
                    {isLoadingSummary ? 'جارٍ احتساب السجلات...' : 'ملخص السجلات الحالية في قاعدة البيانات :'}
                  </span>
                  {isLoadingSummary && <RotateCcw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">📋 الطلبات (order_leads)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.order_leads ?? '...'}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">📦 عناصر الطلب (items)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.order_items ?? '...'}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">🚚 الشحنات (shipments)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.shipment_details ?? '...'}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">👥 الزبائن (customers)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.customers ?? '...'}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">💬 الرسائل (messages)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.whatsapp_messages ?? '...'}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">📞 المكالمات (call_logs)</span>
                    <strong className="text-slate-800 text-xs font-mono">
                      {wipeSummary?.counts?.call_logs ?? '...'}
                    </strong>
                  </div>
                </div>

                {wipeTarget === 'OPERATIONAL' && (
                  <div className="pt-1 text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>سيتم الحفاظ على: كتالوج المنتجات، حسابات المستخدمين، وإعدادات الربط.</span>
                  </div>
                )}
                {wipeTarget === 'FULL' && (
                  <div className="pt-1 text-[11px] text-amber-700 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>سيتم إعادة إنشاء حساب المدير الافتراضي (admin@sendit.ma) والإعدادات فوراً.</span>
                  </div>
                )}
              </div>

              {/* Confirmation Input Verification */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  للتأكيد، اكتب كلمة <span className="text-rose-600 font-mono font-black">مسح</span> أو <span className="text-rose-600 font-mono font-black">DELETE</span> في المربع أسفله :
                </label>
                <input
                  type="text"
                  placeholder="اكتب مسح أو DELETE للتأكيد"
                  value={wipeConfirmationInput}
                  onChange={(e) => setWipeConfirmationInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-center text-xs font-bold text-slate-800 focus:bg-white focus:border-rose-500 focus:outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setWipeModalOpen(false)}
                disabled={isWipingDb}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء / Annuler
              </button>

              <button
                onClick={handleExecuteWipe}
                disabled={
                  isWipingDb ||
                  (wipeConfirmationInput.trim() !== 'مسح' &&
                    wipeConfirmationInput.trim().toUpperCase() !== 'DELETE' &&
                    wipeConfirmationInput.trim().toUpperCase() !== 'CONFIRM')
                }
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {isWipingDb ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ مسح وتفريغ الجداول...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد المسح النهائي للبيانات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

