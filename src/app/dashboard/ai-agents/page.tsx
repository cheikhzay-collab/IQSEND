'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  toolCalled?: string;
  toolDetails?: {
    name: string;
    args?: Record<string, any>;
    resultDescription?: string;
  };
  latencyMs?: number;
}

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
  {
    id: 'prod-2',
    name: 'Smart Watch S2 Pro Retina',
    sku: 'SW2-PRO-BLK',
    basePrice: 599,
    sellingPoints: [
      'Écran AMOLED Retina Ultra-lumineux visible en plein soleil',
      'Appels Bluetooth directs et notifications WhatsApp en arabe et français',
      'Autonomie longue durée de 7 jours avec charge rapide magnétique',
      'Étanche IP68 certifiée pour le sport, la pluie et les ablutions',
    ],
    objections: [
      {
        category: 'Fonctionnalités',
        objection: 'واش كتدوز المكالمات بالبلوتوث وفيها ميكروفون وسبيكر؟',
        replyDarija: 'نعم أخي تماماً! الساعة فيها ميكروفون ومكبر صوت نقي جداً، كتقدر تجاوب وتهضر مباشرة من يدك وتشوف رسائل الواتساب كاملة.',
      },
      {
        category: 'Garantie',
        objection: 'واش فيها ضمانة إيلا وقع فيها شي مشكل؟',
        replyDarija: 'أكيد أخي، الساعة كتوصلك مع شهادة ضمانة لمدة سنة كاملة ضد أي عيب مصنعي، وزيادة على ذلك عندك الحق تفحصها وتخدمها قبل ماتخلص الموزع.',
      },
    ],
    upsellBundle: {
      title: 'Pack Duo (Smart Watch + Écouteurs Sans Fil)',
      extraQty: 1,
      discountPercent: 40,
      pitchDarija: 'أخي العزيز، كاين عرض خاص اليوم: تقدر تاخد مع الساعة ليزيكوتور بلوتوث Pro غير بـ 99 درهم إضافية عوض 250 درهم! واش نضيفوها ليك؟',
    },
    mediaGallery: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        caption: 'Écran AMOLED et finition midnight black',
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'Robe Traditionnelle Soie Brodée',
    sku: 'ROB-SOIE-M',
    basePrice: 490,
    sellingPoints: [
      'Tissu 100% Crêpe de Soie royale de premier choix, fluide et opaque',
      'Broderie artisanale marocaine raffinée (Zwaq Lemâalem) fil d’or',
      'Coupe flatteuse adaptée à toutes les morphologies et occasions',
      'Livraison avec essayage à domicile avant le paiement en espèces',
    ],
    objections: [
      {
        category: 'Taille',
        objection: 'خفت ماتجيش قدي واش كاين التبديل؟',
        replyDarija: 'مرحبا لالة! اطمئني، الموزع كيعطيك الوقت تقيسي، وإيلا ماجاتكش كتقدي تبدلي المقاس فابور أو ترجعيها فالحين بدون أي مصاريف.',
      },
    ],
    upsellBundle: {
      title: 'Foulard Soie Assorti (-50%)',
      extraQty: 1,
      discountPercent: 50,
      pitchDarija: 'لالة، واش تحبي نرافقو ليك الرداء بشال حرير بنفس درجة اللون غير بـ 60 درهم عوض 120 درهم؟',
    },
    mediaGallery: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&auto=format&fit=crop&q=80',
        caption: 'Détail broderie marocaine fil d’or',
      },
    ],
  },
  {
    id: 'prod-4',
    name: 'Pack Soins Visage Huile d’Argan Pure',
    sku: 'ARG-CARE-PK',
    basePrice: 299,
    sellingPoints: [
      'Huile d’argan cosmétique 100% bio pressée à froid de la région de Taroudant',
      'Riche en Vitamine E et acides gras essentiels pour hydrater et régénérer la peau',
      'Sérum anti-âge naturel certifié ONSSA sans aucun produit chimique',
    ],
    objections: [
      {
        category: 'Authenticité',
        objection: 'واش أرݣان حر طبيعي 100% ولا مخلط؟',
        replyDarija: 'أرݣان حر ومعصور على البارد من تعاونية نسوية معتمدة بتارودانت ومختوم بشهادة المطابقة الصحية. كتقدري تفتحي وتشوفي القوام والرائحة الزكية.',
      },
    ],
    upsellBundle: {
      title: 'Pack 2 Boîtes (2ème à -40%)',
      extraQty: 1,
      discountPercent: 40,
      pitchDarija: 'لالة، واش تفضلي تستافدي من العرض المزدوج وتخدي الباك الثاني بـ 179 درهم فقط مع توصيل مجاني؟',
    },
    mediaGallery: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
        caption: 'Pack bio extraction artisanale certifiée',
      },
    ],
  },
];

export default function AiAgentsPage() {
  const [activeTab, setActiveTab] = useState<
    'simulator' | 'product-kb' | 'prompt' | 'knowledge' | 'permissions'
  >('simulator');
  const [temperature, setTemperature] = useState(0.3);
  const [selectedProduct, setSelectedProduct] = useState<ProductKbData>(DEFAULT_PRODUCTS_KB[0]);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [testMessage, setTestMessage] = useState('سلام، واش نقدر نحل الكولية قبل مانخلص الموزع؟');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(
    'وعليكم السلام أخي! نعم أكيد، التوصيل مع Sendit كيعطيك الحق تفحص الكولية وتشوف المقاس ديالك عاد تخلص الموزع نقداً بكل أمان. واش تأكد لينا العنوان ديالك؟'
  );
  const [detectedTool, setDetectedTool] = useState<string | null>(null);

  // 💬 Multi-turn WhatsApp Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      role: 'model',
      text: 'مرحبا بك أخي/أختي الكريمة في منصة Sendit! 👋 كيف نقدر نعاونك اليوم؟ واش باغي تتبع الكولي ديالك، تشوف المنتجات المتوفرة ولا تسجل طلبية جديدة؟ ✨',
      timestamp: '12:00',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [lastToolDetails, setLastToolDetails] = useState<{
    name: string;
    args?: Record<string, any>;
    resultDescription?: string;
  } | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(680);
  const [lastTokensCount, setLastTokensCount] = useState<number>(48);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 🤖 Live Gemini LLM API State (Configurable dans /dashboard/integrations)
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState('');
  const [isSimulatingApi, setIsSimulatingApi] = useState(false);
  const [activeModelName, setActiveModelName] = useState('gemini-1.5-flash');

  // Check Gemini API Key status on load
  useEffect(() => {
    fetch('/api/settings/gemini')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGeminiConfigured(data.isConfigured);
          if (data.maskedKey) setGeminiMaskedKey(data.maskedKey);
          if (data.model) setActiveModelName(data.model);
        }
      })
      .catch(() => {});
  }, []);

  const handleSimulate = async () => {
    if (!testMessage.trim()) return;
    setIsSimulatingApi(true);
    try {
      const res = await fetch('/api/agent/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage.trim(), phone: '0670114455' }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulatedResponse(data.replyText);
        setDetectedTool(data.toolCalled ? data.toolCalled : null);
        if (data.toolDetails) setLastToolDetails(data.toolDetails);
        if (data.model) setActiveModelName(data.model);
        if (data.latencyMs) setLastLatencyMs(data.latencyMs);
        if (data.tokensCount) setLastTokensCount(data.tokensCount);
      } else {
        setSimulatedResponse(`Erreur: ${data.error || "Impossible d'exécuter le modèle"}`);
      }
    } catch (err: any) {
      setSimulatedResponse('Erreur de connexion au serveur');
    } finally {
      setIsSimulatingApi(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || chatInput).trim();
    if (!textToSend || isSimulatingApi) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsSimulatingApi(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
        toolCall: m.toolCalled,
      }));

      const res = await fetch('/api/agent/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: historyPayload,
          phone: '0670114455',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          toolCalled: data.toolCalled,
          toolDetails: data.toolDetails,
          latencyMs: data.latencyMs,
        };

        setMessages((prev) => [...prev, botMsg]);
        setSimulatedResponse(data.replyText);
        setDetectedTool(data.toolCalled || null);
        if (data.toolDetails) {
          setLastToolDetails(data.toolDetails);
        } else if (data.toolCalled) {
          setLastToolDetails({ name: data.toolCalled });
        }
        if (data.model) setActiveModelName(data.model);
        if (data.latencyMs) setLastLatencyMs(data.latencyMs);
        if (data.tokensCount) setLastTokensCount(data.tokensCount);
      } else {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `عذراً، حدث خطأ: ${data.error || 'يرجى المحاولة مجدداً'}`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'تعذر الاتصال بخادم المحاكاة. يرجى التأكد من تشغيل السيرفر.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSimulatingApi(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: 'مرحبا بك أخي/أختي الكريمة في منصة Sendit! 👋 كيف نقدر نعاونك اليوم؟ واش باغي تتبع الكولي ديالك، تشوف المنتجات المتوفرة ولا تسجل طلبية جديدة؟ ✨',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setDetectedTool(null);
    setLastToolDetails(null);
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
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
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

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/integrations"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
            title="Gérer les intégrations API & WhatsApp"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Intégrations & Passerelles</span>
          </Link>

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
      </div>

      {/* Navigation Tabs - Mobile Horizontal Swipe */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Play className="w-3.5 h-3.5" /> 🎮 Simulateur & Function Calling
        </button>
        <button
          onClick={() => setActiveTab('product-kb')}
          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 ${
            activeTab === 'product-kb'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> 🏷️ Fiche Produit AI & Upselling (Pilier 3)
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 ${
            activeTab === 'permissions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> 🛡️ Gouvernance & Droits de l'Agent
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 ${
            activeTab === 'prompt'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code className="w-3.5 h-3.5" /> 📜 Persona & Instructions Système
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95 ${
            activeTab === 'knowledge'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> 📚 FAQs Générales COD
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SIMULATEUR & FUNCTION CALLING (MULTI-TURN WHATSAPP)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: WhatsApp Interactive Multi-turn Chat Simulator */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* WhatsApp Phone Mockup Header */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">Sara - Assistante Sendit COD Intelligente</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Multi-turn Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>En ligne • Bilingue Darija / Français + Function Calling</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetChat}
                title="Réinitialiser la conversation"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Effacer discussion</span>
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 h-[460px] overflow-y-auto space-y-3.5 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs leading-relaxed transition-all ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                    }`}
                  >
                    <div dir="rtl" className="whitespace-pre-line text-right font-medium">
                      {msg.text}
                    </div>

                    {/* Timestamp & Role indicator */}
                    <div
                      className={`text-[10px] mt-1.5 flex items-center gap-1.5 ${
                        msg.role === 'user' ? 'text-emerald-100 justify-end' : 'text-slate-400 justify-start'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.role === 'user' && <CheckCircle className="w-3 h-3 text-emerald-200" />}
                      {msg.latencyMs && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                          {(msg.latencyMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Function Calling Badge Card below Bot response */}
                  {(msg.toolDetails || msg.toolCalled) && (
                    <div className="mt-2 max-w-[88%] sm:max-w-[80%] w-full rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono shadow-md overflow-hidden animate-fadeIn">
                      <div className="bg-slate-950/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-emerald-400 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>⚡ {msg.toolDetails?.name || msg.toolCalled}</span>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                          Function Calling Executed
                        </span>
                      </div>

                      <div className="p-3 space-y-2">
                        {msg.toolDetails?.resultDescription && (
                          <div className="text-[11px] text-slate-200 font-sans">
                            📌 <strong>Résultat :</strong> {msg.toolDetails.resultDescription}
                          </div>
                        )}

                        {msg.toolDetails?.args && Object.keys(msg.toolDetails.args).length > 0 && (
                          <div>
                            <div className="text-[10px] text-slate-400 mb-1">Paramètres extraits (Arguments) :</div>
                            <pre className="bg-black/60 p-2.5 rounded-lg text-emerald-300 text-[10px] overflow-x-auto whitespace-pre font-mono">
                              {JSON.stringify(msg.toolDetails.args, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isSimulatingApi && (
                <div className="flex items-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-xs flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    <span className="font-medium text-slate-700">Sara réfléchit et formule sa réponse...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="p-3 bg-white border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Modèles de test rapide (cliquez pour tester l'Agent) :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🔍 فين وصل الكولي ديالي؟ 0670114455',
                  '📦 شنو عندكم دالسلعة والكتالوج؟',
                  '🛍️ بغيت نطلب باك القمصان لكازا',
                  'صافي أكد ليا الطلب وصيفطوه للعنوان',
                  'واش نقدر نحل الكولية ونقيس قبل مانخلص؟',
                  'بدل ليا المقاس لـ XL بغيتو واسع شوية',
                  'الثمن غالي واش كاين شي برومو؟',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sample)}
                    disabled={isSimulatingApi}
                    className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Input Box */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                dir="auto"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Posez une question à l'Agent IA (ex: Où est mon colis ? 0670114455)..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isSimulatingApi || !chatInput.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                {isSimulatingApi ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Envoyer</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Model Parameters & Live Inspection Card */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Model & Function Calling Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="font-bold text-xs text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" /> Console Function Calling & Outils
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  Live API
                </span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Modèle Actif</span>
                  <span className="font-bold font-mono text-blue-600">{activeModelName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Température (Créativité)</span>
                  <span className="font-bold font-mono text-slate-800">{temperature}</span>
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

              {/* Function Calling Live Inspector */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs font-mono shadow-inner space-y-2">
                <div className="text-slate-400 text-[10px] flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Dernier appel d'outil (Tool Call) :
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {lastToolDetails?.name || detectedTool || 'Aucun'}
                  </span>
                </div>

                {lastToolDetails ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-emerald-300 text-[11px] font-bold">
                      ⚡ {lastToolDetails.name}
                    </div>
                    {lastToolDetails.resultDescription && (
                      <p className="text-slate-300 text-[10px] font-sans">
                        {lastToolDetails.resultDescription}
                      </p>
                    )}
                    {lastToolDetails.args && Object.keys(lastToolDetails.args).length > 0 && (
                      <pre className="bg-slate-950 p-2 rounded text-[10px] text-emerald-300 overflow-x-auto whitespace-pre">
                        {JSON.stringify(lastToolDetails.args, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px] py-1">
                    Essayez d'écrire : "Où est mon colis ? 0670114455" pour voir l'exécution directe de check_order_status !
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Temps de réponse</span>
                  <strong className="text-slate-800">
                    {lastLatencyMs ? `${(lastLatencyMs / 1000).toFixed(2)}s` : '0.65s'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tokens estimés</span>
                  <strong className="text-slate-800">{lastTokensCount || 48}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sécurité</span>
                  <strong className="text-emerald-600">Proxy Backend</strong>
                </div>
              </div>
            </div>

            {/* Test Customer Data Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Colis de test actif pour vérification immédiate :</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Téléphone : <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-900">0670114455</strong>
                <br />
                Client : <strong>Mohammed El Idrissi</strong> (Casablanca) • N° Commande : <strong>#AT1048</strong>
                <br />
                Statut : <span className="text-amber-800 font-bold">En cours de livraison (Sendit Express)</span>
              </p>
            </div>
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

    </div>
  );
}
