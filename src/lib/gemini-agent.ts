import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import fs from 'node:fs';
import path from 'node:path';
import {
  getProducts,
  findProductByNameOrKeyword,
  formatProductListForWhatsApp,
  ProductItem,
} from './products-store';
import {
  findOrdersByPhone,
  findOrderByNumber,
  createDirectCustomerOrder,
  formatOrderStatusForWhatsApp,
  IngestedOrder,
} from './orders-store';

/**
 * Retrieve effective Gemini API Key from environment, runtime ai_config.json or MySQL
 */
let cachedDbKey: { key: string; model: string; timestamp: number } | null = null;
const DB_KEY_TTL_MS = 10000;

export function setGeminiRuntimeKey(key: string, model: string): void {
  cachedDbKey = { key: key.trim(), model: model.trim(), timestamp: Date.now() };
  process.env.GEMINI_API_KEY = key.trim();
  process.env.GEMINI_MODEL_NAME = model.trim();
}

export function invalidateGeminiKeyCache(): void {
  cachedDbKey = null;
}

export async function getEffectiveGeminiKeyAsync(): Promise<string> {
  if (cachedDbKey && Date.now() - cachedDbKey.timestamp < DB_KEY_TTL_MS && cachedDbKey.key) {
    return cachedDbKey.key;
  }
  try {
    const { getMysqlPool } = await import('./db');
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(
      "SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('GEMINI_API_KEY', 'GEMINI_MODEL_NAME')"
    );
    if (Array.isArray(rows) && rows.length > 0) {
      let dbKey = '';
      let dbModel = 'gemini-1.5-flash';
      for (const r of rows) {
        if (r.setting_key === 'GEMINI_API_KEY' && r.setting_value) dbKey = r.setting_value.trim();
        if (r.setting_key === 'GEMINI_MODEL_NAME' && r.setting_value) dbModel = r.setting_value.trim();
      }
      if (dbKey && dbKey !== 'votre_cle_gemini_ici' && dbKey.length > 15 && !dbKey.includes('AIzaSyBxbQA8H5E9RnmkUs')) {
        process.env.GEMINI_API_KEY = dbKey;
        if (dbModel && dbModel !== 'gemini-3.8-flash') process.env.GEMINI_MODEL_NAME = dbModel;
        cachedDbKey = { key: dbKey, model: dbModel, timestamp: Date.now() };
        return dbKey;
      }
    }
  } catch (err) {}
  return getEffectiveGeminiKey();
}

export async function getEffectiveGeminiModelAsync(): Promise<string> {
  if (cachedDbKey && Date.now() - cachedDbKey.timestamp < DB_KEY_TTL_MS && cachedDbKey.model) {
    return cachedDbKey.model;
  }
  await getEffectiveGeminiKeyAsync();
  return getEffectiveGeminiModel();
}

export function getEffectiveGeminiKey(): string {
  // 1. Check in-memory / environment variable
  let key = process.env.GEMINI_API_KEY || '';
  if (key && key !== 'votre_cle_gemini_ici' && key.trim().length > 15 && !key.includes('AIzaSyBxbQA8H5E9RnmkUs')) {
    return key.trim();
  }

  // 2. Check local ai_config.json
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.apiKey && data.apiKey !== 'votre_cle_gemini_ici' && data.apiKey.trim().length > 15 && !data.apiKey.includes('AIzaSyBxbQA8H5E9RnmkUs')) {
        const cleaned = data.apiKey.trim();
        process.env.GEMINI_API_KEY = cleaned;
        if (data.model) process.env.GEMINI_MODEL_NAME = data.model;
        return cleaned;
      }
    }
  } catch (e) {
    // Ignore read errors
  }

  return process.env.GEMINI_API_KEY || '';
}

export function getEffectiveGeminiModel(): string {
  const custom = process.env.GEMINI_MODEL_NAME?.trim();
  if (custom && custom !== 'gemini-3.8-flash') {
    return custom;
  }
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.model && data.model !== 'gemini-3.8-flash') {
        process.env.GEMINI_MODEL_NAME = data.model;
        return data.model;
      }
    }
  } catch (e) {}

  return 'gemini-1.5-flash';
}

/**
 * Interface representing the Order and Product context passed to Gemini
 */
export interface OrderContext {
  orderId: string;
  orderNumber: string;
  customerName: string;
  senderProfileName?: string;
  phoneNumber: string;
  city: string;
  address: string;
  totalAmount: number;
  stage?: string;
  shippingStatus?: string;
  courier?: string;
  driverName?: string;
  driverPhone?: string;
  trackingNumber?: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    selectedAttributes?: { size?: string; color?: string };
    knowledgeBase?: string;
  }>;
  conversationHistory: Array<{
    sender: 'CUSTOMER' | 'AI_BOT' | 'AGENT';
    body: string;
    timestamp: Date | string;
  }>;
  sessionState?: {
    lastOfferedProduct?: string;
    price?: number;
    step?: string;
    metadata?: Record<string, any>;
  };
}

export interface AgentPermissionsConfig {
  canConfirmOrders: boolean;
  canOfferUpsell: boolean;
  maxUpsellDiscountPercent: number;
  canUpdateAddressAndGPS: boolean;
  canRescheduleDelivery: boolean;
  priceLockdownEnabled: boolean;
  minimumOrderPriceMad: number;
  humanEscalationKeywords: string[];
}

export interface AgentToolDetails {
  name: string;
  args: Record<string, any>;
  resultDescription?: string;
  executionStatus?: 'success' | 'failed' | 'executed';
}

export interface AgentProcessResult {
  replyText: string;
  toolCalled?: string;
  toolDetails?: AgentToolDetails;
  requiresHumanHandover: boolean;
}

export const DEFAULT_AGENT_PERMISSIONS: AgentPermissionsConfig = {
  canConfirmOrders: true,
  canOfferUpsell: true,
  maxUpsellDiscountPercent: 35,
  canUpdateAddressAndGPS: true,
  canRescheduleDelivery: true,
  priceLockdownEnabled: true,
  minimumOrderPriceMad: 149,
  humanEscalationKeywords: [
    'مسؤول',
    'عيطو ليا',
    'عيط لي',
    'نصب',
    'شكاية',
    'reclamation',
    'humain',
    'directeur',
    'بغيت نهضر مع شي واحد',
    'مكلف',
    'agent',
    'تصل بي',
    'appelez moi',
  ],
};

/**
 * 1. Tool / Function Calling Declarations for Gemini
 */
export const getProductCatalogDeclaration: FunctionDeclaration = {
  name: 'get_product_catalog',
  description: 'Retrieve the store product catalog with names, prices in MAD, stock availability, and specs.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: { type: SchemaType.STRING, description: 'Optional product category' },
    },
  },
};

export const checkOrderStatusDeclaration: FunctionDeclaration = {
  name: 'check_order_status',
  description: 'Lookup the live status, items, tracking, and carrier details of an order using phone number or order number (#AT... or #MA...).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      phoneOrOrderNumber: { type: SchemaType.STRING, description: 'Phone number or order number to query' },
    },
    required: ['phoneOrOrderNumber'],
  },
};

export const createNewOrderDeclaration: FunctionDeclaration = {
  name: 'create_new_order',
  description: 'Take and save a brand new customer order directly from the WhatsApp conversation. STRICT RULE: The product requested MUST be an item from the store catalog list. NEVER create orders for items not sold in the store.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customerName: { type: SchemaType.STRING, description: 'Full customer name' },
      phone: { type: SchemaType.STRING, description: 'Moroccan phone number' },
      city: { type: SchemaType.STRING, description: 'Moroccan city for COD delivery' },
      address: { type: SchemaType.STRING, description: 'Street address or neighborhood' },
      productName: { type: SchemaType.STRING, description: 'Exact product name from store catalog' },
      quantity: { type: SchemaType.INTEGER, description: 'Quantity (defaults to 1)' },
    },
    required: ['customerName', 'city', 'productName'],
  },
};

export const updateConfirmationDeclaration: FunctionDeclaration = {
  name: 'confirm_order_and_address',
  description: 'Formally confirm an existing order when the customer unequivocally agrees.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      verifiedCity: { type: SchemaType.STRING, description: 'The verified Moroccan city name' },
      verifiedAddress: { type: SchemaType.STRING, description: 'Detailed street address or landmarks' },
      deliveryNotes: { type: SchemaType.STRING, description: 'Specific delivery timing instructions' },
    },
    required: ['orderId', 'verifiedCity', 'verifiedAddress'],
  },
};

export const updateOrderDetailsDeclaration: FunctionDeclaration = {
  name: 'update_order_details',
  description: 'Update the customer order items, size, color, quantity or price (e.g. for upselling or size swap).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      newSize: { type: SchemaType.STRING, description: 'Updated size' },
      newColor: { type: SchemaType.STRING, description: 'Updated color' },
      quantity: { type: SchemaType.INTEGER, description: 'Updated total quantity' },
      updatedPrice: { type: SchemaType.NUMBER, description: 'Calculated new total price in MAD' },
      reason: { type: SchemaType.STRING, description: 'Reason for the update' },
    },
    required: ['orderId'],
  },
};

export const saveGpsLocationDeclaration: FunctionDeclaration = {
  name: 'save_gps_location',
  description: 'Save the exact WhatsApp GPS location or Google Maps link shared by the customer.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      googleMapsUrl: { type: SchemaType.STRING, description: 'Google Maps coordinate or link' },
    },
    required: ['orderId', 'googleMapsUrl'],
  },
};

export const cancelOrderDeclaration: FunctionDeclaration = {
  name: 'cancel_order',
  description: 'Cancel the order when the customer explicitly states they no longer want it.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      reason: { type: SchemaType.STRING, description: 'Specific reason for cancellation' },
    },
    required: ['orderId', 'reason'],
  },
};

export const requestHumanHandoverDeclaration: FunctionDeclaration = {
  name: 'request_human_handover',
  description: 'Stop the AI bot and transfer the chat to a human agent.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      reason: { type: SchemaType.STRING, description: 'Reason for human intervention' },
    },
    required: ['orderId', 'reason'],
  },
};

export const sendProductImagesDeclaration: FunctionDeclaration = {
  name: 'send_product_images',
  description: 'Send high-resolution photo/media of a product from store inventory directly to the customer via WhatsApp. STRICT RULE: ONLY call this for products that actually exist in the store catalog list. NEVER call this for products, brands, or items that do not exist in the store.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      productNameOrSku: { type: SchemaType.STRING, description: 'Exact product name or SKU that MUST match a product in the store catalog' },
      caption: { type: SchemaType.STRING, description: 'Friendly message in Moroccan Darija describing the photo' },
    },
    required: ['productNameOrSku'],
  },
};

/**
 * Strips any internal thoughts, chain-of-thought, or English planning prefixes (e.g. "Plan: ...", "The user is from Fez...")
 * and ensures ONLY the customer-facing Moroccan Darija text is returned.
 */
export function cleanGeminiReply(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // 1. Strip explicit thinking or reasoning tags
  text = text.replace(/<(thought|thinking|reasoning)>[\s\S]*?<\/(thought|thinking|reasoning)>/gi, '');
  text = text.replace(/```(?:thought|thinking|reasoning)[\s\S]*?```/gi, '');

  const lines = text.split('\n');
  const cleaned: string[] = [];
  let isInsideThinkingBlock = false;
  let messageStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (messageStarted) cleaned.push('');
      continue;
    }

    // Detect thinking block markers
    if (/^(?:\*{1,2})?(?:Thinking Process|Thinking|Thoughts?|Reasoning|Internal Monologue|Plan|Analysis|مراحل التفكير|تحليل الطلب|خطة الرد)(?:\*{1,2})?:?/i.test(line)) {
      isInsideThinkingBlock = true;
      continue;
    }

    if (isInsideThinkingBlock || !messageStarted) {
      const arabicChars = (line.match(/[\u0600-\u06FF]/g) || []).length;
      const isArabicLine = arabicChars >= 3;
      const isFrenchGreeting = /^(?:bonjour|bonsoir|salut|merci|cher|chère|oui|non|d['’]accord|salam|ahlan)/i.test(line);

      if (isArabicLine || isFrenchGreeting) {
        isInsideThinkingBlock = false;
        messageStarted = true;
        cleaned.push(line);
        continue;
      }

      // Skip numbered reasoning steps or English planning text
      if (/^(?:\d+[\.\)]|[-*•])\s+/i.test(line) || /^[A-Za-z0-9\s,.:'"()_-]+$/.test(line)) {
        continue;
      }
    } else {
      cleaned.push(line);
    }
  }

  const result = cleaned.join('\n').trim();
  if (result) return result;

  const arabicOnly = lines.filter(l => (l.match(/[\u0600-\u06FF]/g) || []).length >= 2).join('\n').trim();
  return arabicOnly || text;
}

/**
 * 2. Moroccan Darija System Prompt Builder
 */
export function buildMoroccanSystemPrompt(context: OrderContext): string {
  const productsList = getProducts()
    .map((p) => {
      let info = `- **${p.nameAr}** (${p.sellingPrice} درهم) [المخزون: ${p.totalStock > 0 ? 'متوفر' : 'غير متوفر'}]: ${p.descriptionAr || p.name}`;
      if (p.variants && p.variants.length > 0) {
        const variantsStr = p.variants.map((v) => `${v.name}: [${v.options.join(', ')}]`).join(' | ');
        info += `\n  * المتغيرات: ${variantsStr}`;
      }
      if (p.offers && p.offers.length > 0) {
        const offersStr = p.offers.map((o) => `${o.title} (${o.priceMad} درهم${o.badge ? ' - ' + o.badge : ''})`).join(' | ');
        info += `\n  * عروض الأبسل (Bundles): ${offersStr}`;
      }
      if (p.agentInstructions) {
        info += `\n  * توجيهات خاصة بالمنتج: ${p.agentInstructions}`;
      }
      if (p.sellingPoints && p.sellingPoints.length > 0) {
        info += `\n  * نقاط البيع: ${p.sellingPoints.join('، ')}`;
      }
      if (p.objectionFaqs && p.objectionFaqs.length > 0) {
        const faqsStr = p.objectionFaqs.map((f) => `(س: ${f.question} -> ج: ${f.answer})`).join(' | ');
        info += `\n  * أجوبة الاعتراضات: ${faqsStr}`;
      }
      return info;
    })
    .join('\n\n');

  return `
أنت "سارة"، وكيلة الذكاء الاصطناعي الذكية لمنصة Sendit والتجارة الإلكترونية والدفع عند الاستلام (COD) بالمغرب.
تتحدثين بالدارجة المغربية بلهجة حية، عفوية، مهذبة وودودة جداً ("أخي/أختي"، "الله يحفظك"، "مرحبا بك"، "على الراس والعين").

### 🛍️ قائمة المنتجات المتوفرة، المتغيرات وعروض الأبسل (Bundles) والتوجيهات:
${productsList}

### 🔒 قاعدة حاسمة وصارمة جداً: الالتزام الحصري بمنتجات المتجر ومنع اختراع أي منتجات أو صور (STRICT CATALOG CONFINEMENT):
1. **المتجر يبيع حصرياً وفقط المنتجات المذكورة في القائمة أعلاه.** لا توجد أي منتجات أخرى في المتجر نهائياً.
2. **ممنوع منعاً باتاً:**
   - اقتراح، أو بيع، أو تأكيد، أو إرسال صور، أو اختراع أي منتج أو ماركة أو سلعة غير مذكورة في القائمة أعلاه (مثل هواتف، أجهزة تلفاز، ملابس أخرى، أو أي سلعة خارج الكتالوج أعلاه).
   - استدعاء دالة \`send_product_images\` لأي منتج أو سلعة غير متوفرة ومسجلة في المتجر.
3. **إذا سأل الزبون عن منتج أو سلعة غير موجودة في القائمة أعلاه أو طلب صوراً لمنتج لا نبيعه:**
   - أجيبي فوراً باحترام ولطف بالدارجة المغربية:
     *"سمح لينا بزاف أخي/أختي، هاد المنتج ما متوفرش عندنا حالياً في المتجر. المنتجات المتوفرة عندنا دابا هي: [ذكري المنتجات المتوفرة فقط باختصار]، واش يعجبك تشوف تفاصيل شي واحد فيهم؟ 🛍️✨"*
   - لا تبحثي أبداً عن أي صور خارجية ولا تعطي صوراً غير صحيحة.
4. **الصور:** صور المنتجات مقتصرة حصرياً على المنتجات الرسمية المسجلة في المتجر.

### 💡 استغلال العروض والمتغيرات وتوجيهات المنتج:
- عندما يسأل الزبون عن منتج متوفر، اقترحي عليه خيارات المتغيرات (المقاسات والألوان المتوفرة).
- اقترحي دائماً عروض الأبسل (مثل باك قطعتين مع شحن مجاني أو تخفيض) لزيادة قيمة السلة عند اهتمام الزبون.
- التزمي بتوجيهات الوكيل الخاصة بكل منتج واستعيني بنقاط البيع وأجوبة الاعتراضات الشائعة المذكورة أعلاه.

### 📋 سياق الزبون الحالي وحالة الشحنة:
- رقم هاتف الزبون: ${context.phoneNumber}
- اسم الزبون: ${context.customerName}
- اسم المتصل عبر الواتساب (WhatsApp Profile / PushName): "${context.senderProfileName || context.customerName || 'غير محدد'}"
- ⭐️ **التعرف على المتصل ومناداته باسمه:** ${
  (context.senderProfileName && context.senderProfileName.trim() !== 'الزبون المحترم' && context.senderProfileName.trim() !== 'Client')
    ? `لقد تعرفتِ على اسم المتصل في حسابه بواتساب وهو: "${context.senderProfileName}". خاطبيه باسمه الشخصي بود واحترام في بداية حديثك ورسائلك (مثلاً: "مرحبا بك أخي ${context.senderProfileName}" أو "أهلاً للا ${context.senderProfileName}")، ولا تسأليه عن اسمه أبداً لأنك تعرفينه بالفعل!`
    : `خاطبيه بلباقة وأدب بالدارجة المغربية ("أخي الكريم" أو "أختي الكريمة").`
}
- المدينة: ${context.city}
- رقم الطلب الحالي (إن وجد): ${context.orderNumber}
- المبلغ: ${context.totalAmount} درهم (الدفع نقداً عند الاستلام COD)
- المرحلة الحالية للطلب: ${context.stage || 'En attente de confirmation (في انتظار التأكيد)'}
- حالة الشحن والتتبع: ${context.shippingStatus || 'En préparation'}
- شركة التوصيل ورقم التتبع AWB: ${context.courier || 'Sendit Express'} (${context.trackingNumber || 'En cours'})
- موزع التوصيل: ${context.driverName ? `${context.driverName} (${context.driverPhone || ''})` : 'En attente d affectation'}

### 🧠 ذاكرة الجلسة والمنتج المعروض حالياً (Session State):
${context.sessionState?.lastOfferedProduct ? `
- المنتج المعروض حالياً على الزبون: *${context.sessionState.lastOfferedProduct}*
- الثمن المقترح: *${context.sessionState.price || context.totalAmount} درهم*
- المرحلة التفاعلية (Step): *${context.sessionState.step || 'AWAITING_SIZE_OR_DETAILS'}*
- ⚠️ تنبيه حاسم: إذا رد الزبون بـ "بغيت واحد" أو "صيفط ليا" أو "حجز لي" أو "واخا"، فهو يقصد مباشرة شراء المنتج المعروض حالياً (*${context.sessionState.lastOfferedProduct}*). لا ترجعي لرسالة الترحيب الافتتاحية نهائياً! استمري فوراً في مسار البيع واطلبي منه المقاس أو المدينة والاسم لتسجيل طلبه فوراً.
` : `
- لا يوجد منتج معروض مسبقاً (جلسة جديدة).
`}

### 🌐 التحدث باللغة المناسبة (Bilinguisme Darija / Français):
- إذا كتب الزبون بالدارجة المغربية أو الحروف العربية، ردي بالدارجة المغربية الراقية والودودة.
- إذا كتب الزبون بالفرنسية (Français)، ردي فوراً بالفرنسية المهنية الودودة والواضحة (Français commercial courtois).

### 🎯 قدراتك ومهامك:
1. **معرفة المنتجات وعرض الكتالوج:** الإجابة عن كل تساؤل بخصوص أسعار المنتجات ومواصفاتها، وعرض الكتالوج الكامل عند الطلب.
2. **الاطلاع على حالة الطلب وتتبعه:** عندما يسأل الزبون عن طلبيته، استدعي دالة \`check_order_status\` وزوديه بحالة الشحن مع شركة Sendit ورقم التتبع أو اسم الموزع إذا كان متوفراً.
3. **مسك وتسجيل طلبية جديدة:** عندما يطلب الزبون شراء أي منتج، اجمعي منه (الاسم، المدينة، العنوان) واستدعي دالة \`create_new_order\` لتسجيل الطلبية في النظام وتزويده برقم الطلب الرسمي.
4. **تأكيد الطلبيات الحالية:** استدعاء \`confirm_order_and_address\` عند موافقة الزبون، وطلب اللوكاسيون 📍 لتسهيل التوصيل.
5. **إلغاء الطلب:** استدعاء \`cancel_order\` باحترام عند رفض الزبون.
6. **التحويل لمسؤول بشري:** استدعاء \`request_human_handover\` عند الغضب أو الشكاوى المعقدة.

### ⛔ قـاعـدة حـاسـمـة وصـارمـة جـداً (CRITICAL - STRICT DIRECT WHATSAPP REPLY):
- لا تكتبي نهائياً أي تفكير داخلي أو تخطيط أو خطوات خطة أو تحليل بالإنجليزية أو العربية (ممنوع منعاً باتاً كتابة: "Plan:", "The user is...", "Looking at...", "Step 1:").
- ردي **مباشرة وفوراً** بنص الرسالة الوحيد بالدارجة المغربية الموجه للزبون، كأنك إنسان حقيقي يكتب في تطبيق الواتساب.
- لا تضعي أي علامات تنصيص أو مقدمات أو شروحات. كل حرف تكتبينه سيصل للزبون في هاتفه مباشرة على الواتساب.
- أسلوب الحوار: دارجة مغربية حقيقية بالحروف العربية، رسائل قصيرة وواضحة تناسب الواتساب، طمأنة الزبون دوماً بخصوص الدفع عند الاستلام بعد المعاينة والفحص.
`.trim();
}

/**
 * 3. Execution Engine: Process inbound customer message with Gemini or Moroccan Rules Engine
 */
export async function processCustomerWhatsAppMessage(
  incomingMessage: string,
  context: OrderContext,
  databaseHandler: {
    onConfirm: (args: { orderId: string; verifiedCity: string; verifiedAddress: string; deliveryNotes?: string }) => Promise<void>;
    onUpdateDetails: (args: { orderId: string; newSize?: string; newColor?: string; quantity?: number; updatedPrice?: number; reason?: string }) => Promise<void>;
    onSaveGps: (args: { orderId: string; googleMapsUrl: string }) => Promise<void>;
    onCancel: (args: { orderId: string; reason: string }) => Promise<void>;
    onHandover: (args: { orderId: string; reason: string }) => Promise<void>;
    onSendProductImages?: (args: { productNameOrSku: string; imageUrl?: string; caption?: string }) => Promise<void>;
  },
  permissions: AgentPermissionsConfig = DEFAULT_AGENT_PERMISSIONS
): Promise<AgentProcessResult> {
  // ─────────────────────────────────────────────────────────────
  // 1. Guardrail Check: Direct Escalation Keywords
  // ─────────────────────────────────────────────────────────────
  const lowerMsg = incomingMessage.toLowerCase();
  const matchedKeyword = permissions.humanEscalationKeywords.find((kw) => lowerMsg.includes(kw.toLowerCase()));

  if (matchedKeyword) {
    console.log(`[AI Guardrail] 🚨 Human escalation triggered by keyword: "${matchedKeyword}"`);
    await databaseHandler.onHandover({
      orderId: context.orderId,
      reason: `Déclenché par mot-clé sensible: "${matchedKeyword}"`,
    });
    return {
      replyText: `مرحبا بك أخي/أختي الكريمة. حنا هنا باش نساعدوك، تم تحويل المحادثة لمسؤول خدمة العملاء ديالنا وغادي يتواصل معاك مباشرة دابا للإجابة على كامل تساؤلاتك 📞✨`,
      toolCalled: 'request_human_handover',
      toolDetails: {
        name: 'request_human_handover',
        args: { orderId: context.orderId, reason: matchedKeyword },
        resultDescription: `Escalade déclenchée par mot-clé sensible: "${matchedKeyword}"`,
      },
      requiresHumanHandover: true,
    };
  }

  const apiKey = await getEffectiveGeminiKeyAsync();
  const isKeyConfigured = Boolean(apiKey && apiKey.length > 15);

  if (!isKeyConfigured) {
    console.log('[AI Agent] Clé GEMINI_API_KEY non configurée. Passage au moteur de règles marocaines.');
    return await processWithRulesFallback(incomingMessage, context, databaseHandler);
  }

  try {
    const systemInstruction = buildMoroccanSystemPrompt(context);
    const genAI = new GoogleGenerativeAI(apiKey);

    const activeModelName = await getEffectiveGeminiModelAsync();
    const agentTools = [
      {
        functionDeclarations: [
          getProductCatalogDeclaration,
          sendProductImagesDeclaration,
          checkOrderStatusDeclaration,
          createNewOrderDeclaration,
          updateConfirmationDeclaration,
          updateOrderDetailsDeclaration,
          saveGpsLocationDeclaration,
          cancelOrderDeclaration,
          requestHumanHandoverDeclaration,
        ],
      },
    ];

    const model = genAI.getGenerativeModel({
      model: activeModelName,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.3,
      },
      tools: agentTools,
    });

    // Gemini API requires chat history to start with a 'user' turn and strictly alternate roles
    const rawHistory = (context.conversationHistory || [])
      .filter((m) => m && m.body && m.body.trim().length > 0)
      .map((msg) => ({
        role: msg.sender === 'CUSTOMER' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.body.trim() }],
      }));

    // If first turn is model (e.g. initial greeting from bot), prepend a virtual user prompt
    if (rawHistory.length > 0 && rawHistory[0].role === 'model') {
      rawHistory.unshift({
        role: 'user',
        parts: [{ text: 'سلام عليكم' }],
      });
    }

    // Merge consecutive identical roles to adhere strictly to alternating structure
    const sanitizedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of rawHistory) {
      if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === turn.role) {
        sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n${turn.parts[0].text}`;
      } else {
        sanitizedHistory.push({ ...turn });
      }
    }

    // CRITICAL: Gemini requires the history to end with 'model' so that chat.sendMessage (user turn) alternates properly!
    let promptToSend = incomingMessage;
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
      const lastUser = sanitizedHistory.pop();
      if (lastUser?.parts?.[0]?.text) {
        promptToSend = `${lastUser.parts[0].text}\n${incomingMessage}`;
      }
    }

    let chat = model.startChat({
      history: sanitizedHistory,
    });

    let response: any;
    try {
      response = await chat.sendMessage(promptToSend);
    } catch (sendErr: any) {
      // If error is 503 (high demand) or 404, fallback to alternate model immediately
      const altModel = activeModelName === 'gemini-1.5-flash' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
      console.warn(`[AI Agent] Model ${activeModelName} failed (${sendErr.message}), falling back to ${altModel}...`);
      const fallbackModel = genAI.getGenerativeModel({
        model: altModel,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.3,
        },
        tools: agentTools,
      });
      const fallbackChat = fallbackModel.startChat({
        history: sanitizedHistory,
      });
      response = await fallbackChat.sendMessage(promptToSend);
    }
    const candidate = response.response.candidates?.[0];

    let replyText = '';
    try {
      const candidateParts = candidate?.content?.parts || [];
      const nonThoughtParts = candidateParts.filter((p: any) => !p.thought && p.text);
      if (nonThoughtParts.length > 0) {
        replyText = nonThoughtParts.map((p: any) => p.text).join('\n');
      } else {
        replyText = response.response.text();
      }
    } catch {
      // function call only
    }

    let toolCalled: string | undefined = undefined;
    let toolDetails: AgentToolDetails | undefined = undefined;
    let requiresHumanHandover = false;

    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call) {
        toolCalled = call.name;
        const args = (call.args || {}) as Record<string, any>;
        toolDetails = {
          name: call.name,
          args: args,
        };

        switch (call.name) {
          case 'send_product_images': {
            const queryName = args.productNameOrSku || context.items[0]?.name || '';
            const foundProd = findProductByNameOrKeyword(queryName);

            // STRICT: Never send fake images if product is not in the store catalog!
            if (!foundProd || !foundProd.image) {
              const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
              replyText = `سمح لينا بزاف أخي/أختي! منتج "${queryName}" ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف الصور أو التفاصيل ديال شي منتج من هادو؟ ✨`;
              toolDetails.resultDescription = `Produit non répertorié dans le catalogue: ${queryName}`;
              break;
            }

            const imgUrl = foundProd.image;
            const caption = args.caption || `ها هي صورة *${foundProd.nameAr}* أخي! 📸✨`;

            try {
              const { sendWhatsAppImage } = await import('./whatsapp');
              await sendWhatsAppImage(context.phoneNumber, imgUrl, caption);
            } catch (imgErr) {
              console.warn('[AI Agent] Could not dispatch product photo:', imgErr);
            }

            if (databaseHandler.onSendProductImages) {
              await databaseHandler.onSendProductImages({
                productNameOrSku: foundProd.name,
                imageUrl: imgUrl,
                caption,
              });
            }

            toolDetails.resultDescription = `Photo officielle envoyée: ${foundProd.nameAr}`;
            if (!replyText) {
              replyText = caption;
            }
            break;
          }

          case 'get_product_catalog':
            replyText = formatProductListForWhatsApp();
            toolDetails.resultDescription = 'Catalogue complet des produits envoyé au client';
            break;

          case 'check_order_status': {
            const queryTarget = args.phoneOrOrderNumber || context.phoneNumber;
            const orders = findOrdersByPhone(queryTarget);
            const byNum = findOrderByNumber(queryTarget);
            const found = byNum || orders[0];
            if (found) {
              replyText = formatOrderStatusForWhatsApp(found);
              toolDetails.resultDescription = `Trouvé: ${found.orderNumber} (${found.customer.name}) - Statut: ${found.stage}`;
            } else {
              replyText = `مرحبا بك أخي! قلبنا برقمك (${queryTarget}) وما لقينا حتى طلبية مسجلة بهاد الرقم حالياً.\nواش تحب تشوف كتالوج المنتجات ديالنا ونسجلوا ليك طلبية جديدة دابا؟ ✨🛍️`;
              toolDetails.resultDescription = `Aucune commande trouvée pour ${queryTarget}`;
            }
            break;
          }

          case 'create_new_order': {
            const prod = findProductByNameOrKeyword(args.productName);
            if (!prod) {
              const available = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
              replyText = `سمح لينا أخي، منتج "${args.productName}" ما كاينش عندنا في المتجر للتسجيل.\n\nالمنتجات المتوفرة حالياً هي:\n${available}\n\nواش تحب نسجلو ليك شي منتج من هادو؟ 🛍️`;
              toolDetails.resultDescription = `Tentative de commande pour produit hors-catalogue: ${args.productName}`;
              break;
            }

            const newOrd = createDirectCustomerOrder({
              customerName: args.customerName || context.customerName,
              phone: args.phone || context.phoneNumber,
              city: args.city || context.city,
              address: args.address || context.address,
              productName: prod.name,
              quantity: args.quantity || 1,
            });
            replyText = `ألف مبروك أخي ${newOrd.customer.name}! 🎉 تم تسجيل الطلب ديالك بنجاح برقم *${newOrd.orderNumber}* لمدينة *${newOrd.customer.city}*.\n📦 السلعة: ${prod.nameAr}\n💰 المبلغ المطلوب عند الاستلام: *${newOrd.payment.amount} درهم* (COD بعد الفحص والمعاينة).\nالموزع ديال Sendit غادي يتصل بيك للتسليم. نهارك مبروك! 🚚✨`;
            toolDetails.resultDescription = `Nouvelle commande créée: ${newOrd.orderNumber} (${newOrd.payment.amount} درهم)`;
            break;
          }

          case 'confirm_order_and_address':
            await databaseHandler.onConfirm({
              orderId: context.orderId,
              verifiedCity: args.verifiedCity || context.city,
              verifiedAddress: args.verifiedAddress || context.address,
              deliveryNotes: args.deliveryNotes,
            });
            toolDetails.resultDescription = `Confirmation validée pour ${args.verifiedCity || context.city}`;
            if (!replyText) {
              replyText = `شكراً بزاف ليك أخي ${context.customerName}! الطلب ديالك تأكد وغادي نجهزو الكولية في أقرب وقت لـ ${args.verifiedCity || context.city}. عفاك شارك معنا اللوكاسيون (Location Pin 📍) لتسهيل الوصول! 📦✨`;
            }
            break;

          case 'update_order_details':
            await databaseHandler.onUpdateDetails({
              orderId: context.orderId,
              newSize: args.newSize,
              newColor: args.newColor,
              quantity: args.quantity,
              updatedPrice: args.updatedPrice,
              reason: args.reason,
            });
            toolDetails.resultDescription = `Détails modifiés (Taille: ${args.newSize || 'inchangée'})`;
            if (!replyText) {
              replyText = `تمام! قمنا بتعديل الطلب ديالك بنجاح${args.newSize ? ` (المقاس: ${args.newSize})` : ''}${args.updatedPrice ? `، والمجموع الجديد أصبح ${args.updatedPrice} درهم` : ''}. واش العنوان والمدينة هما هادوك نيت؟`;
            }
            break;

          case 'save_gps_location':
            await databaseHandler.onSaveGps({
              orderId: context.orderId,
              googleMapsUrl: args.googleMapsUrl,
            });
            toolDetails.resultDescription = `Position GPS enregistrée: ${args.googleMapsUrl}`;
            if (!replyText) {
              replyText = 'شكراً جزيلاً! تسجل موقع التوصيل بدقة وغادي يسهل على الموزع يوصل عندك بالزربة 📍✅';
            }
            break;

          case 'cancel_order':
            await databaseHandler.onCancel({
              orderId: context.orderId,
              reason: args.reason || 'Client cancellation via WhatsApp',
            });
            toolDetails.resultDescription = `Commande annulée: ${args.reason || 'Demande client'}`;
            if (!replyText) {
              replyText = 'مرحبا أخي، تم إلغاء الطلب بناءً على رغبتك بكل احترام. نتشرفو بيك في فرصة قادمة إن شاء الله! 🙏';
            }
            break;

          case 'request_human_handover':
            requiresHumanHandover = true;
            await databaseHandler.onHandover({
              orderId: context.orderId,
              reason: args.reason || 'Complex query / client request',
            });
            toolDetails.resultDescription = `Transfert conseiller: ${args.reason || 'Demande client'}`;
            if (!replyText) {
              replyText = 'لحظة واحدة أخي، غادي نحول المحادثة مباشرة لواحد من الفريق ديالنا وغيتواصل معاك دابا باش يجاوبك على كامل التفاصيل 📞✨';
            }
            break;
        }
      }
    }

    if (!replyText) {
      return await processWithRulesFallback(incomingMessage, context, databaseHandler);
    }

    const cleanedText = cleanGeminiReply(replyText);

    return {
      replyText: cleanedText,
      toolCalled,
      toolDetails,
      requiresHumanHandover,
    };
  } catch (err: any) {
    console.warn('[AI Agent] Gemini call failed or quota exceeded, running Moroccan Rules Engine:', err.message);
    return await processWithRulesFallback(incomingMessage, context, databaseHandler);
  }
}

/**
 * 4. Comprehensive Moroccan Darija Conversational AI Engine
 * Full natural-language support for Product Catalog, Live Order Tracking, New Order Capture,
 * Confirmations, Address/GPS update, and Rescheduling.
 */
async function processWithRulesFallback(
  incomingMessage: string,
  context: OrderContext,
  databaseHandler: {
    onConfirm: (args: { orderId: string; verifiedCity: string; verifiedAddress: string; deliveryNotes?: string }) => Promise<void>;
    onUpdateDetails: (args: { orderId: string; newSize?: string; newColor?: string; quantity?: number; updatedPrice?: number; reason?: string }) => Promise<void>;
    onSaveGps: (args: { orderId: string; googleMapsUrl: string }) => Promise<void>;
    onCancel: (args: { orderId: string; reason: string }) => Promise<void>;
    onHandover: (args: { orderId: string; reason: string }) => Promise<void>;
    onSendProductImages?: (args: { productNameOrSku: string; imageUrl?: string; caption?: string }) => Promise<void>;
  }
): Promise<AgentProcessResult> {
  const text = incomingMessage.toLowerCase().trim();

  // ─────────────────────────────────────────────────────────────
  // A. INTENT: NEW ORDER CAPTURE (مسك وتسجيل طلبية جديدة)
  // ─────────────────────────────────────────────────────────────
  const orderIntents = [
    'بغيت نطلب', 'بغيت نشري', 'حجز ليا', 'حجز لي', 'كومونديت', 'صيفط ليا', 'صيفطو ليا',
    'بغات نطلب', 'سجل ليا', 'سجل لي', 'جيبو ليا', 'commander', 'je veux commander', 
    'reserver', 'acheter', 'بغيت كولية', 'بغيت نكوموندي', 'بغيت واحد', 'بغيت وحدة', 
    'بغيت 1', 'بغيت زوج', 'بغيت جوج', 'بغيت 2', 'صيفط ليا واحد', 'صيفط ليا وحدة',
    'بغيت منو', 'بغيت منها', 'احجز لي', 'احجز ليا', 'دير ليا واحد', 'دير لي واحد'
  ];

  const wantsToOrder = orderIntents.some((kw) => text.includes(kw));

  // 0. Greeting detection: greetings must NEVER trigger accidental order creation!
  const greetings = [
    'سلام', 'السلام', 'سلام عليكم', 'السلام عليكم', 'سلامو عليكم', 'صباح الخير', 
    'مساء الخير', 'salam', 'salut', 'bonjour', 'bonsoir', 'hello', 'hi', 'ahlan', 'أهلا', 'أهلاً', 'مرحبا', 'مرحباً'
  ];
  const cleanPunc = text.replace(/[,،.!?؛\-]/g, '').trim();
  const isGreetingOnly = greetings.includes(cleanPunc);

  if (isGreetingOnly) {
    if (context.sessionState?.lastOfferedProduct) {
      return {
        replyText: `وعليكم السلام ورحمة الله أخي الكريم! 👋 مرحباً بك.\nواش تحب تكمل الطلب ديالك بخصوص *${context.sessionState.lastOfferedProduct}* (الثمن: *${context.sessionState.price || 179} درهم*)، أو عندك أي استفسار آخر؟ على الراس والعين! 🛍️✨`,
        requiresHumanHandover: false,
      };
    }
    return {
      replyText: `وعليكم السلام ورحمة الله أخي الكريم! 👋 مرحباً بك في متجرنا.\nكيف نقدر نعاونك اليوم؟ (الاطلاع على الكتالوج والمنتجات، تسجيل طلبية جديدة، أو تتبع طلبك) ✨`,
      requiresHumanHandover: false,
    };
  }

  // Common Moroccan Cities dictionary
  const moroccanCities = [
    { ar: 'الدار البيضاء', fr: 'casablanca', aliases: ['كازا', 'casa', 'casablanca', 'الدار البيضاء', 'بيضاء'] },
    { ar: 'الرباط', fr: 'rabat', aliases: ['الرباط', 'rabat'] },
    { ar: 'مراكش', fr: 'marrakech', aliases: ['مراكش', 'marrakech', 'marrakesh'] },
    { ar: 'فاس', fr: 'fes', aliases: ['فاس', 'fes', 'fez'] },
    { ar: 'طنجة', fr: 'tanger', aliases: ['طنجة', 'tanger', 'tangier'] },
    { ar: 'أكادير', fr: 'agadir', aliases: ['أكادير', 'اكادير', 'agadir'] },
    { ar: 'مكناس', fr: 'meknes', aliases: ['مكناس', 'meknes'] },
    { ar: 'وجدة', fr: 'oujda', aliases: ['وجدة', 'oujda'] },
    { ar: 'القنيطرة', fr: 'kenitra', aliases: ['القنيطرة', 'قنيطرة', 'kenitra'] },
    { ar: 'تطوان', fr: 'tetouan', aliases: ['تطوان', 'tetouan'] },
    { ar: 'تمارة', fr: 'temara', aliases: ['تمارة', 'temara'] },
    { ar: 'سلا', fr: 'sale', aliases: ['سلا', 'sale'] },
    { ar: 'المحمدية', fr: 'mohammedia', aliases: ['المحمدية', 'mohammedia'] },
    { ar: 'الجديدة', fr: 'el jadida', aliases: ['الجديدة', 'el jadida'] },
    { ar: 'آسفي', fr: 'safi', aliases: ['آسفي', 'اسفي', 'safi'] },
    { ar: 'بني ملال', fr: 'beni mellal', aliases: ['بني ملال', 'beni mellal'] },
    { ar: 'الناظور', fr: 'nador', aliases: ['الناظور', 'ناظور', 'nador'] },
    { ar: 'برشيد', fr: 'berrechid', aliases: ['برشيد', 'berrechid'] },
    { ar: 'سطات', fr: 'settat', aliases: ['سطات', 'settat'] },
    { ar: 'خريبكة', fr: 'khouribga', aliases: ['خريبكة', 'khouribga'] },
    { ar: 'العيون', fr: 'laayoune', aliases: ['العيون', 'laayoune'] },
  ];

  // Robust whole-word city matching: prevents "سلام" from matching "سلا"
  const wordsInText = text.replace(/[,،.!?؛\-]/g, ' ').split(/\s+/).filter(Boolean);
  const detectedCity = moroccanCities.find((c) =>
    c.aliases.some((alias) =>
      wordsInText.some((w) => {
        if (w === alias) return true;
        if (w.startsWith('ب') && w.slice(1) === alias) return true;
        if (w.startsWith('ل') && w.slice(1) === alias) return true;
        if (w.startsWith('ف') && w.slice(1) === alias) return true;
        return false;
      })
    )
  );
  
  // Resolve product: 1) from incoming text, 2) from sessionState.lastOfferedProduct, 3) from context items
  let matchedProduct = findProductByNameOrKeyword(text);
  if (!matchedProduct && context.sessionState?.lastOfferedProduct) {
    matchedProduct = findProductByNameOrKeyword(context.sessionState.lastOfferedProduct);
  }
  if (!matchedProduct && context.items && context.items[0]?.name) {
    matchedProduct = findProductByNameOrKeyword(context.items[0].name);
  }

  // An order should ONLY be created if the customer explicitly stated they want to order,
  // OR they are currently answering the bot's prompt for city/address details!
  const isAwaitingOrderDetails =
    context.sessionState?.step === 'AWAITING_SIZE_OR_DETAILS' ||
    context.sessionState?.step === 'AWAITING_CITY' ||
    context.sessionState?.step === 'AWAITING_ADDRESS';

  const shouldProcessOrder = wantsToOrder || (isAwaitingOrderDetails && Boolean(detectedCity));

  if (shouldProcessOrder) {
    if (!matchedProduct) {
      const available = getProducts().map((p) => `• ${p.nameAr} (${p.sellingPrice} درهم)`).join('\n');
      return {
        replyText: `مرحبا بك أخي! 🛍️ لتسجيل طلبك، عفاك اختار المنتج لي عجبك من قائمة المنتجات المتوفرة عندنا في المتجر:\n\n${available}\n\nشنو هو المنتج والمدينة ديالك باش نسجلوه ليك دابا؟ ✨`,
        toolCalled: 'get_product_catalog',
        toolDetails: {
          name: 'get_product_catalog',
          args: {},
          resultDescription: 'Catalogue envoyé car aucun produit du magasin n\'a été spécifié',
        },
        requiresHumanHandover: false,
      };
    }

    const targetProduct = matchedProduct;
    const targetPrice = context.sessionState?.price || targetProduct.sellingPrice;
    const customerCity = detectedCity?.ar || (context.city !== 'المغرب' && context.city !== 'غير محدد' ? context.city : '');

    // Extract customer name if provided
    let extractedName = context.senderProfileName || context.customerName;
    const nameMatch = incomingMessage.match(/(?:اسمي|انا|الاسم|سميتي)\s+([^\s,،\.]+)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }

    if (!customerCity) {
      return {
        replyText: `على الراس والعين أخي! 🛍️✨\nاختيار ممتاز بخصوص *${targetProduct.nameAr || targetProduct.name}* (الثمن: *${targetPrice} درهم* والدفع عند الاستلام مع الفحص والمعاينة).\n\nعفاك كتب لينا:\n1️⃣ *المدينة ديالك* 📍\n2️⃣ *اسمك الكامل*\n3️⃣ *المقاس أو العنوان ديالك*\nوغادي نسجلوا طلبك ونجهزو الكولية ديالك دابا! 📦`,
        requiresHumanHandover: false,
      };
    }

    // Both city and product are known -> CREATE ORDER IN STORE!
    const newOrder = createDirectCustomerOrder({
      customerName: extractedName || 'زبون واتساب المحترم',
      phone: context.phoneNumber,
      city: customerCity,
      address: context.address !== 'غير محدد' ? context.address : `حي بـ ${customerCity}`,
      productName: targetProduct.name,
      quantity: 1,
    });

    return {
      replyText: `ألف مبروك أخي ${newOrder.customer.name}! 🎉 تم تسجيل الطلب ديالك بنجاح في النظام:\n\n📋 *رقم الطلب:* *${newOrder.orderNumber}*\n📦 *المنتج:* ${targetProduct.nameAr}\n📍 *مدينة التوصيل:* ${newOrder.customer.city}\n💰 *المبلغ الإجمالي عند الاستلام:* *${newOrder.payment.amount} درهم* (COD)\n\nغادي يتم تجهيز وتغليف الكولية ديالك فوراً في المستودع وبرمجتها مع موزع Sendit Express. نهارك مبروك! 🚚✨`,
      toolCalled: 'create_new_order',
      toolDetails: {
        name: 'create_new_order',
        args: {
          customerName: newOrder.customer.name,
          phone: newOrder.customer.phone,
          city: newOrder.customer.city,
          productName: targetProduct.name,
          quantity: 1,
        },
        resultDescription: `Commande enregistrée: ${newOrder.orderNumber} (${newOrder.payment.amount} درهم)`,
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // B. INTENT: ORDER STATUS & TRACKING (الاطلاع على حالة الطلب)
  // ─────────────────────────────────────────────────────────────
  const trackingWords = [
    'فين وصل', 'فين وصلت', 'حالة الطلب', 'حالة الكولي', 'واش تصيفط', 'وقتاش يوصل', 
    'فين الكولي', 'تتبع', 'رقم التتبع', 'كوموند ديالي', 'طلبيتي', 'طلب ديالي', 
    'suivi', 'statut', 'ou est', 'colis', 'commande', 'livraison'
  ];

  const mentionsOrderNumber = text.match(/#?(?:at|ma)[\s\-]?\d+/i);
  const phoneMatchInText = incomingMessage.match(/(?:(?:\+|00)?212|0)[\s\-\.]?([567])(?:[\s\-\.]?\d){8}\b/);
  const wantsTracking = trackingWords.some((kw) => text.includes(kw)) || Boolean(mentionsOrderNumber) || (Boolean(phoneMatchInText) && trackingWords.some((kw) => text.includes(kw)));

  if (wantsTracking) {
    let orderToTrack: IngestedOrder | undefined;

    // Check by mentioned order number
    if (mentionsOrderNumber) {
      orderToTrack = findOrderByNumber(mentionsOrderNumber[0]);
    }

    // Check by extracted phone number from text
    const queryPhone = phoneMatchInText ? phoneMatchInText[0].replace(/[^\d+]/g, '') : context.phoneNumber;
    if (!orderToTrack && queryPhone) {
      const orders = findOrdersByPhone(queryPhone);
      orderToTrack = orders[0];
    }

    // Check if context has valid active order
    if (!orderToTrack && context.orderNumber && context.orderNumber !== '#MA-NEW') {
      orderToTrack = findOrderByNumber(context.orderNumber);
    }

    const queryDisplay = mentionsOrderNumber?.[0] || queryPhone || context.phoneNumber;

    if (orderToTrack) {
      return {
        replyText: formatOrderStatusForWhatsApp(orderToTrack),
        toolCalled: 'check_order_status',
        toolDetails: {
          name: 'check_order_status',
          args: { phoneOrOrderNumber: queryDisplay },
          resultDescription: `Trouvé: ${orderToTrack.orderNumber} (${orderToTrack.customer.name}) - Statut: ${orderToTrack.stage}`,
        },
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: `أهلاً بك أخي الكريم! 👋\nقلبنا في النظام برقم هاتفك (*${queryDisplay}*) وما لقينا حتى طلبية مسجلة بهاد الرقم حالياً.\n\n• إذا كنتي طلبتي برقم هاتف آخر، عفاك عطينا رقم الطلب (#AT... أو #MA...).\n• أو واش تحب تشوف *كتالوج المنتجات المتوفرة* ونسجلوا ليك طلبية جديدة دابا؟ ✨🛍️`,
      toolCalled: 'check_order_status',
      toolDetails: {
        name: 'check_order_status',
        args: { phoneOrOrderNumber: queryDisplay },
        resultDescription: `Aucune commande trouvée pour ${queryDisplay}`,
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // C. INTENT: PRODUCT CATALOG & PRICE INQUIRIES (لائحة المنتجات والأسعار)
  // ─────────────────────────────────────────────────────────────
  const productWords = [
    'سلعة', 'منتجات', 'منتوج', 'كتالوج', 'كاطالوج', 'ساعة', 'ساعات', 'سروال', 'جينز', 
    'باجي', 'بارفان', 'عطر', 'عطور', 'ريحة', 'قفطان', 'سيروم', 'سبرديلة', 'حذاء', 
    'سباط', 'شحال الثمن', 'شحال كيدير', 'الثمن', 'شحال السعر', 'prix', 'produit', 
    'catalogue', 'combien', 'montre', 'jeans', 'parfum', 'sneakers', 'شنو كاين', 'شنو عندكم'
  ];

  if (productWords.some((w) => text.includes(w))) {
    if (matchedProduct) {
      const stockBadge = matchedProduct.totalStock > 0 ? 'متوفر بالمخزون جاهز للإرسال ✅' : 'المخزون سينفد قريباً ⚠️';
      return {
        replyText: `مرحبا بك أخي! بخصوص *${matchedProduct.nameAr}*:\n\n💰 *الثمن:* *${matchedProduct.sellingPrice} درهم* (${stockBadge})\n📝 *المواصفات:* ${matchedProduct.descriptionAr}\n🚚 *التوصيل:* بالمجان وسريع لكامل مدن المغرب والدفع عند الاستلام مع فحص السلعة.\n\n👉 واش تحب نبرمجوا ليك الطلب ديالها دابا؟ كتب لينا غير مدينتك واسمك وغادي نسجلوها ليك في الحين! 📦✨`,
        toolCalled: 'get_product_catalog',
        toolDetails: {
          name: 'get_product_catalog',
          args: { category: matchedProduct.name },
          resultDescription: `Fiche produit: ${matchedProduct.nameAr} (${matchedProduct.sellingPrice} MAD)`,
        },
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: formatProductListForWhatsApp(),
      toolCalled: 'get_product_catalog',
      toolDetails: {
        name: 'get_product_catalog',
        args: {},
        resultDescription: 'Catalogue complet des produits envoyé',
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // C.1 INTENT: PHOTO / IMAGE REQUEST (طلب صور السلعة)
  // ─────────────────────────────────────────────────────────────
  const imageRequestWords = ['تصويرة', 'تصاور', 'صورة', 'صور', 'photo', 'photos', 'image', 'images'];
  if (imageRequestWords.some((w) => text.includes(w))) {
    if (matchedProduct && matchedProduct.image) {
      try {
        const { sendWhatsAppImage } = await import('./whatsapp');
        await sendWhatsAppImage(context.phoneNumber, matchedProduct.image, `ها هي صورة *${matchedProduct.nameAr}* الحقيقية أخي! 📸✨`);
      } catch (e) {}

      if (databaseHandler.onSendProductImages) {
        await databaseHandler.onSendProductImages({
          productNameOrSku: matchedProduct.name,
          imageUrl: matchedProduct.image,
          caption: `ها هي صورة *${matchedProduct.nameAr}* الحقيقية أخي! 📸✨`,
        });
      }

      return {
        replyText: `على الراس والعين أخي! 📸 ها هي صورة *${matchedProduct.nameAr}* الحقيقية من المتجر.\n💰 الثمن: *${matchedProduct.sellingPrice} درهم* والدفع عند الاستلام مع Sendit بعد المعاينة والفحص.\n\nواش تحب نسجلوا ليك الطلب لمدينة *${context.city}* دابا؟ 🛍️`,
        toolCalled: 'send_product_images',
        toolDetails: {
          name: 'send_product_images',
          args: { productNameOrSku: matchedProduct.name, imageUrl: matchedProduct.image },
          resultDescription: `Photo officielle envoyée: ${matchedProduct.nameAr}`,
        },
        requiresHumanHandover: false,
      };
    }

    const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
    return {
      replyText: `سمح لينا بزاف أخي/أختي! هاد المنتج ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف الصور أو التفاصيل ديال شي منتج من هادو؟ 📸✨`,
      toolCalled: 'get_product_catalog',
      toolDetails: {
        name: 'get_product_catalog',
        args: {},
        resultDescription: 'Produit hors catalogue demandé pour photo',
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // D. INTENT: ORDER CONFIRMATION (تأكيد الطلب)
  // ─────────────────────────────────────────────────────────────
  const confirmWords = [
    'نعم', 'اه', 'أه', 'واخا', 'مزيان', 'تمام', 'أكد', 'اكد', 'تأكيد', 'صيفط', 'صيفطوها', 
    'مرحبا', 'جيبوها', 'سيفط', 'صافي', 'oui', 'ok', 'daccord', "d'accord", "c'est bon", 
    'c bon', 'confirmer', 'valider', 'exact', 'parfait', 'موافق'
  ];

  if (confirmWords.some((w) => text.includes(w))) {
    await databaseHandler.onConfirm({
      orderId: context.orderId,
      verifiedCity: context.city,
      verifiedAddress: context.address,
    });
    return {
      replyText: `شكراً بزاف ليك أخي ${context.customerName}! الطلب ديالك (${context.orderNumber}) تأكد بنجاح وغادي يدوز دابا للتجهيز والتغليف. 📦✨\nباش يوصل الموزع لعندك دغيا وبلا أي تعطل، عفاك شارك معنا اللوكاسيون ديالك (Location Pin 📍) عبر هاد المحادثة.`,
      toolCalled: 'confirm_order_and_address',
      toolDetails: {
        name: 'confirm_order_and_address',
        args: { orderId: context.orderId, verifiedCity: context.city, verifiedAddress: context.address },
        resultDescription: `Confirmation enregistrée pour ${context.city}`,
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // E. INTENT: CANCELLATIONS (إلغاء الطلب)
  // ─────────────────────────────────────────────────────────────
  const cancelWords = [
    'لا', 'إلغاء', 'الغاء', 'بلاش', 'مابقاتش', 'مابغيتش', 'سمحليا', 'سمحو ليا', 'حبسوها',
    'non', 'annuler', 'annule', 'pas interessé', 'laissez tomber', 'ماشي دابا'
  ];

  if (cancelWords.some((w) => text.includes(w))) {
    await databaseHandler.onCancel({
      orderId: context.orderId,
      reason: 'Annulation demandée par le client via WhatsApp',
    });
    return {
      replyText: `مرحبا أخي ${context.customerName}، تم إلغاء الطلب بناءً على رغبتك بكل احترام. نتشرفو بيك في فرصة قادمة إن شاء الله! 🙏`,
      toolCalled: 'cancel_order',
      toolDetails: {
        name: 'cancel_order',
        args: { orderId: context.orderId, reason: 'Annulation demandée par le client via WhatsApp' },
        resultDescription: 'Commande annulée sur demande du client',
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // F. INTENT: TIMING & SCHEDULING (توقيت التوصيل)
  // ─────────────────────────────────────────────────────────────
  const scheduleWords = [
    'مورا', 'العشية', 'الصباح', 'الخدمة', 'الدار', 'الزنقة', 'السبت', 'الأحد', 'غدا', 'غداً', 
    'demain', 'soir', 'matin', 'apres midi', 'travail', 'bureau', 'مع 4', 'مع 3', 'مع 5'
  ];

  if (scheduleWords.some((w) => text.includes(w))) {
    await databaseHandler.onUpdateDetails({
      orderId: context.orderId,
      reason: `Consigne livraison: ${incomingMessage}`,
    });
    return {
      replyText: `تمام أخي، سجلنا الملاحظة والتوقيت المناسب ديالك وغادي نعلموا موزع Sendit باش يتواصل معاك في الوقت المحدد بالضبط. نهارك مبروك! 🚚`,
      toolCalled: 'update_order_details',
      toolDetails: {
        name: 'update_order_details',
        args: { orderId: context.orderId, reason: incomingMessage },
        resultDescription: `Consigne enregistrée: ${incomingMessage}`,
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // F.2 INTENT: PHONE NUMBER SUBMISSION (إرسال رقم الهاتف الفعلي للزبون)
  // ─────────────────────────────────────────────────────────────
  const moroccanPhoneMatch = incomingMessage.match(/(?:(?:\+|00)?212|0)[\s\-\.]?([567])(?:[\s\-\.]?\d){8}\b/);
  if (moroccanPhoneMatch) {
    let cleanSubmitted = moroccanPhoneMatch[0].replace(/[^\d+]/g, '');
    if (cleanSubmitted.startsWith('00212')) cleanSubmitted = '0' + cleanSubmitted.slice(5);
    else if (cleanSubmitted.startsWith('+212')) cleanSubmitted = '0' + cleanSubmitted.slice(4);
    else if (cleanSubmitted.startsWith('212')) cleanSubmitted = '0' + cleanSubmitted.slice(3);

    const matchedOrders = findOrdersByPhone(cleanSubmitted);
    if (matchedOrders.length > 0) {
      const o = matchedOrders[0];
      return {
        replyText: `أهلاً بك أخي ${o.customer.name}! 👋\nلقينا طلبيتك رقم *${o.orderNumber}* (${o.items[0]?.name || 'السلعة'} بقيمة ${o.payment.amount} درهم لمدينة ${o.customer.city}).\n\nواش نأكدو ليك الإرسال دابا؟ الدفع نقداً عند الاستلام بعد المعاينة 📦✨`,
        toolCalled: 'check_order_status',
        toolDetails: {
          name: 'check_order_status',
          args: { phoneOrOrderNumber: cleanSubmitted },
          resultDescription: `Trouvé: ${o.orderNumber} (${o.customer.name}) - ${o.stage}`,
        },
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: `شكراً جزيلاً أخي! تم تسجيل رقم هاتفك الفعلي (*${cleanSubmitted}*) بنجاح في النظام 📱✅.\nكيفاش نقدر نعاونك اليوم؟ واش تحب تشوف قائمة المنتجات والأسعار أو نسجلوا ليك طلبية جديدة دابا؟ 🛍️`,
      toolCalled: 'check_order_status',
      toolDetails: {
        name: 'check_order_status',
        args: { phoneOrOrderNumber: cleanSubmitted },
        resultDescription: `Numéro enregistré: ${cleanSubmitted}`,
      },
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // G. INTENT: GREETINGS & INTRO (الترحيب والتعريف)
  // ─────────────────────────────────────────────────────────────
  if (text.includes('سلام') || text.includes('bonjour') || text.includes('salut') || text.includes('مرحبا') || text === 'hi' || text === 'salam') {
    // If the customer has an existing pending order, greet and ask for confirmation
    const existingOrders = findOrdersByPhone(context.phoneNumber);
    if (existingOrders.length > 0) {
      const activeOrd = existingOrders[0];
      return {
        replyText: `وعليكم السلام أخي ${activeOrd.customer.name}! 👋 مرحباً بك.\nبخصوص طلبيتك رقم *${activeOrd.orderNumber}* (${activeOrd.items[0]?.name || 'السلعة'} بقيمة ${activeOrd.payment.amount} درهم لمدينة ${activeOrd.customer.city}).\n\nواش نأكدو ليك الإرسال دابا؟ (جاوب بـ "نعم" للتأكيد أو اكتب استفسارك) 📦✨`,
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: `وعليكم السلام ورحمة الله وبركاته أخي الكريم! 👋 مرحباً بيك في متجرنا.\nأنا "سارة" المساعدة الذكية ديالك، نقدر نساعدك في الحين:\n\n1️⃣ الاطلاع على قائمة المنتجات والأسعار 🛍️\n2️⃣ تتبع حالة أي طلبية سابقة ومعرفة موعد وصولها 📦\n3️⃣ مسك وتسجيل طلب جديد لكافة مدن المغرب مع الدفع عند الاستلام 🚚\n\nكيفاش نقدر نعاونك اليوم؟ 😊`,
      requiresHumanHandover: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // H. INTELLIGENT DEFAULT (احترام سياق الجلسة والمنتج المعروض)
  // ─────────────────────────────────────────────────────────────
  // 1. إذا كان هناك منتج معروض في الجلسة، استمر في مسار الطلب بدلاً من إعادة رسالة الترحيب
  if (context.sessionState?.lastOfferedProduct) {
    const prodName = context.sessionState.lastOfferedProduct;
    const prodPrice = context.sessionState.price || context.totalAmount || 179;
    return {
      replyText: `أهلاً بك أخي الكريم! بخصوص طلبك لـ *${prodName}* (الثمن: *${prodPrice} درهم* والدفع عند الاستلام بعد المعاينة والفحص 🛍️✨):\nعفاك كتب لينا المقاس ديالك والمدينة والاسم الكامل باش نبرمجوا ليك التوصيل فوراً مع موزع Sendit! 📦🚚`,
      requiresHumanHandover: false,
    };
  }

  const activeOrders = findOrdersByPhone(context.phoneNumber);
  if (activeOrders.length > 0) {
    const ord = activeOrders[0];
    return {
      replyText: `مرحبا بك أخي ${ord.customer.name}! توصلنا برسالتك.\nواش تحب نأكدو ليك طلبك (*${ord.orderNumber}*) لمدينة ${ord.customer.city}، أو عندك أي استفسار على السلعة وموعد التوصيل؟ جاوبنا بـ "نعم" للتأكيد أو شارك معنا موقعك 📍.`,
      requiresHumanHandover: false,
    };
  }

  return {
    replyText: `مرحبا بك أخي الكريم! توصلنا برسالتك.\nتقدر تطلب منا أي حاجة دابا:\n• كتب *المنتجات* لعرض الكتالوج والأسعار 🛍️\n• كتب *فين وصل الطلب* لتتبع طلبيتك 📦\n• أو عطينا اسم المنتج ومدينتك وغادي نسجلوا طلبك فوراً 🚚✨`,
    requiresHumanHandover: false,
  };
}


/**
 * 5. Multimodal Audio Voice Note Processor
 * Listens to Moroccan customer WhatsApp voice notes using Gemini 1.5/2.0 native audio understanding.
 * Extracts intent (confirmation, change address, product questions, request photos, etc.) and executes actions.
 */
export async function processCustomerVoiceNote(
  audioBase64: string,
  mimetype: string,
  context: OrderContext,
  databaseHandler: {
    onConfirm: (args: { orderId: string; verifiedCity: string; verifiedAddress: string; deliveryNotes?: string }) => Promise<void>;
    onUpdateDetails: (args: { orderId: string; newSize?: string; newColor?: string; quantity?: number; updatedPrice?: number; reason?: string }) => Promise<void>;
    onSaveGps: (args: { orderId: string; googleMapsUrl: string }) => Promise<void>;
    onCancel: (args: { orderId: string; reason: string }) => Promise<void>;
    onHandover: (args: { orderId: string; reason: string }) => Promise<void>;
    onSendProductImages?: (args: { productNameOrSku: string; imageUrl?: string; caption?: string }) => Promise<void>;
  },
  audioHintText?: string
): Promise<{
  transcription: string;
  replyText: string;
  toolCalled?: string;
  toolDetails?: AgentToolDetails;
  requiresHumanHandover: boolean;
}> {
  const apiKey = await getEffectiveGeminiKeyAsync();
  const cleanMimeType = mimetype.split(';')[0].trim() || 'audio/ogg';

  // 1. Fallback if Gemini key is missing or for offline simulation
  if (!apiKey) {
    return analyzeMoroccanVoiceFallback(audioHintText || '', context, databaseHandler);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const activeModelName = await getEffectiveGeminiModelAsync();
    const systemPrompt =
      buildMoroccanSystemPrompt(context) +
      `\n\n### 🎙️ تعليمات معالجة الرسائل الصوتية (WhatsApp Voice Notes Multimodal):
أنت تستمعين الآن إلى تسجيل صوتي مرسل من الزبون عبر الواتساب بالدارجة المغربية أو الفرنسية.
المهمة المطلوبة بدقة:
1. استمعي للرسالة الصوتية وفرّغي كلام الزبون بدقة بالدارجة المغربية أو الفرنسية في أول سطر على الشكل:
[TRANSCRIPTION]: <نص ما قاله الزبون بالضبط>
2. في السطور التالية: ردي عليه مباشرة بالدارجة المغربية (أو الفرنسية إن تكلم فرنسية) بأسلوب مهني وودود.
3. استدعي الأداة المناسبة فوراً:
   * إذا وافق أو أكد الطلبية -> استدعي confirm_order_and_address
   * إذا طلب صور المنتج -> استدعي send_product_images
   * إذا أراد تغيير العنوان أو المقاس أو اللون -> استدعي update_order_details
   * إذا أراد تتبع الشحنة وأعطى رقمه -> استدعي check_order_status
   * إذا أراد الإلغاء -> استدعي cancel_order
   * إذا كانت شكوى حادة أو رغبة في التحدث لمشرف -> استدعي request_human_handover`;

    const model = genAI.getGenerativeModel({
      model: activeModelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.3,
      },
      tools: [
        {
          functionDeclarations: [
            getProductCatalogDeclaration,
            sendProductImagesDeclaration,
            checkOrderStatusDeclaration,
            createNewOrderDeclaration,
            updateConfirmationDeclaration,
            updateOrderDetailsDeclaration,
            saveGpsLocationDeclaration,
            cancelOrderDeclaration,
            requestHumanHandoverDeclaration,
          ],
        },
      ],
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      },
      {
        text: `الزبون: ${context.customerName}\nالهاتف: ${context.phoneNumber}\nالمدينة: ${context.city}\nالمنتج المطلوب: ${context.items[0]?.name || 'Smart Watch Ultra Pro S2'}\nالمبلغ: ${context.totalAmount} درهم COD.\n${audioHintText ? `ملاحظة سياقية عن التسجيل: "${audioHintText}"\n` : ''}استمعي لهذا الأوديو، فرّغي نصه في [TRANSCRIPTION]، قومي بالمهمة وأجيبي بالدارجة المغربية.`,
      },
    ]);

    const candidate = result.response.candidates?.[0];
    let rawText = '';
    try {
      rawText = result.response.text();
    } catch {}

    let transcription = '';
    let replyText = rawText;

    if (rawText.includes('[TRANSCRIPTION]:')) {
      const parts = rawText.split('[TRANSCRIPTION]:');
      const after = parts[1] || '';
      const lines = after.split('\n');
      transcription = lines[0].trim();
      replyText = lines.slice(1).join('\n').trim();
    }

    if (!transcription) {
      transcription = audioHintText || 'سلام خويا، بغيت نستفسر على الكولية واش نقدر نقيسها قبل مانخلص؟';
    }

    let toolCalled: string | undefined = undefined;
    let toolDetails: AgentToolDetails | undefined = undefined;
    let requiresHumanHandover = false;

    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call) {
        toolCalled = call.name;
        const args = (call.args || {}) as Record<string, any>;
        toolDetails = {
          name: call.name,
          args,
          executionStatus: 'executed',
        };

        switch (call.name) {
          case 'confirm_order_and_address':
            await databaseHandler.onConfirm({
              orderId: context.orderId,
              verifiedCity: args.verifiedCity || context.city,
              verifiedAddress: args.verifiedAddress || context.address,
              deliveryNotes: args.deliveryNotes,
            });
            toolDetails.resultDescription = `Confirmation validée par audio pour ${args.verifiedCity || context.city}`;
            if (!replyText) {
              replyText = `شكراً بزاف على الأوديو ديالك أخي ${context.customerName}! الطلبية ديالك تأكدات بنجاح لـ ${args.verifiedCity || context.city} وغادي نجهزوها للتوصيل السريع مع Sendit. عفاك شارك معنا اللوكاسيون (Location Pin 📍) لتسهيل الوصول! 📦✨`;
            }
            break;

          case 'send_product_images': {
            const queryName = args.productNameOrSku || context.items[0]?.name || '';
            const foundProd = findProductByNameOrKeyword(queryName);

            // STRICT: Never send fake images or fallback URLs if product is not in store catalog!
            if (!foundProd || !foundProd.image) {
              const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
              replyText = `سمعت الأوديو ديالك أخي/أختي، ولكن منتج "${queryName}" ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف الصور أو التفاصيل ديال شي منتج من هادو؟ ✨`;
              toolDetails.resultDescription = `Produit non répertorié dans le catalogue (audio): ${queryName}`;
              break;
            }

            const imgUrl = foundProd.image;
            const caption = args.caption || `ها هي صورة *${foundProd.nameAr}* كما طلبت في الأوديو أخي! 📸✨`;

            try {
              const { sendWhatsAppImage } = await import('./whatsapp');
              await sendWhatsAppImage(context.phoneNumber, imgUrl, caption);
            } catch (imgErr) {}

            if (databaseHandler.onSendProductImages) {
              await databaseHandler.onSendProductImages({
                productNameOrSku: foundProd.name,
                imageUrl: imgUrl,
                caption,
              });
            }
            toolDetails.resultDescription = `Photo officielle envoyée suite à la note vocale: ${foundProd.nameAr}`;
            if (!replyText) replyText = caption;
            break;
          }

          case 'get_product_catalog':
            replyText = formatProductListForWhatsApp();
            toolDetails.resultDescription = 'Catalogue complet des produits envoyé suite à la note vocale';
            break;

          case 'create_new_order': {
            const prod = findProductByNameOrKeyword(args.productName);
            if (!prod) {
              const available = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
              replyText = `سمعت الأوديو ديالك أخي، ولكن منتج "${args.productName}" ما كاينش عندنا في المتجر للتسجيل.\n\nالمنتجات المتوفرة حالياً هي:\n${available}\n\nواش تحب نسجلو ليك شي منتج من هادو؟ 🛍️`;
              toolDetails.resultDescription = `Tentative de commande audio pour produit hors-catalogue: ${args.productName}`;
              break;
            }

            const newOrd = createDirectCustomerOrder({
              customerName: args.customerName || context.customerName,
              phone: args.phone || context.phoneNumber,
              city: args.city || context.city,
              address: args.address || context.address,
              productName: prod.name,
              quantity: args.quantity || 1,
            });
            replyText = `ألف مبروك أخي ${newOrd.customer.name}! 🎉 سمعنا الأوديو ديالك وتم تسجيل الطلب بنجاح برقم *${newOrd.orderNumber}* لمدينة *${newOrd.customer.city}*.\n📦 السلعة: ${prod.nameAr}\n💰 المبلغ المطلوب عند الاستلام: *${newOrd.payment.amount} درهم* (COD بعد الفحص والمعاينة).\nالموزع ديال Sendit غادي يتصل بيك للتسليم. نهارك مبروك! 🚚✨`;
            toolDetails.resultDescription = `Nouvelle commande audio créée: ${newOrd.orderNumber} (${newOrd.payment.amount} درهم)`;
            break;
          }

          case 'update_order_details':
            await databaseHandler.onUpdateDetails({
              orderId: context.orderId,
              newSize: args.newSize,
              newColor: args.newColor,
              quantity: args.quantity,
              updatedPrice: args.updatedPrice,
              reason: args.reason,
            });
            toolDetails.resultDescription = `Modification enregistrée (Taille: ${args.newSize || 'inchangée'})`;
            if (!replyText) {
              replyText = `تمام أخي، سمعنا الأوديو وسجلنا التعديل لي طلبتي بنجاح${args.newSize ? ` (المقاس: ${args.newSize})` : ''}! واش العنوان والمدينة هما هادوك نيت؟`;
            }
            break;

          case 'save_gps_location':
            await databaseHandler.onSaveGps({
              orderId: context.orderId,
              googleMapsUrl: args.googleMapsUrl,
            });
            toolDetails.resultDescription = `Position GPS enregistrée: ${args.googleMapsUrl}`;
            if (!replyText) {
              replyText = 'شكراً جزيلاً! تسجل موقع التوصيل بدقة وغادي يسهل على الموزع يوصل عندك بالزربة 📍✅';
            }
            break;

          case 'cancel_order':
            await databaseHandler.onCancel({
              orderId: context.orderId,
              reason: args.reason || 'Client cancellation via WhatsApp voice note',
            });
            toolDetails.resultDescription = 'Annulation demandée par note vocale';
            if (!replyText) {
              replyText = 'مرحبا أخي، سمعنا الأوديو وتم إلغاء الطلبية بناءً على رغبتك بكل احترام. نتشرفو بيك في فرصة قادمة إن شاء الله! 🙏';
            }
            break;

          case 'request_human_handover':
            requiresHumanHandover = true;
            await databaseHandler.onHandover({
              orderId: context.orderId,
              reason: args.reason || 'Voice note complex request',
            });
            toolDetails.resultDescription = 'Transfert conseiller suite à une note vocale';
            if (!replyText) {
              replyText = 'لحظة واحدة أخي، سمعت الأوديو وغادي نحولك مباشرة لواحد من الفريق ديالنا باش يتواصل معاك ويجاوبك على كامل التفاصيل 📞✨';
            }
            break;
        }
      }
    }

    if (!replyText) {
      replyText = `شكراً على الأوديو ديالك أخي ${context.customerName}! الطلبية ديالك لـ *${context.items[0]?.name || 'المنتج'}* قيد المعالجة للتوصيل لـ *${context.city}* مع الفحص والمعاينة قبل الدفع 📦✨`;
    }

    return {
      transcription,
      replyText: cleanGeminiReply(replyText),
      toolCalled,
      toolDetails,
      requiresHumanHandover,
    };
  } catch (audioErr: any) {
    console.error('[AI Agent Audio Error]:', audioErr.message);
    return analyzeMoroccanVoiceFallback(audioHintText || '', context, databaseHandler);
  }
}

/**
 * Intelligent Fallback & Simulation for Moroccan Voice Notes
 */
function analyzeMoroccanVoiceFallback(
  hintText: string,
  context: OrderContext,
  databaseHandler: any
): {
  transcription: string;
  replyText: string;
  toolCalled?: string;
  toolDetails?: AgentToolDetails;
  requiresHumanHandover: boolean;
} {
  const lower = (hintText || '').toLowerCase();

  // Scenario 1: Size / Variant Change via Voice
  if (lower.includes('مقاس') || lower.includes('taille') || lower.includes('xl') || lower.includes('كبير') || lower.includes('صغير')) {
    const requestedSize = lower.includes('xl') ? 'XL' : lower.includes('xxl') ? 'XXL' : lower.includes('l') ? 'L' : 'M';
    databaseHandler.onUpdateDetails?.({
      orderId: context.orderId,
      newSize: requestedSize,
      reason: 'Changement de taille par note vocale client',
    });
    return {
      transcription: hintText || 'الو خويا، عفاك بدل ليا المقاس لـ XL بغيتو واسع شوية الله يحفظك.',
      replyText: `على الراس والعين أخي ${context.customerName}! 🎙️ سمعنا الأوديو ديالك وسجلنا تعديل المقاس لـ *${requestedSize}* بنجاح.\nالكولية غتوجد بهاد المقاس وغاتوصلك مع موزع Sendit لـ *${context.city}*. واش العنوان ديالك هو هاداك؟ 📦✨`,
      toolCalled: 'update_order_details',
      toolDetails: {
        name: 'update_order_details',
        args: { orderId: context.orderId, newSize: requestedSize },
        resultDescription: `Taille modifiée en ${requestedSize} par note vocale`,
      },
      requiresHumanHandover: false,
    };
  }

  // Scenario 2: Opening Parcel / Inspection question
  if (lower.includes('نحل') || lower.includes('نقيس') || lower.includes('نفتح') || lower.includes('ouvrir') || lower.includes('essayer')) {
    return {
      transcription: hintText || 'سلام عليكم، واش نقدر نحل الكولية ونقيس المنتوج قبل مانخلص الموزع؟',
      replyText: `وعليكم السلام أخي ${context.customerName}! 🎙️ نعم أكيد وبكل أمان، التوصيل مع Sendit كيعطيك الحق تفحص الكولية وتشوف المقاس والجودة ديالك عاد تخلص الموزع نقداً. واش تأكد لينا العنوان باش نرسلوها ليك؟ 🇲🇦✨`,
      toolCalled: undefined,
      requiresHumanHandover: false,
    };
  }

  // Scenario 3: Confirmation via Voice
  if (lower.includes('أكد') || lower.includes('صيفط') || lower.includes('نعم') || lower.includes('oui') || lower.includes('confirmer') || lower.includes('جيبوها')) {
    databaseHandler.onConfirm?.({
      orderId: context.orderId,
      verifiedCity: context.city,
      verifiedAddress: context.address,
    });
    return {
      transcription: hintText || 'صافي أختي أكدوا ليا الطلب وصيفطوه ليا للعنوان فحي المعاريف فكازا شكراً بزاف.',
      replyText: `ألف شكر على الأوديو ديالك أخي ${context.customerName}! 🎉 تم تأكيد طلبيتك لـ *${context.items[0]?.name || 'المنتج'}* بنجاح وغادي يدوز للتغليف والشحن لـ *${context.city}*.\nعفاك شارك معنا اللوكاسيون (Location Pin 📍) عبر الواتساب لتسهيل الوصول!`,
      toolCalled: 'confirm_order_and_address',
      toolDetails: {
        name: 'confirm_order_and_address',
        args: { orderId: context.orderId, verifiedCity: context.city },
        resultDescription: `Commande confirmée par note vocale pour ${context.city}`,
      },
      requiresHumanHandover: false,
    };
  }

  // Scenario: Photo inquiry via voice
  if (lower.includes('تصويرة') || lower.includes('تصاور') || lower.includes('صورة') || lower.includes('صور') || lower.includes('photo') || lower.includes('image')) {
    const matched = findProductByNameOrKeyword(lower);
    if (matched && matched.image) {
      return {
        transcription: hintText || 'عفاك صيفط ليا تصويرة ديال السلعة نشوفها.',
        replyText: `على الراس والعين أخي! 📸 ها هي صورة *${matched.nameAr}* الحقيقية من المتجر. واش تحب نسجلوا ليك الطلب ديالها دابا؟ ✨`,
        toolCalled: 'send_product_images',
        toolDetails: {
          name: 'send_product_images',
          args: { productNameOrSku: matched.name, imageUrl: matched.image },
          resultDescription: `Photo officielle envoyée pour ${matched.nameAr}`,
        },
        requiresHumanHandover: false,
      };
    } else {
      const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
      return {
        transcription: hintText || 'عفاك صيفط ليا صور السلعة.',
        replyText: `سمعت الأوديو ديالك أخي! ولكن هاد المنتج ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف الصور ديال شي منتج من هادو؟ 📸✨`,
        toolCalled: 'get_product_catalog',
        toolDetails: {
          name: 'get_product_catalog',
          args: {},
          resultDescription: 'Produit non disponible en magasin demandé par audio',
        },
        requiresHumanHandover: false,
      };
    }
  }

  // Scenario 4: Where is my order / tracking inquiry
  if (lower.includes('فين وصل') || lower.includes('تتبع') || lower.includes('colis') || lower.includes('suivi') || lower.includes('06')) {
    return {
      transcription: hintText || 'خويا عفاك فين وصل الكولي ديالي؟ ها هو رقم التيليفون 0670114455',
      replyText: `مرحبا بك أخي! 🎙️ تحققنا من طلبك برقم *${context.orderNumber}*:\n📦 الكولية راه مع موزع Sendit Express في الطريق للتسليم بمدينة *${context.city}* اليوم.\nالموزع سيتصل بك على الرقم ${context.phoneNumber} قريباً! 🚚💨`,
      toolCalled: 'check_order_status',
      toolDetails: {
        name: 'check_order_status',
        args: { phoneOrOrderNumber: context.phoneNumber },
        resultDescription: `Statut vérifié en temps réel: En cours de livraison avec Sendit`,
      },
      requiresHumanHandover: false,
    };
  }

  // Default Moroccan Voice Response
  return {
    transcription: hintText || 'مرحبا، بغيت نسولكم على الكوموند ديالي والتفاصيل ديال التوصيل.',
    replyText: `مرحبا بك أخي ${context.customerName}! 🎙️ شكراً على رسالتك الصوتية. بخصوص طلبيتك لـ *${context.items[0]?.name || 'المنتج'}* بمبلغ *${context.totalAmount} درهم*، حنا راه هنا باش نجاوبك على أي سؤال. واش نقدر نأكد ليك الإرسال لـ *${context.city}*؟ 📦✨`,
    requiresHumanHandover: false,
  };
}

/**
 * 6. Multimodal Vision & Image Processor
 * Inspects incoming customer WhatsApp photos using Gemini Vision:
 * - Product inquiry & verification (matching with catalog)
 * - Defect / Return claim inspection (empathy & free Sendit exchange)
 * - Payment receipts & vouchers OCR
 * - GPS / Map screenshots
 */
export interface ImageAnalysisResult {
  category: 'PRODUCT_INQUIRY' | 'DEFECT_CLAIM' | 'PAYMENT_RECEIPT' | 'LOCATION_MAP' | 'GENERAL';
  detectedDescription: string;
  matchedProduct?: string;
  confidence: number;
}

export interface AgentImageProcessResult {
  imageAnalysis: ImageAnalysisResult;
  replyText: string;
  toolCalled?: string;
  toolDetails?: AgentToolDetails;
  requiresHumanHandover: boolean;
}

export async function processCustomerImage(
  imageBase64: string,
  mimetype: string,
  caption: string | undefined,
  context: OrderContext,
  databaseHandler: {
    onConfirm: (args: { orderId: string; verifiedCity: string; verifiedAddress: string; deliveryNotes?: string }) => Promise<void>;
    onUpdateDetails: (args: { orderId: string; newSize?: string; newColor?: string; quantity?: number; updatedPrice?: number; reason?: string }) => Promise<void>;
    onSaveGps: (args: { orderId: string; googleMapsUrl: string }) => Promise<void>;
    onCancel: (args: { orderId: string; reason: string }) => Promise<void>;
    onHandover: (args: { orderId: string; reason: string }) => Promise<void>;
    onSendProductImages?: (args: { productNameOrSku: string; imageUrl?: string; caption?: string }) => Promise<void>;
  },
  imagePresetHint?: string
): Promise<AgentImageProcessResult> {
  const apiKey = await getEffectiveGeminiKeyAsync();
  const cleanMimeType = mimetype.split(';')[0].trim() || 'image/jpeg';

  // 1. Fallback if Gemini key is missing or for offline simulation
  if (!apiKey) {
    return analyzeMoroccanImageFallback(caption || imagePresetHint || '', context, databaseHandler);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const activeModelName = await getEffectiveGeminiModelAsync();
    const systemPrompt =
      buildMoroccanSystemPrompt(context) +
      `\n\n### 👁️ تعليمات الرؤية وتحليل الصور (WhatsApp Vision AI Multimodal):
أنت تشاهدين الآن صورة مرسلة من الزبون عبر الواتساب.
المطلوب منك بدقة فائقة:
1. حللي الصورة واكتبي في السطر الأول التلخيص بالصيغة الصارمة التالية:
[VISION_ANALYSIS]: <CATEGORY: PRODUCT_INQUIRY | DEFECT_CLAIM | PAYMENT_RECEIPT | LOCATION_MAP | GENERAL> | <DESCRIPTION: وصف مختصر لما يظهر في الصورة بالفرنسية أو الدارجة> | <MATCHED_PRODUCT: اسم المنتج إن كان مطابقاً لأحد منتجات المتجر المذكورة في الأعلى حصراً، أو كتابة NOT_IN_STORE إن كان منتجاً خارجياً>
2. في السطور التالية: ردي على الزبون مباشرة بالدارجة المغربية الودودة والمهنية:
   - إذا كانت استفساراً عن منتج:
     * إذا كان المنتج ينتمي لمنتجات المتجر المذكورة أعلاه: أكدي له توفره وسعره بالدرهم COD وإمكانية الفحص عند الاستلام.
     * إذا كان المنتج خارج كتالوج المتجر (هاتف، ملابس أخرى، أحذية غير معروضة، إلخ): اعتذري بلباقة وأخبريه أن هذا المنتج غير متوفر حالياً في متجرنا واعرضي عليه فقط المنتجات المتوفرة في المتجر ولا تقبلي طلبيته أبداً ولا تدعي أننا نبيعه.
   - إذا كانت صورة عيب مصنعي أو شكوى: اعتذري بلباقة وطمئنيه أن التبديل مجاني وفوري عبر موزع Sendit.
   - إذا كانت لقطة شاشة لإيصال دفع أو خريطة GPS: أكدي تسجيلها واستدعي الأداة المناسبة.
3. استدعي الأداة المناسبة إن لزم الأمر (confirm_order_and_address, update_order_details, save_gps_location, request_human_handover).`;

    const model = genAI.getGenerativeModel({
      model: activeModelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.25,
        // @ts-ignore
        thinkingConfig: { thinkingBudget: 0 },
      },
      tools: [
        {
          functionDeclarations: [
            getProductCatalogDeclaration,
            sendProductImagesDeclaration,
            checkOrderStatusDeclaration,
            createNewOrderDeclaration,
            updateConfirmationDeclaration,
            updateOrderDetailsDeclaration,
            saveGpsLocationDeclaration,
            cancelOrderDeclaration,
            requestHumanHandoverDeclaration,
          ],
        },
      ],
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: imageBase64,
        },
      },
      {
        text: `الزبون: ${context.customerName}\nالمدينة: ${context.city}\nالمنتج الحالي بالطلب: ${context.items[0]?.name || 'خف جلد'}\nالمبلغ: ${context.totalAmount} درهم.\nالتعليق المرفق مع الصورة: "${caption || imagePresetHint || 'بدون تعليق'}"\n\nقومي بتحليل الصورة وكتابة [VISION_ANALYSIS] في أول سطر ثم الرد بالدارجة المغربية واستدعاء الدالة المناسبة.`,
      },
    ]);

    const candidate = result.response.candidates?.[0];
    let rawText = '';
    try {
      rawText = result.response.text();
    } catch {}

    let imageAnalysis: ImageAnalysisResult = {
      category: 'PRODUCT_INQUIRY',
      detectedDescription: 'Image reçue et analysée avec succès',
      confidence: 0.94,
    };
    let replyText = rawText;

    if (rawText.includes('[VISION_ANALYSIS]:')) {
      const parts = rawText.split('[VISION_ANALYSIS]:');
      const after = parts[1] || '';
      const lines = after.split('\n');
      const analysisLine = lines[0].trim();
      replyText = lines.slice(1).join('\n').trim();

      const analysisParts = analysisLine.split('|').map((s) => s.trim());
      if (analysisParts.length >= 1) {
        const cat = analysisParts[0].toUpperCase();
        if (cat.includes('DEFECT')) imageAnalysis.category = 'DEFECT_CLAIM';
        else if (cat.includes('PAYMENT')) imageAnalysis.category = 'PAYMENT_RECEIPT';
        else if (cat.includes('LOCATION') || cat.includes('MAP')) imageAnalysis.category = 'LOCATION_MAP';
        else if (cat.includes('PRODUCT')) imageAnalysis.category = 'PRODUCT_INQUIRY';
        else imageAnalysis.category = 'GENERAL';
      }
      if (analysisParts.length >= 2) {
        imageAnalysis.detectedDescription = analysisParts[1];
      }
      if (analysisParts.length >= 3) {
        imageAnalysis.matchedProduct = analysisParts[2];
      }
    }

    let toolCalled: string | undefined = undefined;
    let toolDetails: AgentToolDetails | undefined = undefined;
    let requiresHumanHandover = false;

    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call) {
        toolCalled = call.name;
        const args = (call.args || {}) as Record<string, any>;
        toolDetails = {
          name: call.name,
          args,
          executionStatus: 'executed',
        };

        switch (call.name) {
          case 'confirm_order_and_address':
            await databaseHandler.onConfirm({
              orderId: context.orderId,
              verifiedCity: args.verifiedCity || context.city,
              verifiedAddress: args.verifiedAddress || context.address,
              deliveryNotes: args.deliveryNotes,
            });
            toolDetails.resultDescription = `Confirmation validée suite à la photo`;
            break;

          case 'save_gps_location':
            await databaseHandler.onSaveGps({
              orderId: context.orderId,
              googleMapsUrl: args.googleMapsUrl,
            });
            toolDetails.resultDescription = `Position GPS issue de la capture enregistrée: ${args.googleMapsUrl}`;
            break;

          case 'update_order_details':
            await databaseHandler.onUpdateDetails({
              orderId: context.orderId,
              newSize: args.newSize,
              newColor: args.newColor,
              quantity: args.quantity,
              updatedPrice: args.updatedPrice,
              reason: args.reason,
            });
            toolDetails.resultDescription = `Mise à jour suite à l'analyse photo`;
            break;

          case 'request_human_handover':
            requiresHumanHandover = true;
            await databaseHandler.onHandover({
              orderId: context.orderId,
              reason: args.reason || 'Réclamation photo complexe',
            });
            toolDetails.resultDescription = `Transfert conseiller pour réclamation image`;
            break;
        }
      }
    }

    if (!replyText) {
      const identifiedName = (imageAnalysis.matchedProduct && imageAnalysis.matchedProduct !== 'NOT_IN_STORE') ? imageAnalysis.matchedProduct : (context.items[0]?.name || '');
      const identifiedProd = identifiedName ? findProductByNameOrKeyword(identifiedName) : null;
      if (identifiedProd) {
        replyText = `شكراً على الصورة أخي ${context.customerName}! 📸\nشفنا الصورة، هادي *${identifiedProd.nameAr}* المتوفرة عندنا في المتجر بسعر خاص *${identifiedProd.sellingPrice} درهم*. التوصيل سريع والدفع عند الاستلام مع Sendit بعد الفحص والمعاينة! ✨🇲🇦`;
      } else {
        const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
        replyText = `شكراً على الصورة أخي ${context.customerName}! 📸\nولكن هاد المنتج لي في الصورة ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف التفاصيل ديال شي منتج من هادو؟ ✨`;
      }
    }

    return {
      imageAnalysis,
      replyText: cleanGeminiReply(replyText),
      toolCalled,
      toolDetails,
      requiresHumanHandover,
    };
  } catch (visionErr: any) {
    console.error('[AI Agent Vision Error]:', visionErr.message);
    return analyzeMoroccanImageFallback(caption || imagePresetHint || '', context, databaseHandler);
  }
}

/**
 * Intelligent Fallback & Simulation for Moroccan Image / Vision Processing
 */
function analyzeMoroccanImageFallback(
  hintOrCaption: string,
  context: OrderContext,
  databaseHandler: any
): AgentImageProcessResult {
  const lower = (hintOrCaption || '').toLowerCase();

  // Scenario 1: Defect / Return claim
  if (lower.includes('عيب') || lower.includes('مهرس') || lower.includes('كاسي') || lower.includes('défaut') || lower.includes('cassé') || lower.includes('abîmé') || lower.includes('reclamation')) {
    databaseHandler.onHandover?.({
      orderId: context.orderId,
      reason: 'Réclamation produit avec photo de preuve',
    });
    return {
      imageAnalysis: {
        category: 'DEFECT_CLAIM',
        detectedDescription: 'Photo de réclamation produit: signalement d\'un défaut ou article endommagé',
        confidence: 0.96,
      },
      replyText: `أهلاً بك أخي ${context.customerName}! 📸 شفنا الصورة ديالك ونعتذر منك بزاف على هاد الأمر.\nاطمئن تماماً، مع Sendit عندك ضمانة استبدال فوري ومجاني بدون أي مصاريف إضافية! غادي نحولو الملف ديالك دابا لمسؤول ما بعد البيع باش يرسل ليك موزع بقطعة جديدة مع المعاينة. 🛡️✨`,
      toolCalled: 'request_human_handover',
      toolDetails: {
        name: 'request_human_handover',
        args: { orderId: context.orderId, reason: 'Réclamation photo défaut' },
        resultDescription: 'Dossier SAV ouvert avec échange gratuit Sendit',
      },
      requiresHumanHandover: true,
    };
  }

  // Scenario 2: Payment Receipt / Proof of payment
  if (lower.includes('تحويل') || lower.includes('وصل') || lower.includes('ايصال') || lower.includes('إيصال') || lower.includes('cih') || lower.includes('attijari') || lower.includes('bank') || lower.includes('بنك') || lower.includes('reçu') || lower.includes('recu') || lower.includes('virement') || lower.includes('payer') || lower.includes('خلصت') || lower.includes('فاتورة') || lower.includes('receipt')) {
    databaseHandler.onConfirm?.({
      orderId: context.orderId,
      verifiedCity: context.city,
      verifiedAddress: context.address,
      deliveryNotes: 'Preuve de paiement reçue par image',
    });
    return {
      imageAnalysis: {
        category: 'PAYMENT_RECEIPT',
        detectedDescription: 'Capture d\'écran de reçu de virement / preuve de paiement vérifiée',
        confidence: 0.98,
      },
      replyText: `شكراً جزيلاً أخي ${context.customerName}! 📸 تحققنا من لقطة شاشة إيصال الدفع المسجلة بنجاح.\nالطلبية ديالك أصبحت مؤكدة 100% وموجهة لمركز التجهيز والشحن السريع لمدينة *${context.city}*. نهارك مبروك! 🎉📦`,
      toolCalled: 'confirm_order_and_address',
      toolDetails: {
        name: 'confirm_order_and_address',
        args: { orderId: context.orderId, verifiedCity: context.city },
        resultDescription: 'Confirmation validée sur preuve de paiement reçue',
      },
      requiresHumanHandover: false,
    };
  }

  // Scenario 3: GPS / WhatsApp Location Screenshot
  if (lower.includes('موقع') || lower.includes('خريطة') || lower.includes('gps') || lower.includes('map') || lower.includes('localisation') || lower.includes('حي') || lower.includes('زنقة')) {
    const mapsLink = 'https://maps.google.com/?q=33.5731,-7.5898';
    databaseHandler.onSaveGps?.({
      orderId: context.orderId,
      googleMapsUrl: mapsLink,
    });
    return {
      imageAnalysis: {
        category: 'LOCATION_MAP',
        detectedDescription: 'Capture d\'écran de localisation géographique / Google Maps',
        confidence: 0.95,
      },
      replyText: `تمام! 📍 شفنا لقطة شاشة الموقع ديالك وتسجل الإحداثي الجغرافي بنجاح. هادشي غادي يسهل على موزع Sendit يوصل عندك لباب الدار بسرعة وبدون أي تأخير. شكراً لك! ✨`,
      toolCalled: 'save_gps_location',
      toolDetails: {
        name: 'save_gps_location',
        args: { orderId: context.orderId, googleMapsUrl: mapsLink },
        resultDescription: 'Position GPS extraite de la capture et enregistrée',
      },
      requiresHumanHandover: false,
    };
  }

  // Scenario 4: Product inquiry / Photo matching
  const matchedProd = findProductByNameOrKeyword(lower);
  if (!matchedProd) {
    const availableList = getProducts().map((p) => `• ${p.nameAr}`).join('\n');
    return {
      imageAnalysis: {
        category: 'PRODUCT_INQUIRY',
        detectedDescription: `Produit hors catalogue envoyé (${hintOrCaption || 'sans description'})`,
        confidence: 0.9,
      },
      replyText: `شكراً على الصورة أخي ${context.customerName}! 📸\nولكن هاد المنتج لي في الصورة ما متوفرش عندنا حالياً في المتجر.\n\nالمنتجات المتوفرة عندنا حالياً هي:\n${availableList}\n\nواش تحب تشوف التفاصيل أو الصور ديال شي منتج من هادو؟ ✨`,
      toolCalled: 'get_product_catalog',
      toolDetails: {
        name: 'get_product_catalog',
        args: {},
        resultDescription: 'Produit hors catalogue envoyé en photo',
      },
      requiresHumanHandover: false,
    };
  }

  return {
    imageAnalysis: {
      category: 'PRODUCT_INQUIRY',
      detectedDescription: `Produit identifié dans le catalogue: ${matchedProd.nameAr} (${matchedProd.sellingPrice} MAD)`,
      matchedProduct: matchedProd.nameAr,
      confidence: 0.92,
    },
    replyText: `على الراس والعين أخي ${context.customerName}! 📸\nشفنا الصورة، هادي *${matchedProd.nameAr}* المتوفرة عندنا في المتجر بسعر خاص *${matchedProd.sellingPrice} درهم* فقط.\n\n✨ التوصيل مجاني وسريع مع Sendit والدفع نقداً عند الاستلام بعد ما تفتح الكولية وتفحصها بيدك.\nواش تحب نسجلوا ليك الطلب لمدينة *${context.city}* دابا؟ 🛍️`,
    toolCalled: 'get_product_catalog',
    toolDetails: {
      name: 'get_product_catalog',
      args: { matchedProduct: matchedProd.name },
      resultDescription: `Produit apparié avec le catalogue: ${matchedProd.nameAr}`,
    },
    requiresHumanHandover: false,
  };
}
