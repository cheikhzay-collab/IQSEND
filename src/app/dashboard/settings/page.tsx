'use client';

import React, { useState } from 'react';
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
  RotateCcw
} from 'lucide-react';

export default function SettingsPage() {
  const [senditKey, setSenditKey] = useState('snd_live_9a8f7c6e5d4b3a210987654321');
  const [geminiKey, setGeminiKey] = useState('AIzaSyD-sample-gemini-key-morocco-cod');
  const [evolutionUrl, setEvolutionUrl] = useState('https://whatsapp.yourdomain.com');
  const [rotationActive, setRotationActive] = useState(true);

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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bot className="w-4 h-4 text-purple-600" />
          <h2 className="text-xs font-bold text-slate-900">Configuration Google Gemini AI</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Clé API Gemini (GEMINI_API_KEY):</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
            />
          </div>
          <div className="flex justify-between items-center bg-purple-50 p-3 rounded-xl border border-purple-100">
            <div>
              <span className="font-bold text-purple-900 block">Modèle Actif: Gemini 1.5 Flash</span>
              <span className="text-[11px] text-purple-700">Optimisé pour la vitesse sub-2s et Function Calling en Darija</span>
            </div>
            <span className="bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">
              Actif ✓
            </span>
          </div>
        </div>
      </div>

      {/* 3. WHATSAPP ROTATION & ANTI-BAN */}
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
