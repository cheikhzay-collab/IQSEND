import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
export const updateOrderDetailsDeclaration: FunctionDeclaration = {
  name: 'update_order_details',
  description: 'Update the customer order items, size, color, quantity or price (e.g. for upselling or size swap).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      newSize: { type: SchemaType.STRING, description: 'Updated size chosen by the customer (e.g. M, L, XL, XXL)' },
      newColor: { type: SchemaType.STRING, description: 'Updated color chosen by the customer (e.g. Noir, Blanc, Bleu)' },
      quantity: { type: SchemaType.INTEGER, description: 'Updated total quantity of items' },
      updatedPrice: { type: SchemaType.NUMBER, description: 'Calculated new total price in MAD including discount' },
      reason: { type: SchemaType.STRING, description: 'Reason for the update (e.g. Upsell, Size correction)' },
    },
    required: ['orderId'],
  },
};

export const confirmOrderAndAddressDeclaration: FunctionDeclaration = {
  name: 'confirm_order_and_address',
  description: 'Formally confirm the order when the customer unequivocally agrees, verifying their city, address, or preferred delivery timing.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      verifiedCity: { type: SchemaType.STRING, description: 'The verified Moroccan city name (e.g. Casablanca, Rabat, Marrakech, Fes)' },
      verifiedAddress: { type: SchemaType.STRING, description: 'Detailed street address, quarter/neighborhood, or landmarks' },
      deliveryNotes: { type: SchemaType.STRING, description: 'Any specific instructions (e.g. call after 3 PM, deliver to workplace)' },
    },
    required: ['orderId', 'verifiedCity', 'verifiedAddress'],
  },
};

export const saveGpsLocationDeclaration: FunctionDeclaration = {
  name: 'save_gps_location',
  description: 'Save the exact WhatsApp GPS location or Google Maps link shared by the customer for hard-to-find Moroccan addresses.',
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
  description: 'Cancel the order when the customer explicitly states they no longer want it or made an accidental order.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: { type: SchemaType.STRING, description: 'The unique ID of the order' },
      reason: { type: SchemaType.STRING, description: 'Specific reason for cancellation (e.g. price too high, bought elsewhere, accidental click)' },
    },
    required: ['orderId', 'reason'],
  },
};

export const requestHumanHandoverDeclaration: FunctionDeclaration = {
  name: 'request_human_handover',
  description: 'Stop the AI bot and transfer the chat to a human confirmation agent when the customer is angry, expresses complex claims, or asks for a real person.',
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
  const itemsSummary = context.items
    .map(
      (item) =>
        `- ${item.name} (الكمية: ${item.quantity}, الثمن: ${item.price} درهم${
          item.selectedAttributes?.size ? `, المقاس: ${item.selectedAttributes.size}` : ''
        }${item.selectedAttributes?.color ? `, اللون: ${item.selectedAttributes.color}` : ''})`
    )
    .join('\n');

  const knowledgeBase = context.items.map((i) => i.knowledgeBase || '').filter(Boolean).join('\n---\n');

  return `
أنت "سارة"، مساعدة ذكية متخصصة في تأكيد وتتبع طلبيات التجارة الإلكترونية والدفع عند الاستلام (COD) في المغرب.
تتحدثين بالدارجة المغربية بلهجة طبيعية، مهذبة، وودودة جداً ("أخي / أختي"، "الله يحفظك"، "مرحبا بك").

### 📋 سياق الطلب الحالي:
- رقم الطلب: ${context.orderNumber} (معرّف النظام الداخلي: ${context.orderId})
- اسم الزبون: ${context.customerName}
- رقم الهاتف: ${context.phoneNumber}
- المدينة: ${context.city}
- العنوان: ${context.address}
- المبلغ الإجمالي للدفع عند الاستلام: ${context.totalAmount} درهم مغربي
- المنتجات:
${itemsSummary}

### 💡 قاعدة بيانات المنتج ومعلومات الشحن (Knowledge Base):
${knowledgeBase || 'التوصيل مجاني وسريع عبر شركة Sendit خلال 24 إلى 48 ساعة. الدفع نقداً عند استلام ومعاينة الطلب.'}

### 🎯 أهدافك ومهمتك الأساسية:
1. **الترحيب الفوري والتأكيد:** رحبي بالزبون باسمه، وأكدي معه اختياره للمنتج والمقاس والمدينة.
2. **اقتراح الترقية الذكية (Upsell):** إذا كان مناسباً، اقترحي عليه الحصول على قطعة ثانية أو حبة إضافية بتخفيض مميز (مثلاً توفير 50 درهم).
3. **تدقيق العنوان:** تأكدي من المدينة والحي بدقة. إذا كان الحي غير دقيق أو من الأحياء الصعبة، اطلبي منه إرسال لوكاسيون (WhatsApp Location Pin) لتسهيل وصول موزع Sendit.
4. **استدعاء الدوال المناسبة فوراً (Function Calling):**
   - عندما يؤكد الزبون الطلب والعنوان بوضوح (مثل: "نعم موافق"، "صافي صيفطوها لي"، "العنوان هو هذاك") -> **يجب استدعاء** دالة: \`confirm_order_and_address\`.
   - إذا طلب تغيير المقاس أو اللون أو زيادة الكمية -> استدعي دالة: \`update_order_details\`.
   - إذا أرسل موقعاً جغرافياً أو رابط خرائط -> استدعي دالة: \`save_gps_location\`.
   - إذا رفض الطلب نهائياً وقال "مابغيتش" أو "غير غلطت" -> استدعي دالة: \`cancel_order\`.
   - إذا لاحظت غضباً، شكوى، أو طلب التحدث مع مكلف بشري ("بغييت نهضر مع شي واحد حقيقي") -> استدعي دالة: \`request_human_handover\`.

### ⚠️ قواعد صارمة في الحوار:
- اكتبي بالدارجة المغربية بالأحرف العربية (أو بالفرنسية إذا بدأ الزبون بها).
- اجعلي رسائلك قصيرة (سؤال واحد أو معلومة واحدة في كل رسالة) لتسهيل القراءة عبر الواتساب.
- لا تترددي في طمأنة الزبون: "الدفع كيكون حتى كتوصلك الكولية ديالك للدار وتفحصها عاد كتخلص الموزع".
`.trim();
}

/**
 * 3. Execution Engine: Process inbound customer message with Gemini 1.5 Flash
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
  const systemInstruction = buildMoroccanSystemPrompt(context);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemInstruction,
    generationConfig: {
      temperature: 0.3,
    },
    tools: [
      {
        functionDeclarations: [
          confirmOrderAndAddressDeclaration,
          updateOrderDetailsDeclaration,
          saveGpsLocationDeclaration,
          cancelOrderDeclaration,
          requestHumanHandoverDeclaration,
        ],
      },
    ],
  });

  // Transform conversation history into Gemini format
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
    // text() may throw if model returned only functionCalls
  }

  let toolCalled: string | undefined = undefined;
  let requiresHumanHandover = false;

  // Handle function calls if triggered by Gemini
  const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall).map((p) => p.functionCall);

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call) {
      toolCalled = call.name;
      const args = (call.args || {}) as Record<string, any>;

      switch (call.name) {
        case 'confirm_order_and_address':
          await databaseHandler.onConfirm({
            orderId: context.orderId,
            verifiedCity: args.verifiedCity || context.city,
            verifiedAddress: args.verifiedAddress || context.address,
            deliveryNotes: args.deliveryNotes,
          });
          if (!replyText) {
            replyText = `شكراً بزاف ليك أخي ${context.customerName}! الطلب ديالك تأكد وغادي نجهزو الكولية في أقرب وقت. الموزع ديال Sendit غيتواصل معاك فاش تكون الكولية قريبة لـ ${args.verifiedCity || context.city}. يومك سعيد! 📦✨`;
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
            replyText = 'شكراً جزيلاً! تسجل موقع التوصيل بدقة وغادي يسهل على الموزع يوصل عندك بالزربة.';
          }
          break;

        case 'cancel_order':
          await databaseHandler.onCancel({
            orderId: context.orderId,
            reason: args.reason || 'Client cancellation via WhatsApp',
          });
          if (!replyText) {
            replyText = 'مرحبا أخي، تم إلغاء الطلب بناءً على رغبتك بكل احترام. نتشرفو بيك في فرصة قادمة إن شاء الله!';
          }
          break;

        case 'request_human_handover':
          requiresHumanHandover = true;
          await databaseHandler.onHandover({
            orderId: context.orderId,
            reason: args.reason || 'Complex query / client request',
          });
          if (!replyText) {
            replyText = 'لحظة واحدة أخي، غادي نحول المحادثة مباشرة لواحد من الفريق ديالنا وغيتواصل معاك دابا باش يجاوبك على كامل التفاصيل.';
          }
          break;
      }
    }
  }

  return {
    replyText,
    toolCalled,
    requiresHumanHandover,
  };
}
