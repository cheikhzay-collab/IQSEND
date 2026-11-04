'use client';

import React, { useState, useEffect } from 'react';
import {
  Moon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Save,
  CheckCircle2,
  Ban,
  Plus,
  Zap,
  Phone,
  RefreshCw,
} from 'lucide-react';

interface AgentSettingsData {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  cooldownOutForDeliveryHours: number;
  cooldownMorningReminderHours: number;
  cooldownConfirmationHours: number;
  cooldownRescueHours: number;
  cooldownReviewHours: number;
  maxDailyMessagesPerCustomer: number;
  operationMode: 'AUTOPILOT' | 'SUPERVISED';
  dndPhones: string[];
  ownerNotifyPhone: string;
  notifyOwnerOnConfirmedOrder: boolean;
  notifyOwnerOnIntervention: boolean;
}

export default function AgentAdvancedRulesTab() {
  const [settings, setSettings] = useState<AgentSettingsData>({
    quietHoursEnabled: true,
    quietHoursStart: '21:30',
    quietHoursEnd: '08:30',
    cooldownOutForDeliveryHours: 24,
    cooldownMorningReminderHours: 24,
    cooldownConfirmationHours: 4,
    cooldownRescueHours: 18,
    cooldownReviewHours: 720,
    maxDailyMessagesPerCustomer: 2,
    operationMode: 'AUTOPILOT',
    dndPhones: [],
    ownerNotifyPhone: '',
    notifyOwnerOnConfirmedOrder: true,
    notifyOwnerOnIntervention: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [newDndPhone, setNewDndPhone] = useState<string>('');
  const [isTestingOwnerAlert, setIsTestingOwnerAlert] = useState<boolean>(false);
  const [testOwnerResult, setTestOwnerResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestOwnerAlert = async () => {
    if (!settings.ownerNotifyPhone.trim()) {
      alert('Veuillez d’abord saisir le numéro WhatsApp du propriétaire du magasin.');
      return;
    }
    setIsTestingOwnerAlert(true);
    setTestOwnerResult(null);
    try {
      const res = await fetch('/api/ai-agents/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testOwnerAlert: true,
          ownerNotifyPhone: settings.ownerNotifyPhone.trim(),
        }),
      });
      const data = await res.json();
      setTestOwnerResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Message test envoyé avec succès !' : 'Échec de l’envoi.'),
      });
      setTimeout(() => setTestOwnerResult(null), 6000);
    } catch (err: any) {
      setTestOwnerResult({
        success: false,
        message: `Erreur technique : ${err.message}`,
      });
    } finally {
      setIsTestingOwnerAlert(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-agents/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching agent advanced settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai-agents/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving agent advanced settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addDndPhone = () => {
    const cleaned = newDndPhone.trim();
    if (!cleaned) return;
    if (!settings.dndPhones.includes(cleaned)) {
      setSettings({
        ...settings,
        dndPhones: [...settings.dndPhones, cleaned],
      });
      setNewDndPhone('');
    }
  };

  const removeDndPhone = (phoneToRemove: string) => {
    setSettings({
      ...settings,
      dndPhones: settings.dndPhones.filter((p) => p !== phoneToRemove),
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
        Chargement des règles et paramètres avancés de l'agent...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* ── CARD 1: QUIET HOURS (Heures de silence & Protection nocturne) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              <Moon className="w-3.5 h-3.5 text-purple-600" />
              Heures de silence & Protection nocturne (Quiet Hours)
            </div>
            <h3 className="font-black text-sm text-slate-900 mt-1">
              Bloquer les notifications automatiques la nuit
            </h3>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Empêche l'agent d'envoyer toute notification ou relance automatique (expédition, livraison, rappel COD) pendant la nuit pour préserver les clients et protéger le compte WhatsApp contre les signalements.
            </p>
          </div>

          <button
            onClick={() =>
              setSettings({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled })
            }
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
              settings.quietHoursEnabled ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {settings.quietHoursEnabled && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-1">
              <label className="block text-[11px] font-bold text-purple-900">
                Début des heures de silence (soir) :
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value })}
                className="w-full text-xs font-bold font-mono bg-white border border-purple-200 rounded-xl p-2.5 text-slate-800 focus:outline-purple-600"
              />
              <span className="text-[10px] text-purple-600 block mt-1">Par défaut : 21:30 (Heure Maroc)</span>
            </div>

            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-1">
              <label className="block text-[11px] font-bold text-purple-900">
                Fin des heures de silence (matin) :
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value })}
                className="w-full text-xs font-bold font-mono bg-white border border-purple-200 rounded-xl p-2.5 text-slate-800 focus:outline-purple-600"
              />
              <span className="text-[10px] text-purple-600 block mt-1">Par défaut : 08:30 (Heure Maroc)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 2: COOLDOWN MATRIX (Matrice de temporisation anti-spam) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Matrice de temporisation anti-spam (Smart Cooldown Matrix)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            Règles anti-répétition dans la même journée et fenêtre temporelle
          </h3>
          <p className="text-xs text-slate-500">
            Ces valeurs définissent la durée minimale (en heures) avant qu'une relance du même type ne puisse être envoyée au même client.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Rule 1: Out for Delivery */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                Notification « Colis en cours de livraison (Livreur) »
              </span>
              <span className="text-xs font-bold font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownOutForDeliveryHours} h
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Si le statut Sendit est mis à jour plusieurs fois dans la même journée, aucune notification en double ne sera envoyée pendant cette période.
            </p>
            <input
              type="range"
              min="12"
              max="48"
              step="6"
              value={settings.cooldownOutForDeliveryHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownOutForDeliveryHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>12 h</span>
              <span className="font-bold text-amber-700">24 h (Recommandé)</span>
              <span>48 h</span>
            </div>
          </div>

          {/* Rule 2: Morning Reminder */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                Rappel matinal de paiement à la livraison (COD)
              </span>
              <span className="text-xs font-bold font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownMorningReminderHours} h
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Rappeler au client de préparer le montant en espèces le matin, avec un plafond d'une fois par jour.
            </p>
            <input
              type="range"
              min="12"
              max="48"
              step="6"
              value={settings.cooldownMorningReminderHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownMorningReminderHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>12 h</span>
              <span className="font-bold text-amber-700">24 h (Recommandé)</span>
              <span>48 h</span>
            </div>
          </div>

          {/* Rule 3: Confirmation Outreach */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                Relance de confirmation interactive & adresse
              </span>
              <span className="text-xs font-bold font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownConfirmationHours} h
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Délai minimal entre le premier message de confirmation et la relance suivante si le client n'a pas répondu.
            </p>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={settings.cooldownConfirmationHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownConfirmationHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 h</span>
              <span className="font-bold text-emerald-700">4 h (Recommandé)</span>
              <span>12 h</span>
            </div>
          </div>

          {/* Rule 4: Delivery Rescue */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                Messages de sauvetage en cas d'échec de livraison
              </span>
              <span className="text-xs font-bold font-mono bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownRescueHours} h
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Délai minimal avant d'envoyer un message alternatif de sauvetage si le client était injoignable par le livreur.
            </p>
            <input
              type="range"
              min="6"
              max="36"
              step="6"
              value={settings.cooldownRescueHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownRescueHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>6 h</span>
              <span className="font-bold text-rose-700">18 h (Recommandé)</span>
              <span>36 h</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: DAILY CAP & OPERATION MODE ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Plafond journalier & Mode opérationnel
          </div>
          <h3 className="font-black text-sm text-slate-900">
            Nombre maximal de messages & Degré d'autonomie
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Cap */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              Limite maximale de messages automatiques par client et par jour :
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Quels que soient les événements du colis dans la même journée, l'agent ne dépassera pas ce plafond pour éviter tout signalement WhatsApp.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setSettings({ ...settings, maxDailyMessagesPerCustomer: cap })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    settings.maxDailyMessagesPerCustomer === cap
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cap} {cap === 1 ? 'message' : 'messages'}
                </button>
              ))}
            </div>
          </div>

          {/* Operation Mode */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              Mode d'exécution de l'agent (Autopilote vs Supervisé) :
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Choisissez entre un envoi autonome direct ou une validation préalable requise par un opérateur.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, operationMode: 'AUTOPILOT' })}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  settings.operationMode === 'AUTOPILOT'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5 mx-auto mb-1" />
                Pilote automatique
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, operationMode: 'SUPERVISED' })}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  settings.operationMode === 'SUPERVISED'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 mx-auto mb-1" />
                Validation supervisée
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: STORE OWNER WHATSAPP NOTIFICATIONS (Alertes WhatsApp du Propriétaire) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-1.5">
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            Alertes WhatsApp du Propriétaire (Store Owner Alerts)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            Numéro WhatsApp du superviseur pour recevoir les confirmations et les alertes d'intervention
          </h3>
          <p className="text-xs text-slate-500">
            L'agent intelligent envoie automatiquement à ce numéro un récapitulatif pour chaque commande confirmée, ainsi que des alertes urgentes si un colis rencontre un problème de livraison ou si le client demande un conseiller humain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Owner Phone Input */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="font-bold text-xs text-slate-900 block">
              Numéro WhatsApp du Propriétaire (Store Owner)
            </span>
            <input
              type="text"
              placeholder="Ex: 0661234567 ou 212661234567..."
              value={settings.ownerNotifyPhone}
              onChange={(e) => setSettings({ ...settings, ownerNotifyPhone: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-blue-600 font-mono font-bold text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              Format local (06...) ou international (212...) accepté.
            </p>

            <button
              type="button"
              onClick={handleTestOwnerAlert}
              disabled={isTestingOwnerAlert || !settings.ownerNotifyPhone.trim()}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              {isTestingOwnerAlert ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Envoi du message test en cours...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  Envoyer un message test maintenant
                </>
              )}
            </button>

            {testOwnerResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  testOwnerResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testOwnerResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{testOwnerResult.message}</span>
              </div>
            )}
          </div>

          {/* Alert Toggles */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-slate-900 block">
              Types de notifications à transmettre au propriétaire :
            </span>

            <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300 transition-all">
              <input
                type="checkbox"
                checked={settings.notifyOwnerOnConfirmedOrder}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOwnerOnConfirmedOrder: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Récapitulatif des commandes confirmées</span>
                <span className="text-[11px] text-slate-500">
                  Envoi d'une fiche avec nom du client, ville, produits et montant COD encaissable.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300 transition-all">
              <input
                type="checkbox"
                checked={settings.notifyOwnerOnIntervention}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOwnerOnIntervention: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded text-rose-600 accent-rose-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Alertes d'intervention humaine & sauvetage</span>
                <span className="text-[11px] text-slate-500">
                  Notification instantanée quand le client demande un conseiller ou en cas d'échec de livraison Sendit.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── CARD 5: BLACKLIST & DND PHONES (Liste noire & Ne pas déranger) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full mb-1.5">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            Liste noire & Ne pas déranger (DND & Blacklist)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            Numéros de téléphone exclus des messages automatiques
          </h3>
          <p className="text-xs text-slate-500">
            Tout numéro ajouté ici ne recevra plus aucun message automatique ni notification de suivi de la part de l'agent, respectant ainsi le choix du client.
          </p>
        </div>

        {/* Add phone input */}
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="Entrez le numéro de téléphone (Ex: 0661234567)..."
            value={newDndPhone}
            onChange={(e) => setNewDndPhone(e.target.value)}
            className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-blue-600 font-mono"
          />
          <button
            onClick={addDndPhone}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter à la liste
          </button>
        </div>

        {/* List of blocked numbers */}
        <div className="flex flex-wrap gap-2 pt-2">
          {settings.dndPhones.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">Aucun numéro bloqué actuellement.</div>
          ) : (
            settings.dndPhones.map((phone) => (
              <span
                key={phone}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200"
              >
                <Phone className="w-3 h-3 text-rose-500" />
                {phone}
                <button
                  onClick={() => removeDndPhone(phone)}
                  className="hover:text-rose-950 font-black text-sm"
                  title="Supprimer de la liste"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── SAVE ACTION BAR ─────────────────────────────────────── */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between text-white shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Les règles mises à jour s'appliquent immédiatement à tous les webhooks et messages sortants.</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0 ml-4"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Enregistrement en cours...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Enregistré avec succès !
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Enregistrer les règles avancées
            </>
          )}
        </button>
      </div>
    </div>
  );
}
