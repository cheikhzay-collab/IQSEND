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
 * Retrieve effective Gemini API Key from environment or runtime ai_config.json
 */
export function getEffectiveGeminiKey(): string {
  let key = process.env.GEMINI_API_KEY || '';
  if (key && key !== 'votre_cle_gemini_ici' && key.trim().length > 15) {
    return key.trim();
  }

  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.apiKey && data.apiKey !== 'votre_cle_gemini_ici' && data.apiKey.trim().length > 15) {
        const cleaned = data.apiKey.trim();
        process.env.GEMINI_API_KEY = cleaned;
        if (data.model) process.env.GEMINI_MODEL_NAME = data.model;
        return cleaned;
      }
    }
  } catch (e) {
    // Ignore read errors
  }

  return '';
}

export function getEffectiveGeminiModel(): string {
  if (process.env.GEMINI_MODEL_NAME) {
    return process.env.GEMINI_MODEL_NAME;
  }
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.model) {
        process.env.GEMINI_MODEL_NAME = data.model;
        return data.model;
      }
    }
  } catch (e) {}

  return 'gemini-1.5-flash-latest';
}

/**
 * Interface representing the Order and Product context passed to Gemini
 */
export interface OrderContext {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  address: string;
  totalAmount: number;
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
  description: 'Take and save a brand new customer order directly from the WhatsApp conversation.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customerName: { type: SchemaType.STRING, description: 'Full customer name' },
      phone: { type: SchemaType.STRING, description: 'Moroccan phone number' },
      city: { type: SchemaType.STRING, description: 'Moroccan city for COD delivery' },
      address: { type: SchemaType.STRING, description: 'Street address or neighborhood' },
      productName: { type: SchemaType.STRING, description: 'Product name requested by customer' },
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

/**
 * 2. Moroccan Darija System Prompt Builder
 */
export function buildMoroccanSystemPrompt(context: OrderContext): string {
  const productsList = getProducts()
    .map((p) => `- ${p.nameAr} (${p.sellingPrice} درهم): ${p.descriptionAr} [المخزون: ${p.totalStock > 0 ? 'متوفر' : 'غير متوفر'}]`)
    .join('\n');

  return `
أنت "سارة"، وكيلة الذكاء الاصطناعي الذكية لمنصة Sendit والتجارة الإلكترونية والدفع عند الاستلام (COD) بالمغرب.
تتحدثين بالدارجة المغربية بلهجة حية، عفوية، مهذبة وودودة جداً ("أخي/أختي"، "الله يحفظك"، "مرحبا بك"، "على الراس والعين").

### 🛍️ قائمة المنتجات المتوفرة في المتجر:
${productsList}

### 📋 سياق الزبون الحالي:
- رقم هاتف الزبون: ${context.phoneNumber}
- اسم الزبون: ${context.customerName}
- المدينة: ${context.city}
- رقم الطلب الحالي (إن وجد): ${context.orderNumber}
- المبلغ: ${context.totalAmount} درهم

### 🎯 قدراتك ومهامك:
1. **معرفة المنتجات وعرض الكتالوج:** الإجابة عن كل تساؤل بخصوص أسعار المنتجات ومواصفاتها، وعرض الكتالوج الكامل عند الطلب.
2. **الاطلاع على حالة الطلب وتتبعه:** عندما يسأل الزبون عن طلبيته، استدعي دالة \`check_order_status\` وزوديه بحالة الشحن مع شركة Sendit.
3. **مسك وتسجيل طلبية جديدة:** عندما يطلب الزبون شراء أي منتج، اجمعي منه (الاسم، المدينة، العنوان) واستدعي دالة \`create_new_order\` لتسجيل الطلبية في النظام وتزويده برقم الطلب الرسمي.
4. **تأكيد الطلبيات الحالية:** استدعاء \`confirm_order_and_address\` عند موافقة الزبون، وطلب اللوكاسيون 📍 لتسهيل التوصيل.
5. **إلغاء الطلب:** استدعاء \`cancel_order\` باحترام عند رفض الزبون.
6. **التحويل لمسؤول بشري:** استدعاء \`request_human_handover\` عند الغضب أو الشكاوى المعقدة.

### ⚠️ أسلوب الحوار:
- دارجة مغربية حقيقية بالحروف العربية، رسائل قصيرة وواضحة تناسب الواتساب.
- طمأنة الزبون دوماً: "الدفع كيكون حتى كتوصلك الكولية للدار وتفحصها عاد كتخلص الموزع".
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
  },
  permissions: AgentPermissionsConfig = DEFAULT_AGENT_PERMISSIONS
): Promise<{ replyText: string; toolCalled?: string; requiresHumanHandover: boolean }> {
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
      requiresHumanHandover: true,
    };
  }

  const apiKey = getEffectiveGeminiKey();
  const isKeyConfigured = Boolean(apiKey && apiKey.length > 15);

  if (!isKeyConfigured) {
    console.log('[AI Agent] Clé GEMINI_API_KEY non configurée. Passage au moteur de règles marocaines.');
    return await processWithRulesFallback(incomingMessage, context, databaseHandler);
  }

  try {
    const systemInstruction = buildMoroccanSystemPrompt(context);
    const genAI = new GoogleGenerativeAI(apiKey);

    const activeModelName = getEffectiveGeminiModel();
    const model = genAI.getGenerativeModel({
      model: activeModelName,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.3,
      },
      tools: [
        {
          functionDeclarations: [
            getProductCatalogDeclaration,
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

    const chatHistory = context.conversationHistory.map((msg) => ({
      role: msg.sender === 'CUSTOMER' ? 'user' : 'model',
      parts: [{ text: msg.body }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const response = await chat.sendMessage(incomingMessage);
    const candidate = response.response.candidates?.[0];

    let replyText = '';
    try {
      replyText = response.response.text();
    } catch {
      // function call only
    }

    let toolCalled: string | undefined = undefined;
    let requiresHumanHandover = false;

    const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall).map((p) => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call) {
        toolCalled = call.name;
        const args = (call.args || {}) as Record<string, any>;

        switch (call.name) {
          case 'get_product_catalog':
            replyText = formatProductListForWhatsApp();
            break;

          case 'check_order_status': {
            const queryTarget = args.phoneOrOrderNumber || context.phoneNumber;
            const orders = findOrdersByPhone(queryTarget);
            const byNum = findOrderByNumber(queryTarget);
            const found = byNum || orders[0];
            if (found) {
              replyText = formatOrderStatusForWhatsApp(found);
            } else {
              replyText = `مرحبا بك أخي! قلبنا برقمك (${queryTarget}) وما لقينا حتى طلبية مسجلة بهاد الرقم حالياً.\nواش تحب تشوف كتالوج المنتجات ديالنا ونسجلوا ليك طلبية جديدة دابا؟ ✨🛍️`;
            }
            break;
          }

          case 'create_new_order': {
            const newOrd = createDirectCustomerOrder({
              customerName: args.customerName || context.customerName,
              phone: args.phone || context.phoneNumber,
              city: args.city || context.city,
              address: args.address || context.address,
              productName: args.productName,
              quantity: args.quantity || 1,
            });
            replyText = `ألف مبروك أخي ${newOrd.customer.name}! 🎉 تم تسجيل الطلب ديالك بنجاح برقم *${newOrd.orderNumber}* لمدينة *${newOrd.customer.city}*.\n📦 السلعة: ${newOrd.items[0]?.name}\n💰 المبلغ المطلوب عند الاستلام: *${newOrd.payment.amount} درهم* (COD بعد الفحص والمعاينة).\nالموزع ديال Sendit غادي يتصل بيك للتسليم. نهارك مبروك! 🚚✨`;
            break;
          }

          case 'confirm_order_and_address':
            await databaseHandler.onConfirm({
              orderId: context.orderId,
              verifiedCity: args.verifiedCity || context.city,
              verifiedAddress: args.verifiedAddress || context.address,
              deliveryNotes: args.deliveryNotes,
            });
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
            if (!replyText) {
              replyText = `تمام! قمنا بتعديل الطلب ديالك بنجاح${args.newSize ? ` (المقاس: ${args.newSize})` : ''}${args.updatedPrice ? `، والمجموع الجديد أصبح ${args.updatedPrice} درهم` : ''}. واش العنوان والمدينة هما هادوك نيت؟`;
            }
            break;

          case 'save_gps_location':
            await databaseHandler.onSaveGps({
              orderId: context.orderId,
              googleMapsUrl: args.googleMapsUrl,
            });
            if (!replyText) {
              replyText = 'شكراً جزيلاً! تسجل موقع التوصيل بدقة وغادي يسهل على الموزع يوصل عندك بالزربة 📍✅';
            }
            break;

          case 'cancel_order':
            await databaseHandler.onCancel({
              orderId: context.orderId,
              reason: args.reason || 'Client cancellation via WhatsApp',
            });
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

    return {
      replyText,
      toolCalled,
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
  }
): Promise<{ replyText: string; toolCalled?: string; requiresHumanHandover: boolean }> {
  const text = incomingMessage.toLowerCase().trim();

  // ─────────────────────────────────────────────────────────────
  // A. INTENT: NEW ORDER CAPTURE (مسك وتسجيل طلبية جديدة)
  // ─────────────────────────────────────────────────────────────
  const orderIntents = [
    'بغيت نطلب', 'بغيت نشري', 'حجز ليا', 'حجز لي', 'كومونديت', 'صيفط ليا', 'صيفطو ليا',
    'بغات نطلب', 'سجل ليا', 'سجل لي', 'جيبو ليا', 'commander', 'je veux commander', 
    'reserver', 'acheter', 'بغيت كولية', 'بغيت نكوموندي'
  ];

  const wantsToOrder = orderIntents.some((kw) => text.includes(kw));

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

  const detectedCity = moroccanCities.find((c) => c.aliases.some((alias) => text.includes(alias)));
  const matchedProduct = findProductByNameOrKeyword(text);

  if (wantsToOrder || (detectedCity && matchedProduct)) {
    // If we have both product and city, create the order directly!
    const targetProduct = matchedProduct || getProducts()[0]; // Default to flagship product if not specified
    const customerCity = detectedCity?.ar || (context.city !== 'المغرب' && context.city !== 'غير محدد' ? context.city : '');

    // Extract customer name if provided
    let extractedName = context.customerName;
    const nameMatch = incomingMessage.match(/(?:اسمي|انا|الاسم|سميتي)\s+([^\s,،\.]+)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }

    if (!customerCity) {
      return {
        replyText: `على الراس والعين أخي! 🛍️✨\nبغيتي تطلب *${targetProduct.nameAr}* (الثمن: *${targetProduct.sellingPrice} درهم* والدفع عند الاستلام مع الفحص والمعاينة).\n\nعفاك كتب لينا:\n1️⃣ *المدينة ديالك* 📍\n2️⃣ *اسمك الكامل*\n3️⃣ *عنوان التوصيل أو الحي*\nوغادي نسجلوا طلبك ونجهزو الكولية ديالك دابا! 📦`,
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
  const wantsTracking = trackingWords.some((kw) => text.includes(kw)) || Boolean(mentionsOrderNumber);

  if (wantsTracking) {
    let orderToTrack: IngestedOrder | undefined;

    // Check by mentioned order number
    if (mentionsOrderNumber) {
      orderToTrack = findOrderByNumber(mentionsOrderNumber[0]);
    }

    // Check by customer phone number
    if (!orderToTrack) {
      const orders = findOrdersByPhone(context.phoneNumber);
      orderToTrack = orders[0];
    }

    // Check if context has valid active order
    if (!orderToTrack && context.orderNumber && context.orderNumber !== '#MA-NEW') {
      orderToTrack = findOrderByNumber(context.orderNumber);
    }

    if (orderToTrack) {
      return {
        replyText: formatOrderStatusForWhatsApp(orderToTrack),
        toolCalled: 'check_order_status',
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: `أهلاً بك أخي الكريم! 👋\nقلبنا في النظام برقم هاتفك (*${context.phoneNumber}*) وما لقينا حتى طلبية مسجلة بهاد الرقم حالياً.\n\n• إذا كنتي طلبتي برقم هاتف آخر، عفاك عطينا رقم الطلب (#AT... أو #MA...).\n• أو واش تحب تشوف *كتالوج المنتجات المتوفرة* ونسجلوا ليك طلبية جديدة دابا؟ ✨🛍️`,
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
        requiresHumanHandover: false,
      };
    }

    return {
      replyText: formatProductListForWhatsApp(),
      toolCalled: 'get_product_catalog',
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
  // H. INTELLIGENT DEFAULT
  // ─────────────────────────────────────────────────────────────
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
