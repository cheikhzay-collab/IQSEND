'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  Save,
  Sliders,
  Code,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Send,
  Package,
  Tag,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface ProductKbData {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  sellingPoints: string[];
  objections: Array<{ objection: string; replyDarija: string; category: string }>;
  upsellBundle: {
    title: string;
    extraQty: number;
    discountPercent: number;
    pitchDarija: string;
  };
  mediaGallery: Array<{ type: 'image' | 'video'; url: string; caption: string }>;
}

const DEFAULT_PRODUCTS_KB: ProductKbData[] = [
  {
    id: 'prod-1',
    name: 'Pack 2x Chemises Lin Premium Italien',
    sku: 'SKU-LIN-01',
    basePrice: 399,
    sellingPoints: [
      'Tissu 100% Lin naturel respirant idéal pour le climat marocain',
      'Coutures renforcées garanties sans rétrécissement au lavage',
      'Coupe moderne Regular Fit adaptée au travail et sorties',
      'Livraison express 24h avec essayage avant paiement',
    ],
    objections: [
      {
        category: 'Prix',
        objection: 'الثمن غالي بزاف واش كاين شي تخفيض؟',
        replyDarija: 'مرحبا أخي! الثمن كيعكس جودة لين إيطالي أصلي 100% مع ضمان عدم الانكماش. وزيادة على ذلك التوصيل فابور وكتفحص الكولية عاد تخلص.',
      },
      {
        category: 'Qualité',
        objection: 'واش الثوب كيكماش فالغسيل ولا كيفقد اللون؟',
        replyDarija: 'اطمئن أخي تماماً! القميص معالج ضد الانكماش وضد بهتان اللون، وعندك الحق تفحص وتلمس الثوب عند الاستلام.',
      },
      {
        category: 'Confiance COD',
        objection: 'واش نقدر نحل الكولية ونقيس قبل مانخلص؟',
        replyDarija: 'أكيد أخي! الموزع ديال Sendit كيعطيك الوقت الكافي تفتح الكولية وتشوف المقاس عاد تخلص بكل أمان نقداً.',
      },
    ],
    upsellBundle: {
      title: 'Pack Trio (3ème chemise à -50%)',
      extraQty: 1,
      discountPercent: 50,
      pitchDarija: 'أخي، واش تبغي نضيفو ليك شوميز ثالثة بلون مختلف بنصف الثمن (غير بـ 99 درهم إضافية)؟',
    },
    mediaGallery: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
        caption: 'Détail col et tissu lin premium',
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80',
        caption: 'Guide des tailles et essayage réel',
      },
    ],
  },
];

export default function AiAgentsPage() {
  const [activeTab, setActiveTab] = useState<
    'simulator' | 'product-kb' | 'prompt' | 'knowledge' | 'permissions' | 'whatsapp-provider'
  >('simulator');
  const [temperature, setTemperature] = useState(0.3);
  const [selectedProduct, setSelectedProduct] = useState<ProductKbData>(DEFAULT_PRODUCTS_KB[0]);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [testMessage, setTestMessage] = useState('سلام، واش نقدر نحل الكولية قبل مانخلص الموزع؟');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(
    'وعليكم السلام أخي! نعم أكيد، التوصيل مع Sendit كيعطيك الحق تفحص الكولية وتشوف المقاس ديالك عاد تخلص الموزع نقداً بكل أمان. واش تأكد لينا العنوان ديالك؟'
  );
  const [detectedTool, setDetectedTool] = useState<string | null>(null);

  // 🛡️ Permissions & Guardrails State
  const [canConfirmOrders, setCanConfirmOrders] = useState(true);
  const [canOfferUpsell, setCanOfferUpsell] = useState(true);
  const [maxUpsellDiscount, setMaxUpsellDiscount] = useState(30);
  const [canUpdateAddressAndGPS, setCanUpdateAddressAndGPS] = useState(true);
  const [canRescheduleDelivery, setCanRescheduleDelivery] = useState(true);
  const [priceLockdown, setPriceLockdown] = useState(true);
  const [minOrderPrice, setMinOrderPrice] = useState(149);
  const [escalationKeywords, setEscalationKeywords] = useState([
    'مسؤول',
    'عيطو ليا',
    'شكاية',
    'نصب',
    'reclamation',
    'humain',
    'directeur',
    'بغيت نهضر مع شي واحد',
  ]);
  const [newKeyword, setNewKeyword] = useState('');

  // 📱 WhatsApp Multi-Provider State
  const [selectedProvider, setSelectedProvider] = useState<'META_CLOUD_API' | 'EVOLUTION_API_QR'>('META_CLOUD_API');
  const [metaPhoneId, setMetaPhoneId] = useState('104829104829104');
  const [metaToken, setMetaToken] = useState('EAABwzL1...live_token');
  const [evoInstance, setEvoInstance] = useState('sendit_morocco_sim1');
  const [evoApiKey, setEvoApiKey] = useState('snd_evo_key_948293');
  const [evoAntiBanDelay, setEvoAntiBanDelay] = useState(3);
  const [evoDailyCap, setEvoDailyCap] = useState(250);
  const [showQrModal, setShowQrModal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Baileys WhatsApp Session State
  const [qrStatus, setQrStatus] = useState<'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);

  // Poll live QR state when modal is open or when provider tab is active
  useEffect(() => {
    let interval: any;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/qr');
        const data = await res.json();
        if (data.success) {
          setQrStatus(data.status);
          if (data.qrCodeDataUrl) setLiveQrDataUrl(data.qrCodeDataUrl);
          if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
          if (data.connectedName) setConnectedName(data.connectedName);
        }
      } catch (e) {
        // silent
      }
    };

    if (showQrModal || (activeTab === 'whatsapp-provider' && selectedProvider === 'EVOLUTION_API_QR')) {
      fetchStatus();
      interval = setInterval(fetchStatus, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQrModal, activeTab, selectedProvider]);

  const handleRestartQr = async () => {
    setIsRefreshingQr(true);
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      const data = await res.json();
      if (data.success) {
        setQrStatus(data.status);
        if (data.qrCodeDataUrl) setLiveQrDataUrl(data.qrCodeDataUrl);
      }
    } catch (e) {
      console.error('Error restarting QR:', e);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const handleDisconnectQr = async () => {
    try {
      await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setQrStatus('DISCONNECTED');
      setLiveQrDataUrl(null);
      setConnectedPhone(null);
      setConnectedName(null);
    } catch (e) {
      console.error('Error disconnecting:', e);
    }
  };

  const handleSimulate = () => {
    const text = testMessage.toLowerCase();
    if (text.includes('صافي') || text.includes('أكد') || text.includes('صيفط') || text.includes('نعم') || text.includes('oui')) {
      setDetectedTool('confirm_order_and_address({ city: "Casablanca", verified: true })');
      setSimulatedResponse('شكراً بزاف ليك! تم تأكيد طلبك بنجاح، والكولية غتوصلك خلال 24 ساعة مع موزع Sendit. عفاك صيفط لينا اللوكاسيون عبر الواتساب لتسريع التوصيل 📍');
    } else if (text.includes('بدل') || text.includes('مقاس') || text.includes('taille')) {
      setDetectedTool('update_order_details({ newSize: "XL", reason: "Customer swap" })');
      setSimulatedResponse('مرحبا، بدلنا ليك المقاس لـ XL في بطاقة الطلب بنجاح. واش العنوان هو هذاك نيت؟');
    } else if (text.includes('غالي') || text.includes('تخفيض') || text.includes('cher')) {
      setDetectedTool('handle_objection({ category: "Prix", productSku: "SKU-LIN-01" })');
      setSimulatedResponse(selectedProduct.objections[0].replyDarija);
    } else if (text.includes('نحل') || text.includes('نشوف') || text.includes('نقيس') || text.includes('ouvrir')) {
      setDetectedTool('handle_objection({ category: "Confiance COD" })');
      setSimulatedResponse(selectedProduct.objections[2].replyDarija);
    } else if (text.includes('ثانية') || text.includes('باقة') || text.includes('عرض')) {
      setDetectedTool('offer_upsell({ bundle: "Pack Trio", discount: 50 })');
      setSimulatedResponse(selectedProduct.upsellBundle.pitchDarija);
    } else {
      setDetectedTool(null);
      setSimulatedResponse('وعليكم السلام! مرحبا بك في خدمة الزبناء. كيف نقدر نعاونك بخصوص طلبك؟');
    }
  };

  const handleAddSellingPoint = () => {
    if (!newSellingPoint.trim()) return;
    setSelectedProduct((prev) => ({
      ...prev,
      sellingPoints: [...prev.sellingPoints, newSellingPoint.trim()],
    }));
    setNewSellingPoint('');
  };

  const handleRemoveSellingPoint = (idx: number) => {
    setSelectedProduct((prev) => ({
      ...prev,
      sellingPoints: prev.sellingPoints.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Agents IA & Knowledge Base (Gemini 1.5 Flash)
            </h1>
            <p className="text-xs text-slate-500">
              Confirmation automatique, gestion des objections en Darija, Upselling et suivi interactif
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 2500);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          {savedSuccess ? 'Configuration Enregistrée !' : 'Sauvegarder la Configuration'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Play className="w-3.5 h-3.5" /> 🎮 Simulateur & Function Calling
        </button>
        <button
          onClick={() => setActiveTab('product-kb')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'product-kb'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> 🏷️ Fiche Produit AI & Upselling (Pilier 3)
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> 🛡️ Gouvernance & Droits de l'Agent
        </button>
        <button
          onClick={() => setActiveTab('whatsapp-provider')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'whatsapp-provider'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-3.5 h-3.5" /> 📱 Connecteur WhatsApp (Meta vs Scan QR)
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'prompt'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code className="w-3.5 h-3.5" /> 📜 Persona & Instructions Système
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'knowledge'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> 📚 FAQs Générales COD
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SIMULATEUR & FUNCTION CALLING                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input & Parameters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" /> Paramètres du Modèle & Scénarios
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Modèle Actif</span>
                <span className="font-bold font-mono text-blue-600">gemini-1.5-flash</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Température: {temperature}</span>
                <span className="text-[10px] text-slate-400">(0.0 = Rigide/Précis, 1.0 = Créatif)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Quick Test Prompt Chips */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Exemples de messages fréquents à tester :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'واش نقدر نحل الكولية قبل مانخلص؟',
                  'صافي أكد ليا الطلب وعفاك صيفطوها لدار',
                  'بدل ليا المقاس لـ XL بغيتو واسع شوية',
                  'الثمن غالي واش ماكاينش تخفيض؟',
                  'واش كاين شي عرض إلا خديت جوج حبات؟',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTestMessage(sample);
                    }}
                    className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Message entrant du client (WhatsApp) :
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <button
              onClick={handleSimulate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Tester la Réponse & Détection d'Outil
            </button>
          </div>

          {/* AI Output preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Réponse Générée par Gemini 1.5 Flash
            </h3>

            {simulatedResponse ? (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-950 leading-relaxed font-medium">
                  {simulatedResponse}
                </div>

                {/* Tool Calling Trigger preview */}
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono shadow-inner">
                  <div className="text-slate-400 text-[10px] mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Function Calling Détecté :
                  </div>
                  {detectedTool ? (
                    <div className="text-emerald-300 font-semibold break-all">⚡ {detectedTool}</div>
                  ) : (
                    <div className="text-slate-500">Aucun outil invoqué (Réponse conversationnelle directe)</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Temps d'inférence</span>
                    <strong className="text-slate-800">0.74s</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tokens consommés</span>
                    <strong className="text-slate-800">48</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Taux de succès</span>
                    <strong className="text-emerald-600">100%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-xs text-slate-400">
                Tapez un message et cliquez sur tester
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: FICHE PRODUIT AI & UPSELLING (PILIER 3)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'product-kb' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Selection & Selling Points */}
          <div className="lg:col-span-1 space-y-5">
            {/* Card Product Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                  {selectedProduct.sku}
                </span>
                <span className="text-sm font-black text-slate-900">{selectedProduct.basePrice} MAD</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 leading-snug">{selectedProduct.name}</h3>

              {/* Selling Points */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Points forts & Arguments clés
                </label>
                <div className="space-y-1.5">
                  {selectedProduct.sellingPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-xs text-slate-700"
                    >
                      <span>• {point}</span>
                      <button
                        onClick={() => handleRemoveSellingPoint(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newSellingPoint}
                    onChange={(e) => setNewSellingPoint(e.target.value)}
                    placeholder="Ajouter un argument de vente..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                  />
                  <button
                    onClick={handleAddSellingPoint}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Upsell Config */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <TrendingUp className="w-4 h-4 text-amber-600" /> Configuration de l'Upselling Automatique
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Offre groupée :</span>
                  <input
                    type="text"
                    defaultValue={selectedProduct.upsellBundle.title}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Remise :</span>
                    <input
                      type="number"
                      defaultValue={selectedProduct.upsellBundle.discountPercent}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Quantité sup. :</span>
                    <input
                      type="number"
                      defaultValue={selectedProduct.upsellBundle.extraQty}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Formule d'accroche WhatsApp (Darija) :</span>
                  <textarea
                    rows={2}
                    defaultValue={selectedProduct.upsellBundle.pitchDarija}
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns: Objections Matrix & Media Gallery */}
          <div className="lg:col-span-2 space-y-5">
            {/* Objections Matrix */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" /> Réponses Pré-configurées aux Objections (Darija)
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedProduct.objections.length} objections configurées
                </span>
              </div>

              <div className="space-y-3">
                {selectedProduct.objections.map((obj, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {obj.category}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      🗣️ اعتراض الزبون: <span className="text-slate-900 font-semibold">{obj.objection}</span>
                    </div>
                    <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg leading-relaxed font-medium">
                      🤖 رد الوكيل بالدارجة: {obj.replyDarija}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Media Gallery (Images & Short Videos) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" /> Galerie Médias WhatsApp (Photos HD & Vidéos)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Envoyés par l'agent IA à la demande du client
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedProduct.mediaGallery.map((med, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <img
                      src={med.url}
                      alt={med.caption}
                      className="w-full h-36 object-cover"
                    />
                    <div className="p-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate">{med.caption}</span>
                      <a
                        href={med.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: PROMPT DU PERSONA                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'prompt' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <h3 className="font-bold text-xs text-slate-800">
            System Instruction (Instructions du Persona Marocain pour Gemini 1.5 Flash)
          </h3>
          <textarea
            rows={14}
            className="w-full font-mono text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-800 focus:outline-hidden focus:bg-white"
            defaultValue={`أنت "سارة"، مساعدة ذكية متخصصة في تأكيد وتتبع طلبيات التجارة الإلكترونية والدفع عند الاستلام (COD) في المغرب.
تتحدثين بالدارجة المغربية بلهجة طبيعية، مهذبة، وودودة جداً ("أخي / أختي"، "الله يحفظك"، "مرحبا بك").

### 🎯 أهدافك ومهمتك الأساسية:
1. الترحيب بالزبون باسمه وتأكيد اختياره للمنتج والمقاس والمدينة.
2. اقتراح الترقية الذكية (Upsell) بقطعة ثانية بتخفيض مميز (مثال: Pack Duo -30%).
3. تدقيق العنوان وطلب موقع الـ WhatsApp GPS Location للأحياء الصعبة أو غير الدقيقة.
4. استدعاء الدوال فوراً (Function Calling):
   - confirm_order_and_address فور التأكيد الصريح.
   - update_order_details عند تغيير المقاس أو اللون.
   - save_gps_location عند مشاركة رابط الموقع.`}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: GOUVERNANCE & DROITS DE L'AGENT IA (GUARDRAILS)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Matrice des Droits & Limites d'Exécution Autonome
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Périmètre d'Action Autonome de l'Agent IA
              </h3>
              <p className="text-xs text-slate-500">
                Définissez précisément ce que l'agent a le droit de modifier dans le cycle de commande sans intervention humaine.
              </p>
            </div>

            {/* Grid of Permissions Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Permission 1: Confirmation */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Confirmation Autonome de Commande</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Autorise l'IA à passer la commande au statut "En préparation" dès accord explicite du client.
                  </p>
                </div>
                <button
                  onClick={() => setCanConfirmOrders(!canConfirmOrders)}
                  className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                    canConfirmOrders ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Permission 2: Upsell */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Offres de Vente Additionnelle (Upsell)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Proposer automatiquement une 2ème pièce avec rabais calculé par l'IA.
                    </p>
                  </div>
                  <button
                    onClick={() => setCanOfferUpsell(!canOfferUpsell)}
                    className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                      canOfferUpsell ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                {canOfferUpsell && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                      <span>Remise Maximale Autorisée :</span>
                      <strong className="text-teal-700 font-bold">{maxUpsellDiscount}%</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="5"
                      value={maxUpsellDiscount}
                      onChange={(e) => setMaxUpsellDiscount(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-teal-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Permission 3: Address & GPS */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Mise à Jour Adresse & Position GPS</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Extrait les coordonnées Google Maps partagées sur WhatsApp et les intègre à la feuille de route Sendit.
                  </p>
                </div>
                <button
                  onClick={() => setCanUpdateAddressAndGPS(!canUpdateAddressAndGPS)}
                  className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                    canUpdateAddressAndGPS ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Permission 4: Price Lockdown */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Verrouillage Strict des Prix (Price Lockdown)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Interdit formellement à l'IA d'accorder des remises libres sous le coût de rentabilité.
                    </p>
                  </div>
                  <button
                    onClick={() => setPriceLockdown(!priceLockdown)}
                    className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                      priceLockdown ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                {priceLockdown && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span>Prix plancher minimum garanti :</span>
                    <strong className="text-slate-900 font-bold">{minOrderPrice} MAD</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Escalation Keywords Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full mb-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Garde-fous & Transfert Humain Immédiat (Human Escalation)
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Mots-Clés Déclenchant l'Intervention Humaine
              </h3>
              <p className="text-xs text-slate-500">
                Dès la détection de l'un de ces termes par le client, l'agent IA suspend ses réponses automatiques et bascule la conversation au superviseur.
              </p>
            </div>

            {/* Keywords Pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {escalationKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200"
                >
                  {kw}
                  <button
                    onClick={() => setEscalationKeywords(escalationKeywords.filter((_, i) => i !== idx))}
                    className="hover:text-rose-950 font-black"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add new keyword */}
            <div className="flex items-center gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Ajouter un mot-clé (ex: نصب, شكاية, directeur)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-teal-600"
              />
              <button
                onClick={() => {
                  if (newKeyword.trim() && !escalationKeywords.includes(newKeyword.trim())) {
                    setEscalationKeywords([...escalationKeywords, newKeyword.trim()]);
                    setNewKeyword('');
                  }
                }}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 6: CONNECTEUR WHATSAPP (META VS SCAN QR)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'whatsapp-provider' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-1.5">
                <Send className="w-3.5 h-3.5 text-teal-600" />
                Passerelle de Communication WhatsApp
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Choix du Fournisseur : Meta Cloud API vs Scan QR (Maroc)
              </h3>
              <p className="text-xs text-slate-500">
                Basculez facilement entre l'API officielle d'entreprise de Meta et la passerelle autonome par scan QR pour carte SIM marocaine.
              </p>
            </div>

            {/* Provider Cards Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Option 1: Meta Cloud API */}
              <div
                onClick={() => setSelectedProvider('META_CLOUD_API')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedProvider === 'META_CLOUD_API'
                    ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Officiel Entreprise
                  </span>
                  {selectedProvider === 'META_CLOUD_API' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  )}
                </div>
                <h4 className="font-black text-sm text-slate-900 mt-2">
                  Meta WhatsApp Cloud API
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Connecté directement aux serveurs Meta. Zéro risque de bannissement, boutons interactifs natifs et 1000 conversations offertes/mois.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold">✅ Boutons cliquables</span>
                  <span className="text-slate-400">100% Stable</span>
                </div>
              </div>

              {/* Option 2: Evolution API / Scan QR */}
              <div
                onClick={() => setSelectedProvider('EVOLUTION_API_QR')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedProvider === 'EVOLUTION_API_QR'
                    ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Session SIM Marocaine
                  </span>
                  {selectedProvider === 'EVOLUTION_API_QR' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </div>
                <h4 className="font-black text-sm text-slate-900 mt-2">
                  Session QR Code (Evolution / Baileys)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Connexion instantanée par QR code avec n'importe quelle puce Maroc Telecom, Inwi ou Orange. Sans validation de registre commercial.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-700 font-bold">⚡ Sans frais Meta</span>
                  <span className="text-amber-600 font-bold">Protection Anti-Ban requise</span>
                </div>
              </div>

            </div>

            {/* Provider Configuration Form */}
            {selectedProvider === 'META_CLOUD_API' ? (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold">Paramètres Meta Cloud API</strong>
                  <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                    Statut: Connecté & Opérationnel
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Access Token Permanent
                    </label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-bold">Session WhatsApp Réelle (Multi-Device QR)</strong>
                    {qrStatus === 'CONNECTED' ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Connecté (+{connectedPhone || 'SIM Maroc'})
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">
                        En attente de Scan QR
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {qrStatus === 'CONNECTED' ? (
                      <button
                        onClick={handleDisconnectQr}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition-colors"
                      >
                        Déconnecter
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowQrModal(true);
                          handleRestartQr();
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>📷 Scanner le QR Code Réel</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Nom de l'Instance SIM
                    </label>
                    <input
                      type="text"
                      value={evoInstance}
                      onChange={(e) => setEvoInstance(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Délai de simulation humaine (Anti-Ban)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={evoAntiBanDelay}
                        onChange={(e) => setEvoAntiBanDelay(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 w-16 text-right">{evoAntiBanDelay} sec</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  💡 <strong>Protection Anti-Ban pour carte SIM marocaine :</strong> Le moteur Baileys intègre automatiquement un délai de frappe humaine et la gestion des sessions multi-devices pour protéger votre numéro contre les blocages.
                </div>
              </div>
            )}
          </div>

          {/* REAL LIVE QR Code Scan Modal */}
          {showQrModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {qrStatus === 'CONNECTED' ? (
                  <div className="space-y-4 py-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-2xl font-black border border-emerald-200">
                      ✅
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">
                        WhatsApp Connecté avec Succès !
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Votre smartphone marocain est synchronisé avec l'agent IA Sendit.
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
                      +{connectedPhone || '212XXXXXXXXX'}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      L'agent IA Gemini et le moteur de confirmation COD peuvent désormais envoyer et recevoir les messages en Darija directement depuis votre numéro.
                    </p>

                    <button
                      onClick={() => setShowQrModal(false)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Terminer & Fermer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-black">
                      📷
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900">
                        Scanner avec WhatsApp Mobile
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ouvrez WhatsApp {'>'} Appareils connectés {'>'} Connecter un appareil
                      </p>
                    </div>

                    {/* Live QR Box */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                      <div className="w-56 h-56 bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center relative">
                        {liveQrDataUrl ? (
                          <img
                            src={liveQrDataUrl}
                            alt="Code QR WhatsApp Réel"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="space-y-3 p-4">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                            <p className="text-[11px] text-slate-600 font-medium">
                              Génération du code QR chiffré WhatsApp...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-2 text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Actualisation temps réel
                      </span>
                      <button
                        onClick={handleRestartQr}
                        disabled={isRefreshingQr}
                        className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                        Régénérer
                      </button>
                    </div>

                    <div className="text-[11px] text-indigo-800 font-medium bg-indigo-50/80 py-2 px-3 rounded-xl border border-indigo-100 text-left leading-relaxed">
                      📌 <strong>Conseil :</strong> Pointez l'appareil photo WhatsApp directement sur le QR code ci-dessus. La connexion s'établit automatiquement dès la lecture.
                    </div>

                    <button
                      onClick={() => setShowQrModal(false)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      Fermer
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
