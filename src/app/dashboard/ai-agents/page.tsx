'use client';

import React, { useState } from 'react';
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
  ExternalLink
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
  const [activeTab, setActiveTab] = useState<'simulator' | 'prompt' | 'knowledge' | 'product-kb'>('simulator');
  const [temperature, setTemperature] = useState(0.3);
  const [selectedProduct, setSelectedProduct] = useState<ProductKbData>(DEFAULT_PRODUCTS_KB[0]);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [testMessage, setTestMessage] = useState('سلام، واش نقدر نحل الكولية قبل مانخلص الموزع؟');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(
    'وعليكم السلام أخي! نعم أكيد، التوصيل مع Sendit كيعطيك الحق تفحص الكولية وتشوف المقاس ديالك عاد تخلص الموزع نقداً بكل أمان. واش تأكد لينا العنوان ديالك؟'
  );
  const [detectedTool, setDetectedTool] = useState<string | null>(null);

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

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
          <Save className="w-3.5 h-3.5" /> Sauvegarder la Configuration
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
      {/* TAB 4: FAQS COD GENERALES                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'knowledge' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="font-bold text-xs text-slate-800">
            Base de Connaissances Générale Logistique & COD
          </h3>
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <span className="font-bold text-slate-800 block">Q: واش التوصيل فابور؟</span>
              <span className="text-slate-600">R: نعم، التوصيل بالمجان لجميع المدن المغربية عبر شركة Sendit.</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <span className="font-bold text-slate-800 block">Q: شحال كياخد الوقت باش يوصلني الطلب؟</span>
              <span className="text-slate-600">R: كيوصلك خلال 24 إلى 48 ساعة كحد أقصى، كيتصل بيك الموزع قبل ما يجي.</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <span className="font-bold text-slate-800 block">Q: واش نقدر نحل الكولية ونشوفها؟</span>
              <span className="text-slate-600">R: نعم، عندك الحق الكامل تفتح الكولية وتفحصها عاد تخلص الموزع.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
