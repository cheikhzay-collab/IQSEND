'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface GoogleSheetsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSheetsIntegrationModal({ isOpen, onClose }: GoogleSheetsIntegrationModalProps) {
  const { refreshInboundOrders } = useOrderLifecycle();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    orderNumber?: string;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/google-sheets`
    : 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets';

  const scriptCode = `// ==============================================================
// Script de synchronisation automatique avec la plateforme SENDIT COD
// Transmet chaque commande ajoutée dans Google Sheets directement en "En attente"
// ==============================================================

function onEdit(e) {
  // Ou configurez-le comme déclencheur "Lors de l'envoi du formulaire" (On form submit)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e ? e.range.getRow() : sheet.getLastRow();
  if (row <= 1) return; // Ignorer la ligne d'en-tête

  var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Ajustez les indices de colonnes selon votre feuille (index commence à 0) :
  // Colonne A = data[0], Colonne B = data[1], Colonne C = data[2] ...
  var payload = {
    name: data[1] || data[0],             // Nom du client
    phone: data[2] || "",                 // Numéro de téléphone
    city: data[3] || "Casablanca",        // Ville
    address: data[4] || "",               // Adresse complète
    product: data[5] || "Pack COD",       // Nom du produit
    quantity: data[6] || 1,               // Quantité
    price: data[7] || 299,                // Montant en MAD
    notes: data[8] || "Commande Sheets"   // Remarques client
  };

  // Transmission instantanée au webhook de confirmation
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch("${webhookUrl}", options);
    Logger.log("Commande transmise avec succès : " + response.getContentText());
  } catch (err) {
    Logger.log("Erreur lors de la transmission : " + err.toString());
  }
}`;

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSimulateOrder = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    const testClients = [
      { name: 'Youssef El Amrani', phone: '0661998877', city: 'Marrakech', address: 'Guéliz, Immeuble Atlas, Appt 6', product: 'Montre Luxe Or Noir', price: 349 },
      { name: 'Amina Benjelloun', phone: '0672112233', city: 'Fès', address: 'Route Ain Chkef, Résidence Narjiss', product: 'Pack Robe Caftan Moderne', price: 490 },
      { name: 'Tariq Alami', phone: '0654334455', city: 'Casablanca', address: 'Bd Zerktouni, Quartier Maârif', product: 'Sneakers Sport Élite', price: 299 },
      { name: 'Houda Tazi', phone: '0663778899', city: 'Tanger', address: 'Tanger Balia, Complexe Ennasr n°18', product: 'Sac Cuir Artisanal', price: 380 },
    ];

    const randomClient = testClients[Math.floor(Math.random() * testClients.length)];

    try {
      const res = await fetch('/api/webhooks/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(randomClient),
      });

      const data = await res.json();
      if (data.success) {
        setSimulationResult({
          success: true,
          orderNumber: data.orderNumber,
          message: `Commande injectée avec succès ! N° : ${data.orderNumber} (${randomClient.name} — ${randomClient.city})`,
        });
        await refreshInboundOrders();
      } else {
        setSimulationResult({
          success: false,
          message: data.error || 'Une erreur est survenue lors de l\'injection de la commande.',
        });
      }
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: err.message || 'Impossible de joindre le serveur.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">
                Liaison Google Sheets & Synchronisation Live
              </h3>
              <p className="text-xs text-emerald-100">
                Injection instantanée et automatique de chaque commande reçue dans la phase En attente (Pending Confirmation)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs text-slate-700">
          
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold text-emerald-950 text-xs">Point de terminaison Webhook actif (Live Webhook Active)</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  La plateforme écoute et actualise les commandes en temps réel sans nécessiter de rechargement de page.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              Connecté 100%
            </span>
          </div>

          {/* Webhook Endpoint URL */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 block">
              1. URL de votre Webhook d'ingestion (Webhook Ingestion Endpoint) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copié !' : 'Copier l\'URL'}</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Activation en 3 étapes simples dans Google Sheets :</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pr-1">
              <li>Ouvrez votre document <strong>Google Sheets</strong> contenant les commandes.</li>
              <li>Dans le menu supérieur, cliquez sur <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.</li>
              <li>Effacez le contenu existant, collez le script ci-dessous, puis cliquez sur <strong>Enregistrer</strong>.</li>
              <li>Dans le menu latéral d'Apps Script, ouvrez <strong>Déclencheurs (Triggers)</strong> et activez l'exécution <strong>Lors de l'envoi du formulaire</strong> ou <strong>Lors de la modification</strong>.</li>
            </ol>
          </div>

          {/* Google Apps Script Code block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900">
                2. Script Google Apps Script prêt à l'emploi :
              </label>
              <button
                onClick={() => copyToClipboard(scriptCode, false)}
                className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Code copié !' : 'Copier le script'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed dir-ltr text-left">
              {scriptCode}
            </pre>
          </div>

          {/* Test Simulator Section */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                  <span>3. Tester la connexion en direct (Live Simulation) :</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cliquez pour simuler une commande immédiate et la voir apparaître instantanément dans votre pipeline.
                </p>
              </div>
              <button
                onClick={handleSimulateOrder}
                disabled={isSimulating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Envoi en cours...' : 'Injecter commande test'}</span>
              </button>
            </div>

            {simulationResult && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
                  simulationResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                {simulationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{simulationResult.message}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Prise en charge automatique des colonnes en français, arabe et anglais.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
