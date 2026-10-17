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
            <h1 className="text-xl font-bold text-slate-900">Paramètres & Clés API</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connexions Sendit.ma, Google Gemini, passerelle WhatsApp et gestion de la rotation des numéros
          </p>
        </div>

        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
          <Save className="w-3.5 h-3.5" /> Enregistrer les Paramètres
        </button>
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
