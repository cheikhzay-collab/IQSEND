/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           SARA LIVE — وكيلة الذكاء الاصطناعي المتكاملة                ║
 * ║   Multimodal Sales Agent — Voice + Vision + Darija — Gemini API        ║
 * ║   Version 2.0 | IQSend Platform | Powered by Gemini 2.0 Flash          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * قدرات الوكيلة سارة لايف:
 * ✅ فهم الصوت والكلام والرد عليه (Multimodal Voice)
 * ✅ تحليل الصور والمنتجات المرئية (Vision / Image Understanding)
 * ✅ البيع والتفاوض والإقناع بالدارجة المغربية الأصيلة
 * ✅ الاطلاع على كتالوج المنتجات الكامل
 * ✅ تتبع حالة الطلبات وإنشاء طلبات جديدة
 * ✅ الذاكرة الكاملة للمحادثة (Conversation History)
 */

import { GoogleGenerativeAI, Part, Content, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import { getProducts, findProductByNameOrKeyword, ProductItem } from './products-store';
import { findOrdersByPhone, findOrderByNumber, createDirectCustomerOrder, formatOrderStatusForWhatsApp } from './orders-store';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface SaraMessage {
  role: 'user' | 'model';
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioBase64?: string;
  audioMimeType?: string;
  timestamp: string;
}

export interface SaraConversation {
  sessionId: string;
  customerPhone?: string;
  customerName?: string;
  messages: SaraMessage[];
  createdAt: string;
  lastActivity: string;
  currentOrderId?: string;
}

export interface SaraAgentResponse {
  text: string;
  toolCalled?: string;
  toolResult?: any;
  suggestedActions?: string[];
  productImages?: Array<{ url: string; caption: string }>;
}

export interface SaraProcessInput {
  sessionId: string;
  userText?: string;
  userImageBase64?: string;
  userImageMimeType?: string;
  userAudioBase64?: string;
  userAudioMimeType?: string;
  customerPhone?: string;
  customerName?: string;
  history?: SaraMessage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Session Store
// ─────────────────────────────────────────────────────────────────────────────

const globalForSara = globalThis as unknown as { __saraConversations?: Map<string, SaraConversation> };

function getConversations(): Map<string, SaraConversation> {
  if (!globalForSara.__saraConversations) {
    globalForSara.__saraConversations = new Map();
  }
  return globalForSara.__saraConversations;
}

export function getSaraConversation(sessionId: string): SaraConversation | undefined {
  return getConversations().get(sessionId);
}

export function createOrGetSaraSession(sessionId: string, phone?: string, name?: string): SaraConversation {
  const convs = getConversations();
  if (!convs.has(sessionId)) {
    convs.set(sessionId, {
      sessionId,
      customerPhone: phone,
      customerName: name,
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    });
  }
  const conv = convs.get(sessionId)!;
  if (phone) conv.customerPhone = phone;
  if (name) conv.customerName = name;
  conv.lastActivity = new Date().toISOString();
  return conv;
}

export function getAllSaraSessions(): SaraConversation[] {
  return Array.from(getConversations().values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export function deleteSaraSession(sessionId: string): void {
  getConversations().delete(sessionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Key & Model Resolution
// ─────────────────────────────────────────────────────────────────────────────

function getSaraGeminiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() || '';
}

function getSaraGeminiModel(): string {
  const preferred = process.env.GEMINI_MODEL_NAME?.trim();
  const validModels = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-3.8-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  if (preferred && validModels.includes(preferred)) return preferred;
  return 'gemini-2.0-flash';
}

// ─────────────────────────────────────────────────────────────────────────────
// Function Declarations (Tools)
// ─────────────────────────────────────────────────────────────────────────────

const saraTools: FunctionDeclaration[] = [
  {
    name: 'browse_product_catalog',
    description: 'عرض كتالوج المنتجات الكامل مع الأسعار والمخزون والعروض.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, description: 'الفئة المطلوبة' },
        query: { type: SchemaType.STRING, description: 'كلمة البحث' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'الحصول على تفاصيل منتج معين كاملة.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productNameOrSku: { type: SchemaType.STRING, description: 'اسم المنتج أو SKU' },
      },
      required: ['productNameOrSku'],
    },
  },
  {
    name: 'track_order',
    description: 'تتبع حالة طلب الزبون.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        phoneOrOrderNumber: { type: SchemaType.STRING, description: 'رقم الهاتف أو رقم الطلبية' },
      },
      required: ['phoneOrOrderNumber'],
    },
  },
  {
    name: 'create_order',
    description: 'تسجيل طلبية جديدة من زبون مهتم.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customerName: { type: SchemaType.STRING, description: 'اسم الزبون' },
        phone: { type: SchemaType.STRING, description: 'رقم الهاتف' },
        city: { type: SchemaType.STRING, description: 'المدينة' },
        address: { type: SchemaType.STRING, description: 'العنوان' },
        productName: { type: SchemaType.STRING, description: 'اسم المنتج' },
        quantity: { type: SchemaType.NUMBER, description: 'الكمية' },
        size: { type: SchemaType.STRING, description: 'المقاس' },
        color: { type: SchemaType.STRING, description: 'اللون' },
        offerId: { type: SchemaType.STRING, description: 'معرف العرض' },
      },
      required: ['customerName', 'city', 'productName'],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool Executor
// ─────────────────────────────────────────────────────────────────────────────

async function executeSaraTool(toolName: string, args: Record<string, any>, sessionId: string): Promise<{ result: string; extras?: any }> {
  try {
    switch (toolName) {
      case 'browse_product_catalog': {
        const products = getProducts();
        let filtered = products;
        if (args.query) {
          const q = args.query.toLowerCase();
          filtered = products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.nameAr.toLowerCase().includes(q) ||
            p.keywords.some((k: string) => k.toLowerCase().includes(q))
          );
        }
        if (filtered.length === 0) {
          return { result: JSON.stringify({ message: 'ما كاين حتى منتج بهاد البحث.', products: [] }) };
        }
        const catalog = filtered.map(p => ({
          id: p.id,
          name: p.nameAr,
          nameFr: p.name,
          sku: p.sku,
          price: p.sellingPrice,
          description: p.descriptionAr,
          stock: p.totalStock,
          status: p.status,
          image: p.image,
          variants: p.variants,
          offers: p.offers,
          sellingPoints: p.sellingPoints,
        }));
        return { result: JSON.stringify({ products: catalog, total: catalog.length }) };
      }

      case 'get_product_details': {
        const product = findProductByNameOrKeyword(args.productNameOrSku);
        if (!product) {
          return { result: JSON.stringify({ error: `المنتج "${args.productNameOrSku}" غير موجود.` }) };
        }
        return {
          result: JSON.stringify({
            id: product.id,
            name: product.nameAr,
            nameFr: product.name,
            sku: product.sku,
            price: product.sellingPrice,
            description: product.descriptionAr,
            stock: product.totalStock,
            status: product.status,
            images: [product.image, ...(product.additionalImages || [])],
            variants: product.variants,
            offers: product.offers,
            sellingPoints: product.sellingPoints,
            agentInstructions: product.agentInstructions,
            objectionFaqs: product.objectionFaqs,
          }),
          extras: {
            productImages: [product.image, ...(product.additionalImages || [])].map((url: string, i: number) => ({
              url,
              caption: i === 0 ? `${product.nameAr} — ${product.sellingPrice} درهم 🛍️` : `صورة ${i + 1} — ${product.nameAr}`,
            })),
          },
        };
      }

      case 'track_order': {
        const phoneOrNum = args.phoneOrOrderNumber?.trim();
        if (!phoneOrNum) {
          return { result: JSON.stringify({ error: 'رقم الهاتف أو الطلبية مطلوب.' }) };
        }
        let orders: any[] = [];
        if (phoneOrNum.startsWith('#') || /^(AT|MA)/i.test(phoneOrNum)) {
          const order = findOrderByNumber(phoneOrNum.replace('#', ''));
          orders = order ? [order] : [];
        } else {
          orders = findOrdersByPhone(phoneOrNum) || [];
        }
        if (!orders.length) {
          return { result: JSON.stringify({ message: `ما لقيناش طلبية برقم "${phoneOrNum}".` }) };
        }
        const formatted = orders.map(o => formatOrderStatusForWhatsApp(o)).join('\n\n---\n\n');
        return {
          result: JSON.stringify({
            orders: orders.map(o => ({ orderNumber: o.orderNumber, stage: o.stage, customer: o.customer, items: o.items, payment: o.payment, tracking: o.tracking })),
            formatted,
          }),
        };
      }

      case 'create_order': {
        if (!args.customerName || !args.city || !args.productName) {
          return { result: JSON.stringify({ error: 'الاسم والمدينة واسم المنتج مطلوبين.' }) };
        }
        const product = findProductByNameOrKeyword(args.productName);
        if (!product) {
          const available = getProducts().map((p: ProductItem) => p.nameAr).join('، ');
          return { result: JSON.stringify({ error: `المنتج "${args.productName}" غير موجود. المتوفر: ${available}` }) };
        }
        const newOrder = createDirectCustomerOrder({
          customerName: args.customerName,
          phone: args.phone || 'غير محدد',
          city: args.city,
          address: args.address || args.city,
          productName: args.productName,
          quantity: args.quantity || 1,
          notes: [args.size && `المقاس: ${args.size}`, args.color && `اللون: ${args.color}`].filter(Boolean).join(' | ') || undefined,
        });
        const conv = getSaraConversation(sessionId);
        if (conv) conv.currentOrderId = newOrder.id;
        return {
          result: JSON.stringify({
            success: true,
            orderNumber: newOrder.orderNumber,
            orderId: newOrder.id,
            product: product.nameAr,
            price: newOrder.payment.amount,
            city: newOrder.customer.city,
          }),
        };
      }

      default:
        return { result: JSON.stringify({ error: `الأداة "${toolName}" غير معروفة.` }) };
    }
  } catch (err: any) {
    return { result: JSON.stringify({ error: err.message || 'خطأ في تنفيذ الأداة' }) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sara System Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildSaraSystemPrompt(session: SaraConversation): string {
  const products = getProducts();
  const productsList = products.map((p: ProductItem) => {
    let info = `• *${p.nameAr}* (${p.name}) — ${p.sellingPrice} درهم — المخزون: ${p.totalStock > 0 ? `متوفر (${p.totalStock} قطعة)` : 'نفد'}`;
    if (p.variants?.length) {
      info += `\n  المتغيرات: ${p.variants.map((v: any) => `${v.name}: ${v.options.join('/')}`).join(' | ')}`;
    }
    if (p.offers?.length) {
      info += `\n  العروض: ${p.offers.map((o: any) => `${o.title} بـ${o.priceMad}د`).join(' | ')}`;
    }
    return info;
  }).join('\n\n');

  return `أنت "سارة لايف" — وكيلة ذكاء اصطناعي متكاملة ومتطورة لمنصة IQSend للتجارة الإلكترونية والدفع عند الاستلام بالمغرب.

═══════════════════════════════════════════════════════════
🌟 شخصيتك وأسلوبك:
═══════════════════════════════════════════════════════════
• تتكلمين بالدارجة المغربية الأصيلة والطبيعية.
• صوتك حيوي، ودودة، متحمسة للبيع، محترفة.
• تردين باختصار واضح مناسب للبيع.
• تفهمين الصور التي يرسلها الزبون وتعطين تعليق مفيد.
• تفهمين الصوت وتردين بطبيعية.

═══════════════════════════════════════════════════════════
🛍️ المنتجات المتوفرة:
═══════════════════════════════════════════════════════════
${productsList}

🔒 قاعدة حاسمة: لا تقترحي ولا تبيعي أي منتج خارج القائمة.

═══════════════════════════════════════════════════════════
📋 الجلسة الحالية:
═══════════════════════════════════════════════════════════
• اسم الزبون: ${session.customerName || 'غير معروف'}
• رقم الهاتف: ${session.customerPhone || 'غير مُدخل'}

═══════════════════════════════════════════════════════════
🎯 قدراتك:
═══════════════════════════════════════════════════════════
1. رؤية الصور 📸 وتحليلها
2. فهم الصوت 🎤 والرد عليه
3. عرض الكتالوج 🛍️ باستدعاء browse_product_catalog
4. تفاصيل المنتج 🔍 باستدعاء get_product_details
5. تتبع الطلبية 📦 باستدعاء track_order
6. تسجيل طلبية ✅ باستدعاء create_order

═══════════════════════════════════════════════════════════
💡 استراتيجية البيع:
═══════════════════════════════════════════════════════════
• أكدي: "الدفع نقداً عند الاستلام بعد الفتح والفحص مع موزع Sendit".
• اقترحي العروض والباك (Pack 2، Pack 3).
• عند "واخا" أو "بغيت" — سجلي الطلبية فوراً.

⛔ لا تكتبي تفكيراً داخلياً. الرد مباشر للزبون فقط.`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Sara Agent Processor
// ─────────────────────────────────────────────────────────────────────────────

export async function processSaraMessage(input: SaraProcessInput): Promise<SaraAgentResponse> {
  const apiKey = getSaraGeminiKey();
  if (!apiKey) {
    return { text: 'عفواً، مفتاح Gemini API غير مُعيَّن. تواصل مع المسؤول.' };
  }

  const session = createOrGetSaraSession(input.sessionId, input.customerPhone, input.customerName);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getSaraGeminiModel(),
    systemInstruction: buildSaraSystemPrompt(session),
    tools: [{ functionDeclarations: saraTools }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 1024,
    },
  });

  // Build user message parts
  const userParts: Part[] = [];

  if (input.userText?.trim()) {
    userParts.push({ text: input.userText.trim() });
  }

  if (input.userImageBase64 && input.userImageMimeType) {
    userParts.push({
      inlineData: {
        data: input.userImageBase64,
        mimeType: input.userImageMimeType as any,
      },
    });
    if (!input.userText?.trim()) {
      userParts.push({ text: 'شوف هاد الصورة وعلق عليها مع ربطها بمنتجات المتجر إن أمكن.' });
    }
  }

  if (input.userAudioBase64 && input.userAudioMimeType) {
    userParts.push({
      inlineData: {
        data: input.userAudioBase64,
        mimeType: input.userAudioMimeType as any,
      },
    });
    if (!input.userText?.trim()) {
      userParts.push({ text: 'هاد كلام الزبون بالصوت، افهمي وردي عليه.' });
    }
  }

  if (userParts.length === 0) {
    return { text: 'ما فهمتكش، عاود كتب أو كلمني 😊' };
  }

  // Build conversation history
  const history: Content[] = [];
  for (const msg of session.messages) {
    const parts: Part[] = [];
    if (msg.text) parts.push({ text: msg.text });
    if (msg.imageBase64 && msg.imageMimeType) {
      parts.push({ inlineData: { data: msg.imageBase64, mimeType: msg.imageMimeType as any } });
    }
    if (parts.length > 0) {
      history.push({ role: msg.role, parts });
    }
  }

  // Save user message
  session.messages.push({
    role: 'user',
    text: input.userText,
    imageBase64: input.userImageBase64,
    imageMimeType: input.userImageMimeType,
    audioBase64: input.userAudioBase64,
    audioMimeType: input.userAudioMimeType,
    timestamp: new Date().toISOString(),
  });
  session.lastActivity = new Date().toISOString();

  try {
    const chat = model.startChat({ history });
    let response = await chat.sendMessage(userParts);
    let candidate = response.response;

    let finalText = '';
    let toolCalled: string | undefined;
    let toolResult: any;
    let productImages: Array<{ url: string; caption: string }> | undefined;
    let iterCount = 0;

    while (iterCount < 5) {
      iterCount++;
      const functionCalls = candidate.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        finalText = candidate.text() || '';
        break;
      }

      const call = functionCalls[0];
      toolCalled = call.name;
      const toolExec = await executeSaraTool(call.name, call.args as Record<string, any>, input.sessionId);
      toolResult = JSON.parse(toolExec.result);
      if (toolExec.extras?.productImages) {
        productImages = toolExec.extras.productImages;
      }

      const toolResponseParts: Part[] = [{
        functionResponse: {
          name: call.name,
          response: { result: toolExec.result },
        },
      }];
      response = await chat.sendMessage(toolResponseParts);
      candidate = response.response;
    }

    if (!finalText) {
      finalText = candidate.text() || 'عفواً، ما قدرتش نجاوب دابا. عاود المحاولة.';
    }

    finalText = cleanSaraReply(finalText);

    session.messages.push({
      role: 'model',
      text: finalText,
      timestamp: new Date().toISOString(),
    });

    return {
      text: finalText,
      toolCalled,
      toolResult,
      suggestedActions: buildSuggestedActions(finalText, toolCalled),
      productImages,
    };
  } catch (err: any) {
    console.error('[SaraLiveAgent] Error:', err);
    const errorMsg = 'سمحي أختي، كاين مشكل تقني مؤقت. عاودي المحاولة من فضلك 🙏';
    session.messages.push({ role: 'model', text: errorMsg, timestamp: new Date().toISOString() });
    return { text: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Utilities
// ─────────────────────────────────────────────────────────────────────────────

function cleanSaraReply(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  text = text.replace(/<(thought|thinking|reasoning)>[\s\S]*?<\/(thought|thinking|reasoning)>/gi, '');
  text = text.replace(/```(?:thought|thinking|reasoning)[\s\S]*?```/gi, '');
  const lines = text.split('\n');
  const cleaned: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { if (started) cleaned.push(''); continue; }
    const hasArabic = (trimmed.match(/[\u0600-\u06FF]/g) || []).length >= 2;
    const hasFrench = /^(bonjour|bonsoir|salut|merci|oui|non|salam)/i.test(trimmed);
    if (!started) {
      if (hasArabic || hasFrench) { started = true; cleaned.push(trimmed); }
    } else {
      cleaned.push(trimmed);
    }
  }
  const result = cleaned.join('\n').trim();
  return result || text;
}

function buildSuggestedActions(replyText: string, toolCalled?: string): string[] {
  if (toolCalled === 'browse_product_catalog') {
    return ['🔍 تفاصيل منتج معين', '📦 تتبع طلبيتي'];
  }
  if (toolCalled === 'get_product_details') {
    return ['✅ أريد الطلب', '🔍 منتجات أخرى', '❓ عندي سؤال'];
  }
  if (toolCalled === 'track_order') {
    return ['🛍️ أريد طلب جديد', '📞 تواصل مع مسؤول'];
  }
  if (toolCalled === 'create_order') {
    return ['✅ تأكيد الطلبية', '🔄 تعديل الطلبية'];
  }
  return ['🛍️ عرض المنتجات', '📦 تتبع طلبيتي', '❓ سؤال'];
}
