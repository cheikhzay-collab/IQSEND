// In-memory Omnichannel WhatsApp Inbox Store
// Keeps live WhatsApp customer conversations in sync across in-process Baileys, AI Agent & Dashboard

export interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'AI_BOT' | 'AGENT';
  text: string;
  timestamp: string;
  isVoice?: boolean;
  voiceTranscription?: string;
  isLocation?: boolean;
  locationUrl?: string;
}

export interface ChatConversation {
  id: string;
  orderId?: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  totalAmount: number;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  isAiActive: boolean;
  needsHumanTakeover: boolean;
  takeoverReason?: string;
  hasVoiceNote?: boolean;
  messages: ChatMessage[];
}

const DEFAULT_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'c1',
    orderId: 'ord-1',
    orderNumber: 'MA-20492',
    customerName: 'Khadija El Amrani',
    phoneNumber: '0655819033',
    city: 'Marrakech',
    totalAmount: 249,
    lastMessage: 'كنت فالحمام ماسمعتش، عفاك صيفطوها مورا الـ 3',
    lastTime: '09:20',
    unreadCount: 1,
    isAiActive: true,
    needsHumanTakeover: false,
    hasVoiceNote: true,
    messages: [
      {
        id: 'm1',
        sender: 'AI_BOT',
        text: 'أهلاً لالة خديجة، حاول موزع Sendit يتواصل معاك قبل قليل ولكن تعذر الوصول ليك. واش تحبي نبرمجوا التوصيل لغداً في نفس الوقت؟',
        timestamp: '09:16',
      },
      {
        id: 'm2',
        sender: 'CUSTOMER',
        text: 'كنت فالحمام ماسمعتش التيليفون، عفاك صيفطوه ليا مورا 3 دالعشية راني فدار',
        timestamp: '09:20',
        isVoice: true,
        voiceTranscription: 'كنت فالحمام ماسمعتش التيليفون، عفاك صيفطوه ليا مورا 3 دالعشية راني فدار',
      },
      {
        id: 'm3',
        sender: 'AI_BOT',
        text: 'تمام لالة خديجة! سجلنا التوقيت مورا الـ 3 وعلمنا موزع Sendit باش يتصل بيك مباشرة قبل الوصول. نهارك مبروك! 🚚✨',
        timestamp: '09:21',
      },
    ],
  },
  {
    id: 'c2',
    orderId: 'ord-2',
    orderNumber: 'MA-20495',
    customerName: 'Othmane Jabri',
    phoneNumber: '0612398471',
    city: 'Tanger',
    totalAmount: 320,
    lastMessage: 'مرحبا، راني كنسكن فمالاباطا، بغيت نهضر مع شي مسؤول',
    lastTime: '18:45',
    unreadCount: 2,
    isAiActive: false,
    needsHumanTakeover: true,
    takeoverReason: 'Demande contact humain & Réclamation',
    messages: [
      {
        id: 'm201',
        sender: 'AI_BOT',
        text: 'سلام أخي عثمان، بخصوص طلبيتك من متجرنا بقيمة 320 درهم، واش نقدروا نأكدوا ليك الإرسال؟',
        timestamp: '18:30',
      },
      {
        id: 'm202',
        sender: 'CUSTOMER',
        text: 'مرحبا، راني كنسكن فمالاباطا، بغيت نهضر مع شي مسؤول دابا',
        timestamp: '18:45',
      },
      {
        id: 'm203',
        sender: 'AI_BOT',
        text: 'مرحبا بك أخي الكريم. حنا هنا باش نساعدوك، تم تحويل المحادثة لمسؤول خدمة العملاء ديالنا وغادي يتواصل معاك مباشرة دابا للإجابة على كامل تساؤلاتك 📞✨',
        timestamp: '18:45',
      },
    ],
  },
  {
    id: 'c3',
    orderId: 'ord-3',
    orderNumber: 'MA-20491',
    customerName: 'Yassine Benkirane',
    phoneNumber: '0661294821',
    city: 'Casablanca',
    totalAmount: 399,
    lastMessage: 'وعليكم السلام، نعم المقاس مزيان والعنوان هو هذاك',
    lastTime: '14:22',
    unreadCount: 0,
    isAiActive: true,
    needsHumanTakeover: false,
    messages: [
      {
        id: 'm301',
        sender: 'AI_BOT',
        text: 'سلام عليكم أخي ياسين! بخصوص طلبك لقميص الكتان الأصلي بـ 399 درهم، واش المقاس L مناسبك نأكدو الطلب؟',
        timestamp: '14:15',
      },
      {
        id: 'm302',
        sender: 'CUSTOMER',
        text: 'وعليكم السلام، نعم المقاس مزيان والعنوان هو هذاك صيفطوها',
        timestamp: '14:22',
      },
      {
        id: 'm303',
        sender: 'AI_BOT',
        text: 'شكراً بزاف ليك أخي ياسين! الطلب ديالك تأكد بنجاح وغادي يدوز دابا للتجهيز والتغليف. 📦✨\nعفاك شارك معنا اللوكاسيون (Location Pin 📍) لتسهيل الوصول.',
        timestamp: '14:23',
      },
    ],
  },
];

const globalForInbox = globalThis as unknown as {
  __senditInboxConversations?: ChatConversation[];
};

export function getInboxConversations(): ChatConversation[] {
  if (!globalForInbox.__senditInboxConversations) {
    globalForInbox.__senditInboxConversations = [...DEFAULT_CONVERSATIONS];
  }
  return globalForInbox.__senditInboxConversations;
}

export function cleanPhone(raw: string): string {
  if (!raw) return '';
  let str = raw;
  if (str.includes('@')) str = str.split('@')[0];
  if (str.includes(':')) str = str.split(':')[0];
  let cleaned = str.replace(/[^\d]/g, '');
  if (cleaned.startsWith('212')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

export function recordInboundMessage(params: {
  phone: string;
  text?: string;
  locationUrl?: string;
  customerName?: string;
  orderNumber?: string;
  city?: string;
  totalAmount?: number;
}): { conversation: ChatConversation; isAiActive: boolean } {
  const conversations = getInboxConversations();
  const targetClean = cleanPhone(params.phone);

  let conv = conversations.find((c) => cleanPhone(c.phoneNumber) === targetClean);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const msgText = params.locationUrl
    ? `📍 موقع جغرافي مرسل: ${params.locationUrl}`
    : params.text || '';

  const newMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    sender: 'CUSTOMER',
    text: msgText,
    timestamp: timeStr,
    isLocation: Boolean(params.locationUrl),
    locationUrl: params.locationUrl,
  };

  if (!conv) {
    conv = {
      id: 'c-' + Date.now(),
      orderNumber: params.orderNumber || '#MA-' + Math.floor(10000 + Math.random() * 90000),
      customerName: params.customerName || `Client (+${params.phone})`,
      phoneNumber: params.phone,
      city: params.city || 'المغرب',
      totalAmount: params.totalAmount || 299,
      lastMessage: msgText,
      lastTime: timeStr,
      unreadCount: 1,
      isAiActive: true,
      needsHumanTakeover: false,
      messages: [newMsg],
    };
    conversations.unshift(conv);
  } else {
    conv.messages.push(newMsg);
    conv.lastMessage = msgText;
    conv.lastTime = timeStr;
    conv.unreadCount += 1;
  }

  return { conversation: conv, isAiActive: conv.isAiActive };
}

export function recordOutboundMessage(params: {
  phone: string;
  text: string;
  sender: 'AI_BOT' | 'AGENT';
}): ChatConversation | undefined {
  const conversations = getInboxConversations();
  const targetClean = cleanPhone(params.phone);
  const conv = conversations.find((c) => cleanPhone(c.phoneNumber) === targetClean);

  if (!conv) return undefined;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  conv.messages.push({
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    sender: params.sender,
    text: params.text,
    timestamp: timeStr,
  });

  conv.lastMessage = params.text;
  conv.lastTime = timeStr;
  conv.unreadCount = 0;

  if (params.sender === 'AGENT') {
    // If human agent replies, automatically disable bot takeover
    conv.isAiActive = false;
    conv.needsHumanTakeover = false;
  }

  return conv;
}

export function toggleAiActive(chatIdOrPhone: string, active?: boolean): ChatConversation | undefined {
  const conversations = getInboxConversations();
  const clean = cleanPhone(chatIdOrPhone);
  const conv = conversations.find(
    (c) => c.id === chatIdOrPhone || cleanPhone(c.phoneNumber) === clean
  );

  if (conv) {
    conv.isAiActive = active !== undefined ? active : !conv.isAiActive;
    if (conv.isAiActive) {
      conv.needsHumanTakeover = false;
    }
  }
  return conv;
}
