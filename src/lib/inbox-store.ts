import { cleanGeminiReply } from './gemini-agent';

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
  realPhoneNumber?: string;
  isLid?: boolean;
  lidJid?: string;
  pushName?: string;
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

const DEFAULT_CONVERSATIONS: ChatConversation[] = [];

const globalForInbox = globalThis as unknown as {
  __senditInboxConversations?: ChatConversation[];
};

export function getInboxConversations(): ChatConversation[] {
  if (!globalForInbox.__senditInboxConversations) {
    globalForInbox.__senditInboxConversations = [...DEFAULT_CONVERSATIONS];
  }
  // Retroactively clean any AI_BOT messages in memory that might have thinking traces
  for (const c of globalForInbox.__senditInboxConversations) {
    for (const m of c.messages) {
      if (m.sender === 'AI_BOT' && m.text) {
        m.text = cleanGeminiReply(m.text);
      }
    }
    if (c.lastMessage) {
      c.lastMessage = cleanGeminiReply(c.lastMessage);
    }
  }
  return globalForInbox.__senditInboxConversations;
}

export function isLidNumber(raw: string): boolean {
  if (!raw) return false;
  const digits = raw.replace(/[^\d]/g, '');
  return (
    raw.includes('@lid') ||
    (digits.length >= 14 && (digits.startsWith('1') || !digits.startsWith('212')))
  );
}

export function extractMoroccanPhoneFromText(text: string): string | null {
  if (!text) return null;
  // Match Moroccan numbers: 06xxxxxxxx, 07xxxxxxxx, 05xxxxxxxx, +212..., 212...
  const match = text.match(/(?:(?:\+|00)?212|0)[\s\-\.]?([567])(?:[\s\-\.]?\d){8}\b/);
  if (match) {
    let p = match[0].replace(/[^\d+]/g, '');
    if (p.startsWith('00212')) p = '0' + p.slice(5);
    else if (p.startsWith('+212')) p = '0' + p.slice(4);
    else if (p.startsWith('212')) p = '0' + p.slice(3);
    return p;
  }
  return null;
}

export function formatMoroccanDisplayPhone(phone: string): string {
  if (!phone) return '';
  if (isLidNumber(phone)) {
    return phone; // LID
  }
  let p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('212')) {
    p = '0' + p.slice(3);
  }
  if (p.length === 10 && (p.startsWith('06') || p.startsWith('07') || p.startsWith('05'))) {
    return `${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, 6)} ${p.slice(6, 8)} ${p.slice(8, 10)}`;
  }
  return phone;
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
  realPhone?: string;
  pushName?: string;
  text?: string;
  locationUrl?: string;
  customerName?: string;
  orderNumber?: string;
  city?: string;
  totalAmount?: number;
}): { conversation: ChatConversation; isAiActive: boolean } {
  const conversations = getInboxConversations();
  const targetClean = cleanPhone(params.phone);
  const isInputLid = isLidNumber(params.phone);

  // Look for existing conversation by LID, phone or realPhone
  let conv = conversations.find(
    (c) =>
      cleanPhone(c.phoneNumber) === targetClean ||
      (c.lidJid && cleanPhone(c.lidJid) === targetClean) ||
      (params.realPhone && cleanPhone(c.phoneNumber) === cleanPhone(params.realPhone))
  );

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const msgText = params.locationUrl
    ? `📍 موقع جغرافي مرسل: ${params.locationUrl}`
    : params.text || '';

  // Check if message text contains a customer Moroccan phone number
  const extractedPhone = extractMoroccanPhoneFromText(msgText);
  const effectiveRealPhone = params.realPhone || extractedPhone || undefined;

  const newMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    sender: 'CUSTOMER',
    text: msgText,
    timestamp: timeStr,
    isLocation: Boolean(params.locationUrl),
    locationUrl: params.locationUrl,
  };

  if (!conv) {
    const finalPhone = effectiveRealPhone || (isInputLid ? params.phone : params.phone);
    const friendlyName =
      params.customerName ||
      params.pushName ||
      (effectiveRealPhone
        ? `زبون (${formatMoroccanDisplayPhone(effectiveRealPhone)})`
        : isInputLid
        ? 'زبون واتساب (حساب جديد)'
        : `زبون (${formatMoroccanDisplayPhone(params.phone)})`);

    conv = {
      id: 'c-' + Date.now(),
      orderNumber: params.orderNumber || '#MA-' + Math.floor(10000 + Math.random() * 90000),
      customerName: friendlyName,
      phoneNumber: finalPhone,
      realPhoneNumber: effectiveRealPhone,
      isLid: isInputLid,
      lidJid: isInputLid ? params.phone : undefined,
      pushName: params.pushName,
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

    // If we newly learned the real phone number, update the conversation immediately!
    if (effectiveRealPhone && (!conv.realPhoneNumber || isLidNumber(conv.phoneNumber))) {
      conv.realPhoneNumber = effectiveRealPhone;
      conv.phoneNumber = effectiveRealPhone;
      if (conv.customerName.includes('Client') || conv.customerName.includes('زبون واتساب')) {
        conv.customerName = params.pushName || `زبون (${formatMoroccanDisplayPhone(effectiveRealPhone)})`;
      }
    }
    if (params.pushName && !conv.pushName) {
      conv.pushName = params.pushName;
      if (conv.customerName.includes('Client') || conv.customerName.includes('حساب جديد')) {
        conv.customerName = params.pushName;
      }
    }
  }

  return { conversation: conv, isAiActive: conv.isAiActive };
}

export function updateConversationCustomer(
  chatIdOrPhone: string,
  updates: {
    realPhone?: string;
    customerName?: string;
    orderNumber?: string;
    city?: string;
    totalAmount?: number;
  }
): ChatConversation | undefined {
  const conversations = getInboxConversations();
  const clean = cleanPhone(chatIdOrPhone);
  const conv = conversations.find(
    (c) =>
      c.id === chatIdOrPhone ||
      cleanPhone(c.phoneNumber) === clean ||
      (c.lidJid && cleanPhone(c.lidJid) === clean)
  );

  if (!conv) return undefined;

  if (updates.realPhone) {
    const cleanReal = updates.realPhone.trim();
    conv.realPhoneNumber = cleanReal;
    conv.phoneNumber = cleanReal;
    conv.isLid = false;
  }
  if (updates.customerName) {
    conv.customerName = updates.customerName.trim();
  }
  if (updates.orderNumber) {
    conv.orderNumber = updates.orderNumber.trim();
  }
  if (updates.city) {
    conv.city = updates.city.trim();
  }
  if (updates.totalAmount !== undefined) {
    conv.totalAmount = updates.totalAmount;
  }

  return conv;
}

export function recordOutboundMessage(params: {
  phone: string;
  text: string;
  sender: 'AI_BOT' | 'AGENT';
}): ChatConversation | undefined {
  const conversations = getInboxConversations();
  const targetClean = cleanPhone(params.phone);
  const conv = conversations.find(
    (c) =>
      cleanPhone(c.phoneNumber) === targetClean ||
      (c.lidJid && cleanPhone(c.lidJid) === targetClean) ||
      (c.realPhoneNumber && cleanPhone(c.realPhoneNumber) === targetClean)
  );

  if (!conv) return undefined;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const cleanText = params.sender === 'AI_BOT' ? cleanGeminiReply(params.text) : params.text;

  conv.messages.push({
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    sender: params.sender,
    text: cleanText,
    timestamp: timeStr,
  });

  conv.lastMessage = cleanText;
  conv.lastTime = timeStr;
  conv.unreadCount = 0;

  if (params.sender === 'AGENT') {
    conv.isAiActive = false;
    conv.needsHumanTakeover = false;
  }

  return conv;
}

export function toggleAiActive(chatIdOrPhone: string, active?: boolean): ChatConversation | undefined {
  const conversations = getInboxConversations();
  const clean = cleanPhone(chatIdOrPhone);
  const conv = conversations.find(
    (c) =>
      c.id === chatIdOrPhone ||
      cleanPhone(c.phoneNumber) === clean ||
      (c.lidJid && cleanPhone(c.lidJid) === clean)
  );

  if (conv) {
    conv.isAiActive = active !== undefined ? active : !conv.isAiActive;
    if (conv.isAiActive) {
      conv.needsHumanTakeover = false;
    }
  }
  return conv;
}
