'use client';

import React, { useState, useEffect } from 'react';
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
  Layers
} from 'lucide-react';

export default function SettingsPage() {
  const [senditKey, setSenditKey] = useState('snd_live_9a8f7c6e5d4b3a210987654321');
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
  }, []);

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

  return (
    <div className="p-6 space-y-6 max-w-4xl">
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

        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
          <Save className="w-3.5 h-3.5" /> Enregistrer les Paramètres
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
                  alert('URL Webhook copiée dans le presse-papier !');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors"
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
                  alert('Code Apps Script copié dans le presse-papier !');
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
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
                    alert(`Commande test ${json.orderNumber} créée avec succès dans "En attente de confirmation" !`);
                  }
                } catch {
                  alert('Erreur lors de la simulation');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Simuler un envoi Test
            </button>
          </div>
        </div>
      </div>

      {/* 1. SENDIT.MA LOGISTICS API */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Truck className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-900">Intégration Logistique Sendit.ma</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Clé API Sendit (Bearer Token):</label>
            <input
              type="password"
              value={senditKey}
              onChange={(e) => setSenditKey(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">URL Webhook pour Sendit:</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value="https://app.sendit-cod.ma/api/webhooks/sendit"
                className="flex-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600"
              />
              <button
                onClick={() => alert('URL Webhook copiée!')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Collez cette URL dans votre compte Sendit &gt; Paramètres &gt; Webhooks pour synchroniser les statuts en direct.
            </p>
          </div>
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInitDb(false)}
              disabled={isInitializingDb}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Vérifier Schéma
            </button>
            <button
              onClick={() => handleInitDb(true)}
              disabled={isInitializingDb}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              {isInitializingDb ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recharger les 4 Étapes COD (15 Commandes)
                </>
              )}
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
              {dbStatus?.database || 'u663560985_vC9mY'}
            </span>
            <span className="text-[10px] text-slate-500">User: u663560985_hjwut</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tables Créées & Actives
            </span>
            <span className="text-xs font-mono font-bold text-blue-600 mt-1 block">
              {dbStatus?.tablesCount ?? 10} Tables COD
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
    </div>
  );
}
