'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  ExternalLink,
  Bot,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Check,
} from 'lucide-react';
import { TrackingOrder } from '@/types';

interface RescueInterventionModalProps {
  order: TrackingOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: string, updatedOrder?: any) => void;
}

type TabType = 'whatsapp' | 'call' | 'reprogram' | 'location';
type TemplateKey = 'injoignable_darija' | 'report_darija' | 'gps_darija' | 'cod_darija' | 'injoignable_fr';

export function RescueInterventionModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: RescueInterventionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('whatsapp');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('injoignable_darija');
  const [customMessage, setCustomMessage] = useState('');
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Après-midi (15h - 19h)');
  const [driverNote, setDriverNote] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [gpsUrl, setGpsUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Set default rescheduled date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduledDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Sync state when order prop changes
  useEffect(() => {
    if (!order) return;
    setNewAddress(order.address || '');
    setGpsUrl(order.gpsLocationUrl || '');
    setDriverNote('');
    setActionNotice(null);
  }, [order]);

  // Generate templates dynamically based on order details
  useEffect(() => {
    if (!order) return;

    const name = order.customerName || 'Cher client';
    const num = order.orderNumber || '';
    const prod = order.productName || 'votre commande';
    const amount = order.totalAmount || 0;
    const city = order.city || 'votre ville';

    if (selectedTemplate === 'injoignable_darija') {
      setCustomMessage(
        `السلام عليكم خويا/أختي ${name}، معكم مصلحة الزبناء بخصوص طلبيتكم رقم ${num} (${prod} - ${amount} درهم). الموزع ديال شركة التوصيل حاول يتصل بك اليوم ولكن ما شدش الخط. واش ممكن تأكد لينا الوقت المناسب للتوصيل غداً إن شاء الله؟ شكراً لك! 🚚`
      );
    } else if (selectedTemplate === 'report_darija') {
      setCustomMessage(
        `السلام عليكم ${name}، كنتواصلو معك بخصوص طلب تأجيل تسليم طلبيتكم رقم ${num}. واش ممكن تحدد لينا اليوم والساعة المناسبة ليك باش نخبرو موزع Sendit يجيبها ليك مباشرة؟ شكراً!`
      );
    } else if (selectedTemplate === 'gps_darija') {
      setCustomMessage(
        `السلام عليكم ${name}، موزع شركة التوصيل كيتواجد في ${city} ولكن محتاج توضيح العنوان أو إرسال موقع GPS في الواتساب لتسليم طلبيتك ${num}. عافاك شارك معنا اللوكيشن هنا. شكراً!`
      );
    } else if (selectedTemplate === 'cod_darija') {
      setCustomMessage(
        `السلام عليكم ${name}، نذكرك بأن طلبيتك رقم ${num} في طريقها إليك بمبلغ ${amount} درهم مع التوصيل. المرجو تجهيز المبلغ لتسهيل الاستلام مع الموزع غداً إن شاء الله. شكراً لثقتكم بنا! ✨`
      );
    } else if (selectedTemplate === 'injoignable_fr') {
      setCustomMessage(
        `Bonjour ${name}, nous constatons que le livreur Sendit n'a pas pu vous joindre aujourd'hui pour votre commande ${num} (${prod} - ${amount} MAD). À quel créneau ou adresse préféreriez-vous recevoir votre colis demain ? Merci de nous répondre sur ce numéro WhatsApp.`
      );
    }
  }, [order, selectedTemplate]);

  if (!isOpen || !order) return null;

  // Format clean Moroccan phone number
  const rawPhone = order.phoneNumber.replace(/\s+/g, '');
  const cleanPhone = rawPhone.startsWith('+212')
    ? rawPhone.slice(1)
    : rawPhone.startsWith('0')
    ? `212${rawPhone.slice(1)}`
    : `212${rawPhone}`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;

  // ── Handlers ──
  const handleSendWhatsAppViaBot = async () => {
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'SEND_WHATSAPP',
          phone: order.phoneNumber,
          messageText: customMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Message WhatsApp de sauvetage transmis avec succès au client !' });
        onSuccess('WHATSAPP_SENT');
      } else {
        setActionNotice({ type: 'error', message: `Erreur d'envoi : ${data.error || 'Échec de transmission'}` });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: `Erreur de connexion : ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprogramDelivery = async () => {
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'REPROGRAM',
          rescheduledDate,
          deliverySlot,
          driverNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Livraison reprogrammée avec succès et instructions transmises au livreur Sendit !' });
        setTimeout(() => {
          onSuccess('REPROGRAMMED');
          onClose();
        }, 1200);
      } else {
        setActionNotice({ type: 'error', message: `Erreur : ${data.error}` });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: `Erreur : ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAddress = async () => {
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'UPDATE_ADDRESS',
          newAddress,
          gpsLocationUrl: gpsUrl,
          driverNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Adresse et coordonnées GPS transmises au livreur Sendit avec succès !' });
        setTimeout(() => {
          onSuccess('ADDRESS_UPDATED');
          onClose();
        }, 1200);
      } else {
        setActionNotice({ type: 'error', message: `Erreur : ${data.error}` });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: `Erreur : ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSaved = async () => {
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'RESOLVE_SAVED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Colis sauvé avec succès et réintégré dans le circuit de distribution !' });
        setTimeout(() => {
          onSuccess('RESOLVE_SAVED');
          onClose();
        }, 1000);
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: `Erreur : ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!confirm('Êtes-vous certain de confirmer le refus client ? Le colis sera marqué en Retour définitif et le stock réservé sera libéré.')) {
      return;
    }
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/tracking/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'CONFIRM_RETURN',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: 'Refus enregistré. Colis transféré aux Retours et stock libéré.' });
        setTimeout(() => {
          onSuccess('CONFIRM_RETURN');
          onClose();
        }, 1000);
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: `Erreur : ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* ── 1. Top Header ── */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-indigo-800 text-white p-4 sm:p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-rose-500/80 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Cellule d'Intervention Rapide
            </span>
            <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full">
              ⏳ Délai Sendit &lt; 24h avant retour
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black tracking-tight">{order.orderNumber}</h2>
                <span className="font-mono text-xs bg-white/15 px-2 py-0.5 rounded border border-white/20 font-bold">
                  AWB: {order.trackingNumber}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">{order.customerName}</span>
                <span>•</span>
                <span className="font-mono">{order.phoneNumber}</span>
                <span>•</span>
                <span>{order.city}</span>
                <span>•</span>
                <span className="font-black text-amber-300">{order.totalAmount} MAD (COD)</span>
              </p>
            </div>

            <div className="text-left bg-white/10 backdrop-blur-xs rounded-xl px-3 py-1.5 border border-white/15">
              <span className="text-[10px] text-rose-200 block">Motif de l'échec :</span>
              <span className="text-xs font-bold text-white">
                ⚠️ {order.failedReason || 'Client Injoignable / Tentative infructueuse'}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Action Notice Banner ── */}
        {actionNotice && (
          <div
            className={`border-b px-4 py-2.5 text-xs font-bold flex items-center justify-between ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{actionNotice.message}</span>
            <button onClick={() => setActionNotice(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── 3. Tabs Navigation ── */}
        <div className="flex items-center bg-slate-100/80 border-b border-slate-200 px-3 sm:px-5 gap-1 sm:gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>1. Message WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('call')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'call'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>2. Appel Direct</span>
          </button>

          <button
            onClick={() => setActiveTab('reprogram')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'reprogram'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Reprogrammer Date</span>
          </button>

          <button
            onClick={() => setActiveTab('location')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'location'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>4. Adresse & GPS</span>
          </button>
        </div>

        {/* ── 4. Tab Body ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ────── TAB 1: WHATSAPP ────── */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  Sélectionnez le modèle de message adapté au motif d'échec :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('injoignable_darija')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                      selectedTemplate === 'injoignable_darija'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold">📵 Client Injoignable</span>
                    <span className="text-[10px] text-slate-500">Darija marocaine</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('report_darija')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                      selectedTemplate === 'report_darija'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold">🕒 Demande de Report</span>
                    <span className="text-[10px] text-slate-500">Nouvelle date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('gps_darija')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                      selectedTemplate === 'gps_darija'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold">📍 Demande Localisation</span>
                    <span className="text-[10px] text-slate-500">Adresse / GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('cod_darija')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                      selectedTemplate === 'cod_darija'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-bold">💰 Montant COD Exact</span>
                    <span className="text-[10px] text-slate-500">Préparation paiement</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Texte du message WhatsApp (personnalisable) :
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    Destinataire: {cleanPhone}
                  </span>
                </div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons for WhatsApp */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 text-xs sm:text-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>📱 Ouvrir WhatsApp Web / App (1-Click wa.me)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handleSendWhatsAppViaBot}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-5 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50"
                  title="Envoi automatique en arrière-plan via le serveur WhatsApp"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Envoi via Bot WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* ────── TAB 2: CALL DIRECT ────── */}
          {activeTab === 'call' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Appel téléphonique direct au client</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Le contact téléphonique direct reste la méthode la plus rapide pour sauver un colis COD avant la fin du délai Sendit.
                  </p>
                  <p className="text-base font-black text-blue-700 font-mono mt-2">
                    📞 {order.phoneNumber}
                  </p>
                </div>
                <a
                  href={`tel:${order.phoneNumber}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all shrink-0"
                >
                  <Phone className="w-4 h-4" />
                  <span>Appeler maintenant</span>
                </a>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Enregistrer l'issue de l'appel dans le système :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDriverNote('Client a répondu au téléphone et confirmé sa réception pour demain.');
                      setActiveTab('reprogram');
                    }}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 text-xs font-bold text-left transition-colors"
                  >
                    ✅ Client joint & confirmé pour demain
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverNote('Numéro injoignable ou messagerie vocale. Relance WhatsApp envoyée.');
                      setActiveTab('whatsapp');
                    }}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-bold text-left transition-colors"
                  >
                    📵 Injoignable / Messagerie vocale
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverNote('Le client a confirmé verbalement son refus de la commande.');
                      handleConfirmReturn();
                    }}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-900 text-xs font-bold text-left transition-colors"
                  >
                    ❌ Client refuse définitivement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB 3: REPROGRAMMER ────── */}
          {activeTab === 'reprogram' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Date de re-livraison souhaitée :
                  </label>
                  <input
                    type="date"
                    value={rescheduledDate}
                    onChange={(e) => setRescheduledDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Créneau horaire de livraison :
                  </label>
                  <select
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Matin (10h - 14h)">Matin (10h - 14h)</option>
                    <option value="Après-midi (15h - 19h)">Après-midi (15h - 19h)</option>
                    <option value="Toute la journée (09h - 19h)">Toute la journée (09h - 19h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Instructions spécifiques pour le livreur Sendit :
                </label>
                <input
                  type="text"
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  placeholder="Ex: Client disponible au travail, appeler 15 min avant l'arrivée..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleReprogramDelivery}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>💾 Confirmer la reprogrammation & notifier le livreur</span>
              </button>
            </div>
          )}

          {/* ────── TAB 4: LOCATION / GPS ────── */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Adresse de livraison complète :
                </label>
                <textarea
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lien de position GPS (Google Maps ou WhatsApp Location) :
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={gpsUrl}
                    onChange={(e) => setGpsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=33.5731,-7.5898"
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  {gpsUrl && (
                    <a
                      href={gpsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-amber-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Indications et repères d'accès pour le livreur :
                </label>
                <input
                  type="text"
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  placeholder="Ex: En face de la pharmacie, Immeuble 4, 2ème étage..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handleUpdateAddress}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span>📍 Enregistrer & transmettre les coordonnées au livreur</span>
              </button>
            </div>
          )}

        </div>

        {/* ── 5. Bottom Resolution Footer ── */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">Décision de traitement :</span>
            <button
              type="button"
              onClick={handleMarkSaved}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black rounded-lg transition-colors border border-emerald-300 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✅ Colis Sauvé (Remettre en livraison)</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>❌ Refus Définitif (Valider le retour)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
