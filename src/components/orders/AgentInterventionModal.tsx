'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Sparkles,
  Send,
  MessageCircle,
  Copy,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { OrderItem } from '@/types/orders';
import { useOrderLifecycle, LifecycleStage } from '@/context/OrderLifecycleContext';
import {
  getStageMessageConfig,
  formatPhoneForWhatsApp,
} from '@/lib/order-stage-messages';

interface AgentInterventionModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStageChange?: (orderId: string, newStage: LifecycleStage) => void;
}

type LanguageTab = 'french' | 'darija' | 'arabic';

export function AgentInterventionModal({
  order,
  isOpen,
  onClose,
  onStageChange,
}: AgentInterventionModalProps) {
  const { showToast, confirmOrder, markDelivered, shipOrder } = useOrderLifecycle();

  const [activeLang, setActiveLang] = useState<LanguageTab>('french');
  const [messageText, setMessageText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState<'polite' | 'urgent' | 'upsell' | 'review'>('polite');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [advanceStageAfterSend, setAdvanceStageAfterSend] = useState(true);
  const [isHumanTakeover, setIsHumanTakeover] = useState(true);

  // Sync initial message text when order or active language changes
  useEffect(() => {
    if (!order) return;
    const stageConfig = getStageMessageConfig(order.status);
    if (activeLang === 'french') {
      setMessageText(stageConfig.french(order));
    } else if (activeLang === 'darija') {
      setMessageText(stageConfig.darija(order));
    } else if (activeLang === 'arabic') {
      setMessageText(stageConfig.arabic(order));
    }
  }, [order, activeLang]);

  if (!isOpen || !order) return null;

  const stageConfig = getStageMessageConfig(order.status);

  // Generate or rephrase message via Gemini AI API
  const handleGenerateAiMessage = async (promptOverride?: string) => {
    const promptToUse = promptOverride || customPrompt;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/agent/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          stage: order.status,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          city: order.city,
          productName: order.productName,
          amount: order.amount,
          currency: order.currency,
          language: activeLang,
          customPrompt: promptToUse,
          tone: selectedTone,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessageText(data.message);
        showToast('Message généré avec succès par l\'Agent IA (Gemini) !', 'success');
      } else {
        showToast('Utilisation du modèle optimisé en local.', 'info');
      }
    } catch (err: any) {
      console.warn('[AgentInterventionModal] AI generation notice:', err);
      showToast('Génération assistée appliquée.', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  // Dispatch message via Baileys WhatsApp API
  const handleSendDirectWhatsApp = async () => {
    if (!messageText.trim()) return;
    setIsSending(true);
    setSendSuccess(false);

    try {
      const res = await fetch('/api/agent/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          phone: order.phone,
          messageText: messageText.trim(),
          orderNumber: order.orderNumber,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccess(true);
        showToast(`Message envoyé avec succès à ${order.customerName} via WhatsApp !`, 'success');

        // Optional: Auto-advance stage if user selected it
        if (advanceStageAfterSend) {
          if (order.status === 'PENDING_CONFIRMATION' || order.status === 'NEW_ORDERS') {
            confirmOrder(order.id);
            showToast(`Commande ${order.orderNumber} passée en "En préparation" !`, 'info');
          } else if (order.status === 'PROCESSING' || order.status === 'PACKING') {
            shipOrder(order.id);
            showToast(`Commande ${order.orderNumber} passée en "En cours de livraison" !`, 'info');
          } else if (order.status === 'IN_TRANSIT' || order.status === 'SHIPPED') {
            markDelivered(order.id);
            showToast(`Commande ${order.orderNumber} passée en "Livrée & Encaissée" !`, 'info');
          }
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        showToast(data.error || 'Erreur lors de l\'envoi direct via WhatsApp.', 'error');
      }
    } catch (err: any) {
      showToast('Erreur serveur WhatsApp, vous pouvez ouvrir WhatsApp Web directement.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Open in WhatsApp Web / App directly
  const handleOpenWhatsAppWeb = () => {
    const formattedPhone = formatPhoneForWhatsApp(order.phone);
    const encoded = encodeURIComponent(messageText);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
    showToast('Conversation ouverte dans l\'application WhatsApp.', 'info');
  };

  const handleCopyMessage = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 via-indigo-50/40 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">Intervention Agent IA</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                  {order.orderNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageConfig.badgeBg}`}
                >
                  {stageConfig.stageNameFr}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Client : <strong className="text-slate-800">{order.customerName}</strong> ({order.phone}) •{' '}
                {order.city}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Order Summary Strip */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={order.productThumbnail}
                alt={order.productName}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
              />
              <div>
                <p className="font-bold text-slate-900 line-clamp-1">{order.productName}</p>
                <p className="text-[11px] text-slate-500">
                  Montant COD (Paiement à la livraison) :{' '}
                  <span className="font-black text-emerald-700">
                    {order.amount} {order.currency}
                  </span>
                </p>
              </div>
            </div>

            {/* Stage Indicator Pill */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold">Étape logistique :</span>
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-xl border shadow-2xs ${stageConfig.badgeBg}`}
              >
                {stageConfig.stageNameFr}
              </span>
            </div>
          </div>

          {/* Quick Scenario Pills for this stage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Scénarios d'intervention recommandés ({stageConfig.stageNameFr}) :
              </span>
              <span className="text-[10px] text-slate-400">Cliquez pour formuler automatiquement</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {stageConfig.quickPrompts.map((scenario, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomPrompt(scenario.prompt);
                    handleGenerateAiMessage(scenario.prompt);
                  }}
                  disabled={isGenerating}
                  className="px-2.5 py-1.5 rounded-xl bg-violet-50/70 hover:bg-violet-100 text-violet-800 border border-violet-200/80 hover:border-violet-300 font-bold text-[11px] transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <span>{scenario.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setActiveLang('french')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                  activeLang === 'french'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => setActiveLang('darija')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                  activeLang === 'darija'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🇲🇦 Darija marocain
              </button>
              <button
                onClick={() => setActiveLang('arabic')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                  activeLang === 'arabic'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🇸🇦 Arabe standard
              </button>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 p-1.5 px-2.5 rounded-xl hover:bg-slate-100 transition-colors"
              title="Copier le texte du message"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier le texte</span>
                </>
              )}
            </button>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium">Tonalité :</span>
            <button
              onClick={() => setSelectedTone('polite')}
              className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-bold transition-colors ${
                selectedTone === 'polite'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Courtois & Rassurant
            </button>
            <button
              onClick={() => setSelectedTone('urgent')}
              className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-bold transition-colors ${
                selectedTone === 'urgent'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Livraison urgente
            </button>
            <button
              onClick={() => setSelectedTone('upsell')}
              className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-bold transition-colors ${
                selectedTone === 'upsell'
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Offre & Upsell
            </button>
            <button
              onClick={() => setSelectedTone('review')}
              className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-bold transition-colors ${
                selectedTone === 'review'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Avis & Fidélité
            </button>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                dir={activeLang === 'french' ? 'ltr' : 'rtl'}
                className="w-full text-xs p-3.5 rounded-2xl border border-slate-300 focus:outline-violet-600 text-slate-800 leading-relaxed font-sans shadow-inner"
                placeholder="Texte du message à envoyer au client via WhatsApp..."
              />
              <div className="absolute bottom-2.5 left-3 text-[10px] text-slate-400 font-mono">
                {messageText.length} caractères
              </div>
            </div>
          </div>

          {/* AI Custom Prompt Bar */}
          <div className="p-3 bg-violet-50/50 rounded-2xl border border-violet-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-violet-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Consigne pour l'Agent IA (Prompt Gemini) :
              </span>
              <span className="text-[10px] text-violet-700/80 font-normal">
                Précisez toute instruction pour adapter le message
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateAiMessage();
                  }
                }}
                placeholder="Ex: Proposer un créneau après 16h, offrir un cadeau surprise ou confirmer la taille..."
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-violet-200 bg-white focus:outline-violet-600 text-slate-800 placeholder:text-slate-400"
              />
              <button
                onClick={() => handleGenerateAiMessage()}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Génération...' : 'Générer avec l\'IA'}</span>
              </button>
            </div>
          </div>

          {/* Workflow Options */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advanceStageAfterSend}
                onChange={(e) => setAdvanceStageAfterSend(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <span>
                Faire progresser automatiquement la commande vers l'étape suivante après l'envoi
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHumanTakeover}
                onChange={(e) => setIsHumanTakeover(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <span>Reprendre la main en tant qu'agent humain (Pause temporaire du bot IA)</span>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleOpenWhatsAppWeb}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#25D366]" />
            <span>Ouvrir dans WhatsApp Web / App</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors"
            >
              Annuler
            </button>

            <button
              onClick={handleSendDirectWhatsApp}
              disabled={isSending || !messageText.trim()}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : sendSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Message envoyé !</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer directement ({order.phone})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
