// Centralized Products Catalog for Sendit COD Platform & WhatsApp AI Agent

export interface ProductOfferBundle {
  id: string;
  title: string;
  quantity: number;
  priceMad: number;
  discountPercent?: number;
  badge?: string; // e.g. "الأكثر طلباً", "توفير 100 درهم", "شحن مجاني"
  isDefault?: boolean;
}

export interface ProductVariantGroup {
  type: 'size' | 'color' | 'spec' | 'custom';
  name: string; // e.g. "المقاس", "اللون", "السعة"
  options: string[]; // e.g. ["S", "M", "L", "XL"] or ["Noir", "Blanc", "Bleu"]
}

export interface ProductObjectionFaq {
  question: string;
  answer: string;
}

export interface ProductItem {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  image: string;
  additionalImages?: string[];
  sellingPrice: number;
  costPrice: number;
  deliveryFee: number;
  totalStock: number;
  hubs?: {
    casablanca: number;
    fes: number;
    marrakech: number;
    tanger: number;
  };
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  pendingOrders?: number;
  descriptionAr: string;
  keywords: string[];

  // ── New Enterprise COD Features ──
  // 1. المتغيرات (Variants: sizes, colors, specs)
  variants?: ProductVariantGroup[];
  // 2. العروض وباقات الـ Upsell (Offers & Bundles)
  offers?: ProductOfferBundle[];
  // 3. توجيهات الوكيل الذكي (AI Agent Directives & Knowledge Base)
  agentInstructions?: string;
  sellingPoints?: string[];
  objectionFaqs?: ProductObjectionFaq[];
}

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Smart Watch Ultra Pro S2 (Écran AMOLED & Appels BT)',
    nameAr: 'ساعة ذكية Smart Watch Ultra Pro S2',
    sku: 'SW2-AMOLED-BLK',
    category: 'High-Tech',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
    ],
    sellingPrice: 299,
    costPrice: 85,
    deliveryFee: 35,
    totalStock: 142,
    hubs: { casablanca: 75, fes: 32, marrakech: 20, tanger: 15 },
    status: 'IN_STOCK',
    pendingOrders: 18,
    descriptionAr: 'شاشة AMOLED فائقة الوضوح مقاس 2.04 إنش، مكالمات بلوتوث مباشرة بدون هاتف، بطارية تدوم حتى 5 أيام متواصلة، مقاومة للماء بمعيار IP68، مراقبة نبضات القلب والأكسجين مع 100+ نمط رياضي.',
    keywords: ['ساعة', 'ساعات', 'سمارت', 'watch', 'smart watch', 's2', 'ultra', 'مونتر', 'ساعة ذكية'],
    variants: [
      {
        type: 'color',
        name: 'اللون (Couleur)',
        options: ['Noir Titane (أسود تيتانيوم)', 'Argent Brossé (فضي)', 'Orange Sport (برتقالي رياضي)'],
      },
      {
        type: 'spec',
        name: 'حجم الهيكل (Boîtier)',
        options: ['49mm Ultra'],
      },
    ],
    offers: [
      {
        id: 'off-sw2-1',
        title: 'عرض حبة واحدة (Pack Solo)',
        quantity: 1,
        priceMad: 299,
        badge: 'الثمن العادي',
        isDefault: true,
      },
      {
        id: 'off-sw2-2',
        title: 'باك الثنائي (Pack Duo - حبتين)',
        quantity: 2,
        priceMad: 499,
        discountPercent: 17,
        badge: 'الأكثر طلباً ⭐ توفير 100 درهم + شحن مجاني',
      },
      {
        id: 'off-sw2-3',
        title: 'باك العائلة (Pack Trio - 3 حبات)',
        quantity: 3,
        priceMad: 699,
        discountPercent: 22,
        badge: 'توفير 200 درهم + حزام إضافي هدية',
      },
    ],
    agentInstructions: 'ركز على جودة المكالمات البلوتوث الواضحة وعمر البطارية الطويل (5 أيام). إذا اختار الزبون حبة واحدة، اقترح عليه مباشرة باك الحبتين (Pack Duo) بـ 499 درهم مع شحن مجاني لتقديمها كهدية لشخص عزيز. وضح له دائماً أن الدفع يكون نقداً عند الاستلام بعد فتح وفحص العلبة مع موزع Sendit.',
    sellingPoints: [
      'شاشة AMOLED فائقة النقاء واضحة تحت أشعة الشمس',
      'إجراء واستقبال المكالمات بصوت نقي جداً وميكروفون مانع للضوضاء',
      'بطارية عملاقة 450mAh تدوم 5 إلى 7 أيام',
      'ضمان لمدة سنة كاملة مع التوصيل السريع لجميع مدن المغرب',
    ],
    objectionFaqs: [
      {
        question: 'واش نقدر نفحص العلبة ونجربها قبل ما نخلص؟',
        answer: 'أكيد أخي الكريم! التوصيل مع Sendit كيسمح ليك تفتح الكولية وتفحص الساعة وتتأكد من جودتها عاد تخلص الموزع.',
      },
      {
        question: 'واش فيها الضمان؟',
        answer: 'نعم فيها ضمان رسمي لمدة سنة كاملة، وفي حالة أي مشكل تقني كنوفروا ليك الاستبدال مجاناً لحد باب دارك.',
      },
      {
        question: 'واش كتخدم مع الآيفون والسامسونغ؟',
        answer: 'متوافقة 100% مع جميع هواتف Android والـ iPhone عبر تطبيق مجاني وسهل باللغة العربية.',
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Baggy Denim Jeans Coupe Vintage Brut',
    nameAr: 'سروال جينز باجي أصلي Baggy Denim',
    sku: 'JNS-VNTG-BLU',
    category: 'Mode & Habillement',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    ],
    sellingPrice: 249,
    costPrice: 65,
    deliveryFee: 35,
    totalStock: 68,
    hubs: { casablanca: 40, fes: 18, marrakech: 10, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 12,
    descriptionAr: 'جينز قطني أصلي 100% عالي الجودة بتطريز متين وقصة باجي كلاسيكية عريضة ومريحة، تصميم مريح يناسب جميع الإطلالات الكاجوال مع ثبات اللون بعد الغسيل.',
    keywords: ['سروال', 'جينز', 'باجي', 'jeans', 'baggy', 'pantalon', 'سراول', 'دنيم'],
    variants: [
      {
        type: 'size',
        name: 'المقاس (Taille)',
        options: ['30 (S)', '32 (M)', '34 (L)', '36 (XL)', '38 (XXL)'],
      },
      {
        type: 'color',
        name: 'اللون (Couleur)',
        options: ['Bleu Vintage (أزرق عتيق)', 'Noir Délavé (أسود باهت)', 'Bleu Ciel (أزرق فاتح)'],
      },
    ],
    offers: [
      {
        id: 'off-jns-1',
        title: 'جينز واحد (1 pièce)',
        quantity: 1,
        priceMad: 249,
        badge: 'الثمن العادي',
        isDefault: true,
      },
      {
        id: 'off-jns-2',
        title: 'عرض 2 جينز بألوان مختلفة',
        quantity: 2,
        priceMad: 429,
        discountPercent: 14,
        badge: 'توفير 70 درهم + توصيل مجاني',
      },
    ],
    agentInstructions: 'اسأل الزبون عن طوله ووزنه لاقتراح المقاس المناسب بدقة. أكد له أن تبديل المقاس مجاني وبدون أي مصاريف إضافية إذا لم يأتِ على مقاسه.',
    sellingPoints: [
      'قطن ثقيل ومريح ممتاز 100%',
      'قصة باجي ترند عصرية ومريحة جداً',
      'ضمان تبديل المقاس بالمجان خلال 48 ساعة',
    ],
    objectionFaqs: [
      {
        question: 'إلا مجاش قدي المقاس واش كاين تبديل؟',
        answer: 'نعم بكل سرور! عندنا التبديل مجاني تماماً خلال 48 ساعة، الموزع كيجيب ليك المقاس الجديد وكيسترجع القديم بدون أي رسوم.',
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'Parfum Royal Amber Boisé 50ml Haute Tenue',
    nameAr: 'عطر رويال عنبر الملكي 50 مل',
    sku: 'PRF-AMB-50ML',
    category: 'Parfumerie',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&auto=format&fit=crop&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80',
    ],
    sellingPrice: 349,
    costPrice: 90,
    deliveryFee: 35,
    totalStock: 9,
    hubs: { casablanca: 5, fes: 4, marrakech: 0, tanger: 0 },
    status: 'LOW_STOCK',
    pendingOrders: 14,
    descriptionAr: 'عطر شرقي فاخر بتركيبة مركزة من خشب العود والعنبر الملكي وفانيليا مدغشقر، ثبات استثنائي يدوم لأكثر من 48 ساعة مع فوحان مميز يلفت الأنظار.',
    keywords: ['عطر', 'بارفان', 'ريحة', 'عنبر', 'parfum', 'amber', 'عود', 'رويال'],
    variants: [
      {
        type: 'spec',
        name: 'الحجم (Volume)',
        options: ['50ml Extrait de Parfum', '100ml Edition Royale'],
      },
    ],
    offers: [
      {
        id: 'off-prf-1',
        title: 'قنينة واحدة 50ml',
        quantity: 1,
        priceMad: 349,
        isDefault: true,
      },
      {
        id: 'off-prf-2',
        title: 'باك عطرين (Pack 2 Parfums)',
        quantity: 2,
        priceMad: 549,
        discountPercent: 21,
        badge: 'توفير 150 درهم + شحن مجاني',
      },
    ],
    agentInstructions: 'ركز على الثبات الطويل للرائحة (48 ساعة على الملابس) والفوحان الفاخر. العطر خالي من الكحول الصناعي ومناسب للرجال والنساء.',
    sellingPoints: [
      'تركيز عالي Extrait de Parfum بثبات 48 ساعة',
      'مكونات طبيعية نقية بدون كحول مزعج',
      'تغليف فاخر جداً يصلح كهدية راقية',
    ],
    objectionFaqs: [
      {
        question: 'واش الريحة كتبقى شادة مزيان؟',
        answer: 'عطر رويال عنبر أصلي ومركز، كيبقى شاد في الحوايج أكثر من يومين وكيخلي أثر قوي في المكان.',
      },
    ],
  },
  {
    id: 'prod-4',
    name: 'Kaftan Moderne en Lin Pur Brodé Main',
    nameAr: 'قفطان عصري كتان خالص مطرز',
    sku: 'KFT-LIN-PUR',
    category: 'Artisanat & Mode',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80',
    sellingPrice: 459,
    costPrice: 150,
    deliveryFee: 35,
    totalStock: 24,
    hubs: { casablanca: 12, fes: 12, marrakech: 0, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 6,
    descriptionAr: 'قفطان صيفي راقي مصنوع من الكتان الأصلي بتطريز تقليدي يدوي معاصر، خفيف ومريح للمناسبات واليوميات مع حزام أنيق مدمج.',
    keywords: ['قفطان', 'تكشيطة', 'جلابة', 'كتان', 'kaftan', 'caftan', 'lin', 'مطرز'],
    variants: [
      {
        type: 'size',
        name: 'المقاس (Taille)',
        options: ['Standard (M/L)', 'Grande Taille (XL/XXL)'],
      },
      {
        type: 'color',
        name: 'اللون (Couleur)',
        options: ['Vert Émeraude (أخضر زمردي)', 'Beige Doré (بيج ذهبي)', 'Bleu Nuit (أزرق ملكي)'],
      },
    ],
    offers: [
      {
        id: 'off-kft-1',
        title: 'قفطان واحد (1 Caftan)',
        quantity: 1,
        priceMad: 459,
        isDefault: true,
      },
    ],
    agentInstructions: 'أبرز فخامة القماش الكتان وتطريز المعلم التقليدي. أكد للزبونة أنه خفيف وصالح للصيف والمناسبات العائلية.',
    sellingPoints: [
      'كتان بلدي خالص 100% بارد وصيفي',
      'تطريز يدوي متقن من صناع فاس ومراكش',
      'معاينة وفحص القفطان عند الاستلام',
    ],
  },
  {
    id: 'prod-5',
    name: 'Pack Sérum Argan Bio & Vitamine C 60ml',
    nameAr: 'باك سيروم زيت أركان وفيتامين سي',
    sku: 'BIO-ARG-VITC',
    category: 'Beauté & Soins',
    image: 'https://images.unsplash.com/photo-1608248597359-58b76020556c?w=600&auto=format&fit=crop&q=80',
    sellingPrice: 199,
    costPrice: 42,
    deliveryFee: 35,
    totalStock: 35,
    hubs: { casablanca: 20, fes: 15, marrakech: 0, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 21,
    descriptionAr: 'باقة عناية طبيعية متكاملة لتفتيح ونضارة البشرة ومحاربة التجاعيد، مستخلصة من أركان الصويرة العضوي النقي وفيتامين سي المركز.',
    keywords: ['سيروم', 'أركان', 'فيتامين', 'بشرة', 'تجميل', 'argan', 'serum', 'creme', 'نضارة'],
    variants: [
      {
        type: 'spec',
        name: 'النوع (Type)',
        options: ['Formule Jour (نهار)', 'Formule Nuit Réparatrice (ليل)'],
      },
    ],
    offers: [
      {
        id: 'off-srm-1',
        title: 'سيروم واحد (60ml)',
        quantity: 1,
        priceMad: 199,
        isDefault: true,
      },
      {
        id: 'off-srm-2',
        title: 'عرض 2 سيرومات (نهار + ليل)',
        quantity: 2,
        priceMad: 299,
        discountPercent: 25,
        badge: 'توفير 100 درهم + صابونة أركان هدية',
      },
    ],
    agentInstructions: 'اشرح للزبونة طريقة الاستعمال اليومي (قطرات على الوجه النظيف قبل النوم). اقترح باك الـ 2 لتغطية روتين النهار والليل.',
    sellingPoints: [
      'زيت أركان حيوي أصلي 100% معتمد',
      'نتائج ملحوظة في النضارة والتفتيح من الأسبوع الأول',
      'خالي من المواد الكيميائية والبارابين',
    ],
  },
  {
    id: 'prod-6',
    name: 'Sneakers Cuir Minimalistes Blanc Pur',
    nameAr: 'حذاء سنيكرز جلد أصلي أبيض',
    sku: 'SNK-WHT-LTHR',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
    sellingPrice: 399,
    costPrice: 110,
    deliveryFee: 35,
    totalStock: 53,
    hubs: { casablanca: 30, fes: 13, marrakech: 10, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 8,
    descriptionAr: 'حذاء كاجوال فخم مصنوع من الجلد الطبيعي مع نعل مريح ومضاد للانزلاق، تصميم كلاسيكي أبيض ناصع يناسب جميع الأوقات والمناسبات.',
    keywords: ['سبرديلة', 'حذاء', 'سنيكرز', 'جلد', 'sneakers', 'chaussure', 'سباط', 'باطا', 'جلد طبيعي'],
    variants: [
      {
        type: 'size',
        name: 'المقاس (Pointure)',
        options: ['40', '41', '42', '43', '44', '45'],
      },
      {
        type: 'color',
        name: 'اللون (Couleur)',
        options: ['Blanc Pur (أبيض ناصع)', 'Blanc & Talon Noir (أبيض مع كعب أسود)'],
      },
    ],
    offers: [
      {
        id: 'off-snk-1',
        title: 'زوج واحد (1 Paire)',
        quantity: 1,
        priceMad: 399,
        isDefault: true,
      },
      {
        id: 'off-snk-2',
        title: 'عرض زوجين (Pack 2 Paires)',
        quantity: 2,
        priceMad: 699,
        discountPercent: 12,
        badge: 'توفير 100 درهم + شحن مجاني',
      },
    ],
    agentInstructions: 'انصح الزبون بالمقاس العادي الذي يرتديه في الأحذية الرياضية. أكد له أن تجربة الحذاء والتأكد من المقاس قبل الأداء مضمونة 100%.',
    sellingPoints: [
      'جلد طبيعي فاخر يدوم طويلاً وسهل التنظيف',
      'نعل طبي Orthopedic مريح جداً للمشي طوال اليوم',
      'إمكانية قياس الحذاء عند وصول الموزع قبل الدفع',
    ],
    objectionFaqs: [
      {
        question: 'واش نقدر نقيس الحذاء عاد نخلص؟',
        answer: 'نعم بكل تأكيد! الموزع كينتظرك تقيس السبرديلة وتأكد من المقاس والراحة ديالها عاد تخلص نقداً.',
      },
    ],
  },
  {
    id: 'prod-7',
    name: 'Babouche Marocaine en Cuir Véritable Cousue Main',
    nameAr: 'خف جلد مغربي تقليدي أصلي خياطة اليد',
    sku: 'BAB-LTHR-TRAD-179',
    category: 'Chaussures & Artisanat',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
    ],
    sellingPrice: 179,
    costPrice: 55,
    deliveryFee: 35,
    totalStock: 85,
    hubs: { casablanca: 40, fes: 25, marrakech: 15, tanger: 5 },
    status: 'IN_STOCK',
    pendingOrders: 12,
    descriptionAr: 'خف وبلغة مغربية تقليدية مصنوعة 100% من الجلد الطبيعي المدبوغ أصيل، خياطة يدوية متقنة بنعل مريح ومقاوم، مناسبة للمناسبات والأعياد والاستعمال اليومي المريح.',
    keywords: [
      'خف', 'خف جلد', 'بلغة', 'بلغة جلد', 'شربيل', 'babouche', 'babouches', 'cuir',
      'جلد', 'جلد طبيعي', 'خف مغربي', 'بلغة فاسية', 'بلغة مراكشية', 'خفاف'
    ],
    variants: [
      {
        type: 'size',
        name: 'المقاس (Pointure)',
        options: ['40', '41', '42', '43', '44', '45'],
      },
      {
        type: 'color',
        name: 'اللون (Couleur)',
        options: ['Jaune Royal (أصفر ملكي)', 'Marron Cuir (بني طبيعي)', 'Noir (أسود)', 'Blanc (أبيض)'],
      },
    ],
    offers: [
      {
        id: 'off-bab-1',
        title: 'زوج واحد (1 Paire)',
        quantity: 1,
        priceMad: 179,
        isDefault: true,
      },
      {
        id: 'off-bab-2',
        title: 'عرض زوجين (Pack 2 Paires)',
        quantity: 2,
        priceMad: 299,
        discountPercent: 16,
        badge: 'توفير 59 درهم + شحن مخفض',
      },
    ],
    agentInstructions: 'أكد للزبون أن الخف مصنوع من الجلد الطبيعي الأصلي 100% مع نعل مريح، ويمكنه فتح العلبة وتجربة القياس ومعاينة الجلد مع موزع Sendit قبل دفع الـ 179 درهم.',
    sellingPoints: [
      'جلد طبيعي 100% خياطة يدوية تقليدية متينة',
      'نعل طبي مريح جداً خفيف على القدم',
      'الدفع نقداً عند الاستلام بعد فتح الكولية والمعاينة',
    ],
    objectionFaqs: [
      {
        question: 'واش نقدر نقيس الخف عاد نخلص؟',
        answer: 'أكيد أخي الكريم! مع Sendit عندك كامل الحق تفتح الكولية وتفحص جودة الجلد وتقيس عاد تخلص الموزع نقداً.',
      },
      {
        question: 'واش جلد طبيعي ولا صكلي / سكايل؟',
        answer: 'جلد طبيعي 100% أصلي مدبوغ ومخيط باليد، كتحس بريحة ونعومة الجلد الحقيقي.',
      },
    ],
  },
];

const globalForProducts = globalThis as unknown as {
  __senditProducts?: ProductItem[];
};

export function getProducts(): ProductItem[] {
  if (!globalForProducts.__senditProducts) {
    globalForProducts.__senditProducts = [...INITIAL_PRODUCTS];
  }
  return globalForProducts.__senditProducts;
}

export function saveOrUpdateProductInStore(product: ProductItem): void {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === product.id || p.sku === product.sku);
  if (idx >= 0) {
    products[idx] = { ...products[idx], ...product };
  } else {
    products.unshift(product);
  }
}

export function deleteProductFromStore(idOrSku: string): void {
  if (!idOrSku) return;
  const target = idOrSku.toLowerCase().trim();
  const current = getProducts();
  globalForProducts.__senditProducts = current.filter(
    (p) => p.id.toLowerCase() !== target && (!p.sku || p.sku.toLowerCase() !== target)
  );
}

export function syncStoreWithDbProducts(dbProducts: ProductItem[]): void {
  if (Array.isArray(dbProducts)) {
    globalForProducts.__senditProducts = [...dbProducts];
  }
}

export function findProductByNameOrKeyword(query: string): ProductItem | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  if (q.length < 2) return undefined;

  // Generic words that must never trigger a product match
  const genericWords = [
    'تصويرة', 'تصاور', 'صورة', 'صور', 'برودوي', 'سلعة', 'منتج', 'منتوج', 'واش', 'كاين', 
    'فين', 'شحال', 'بشحال', 'بغيت', 'عفاك', 'سلام', 'photo', 'image', 'photos', 'images', 
    'produit', 'produits', 'article', 'articles', 'catalogue', 'prix', 'شوف', 'وريني'
  ];
  if (genericWords.includes(q)) return undefined;

  const products = getProducts();

  // 1. Direct SKU match
  const bySku = products.find((p) => p.sku && p.sku.toLowerCase() === q);
  if (bySku) return bySku;

  // 2. Direct name match
  if (q.length >= 3) {
    const exact = products.find(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameAr.toLowerCase().includes(q) ||
        q.includes(p.name.toLowerCase()) ||
        q.includes(p.nameAr.toLowerCase())
    );
    if (exact) return exact;
  }

  // 3. Keyword matching (tokens must be meaningful and not generic)
  const cleanTokens = q.split(/[\s,،.!?؛\-]+/).filter((w) => w.length >= 3 && !genericWords.includes(w));
  return products.find((p) =>
    p.keywords.some((kw) => {
      const lowerKw = kw.toLowerCase();
      return cleanTokens.some((token) => token === lowerKw || token.includes(lowerKw)) || q.includes(lowerKw);
    })
  );
}

export function formatProductListForWhatsApp(): string {
  const products = getProducts();
  const lines = products.map((p, idx) => {
    const stockNote = p.totalStock > 0 ? 'متوفر ✅' : 'نفد المخزون ❌';
    let offerNote = '';
    if (p.offers && p.offers.length > 1) {
      const bestOffer = p.offers.find((o) => o.badge?.includes('توفير') || o.badge?.includes('الأكثر طلباً'));
      if (bestOffer) {
        offerNote = `\n🔥 *عرض خاص:* ${bestOffer.title} بـ *${bestOffer.priceMad} درهم* (${bestOffer.badge})`;
      }
    }
    return `*${idx + 1}. ${p.nameAr}*\n💰 الثمن الفردي: *${p.sellingPrice} درهم* (${stockNote})${offerNote}\n📝 ${p.descriptionAr}\n`;
  });

  return `مرحبا بيك في متجرنا! 🛍️✨\nها هي قائمة المنتجات والعروض المتوفرة عندنا حالياً:\n\n${lines.join('\n')}\n🚚 التوصيل بالمجان وسريع لكافة مدن المغرب مع الدفع عند الاستلام بعد الفحص والتجربة!\n\n👉 *للطلب:* كتب لينا اسم المنتج، المقاس أو اللون لي عجبك، مدينتك، ورقم هاتفك وغادي نسجلوا طلبك دابا! 📦`;
}

export const CATALOG_PRODUCTS: ProductItem[] = INITIAL_PRODUCTS;
