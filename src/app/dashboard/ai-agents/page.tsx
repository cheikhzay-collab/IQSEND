'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MOROCCAN_VOICE_PRESETS, COD_IMAGE_PRESETS } from '@/lib/ai-agents-data';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Play,
  Pause,
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
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Eye,
  Check,
  MapPin,
  FileText,
  X,
  UploadCloud,
  Headphones,
  Paperclip,
  Radio
} from 'lucide-react';

// ChatMessage type imported from @/lib/ai-agents-data
// MOROCCAN_VOICE_PRESETS and COD_IMAGE_PRESETS imported from @/lib/ai-agents-data


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
      text: 'مرحبا بك أخي/أختي الكريمة في منصة Sendit! 👋 كيف نقدر نعاونك اليوم؟ واش باغي تتبع الكولي ديالك، تشوف المنتجات المتوفرة ولا تسجل طلبية جديدة؟ ✨ (تقدر تصيفط ليا ميساج، أوديو صوتي بالدارجة 🎙️ أو صورة 📸)',
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

  // 🎙️ Live Voice Recording & Presets State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showVoicePresets, setShowVoicePresets] = useState(false);
  const [showImagePresets, setShowImagePresets] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // 📸 Staged Image Attachment State
  const [stagedImage, setStagedImage] = useState<{
    base64?: string;
    previewUrl: string;
    caption?: string;
    presetHint?: string;
    mimetype?: string;
    filename?: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [systemPromptText, setSystemPromptText] = useState(
    `أنت "سارة"، مساعدة ذكية متخصصة في تأكيد وتتبع طلبيات التجارة الإلكترونية والدفع عند الاستلام (COD) في المغرب.
تتحدثين بالدارجة المغربية بلهجة طبيعية، مهذبة، وودودة جداً ("أخي / أختي"، "الله يحفظك"، "مرحبا بك").

### 🎯 أهدافك ومهمتك الأساسية:
1. الترحيب بالزبون باسمه وتأكيد اختياره للمنتج والمقاس والمدينة.
2. اقتراح الترقية الذكية (Upsell) بقطعة ثانية بتخفيض مميز (مثال: Pack Duo -30%).
3. تدقيق العنوان وطلب موقع الـ WhatsApp GPS Location للأحياء الصعبة أو غير الدقيقة.
4. استدعاء الدوال فوراً (Function Calling):
   - confirm_order_and_address فور التأكيد الصريح.
   - update_order_details عند تغيير المقاس أو اللون.
   - save_gps_location عند مشاركة رابط الموقع.`
  );

  // 🤖 Live Gemini LLM API State
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState('');
  const [isSimulatingApi, setIsSimulatingApi] = useState(false);
  const [activeModelName, setActiveModelName] = useState('gemini-1.5-flash');

  // Check Gemini API Key and AI Agent Configuration from MySQL on load
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

    fetch('/api/ai-agents')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.systemPrompt) {
          setSystemPromptText(data.config.systemPrompt);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'simulator') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 🔊 Text-To-Speech for Sara's voice
  const toggleSpeakSara = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (currentlySpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang.startsWith('ar')) || voices.find((v) => v.lang.startsWith('fr'));
    if (arVoice) utterance.voice = arVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // 🎵 Play / Pause Audio Mock
  const togglePlayAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      setTimeout(() => {
        setPlayingAudioId(null);
      }, 5000);
    }
  };

  // 🎙️ Live Voice Recording using browser Web Audio / MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(audioBlob);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          handleSendVoiceNote({
            audioBase64: base64,
            mimetype: audioBlob.type || 'audio/webm',
            duration: `0:0${Math.max(1, recordingSeconds)}`,
            localUrl,
            hintText: 'تسجيل صوتي مباشر للزبون عبر المتصفح',
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone inaccessible ou refusé, ouverture des presets vocaux marocains:', err);
      setShowVoicePresets(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // 🎙️ Send Voice Note (from live mic or preset)
  const handleSendVoiceNote = async (options: {
    audioBase64?: string;
    mimetype?: string;
    hintText?: string;
    duration?: string;
    localUrl?: string;
  }) => {
    if (isSimulatingApi) return;
    setIsSimulatingApi(true);
    setShowVoicePresets(false);

    const voiceMsgId = `voice-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: voiceMsgId,
      role: 'user',
      mediaType: 'audio',
      isVoice: true,
      audioUrl: options.localUrl,
      voiceDuration: options.duration || '0:06',
      text: options.hintText || '🎙️ Note vocale client (Darija)',
      voiceTranscription: options.hintText,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

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
          mediaType: 'audio',
          audio: {
            base64: options.audioBase64,
            mimetype: options.mimetype || 'audio/ogg',
            hintText: options.hintText,
          },
          conversationHistory: historyPayload,
          phone: '0670114455',
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.transcription) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === voiceMsgId
                ? { ...m, voiceTranscription: data.transcription, text: data.transcription }
                : m
            )
          );
        }

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
        if (data.toolDetails) setLastToolDetails(data.toolDetails);
        if (data.model) setActiveModelName(data.model);
        if (data.latencyMs) setLastLatencyMs(data.latencyMs);
        if (data.tokensCount) setLastTokensCount(data.tokensCount);
      } else {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Erreur vocale : ${data.error || 'Impossible d\'analyser l\'audio.'}`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Erreur de connexion au serveur de transcription vocale.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSimulatingApi(false);
    }
  };

  // 📸 Send Image (uploaded or preset)
  const handleSendImage = async (imagePayload: {
    base64?: string;
    previewUrl: string;
    caption?: string;
    presetHint?: string;
    mimetype?: string;
  }) => {
    if (isSimulatingApi) return;
    setIsSimulatingApi(true);
    setShowImagePresets(false);
    setStagedImage(null);

    const imageMsgId = `img-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: imageMsgId,
      role: 'user',
      mediaType: 'image',
      isImage: true,
      imageUrl: imagePayload.previewUrl,
      imageCaption: imagePayload.caption,
      text: imagePayload.caption || '📸 Photo envoyée par le client',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

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
          mediaType: 'image',
          image: {
            base64: imagePayload.base64,
            mimetype: imagePayload.mimetype || 'image/jpeg',
            caption: imagePayload.caption,
            presetHint: imagePayload.presetHint,
          },
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
          imageAnalysis: data.imageAnalysis,
        };

        setMessages((prev) => [...prev, botMsg]);
        setSimulatedResponse(data.replyText);
        setDetectedTool(data.toolCalled || null);
        if (data.toolDetails) setLastToolDetails(data.toolDetails);
        if (data.model) setActiveModelName(data.model);
        if (data.latencyMs) setLastLatencyMs(data.latencyMs);
        if (data.tokensCount) setLastTokensCount(data.tokensCount);
      } else {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Erreur d'analyse d'image : ${data.error || 'Impossible d\'analyser l\'image.'}`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Erreur de connexion au serveur de vision.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSimulatingApi(false);
    }
  };

  // 📁 Handle Local File Upload for Images
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setStagedImage({
        base64,
        previewUrl: dataUrl,
        mimetype: file.type || 'image/jpeg',
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // 💬 Standard Text Message
  const handleSendMessage = async (overrideText?: string) => {
    // If an image is staged, send it with the text as caption!
    if (stagedImage) {
      const caption = (overrideText || chatInput).trim();
      handleSendImage({
        base64: stagedImage.base64,
        previewUrl: stagedImage.previewUrl,
        mimetype: stagedImage.mimetype,
        caption: caption || undefined,
      });
      setChatInput('');
      return;
    }

    const textToSend = (overrideText || chatInput).trim();
    if (!textToSend || isSimulatingApi) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      mediaType: 'text',
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
          mediaType: 'text',
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
          text: `Désolé, une erreur est survenue : ${data.error || 'Veuillez réessayer.'}`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Impossible de joindre le serveur de simulation. Veuillez vérifier que le serveur est démarré.',
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
            onClick={async () => {
              try {
                const res = await fetch('/api/ai-agents', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    agentName: 'Sarah (AI COD Specialist)',
                    systemPrompt: systemPromptText,
                    autoConfirmThreshold: 70,
                    geminiModel: activeModelName,
                    tone: 'Darija Professional & Courteous',
                    language: 'ar-MA',
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 3000);
                }
              } catch (err) {
                console.error('Error saving AI config to DB:', err);
              }
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {savedSuccess ? '✅ Enregistré dans MySQL !' : 'Sauvegarder dans MySQL'}
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
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col relative">
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
                    <h2 className="text-sm font-bold text-white">Sara - Assistante Sendit Multimodale</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                      Multimodal Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Texte • Vocaux Darija 🎙️ • Vision & Photos 📸 • Function Calling ⚡</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetChat}
                  title="Réinitialiser la conversation"
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Effacer discussion</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 h-[480px] overflow-y-auto space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* BUBBLE: USER VOICE NOTE */}
                  {msg.role === 'user' && msg.isVoice && (
                    <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 bg-emerald-700 text-white shadow-md rounded-tr-xs space-y-2 border border-emerald-600">
                      {/* WhatsApp Audio Waveform Bar */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePlayAudio(msg.id)}
                          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shrink-0 shadow-sm transition-all"
                          title="Écouter la note vocale"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-5 h-5 text-emerald-950 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 text-emerald-950 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 space-y-1">
                          {/* Animated / Static Waveform bars */}
                          <div className="flex items-center gap-1 h-7">
                            {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 90, 45, 70, 85, 60, 40].map(
                              (height, i) => (
                                <span
                                  key={i}
                                  className={`w-1 rounded-full transition-all ${
                                    playingAudioId === msg.id
                                      ? 'bg-emerald-200 animate-pulse'
                                      : 'bg-emerald-300/80'
                                  }`}
                                  style={{
                                    height: `${Math.max(6, (height * 24) / 100)}px`,
                                    animationDelay: `${i * 60}ms`,
                                  }}
                                />
                              )
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-emerald-200 font-mono">
                            <span>{playingAudioId === msg.id ? 'Lecture...' : msg.voiceDuration || '0:06'}</span>
                            <span className="flex items-center gap-1 font-sans">
                              <Mic className="w-3 h-3 text-emerald-300" />
                              <span>Vocal WhatsApp</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Darija Transcription Box */}
                      {msg.voiceTranscription && (
                        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 text-xs">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 mb-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Transcription Automatique (Darija Marocaine) :</span>
                          </div>
                          <div dir="rtl" className="text-right text-emerald-50 font-medium leading-relaxed">
                            "{msg.voiceTranscription}"
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-emerald-200 flex items-center justify-end gap-1 pt-0.5">
                        <span>{msg.timestamp}</span>
                        <CheckCircle className="w-3 h-3 text-emerald-300" />
                      </div>
                    </div>
                  )}

                  {/* BUBBLE: USER IMAGE / PHOTO */}
                  {msg.role === 'user' && msg.isImage && (
                    <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl p-2.5 bg-emerald-600 text-white shadow-md rounded-tr-xs space-y-2 border border-emerald-500">
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-emerald-400/30">
                        <img
                          src={msg.imageUrl}
                          alt="Photo envoyée par le client"
                          className="w-full max-h-60 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>Photo Client WhatsApp</span>
                        </div>
                      </div>

                      {/* Caption if provided */}
                      {msg.imageCaption && (
                        <div dir="rtl" className="text-right text-xs font-medium text-white px-1 leading-relaxed">
                          {msg.imageCaption}
                        </div>
                      )}

                      <div className="text-[10px] text-emerald-100 flex items-center justify-end gap-1 px-1">
                        <span>{msg.timestamp}</span>
                        <CheckCircle className="w-3 h-3 text-emerald-200" />
                      </div>
                    </div>
                  )}

                  {/* BUBBLE: USER STANDARD TEXT */}
                  {msg.role === 'user' && !msg.isVoice && !msg.isImage && (
                    <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs leading-relaxed bg-emerald-600 text-white rounded-tr-xs">
                      <div dir="rtl" className="whitespace-pre-line text-right font-medium">
                        {msg.text}
                      </div>

                      <div className="text-[10px] mt-1.5 flex items-center gap-1.5 text-emerald-100 justify-end">
                        <span>{msg.timestamp}</span>
                        <CheckCircle className="w-3 h-3 text-emerald-200" />
                        {msg.latencyMs && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                            {(msg.latencyMs / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BUBBLE: MODEL / AI AGENT SARA */}
                  {msg.role === 'model' && (
                    <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs leading-relaxed bg-white border border-slate-200 text-slate-900 rounded-tl-xs space-y-2">
                      <div dir="rtl" className="whitespace-pre-line text-right font-medium text-slate-900 leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Footer: Voice TTS button & Timestamp */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                        <button
                          onClick={() => toggleSpeakSara(msg.text, msg.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentlySpeakingId === msg.id
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                          title="Écouter Sara prononcer cette réponse"
                        >
                          {currentlySpeakingId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                              <span>Arrêter la voix</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>🔊 Écouter la voix de Sara</span>
                            </>
                          )}
                        </button>

                        <div className="text-slate-400 flex items-center gap-1.5">
                          <span>{msg.timestamp}</span>
                          {msg.latencyMs && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                              {(msg.latencyMs / 1000).toFixed(2)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISION AI ANALYSIS CARD (when model responded to an image) */}
                  {msg.imageAnalysis && (
                    <div className="mt-2 max-w-[88%] sm:max-w-[80%] w-full rounded-xl bg-purple-950 border border-purple-800 text-[11px] text-white shadow-md overflow-hidden animate-fadeIn">
                      <div className="bg-purple-900/90 px-3 py-2 border-b border-purple-800 flex items-center justify-between text-purple-300 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          <span>👁️ Moteur Vision AI (Reconnaissance d'Image)</span>
                        </div>
                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-700">
                          {msg.imageAnalysis.detectedCategory || 'Analyse Visuelle'}
                        </span>
                      </div>

                      <div className="p-3 space-y-2 text-xs">
                        <div className="text-purple-100">
                          <strong>🔍 Détection visuelle :</strong> {msg.imageAnalysis.description}
                        </div>
                        {msg.imageAnalysis.extractedText && (
                          <div className="text-[10px] text-purple-200 bg-black/40 p-2 rounded-lg font-mono">
                            <strong>OCR / Texte identifié :</strong> {msg.imageAnalysis.extractedText}
                          </div>
                        )}
                        {msg.imageAnalysis.suggestedAction && (
                          <div className="text-[10px] text-emerald-300 flex items-center gap-1 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Action Sendit COD : <strong>{msg.imageAnalysis.suggestedAction}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FUNCTION CALLING BADGE CARD */}
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
                  <div className="bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-xs flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 animate-spin text-purple-600" />
                    <div>
                      <span className="font-bold text-slate-800">Sara analyse le message...</span>
                      <p className="text-[10px] text-slate-400">Transcription vocale & analyse multimodale Gemini 1.5</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Test Chips with Categories */}
            <div className="p-3 bg-white border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">
                  Tests rapides prêts à l'emploi (Texte, Audio & Image) :
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowVoicePresets(true)}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <Mic className="w-3 h-3 text-emerald-600" />
                    <span>Vocaux Darija</span>
                  </button>
                  <button
                    onClick={() => setShowImagePresets(true)}
                    className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <Camera className="w-3 h-3 text-purple-600" />
                    <span>Photos COD</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { text: '🔍 فين وصل الكولي ديالي؟ 0670114455', type: 'text' },
                  { text: 'صافي أكد ليا الطلب وصيفطوه للعنوان', type: 'text' },
                  { text: 'واش نقدر نحل الكولية ونقيس قبل مانخلص؟', type: 'text' },
                  { text: 'بدل ليا المقاس لـ XL بغيتو واسع شوية', type: 'text' },
                  { text: 'الثمن غالي واش كاين شي برومو؟', type: 'text' },
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sample.text)}
                    disabled={isSimulatingApi}
                    className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    {sample.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Staged Image Banner (if image is attached before sending) */}
            {stagedImage && (
              <div className="p-2.5 bg-purple-50 border-t border-purple-200 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <img
                    src={stagedImage.previewUrl}
                    alt="Aperçu"
                    className="w-12 h-12 object-cover rounded-lg border border-purple-300 shadow-2xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">
                      Photo prête pour Vision AI {stagedImage.filename ? `(${stagedImage.filename})` : ''}
                    </span>
                    <span className="text-[10px] text-purple-700">
                      Ajoutez une question ci-dessous ou cliquez sur Envoyer pour analyser la photo.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setStagedImage(null)}
                  className="p-1 rounded-full bg-purple-200 hover:bg-purple-300 text-purple-800 transition-colors"
                  title="Supprimer la photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input for Image Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Bottom Input Box or Live Audio Recording Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              {isRecording ? (
                /* LIVE RECORDING STATE */
                <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-300 rounded-2xl p-2.5 px-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">
                        Enregistrement vocal Darija en cours... (00:0{recordingSeconds})
                      </span>
                      <span className="text-[10px] text-rose-700">
                        Parlez au microphone. L'IA transcrira et répondra immédiatement.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Annuler</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terminer & Envoyer</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* NORMAL INPUT STATE */
                <div className="flex items-center gap-2">
                  {/* Voice Note Trigger Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={startRecording}
                      disabled={isSimulatingApi}
                      title="Enregistrer un vocal avec votre microphone"
                      className="p-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 rounded-xl transition-all shadow-2xs disabled:opacity-40"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setShowVoicePresets(true)}
                      disabled={isSimulatingApi}
                      title="Sélectionner une note vocale marocaine pré-enregistrée (Darija)"
                      className="p-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 rounded-xl transition-all shadow-2xs disabled:opacity-40"
                    >
                      <Headphones className="w-4 h-4" />
                    </button>

                    {/* Image Attachment Trigger */}
                    <button
                      onClick={() => setShowImagePresets(true)}
                      disabled={isSimulatingApi}
                      title="Envoyer une photo (catalogue, réclamation ou reçu de paiement)"
                      className="p-2.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-300 rounded-xl transition-all shadow-2xs disabled:opacity-40"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

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
                    placeholder={
                      stagedImage
                        ? "Posez une question sur la photo ou appuyez sur Envoyer..."
                        : "Écrivez un message en Darija, enregistrez un vocal ou envoyez une photo..."
                    }
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSimulatingApi || (!chatInput.trim() && !stagedImage)}
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
              )}
            </div>

            {/* MODAL: MOROCCAN DARIJA VOICE PRESETS */}
            {showVoicePresets && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Simuler une Note Vocale en Darija Marocaine
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Sélectionnez un scénario audio réel pour tester la transcription et la réponse de Sara
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowVoicePresets(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
                    {MOROCCAN_VOICE_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() =>
                          handleSendVoiceNote({
                            hintText: preset.darija,
                            duration: preset.duration,
                          })
                        }
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer transition-all space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {preset.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ⏱️ {preset.duration}
                          </span>
                        </div>
                        <div dir="rtl" className="text-right text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                          "{preset.darija}"
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {preset.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      💡 Déclenche le Moteur Audio Multimodal Gemini 1.5
                    </span>
                    <button
                      onClick={() => setShowVoicePresets(false)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: COD IMAGE PRESETS & UPLOAD */}
            {showImagePresets && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Vision AI : Sélectionner ou Télécharger une Photo
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Testez la reconnaissance de produits, la gestion des réclamations ou la vérification de reçus
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImagePresets(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Upload Custom File Option */}
                  <div
                    onClick={() => {
                      setShowImagePresets(false);
                      fileInputRef.current?.click();
                    }}
                    className="p-3 border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl bg-purple-50/50 hover:bg-purple-50 flex items-center justify-center gap-2 text-purple-800 text-xs font-bold cursor-pointer transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-purple-600" />
                    <span>Télécharger une photo depuis votre appareil (JPG, PNG)</span>
                  </div>

                  {/* Preset COD Images */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {COD_IMAGE_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() =>
                          handleSendImage({
                            previewUrl: preset.url,
                            caption: preset.caption,
                            presetHint: preset.presetHint,
                          })
                        }
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-all flex items-center gap-3 group"
                      >
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-14 h-14 object-cover rounded-lg shrink-0 border border-slate-200"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-900">
                              {preset.title}
                            </h4>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                              {preset.badge}
                            </span>
                          </div>
                          <div dir="rtl" className="text-right text-[11px] text-slate-700 italic">
                            "{preset.caption}"
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {preset.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowImagePresets(false)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Model Parameters, Multimodal Status & Live Inspector */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Model & Multimodal Engine Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="font-bold text-xs text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" /> Console Multimodale & Outils IA
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Multimodal Active
                </span>
              </h3>

              {/* Multimodal Engines Status Indicators */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Moteur Audio (Darija)</span>
                      <span className="text-[10px] text-slate-400">Transcription & Compréhension orale</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Moteur Vision AI</span>
                      <span className="text-[10px] text-slate-400">Reconnaissance de produits & OCR</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Synthèse Vocale (TTS)</span>
                      <span className="text-[10px] text-slate-400">Voix de Sara en Darija/Arabe</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Modèle Gemini</span>
                  <span className="font-bold font-mono text-blue-600">{activeModelName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Température</span>
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
                    Envoyez un message ou un vocal ("Où est mon colis ? 0670114455") pour observer l'exécution en temps réel !
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Latence</span>
                  <strong className="text-slate-800">
                    {lastLatencyMs ? `${(lastLatencyMs / 1000).toFixed(2)}s` : '0.65s'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tokens</span>
                  <strong className="text-slate-800">{lastTokensCount || 48}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sécurité</span>
                  <strong className="text-emerald-600">Proxy Backend</strong>
                </div>
              </div>
            </div>

            {/* Live Database Sync Notice */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Synchronisation avec les commandes réelles en base :</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                L'agent conversationnel Sara est directement branché sur vos commandes réelles issues de <strong>Sendit.ma</strong> et de vos formulaires. Lorsqu'un client envoie un message ou un vocal WhatsApp, Sara retrouve instantanément son colis réel et son statut de livraison à jour.
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
                      🗣️ Objection Client : <span className="text-slate-900 font-semibold">{obj.objection}</span>
                    </div>
                    <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg leading-relaxed font-medium">
                      🤖 Réponse Agent IA (Darija) : {obj.replyDarija}
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
            value={systemPromptText}
            onChange={(e) => setSystemPromptText(e.target.value)}
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
