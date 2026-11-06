'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Megaphone,
  Upload,
  Image as ImageIcon,
  Video,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Send,
  Loader2,
  AlertCircle,
  MapPin,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { MOROCCAN_CITIES } from '@/lib/moroccan-cities';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCampaignModalProps) {
  // Campaign Form State
  const [name, setName] = useState('');
  const [useDeliveredAudience, setUseDeliveredAudience] = useState(true);
  const [useManualPaste, setUseManualPaste] = useState(false);
  const [cityFilter, setCityFilter] = useState('ALL');
  const [manualText, setManualText] = useState('');

  // Media
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'NONE' | 'IMAGE' | 'VIDEO'>('NONE');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Message & Personalization
  const [messageText, setMessageText] = useState(
    'Salam {nom} ! 👋 Suite à votre commande livrée à {ville}, nous vous offrons une remise exclusive de -30% sur notre nouvelle collection. Stock limité ! ✨'
  );
  const [buttonLabel, setButtonLabel] = useState('Commander avec -30% 🛍️');
  const [quickReplyText, setQuickReplyText] = useState(
    'سلام بغيت نستافد من عرض التخفيض، عفاك واش باقي متوفر؟'
  );

  // Throttling
  const [delayMinSeconds, setDelayMinSeconds] = useState(6);
  const [delayMaxSeconds, setDelayMaxSeconds] = useState(15);

  // Calculated Audience Stats
  const [isCalculatingAudience, setIsCalculatingAudience] = useState(false);
  const [calculatedCount, setCalculatedCount] = useState(0);
  const [sampleRecipients, setSampleRecipients] = useState<any[]>([]);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-calculate audience when selection changes
  useEffect(() => {
    if (!isOpen) return;
    fetchAudienceCount();
  }, [useDeliveredAudience, useManualPaste, cityFilter, manualText, isOpen]);

  const fetchAudienceCount = async () => {
    setIsCalculatingAudience(true);
    try {
      let targetType = 'PAST_DELIVERED';
      if (useDeliveredAudience && useManualPaste) targetType = 'HYBRID';
      else if (useManualPaste) targetType = 'MANUAL_PASTE';

      const res = await fetch('/api/campaigns/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          city: cityFilter,
          manualText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCalculatedCount(data.totalCount);
        setSampleRecipients(data.previewSample || []);
      }
    } catch (err) {
      console.error('Error calculating audience:', err);
    } finally {
      setIsCalculatingAudience(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploadingMedia(true);
    setErrorMsg(null);
    setMediaFile(file);

    // Create local object URL for instant preview
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
    setMediaType(file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMediaUrl(data.url);
        setMediaType(data.mediaType);
      } else {
        setErrorMsg(data.error || 'Échec du téléversement');
      }
    } catch (err: any) {
      setErrorMsg(`Erreur réseau: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = messageText;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setMessageText(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tag.length;
        textareaRef.current.focus();
      }
    }, 10);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaUrl('');
    setMediaType('NONE');
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Veuillez donner un nom à la campagne');
      return;
    }
    if (!useDeliveredAudience && !useManualPaste) {
      setErrorMsg('Veuillez sélectionner au moins une source de destinataires');
      return;
    }
    if (calculatedCount === 0) {
      setErrorMsg('Aucun destinataire éligible trouvé');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let targetAudienceType = 'PAST_DELIVERED';
    if (useDeliveredAudience && useManualPaste) targetAudienceType = 'HYBRID';
    else if (useManualPaste) targetAudienceType = 'MANUAL_PASTE';

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetAudienceType,
          cityFilter,
          manualNumbersText: manualText,
          messageText,
          mediaUrl: mediaUrl || null,
          mediaType,
          quickReplyText: quickReplyText ? quickReplyText.trim() : null,
          buttonLabel: buttonLabel ? buttonLabel.trim() : null,
          delayMinSeconds,
          delayMaxSeconds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setName('');
        setManualText('');
        setMediaFile(null);
        setMediaUrl('');
        setMediaType('NONE');
        setMediaPreview(null);
        onSuccess(data.campaignId);
        onClose();
      } else {
        setErrorMsg(data.error || 'Erreur lors de la création de la campagne');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Mock preview values
  const previewName = sampleRecipients[0]?.name || 'Salma Alaoui';
  const previewCity = sampleRecipients[0]?.city || 'Casablanca';
  const previewProduct = sampleRecipients[0]?.productName || 'Kaftan Lin Italien';

  const previewFormattedText = messageText
    .replace(/\{nom\}/gi, previewName)
    .replace(/\{name\}/gi, previewName)
    .replace(/\{ville\}/gi, previewCity)
    .replace(/\{city\}/gi, previewCity)
    .replace(/\{produit\}/gi, previewProduct)
    .replace(/\{product\}/gi, previewProduct);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 text-slate-800">
        
        {/* Header */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                <span>Créer une Campagne Broadcast WhatsApp</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Baileys Connecté
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Envoi direct de photos, vidéos et messages interactifs avec réponses rapides en 1 clic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: FORM SETTINGS (7 COLS) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">
            
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Campaign Name */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800">
                Nom de la Campagne <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Offre Spéciale Kaftan - Clients Livrés Casablanca"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 font-bold text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* 2. Target Audience Segmentation */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Sélection de l'Audience Destinataire</span>
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                  {isCalculatingAudience ? 'Calcul...' : `${calculatedCount} destinataires`}
                </span>
              </div>

              {/* Option A: Past Delivered Customers */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={useDeliveredAudience}
                  onChange={(e) => setUseDeliveredAudience(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600"
                />
                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Anciens Clients Ayant Reçu leur Colis (Statut: Livré)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      Recommandé COD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clients satisfaits et vérifiés avec fort taux de rachat et de confiance.
                  </p>

                  {useDeliveredAudience && (
                    <div className="mt-2 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="text-[11px] font-bold p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-blue-600"
                      >
                        <option value="ALL">Toutes les villes marocaines</option>
                        {MOROCCAN_CITIES.slice(0, 30).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Option B: Manual Numbers Paste */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={useManualPaste}
                  onChange={(e) => setUseManualPaste(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600"
                />
                <div className="text-xs flex-1">
                  <span className="font-bold text-slate-900 block">
                    Coller des Numéros Manuellement (Paste Text)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Collez une liste de téléphones (un par ligne ou séparés par virgule).
                  </p>

                  {useManualPaste && (
                    <textarea
                      rows={3}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Ex:&#10;0661223344, Youssef&#10;0672112233, Amina&#10;0654998877"
                      className="mt-2 w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                    />
                  )}
                </div>
              </label>
            </div>

            {/* 3. Media Upload (Photo ou Vidéo) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>Média Promotionnel (Photo ou Vidéo)</span>
                </span>
                {mediaPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              {!mediaPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-300 hover:border-purple-400 bg-white rounded-2xl text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">
                    {isUploadingMedia ? 'Téléversement en cours...' : 'Cliquez pour choisir une photo ou une vidéo'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Formats acceptés : JPG, PNG, WEBP, MP4 (Max 25 Mo)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  {mediaType === 'VIDEO' ? (
                    <video src={mediaPreview} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <img src={mediaPreview} alt="Aperçu" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="text-xs flex-1 truncate">
                    <span className="font-bold text-slate-900 block truncate">
                      {mediaFile?.name || 'Média sélectionné'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {isUploadingMedia ? 'Téléversement...' : 'Prêt à l\'envoi ✓'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Message Text & Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800">
                  Texte du Message & Personnalisation <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400">Insérer variable :</span>
                  <button
                    type="button"
                    onClick={() => insertTag('{nom}')}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md hover:bg-blue-100 cursor-pointer"
                  >
                    {'{nom}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{ville}')}
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md hover:bg-emerald-100 cursor-pointer"
                  >
                    {'{ville}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{produit}')}
                    className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md hover:bg-purple-100 cursor-pointer"
                  >
                    {'{produit}'}
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                rows={4}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Rédigez votre texte promotionnel ici..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 text-slate-900 bg-slate-50 focus:bg-white leading-relaxed resize-none font-medium"
              />
            </div>

            {/* 5. Quick Reply Button (Bouton de réponse rapide) */}
            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Bouton de Réponse Rapide en 1 Clic (Quick Reply)</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Permet au client de répondre instantanément d'un seul clic avec un message pré-rempli.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Texte affiché sur le bouton :
                  </label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    placeholder="Ex: Commander l'offre 🛍️"
                    className="w-full text-xs p-2.5 rounded-xl border border-emerald-200 bg-white font-bold text-slate-800 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Message pré-rempli envoyé par le client :
                  </label>
                  <input
                    type="text"
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder="Ex: سلام بغيت نستافد من العرض..."
                    className="w-full text-xs p-2.5 rounded-xl border border-emerald-200 bg-white font-medium text-slate-800 focus:outline-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 6. Anti-Ban Throttling Settings */}
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">Protection Anti-Ban :</span>
                <span>Délai aléatoire {delayMinSeconds}s à {delayMaxSeconds}s entre envois</span>
              </div>
              <span className="text-[10px] text-slate-400">Simulation humaine active</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || calculatedCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création de la campagne...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Créer la Campagne ({calculatedCount} Destinataires)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RIGHT COLUMN: LIVE SMARTPHONE PREVIEW (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="sticky top-2 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>Aperçu Réel sur Téléphone</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  Format WhatsApp
                </span>
              </div>

              {/* Smartphone Frame */}
              <div className="w-full bg-[#E5DDD5] rounded-[36px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[540px]">
                
                {/* WhatsApp Chat Top Bar */}
                <div className="bg-[#075E54] text-white p-3 px-4 flex items-center gap-3 shrink-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 border border-white/40 flex items-center justify-center font-bold text-xs">
                    IQ
                  </div>
                  <div className="text-left flex-1 truncate">
                    <span className="font-bold text-xs block leading-tight truncate">
                      Votre Marque Store
                    </span>
                    <span className="text-[9px] text-emerald-200 block">En ligne</span>
                  </div>
                </div>

                {/* Chat Bubble Area */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                  <div className="text-center">
                    <span className="text-[9px] bg-white/70 px-2 py-0.5 rounded shadow-2xs text-slate-600 font-medium">
                      Aujourd'hui
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-white rounded-2xl rounded-tl-none p-2 shadow-sm max-w-[92%] space-y-2 text-slate-800">
                    
                    {/* Media Thumbnail */}
                    {mediaPreview && (
                      <div className="rounded-xl overflow-hidden bg-slate-100 max-h-48 flex items-center justify-center">
                        {mediaType === 'VIDEO' ? (
                          <video src={mediaPreview} controls className="w-full max-h-48 object-cover" />
                        ) : (
                          <img src={mediaPreview} alt="Média" className="w-full max-h-48 object-cover" />
                        )}
                      </div>
                    )}

                    {/* Caption / Text */}
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                      {previewFormattedText}
                    </p>

                    {/* Quick Reply Button Mockup */}
                    {buttonLabel && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <div className="w-full py-2 px-3 bg-[#E7F8F0] hover:bg-[#d8f3e5] text-[#075E54] font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 border border-emerald-300 shadow-2xs">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{buttonLabel}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400">
                        12:30 • ✓✓
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Bottom Input Bar */}
                <div className="bg-[#F0F0F0] p-2 px-3 border-t border-slate-300 flex items-center gap-2 shrink-0">
                  <div className="flex-1 bg-white h-7 rounded-full border border-slate-300 px-3 text-[10px] text-slate-400 flex items-center">
                    Message
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-xs">
                    🎙️
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

