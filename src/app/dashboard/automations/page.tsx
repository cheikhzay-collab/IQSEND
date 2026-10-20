'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquare,
  Truck,
  RotateCw,
  ArrowRight,
  ShieldAlert,
  Star,
  Settings,
  ChevronRight,
  History
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  pillar: string;
  description: string;
  trigger: string;
  action: string;
  active: boolean;
  totalExecutions: number;
  successRate: number;
}

const INITIAL_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'auto-1',
    name: '1. Confirmation Immédiate WhatsApp & GPS',
    pillar: 'Pilier 1 (Agent IA)',
    description: 'Envoie un message interactif avec boutons de confirmation et demande de localisation GPS Google Maps dès l’arrivée du lead.',
    trigger: 'Nouveau lead Google Sheet ou Webhook Boutique',
    action: 'Message interactif WhatsApp + Assistant Gemini Darija',
    active: true,
    totalExecutions: 842,
    successRate: 98.2,
  },
  {
    id: 'auto-2',
    name: '2. Relance Panier Abandonné COD',
    pillar: 'Pilier 1 (Conversion)',
    description: 'Relance automatique du client avec un code de réduction exclusif si le checkout n’est pas finalisé dans l’heure.',
    trigger: 'Panier non validé après 60 minutes',
    action: 'Message WhatsApp incitatif avec bouton de finalisation',
    active: true,
    totalExecutions: 156,
    successRate: 41.5,
  },
  {
    id: 'auto-3',
    name: '3. Alerte Expédition & Numéro Livreur',
    pillar: 'Pilier 4 (Suivi Interactif)',
    description: 'Notifie le client dès que le colis est pris en charge par le centre de tri Sendit avec le lien de suivi en direct.',
    trigger: 'Webhook Sendit: Statut "EXPÉDIÉ / EN TRANSIT"',
    action: 'Message WhatsApp de notification avec numéro de suivi',
    active: true,
    totalExecutions: 619,
    successRate: 99.4,
  },
  {
    id: 'auto-4',
    name: '4. Rappel Matinal COD (Préparation Espèces)',
    pillar: 'Pilier 4 (Réduction Retours)',
    description: 'Rappelle au client le matin même de préparer le montant exact en Dirhams pour éviter les retards de monnaie.',
    trigger: 'Webhook Sendit: "EN COURS DE LIVRAISON" à 09h00',
    action: 'Message courtois en Darija précisant le montant exact',
    active: true,
    totalExecutions: 520,
    successRate: 97.1,
  },
  {
    id: 'auto-5',
    name: '5. Cellule de Sauvetage Échec de Livraison',
    pillar: 'Pilier 2 (Cellule d’Urgence)',
    description: 'Envoi automatique d’un message d’empathie si le livreur n’a pas pu joindre le client, avec options de reprogrammation.',
    trigger: 'Webhook Sendit: "TENTATIVE ÉCHOUÉE / INJOIGNABLE"',
    action: 'Message de sauvetage en Darija + Bouton Reprogrammer',
    active: true,
    totalExecutions: 89,
    successRate: 64.0,
  },
  {
    id: 'auto-6',
    name: '6. Collecte d’Avis & Code Fidélité',
    pillar: 'Pilier 4 (Post-Livraison)',
    description: 'Sollicite une notation par étoiles et un commentaire 2h après l’encaissement des fonds par le livreur.',
    trigger: 'Webhook Sendit: "LIVRÉ & ENCAISSÉ"',
    action: 'Lien de notation 5 étoiles WhatsApp + Bon d’achat',
    active: true,
    totalExecutions: 478,
    successRate: 88.5,
  },
];

const RECENT_LOGS = [
  {
    id: 'log-1',
    rule: 'Confirmation Immédiate WhatsApp',
    recipient: '0654998877 (Salma R.)',
    time: 'Il y a 3 minutes',
    status: 'SUCCÈS',
    details: 'Boutons interactifs transmis avec succès',
  },
  {
    id: 'log-2',
    rule: 'Rappel Matinal COD',
    recipient: '0661123456 (Amine T.)',
    time: 'Il y a 14 minutes',
    status: 'SUCCÈS',
    details: 'Montant 399 MAD rappelé avant passage Sendit',
  },
  {
    id: 'log-3',
    rule: 'Cellule de Sauvetage Échec',
    recipient: '0671449922 (Youssef B.)',
    time: 'Il y a 42 minutes',
    status: 'SUCCÈS',
    details: 'Reprogrammation acceptée pour demain 14h',
  },
  {
    id: 'log-4',
    rule: 'Collecte d’Avis Post-Livraison',
    recipient: '0662998811 (Dounia S.)',
    time: 'Il y a 1 heure',
    status: 'SUCCÈS',
    details: 'Avis 5 étoiles reçu avec mention "Très satisfaite"',
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [isLiveDb, setIsLiveDb] = useState(false);

  useEffect(() => {
    fetch('/api/automations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.rules)) {
          setAutomations(data.rules);
          setIsLiveDb(true);
        }
      })
      .catch((e) => console.warn('Automations fetch note:', e));
  }, []);

  const toggleAutomation = async (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;
    const nextState = !target.active;

    // Optimistic UI update
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: nextState } : a))
    );

    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, key: (target as any).key, active: nextState }),
      });
    } catch (err) {
      console.error('Error saving automation toggle to MySQL:', err);
    }
  };

  const activeCount = automations.filter((a) => a.active).length;
  const totalExecs = automations.reduce((acc, a) => acc + a.totalExecutions, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            Moteur de Déclencheurs & Webhooks Sendit.ma
            {isLiveDb && (
              <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                MySQL Actif
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Automatisations & Scénarios COD
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion des 6 scénarios clés de conversion, réduction des retours et sauvetage des livraisons sauvegardés en direct dans store_settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeCount} automatisations actives
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Scénarios Actifs</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount} / 6</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Couverture totale du cycle de commande
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Déclenchements</span>
          <p className="text-2xl font-black text-blue-600 mt-2">{totalExecs.toLocaleString()}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Messages et actions automatiques
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Taux de Succès Global</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">91.4%</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Délivrance WhatsApp & Webhooks
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Revenus Sauvegardés</span>
          <p className="text-2xl font-black text-slate-900 mt-2">24,850 MAD</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Grâce aux relances et sauvetages
          </div>
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all ${
              rule.active ? 'border-slate-200' : 'border-slate-200/50 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  {rule.pillar}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">{rule.name}</h3>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleAutomation(rule.id)}
                className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                  rule.active ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
                title={rule.active ? 'Désactiver' : 'Activer'}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {rule.description}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-700">Déclencheur:</span>
                <span className="text-slate-600 truncate max-w-xs">{rule.trigger}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-700">Action:</span>
                <span className="text-slate-600 truncate max-w-xs">{rule.action}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">
                <strong className="text-slate-800">{rule.totalExecutions}</strong> exécutions
              </span>
              <span className="text-emerald-700 font-bold">
                {rule.successRate}% de réussite
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Journal d'Exécution en Direct
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Temps réel</span>
        </div>

        <div className="divide-y divide-slate-100">
          {RECENT_LOGS.map((log) => (
            <div key={log.id} className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <strong className="font-bold text-slate-900">{log.rule}</strong>
                  <span className="text-slate-500 block text-[11px]">
                    Destinataire: {log.recipient} • {log.details}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                <span className="text-slate-400">{log.time}</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
