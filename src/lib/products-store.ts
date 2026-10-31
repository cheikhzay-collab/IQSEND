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
  options: string[]; // e.g. ["40", "41", "42"] or ["NOIR"]
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
    id: 'prod-02',
    name: 'KHUF CUIR',
    nameAr: 'خف جلد',
    sku: 'BMB-BLK-L',
    category: 'Chaussures & Maroquinerie',
    image: 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
    additionalImages: [
      'https://qonfor.shop/wp-content/uploads/2026/10/%D9%83%D8%AB%D8%B1-%D9%83%D9%84-%D9%85%D8%A7-%D9%88%D9%81%D8%B1%D8%AA%D9%8A-%D9%83%D8%AB%D8%B1-1-2048x2048.jpg.webp',
    ],
    sellingPrice: 179,
    costPrice: 80,
    deliveryFee: 35,
    totalStock: 28,
    hubs: { casablanca: 15, fes: 8, marrakech: 5, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 2,
    descriptionAr: 'خف جلد حر صناعة فاسية تقليدية أصيلة عالية الجودة، نعل مريح ومبطن، مناسب للاستعمال اليومي والمناسبات.',
    keywords: ['خف', 'خف جلد', 'خف جلد حر', 'khuf', 'cuir', 'بلغة', 'بلغة جلد', 'babouche', 'bmb-blk-l', 'جلد'],
    variants: [
      {
        type: 'size',
        name: 'Taille',
        options: ['40', '41', '42', '43', '44', '45'],
      },
      {
        type: 'color',
        name: 'Couleur',
        options: ['NOIR'],
      },
    ],
    offers: [
      {
        id: 'off-1792584104962',
        title: 'Pack 1 Pièces',
        quantity: 1,
        priceMad: 179,
        discountPercent: 18,
        badge: 'Remise Spéciale + Livraison Gratuite',
        isDefault: true,
      },
      {
        id: 'off-1792584123916',
        title: 'Pack 2 Pièces',
        quantity: 2,
        priceMad: 269,
        discountPercent: 18,
        badge: 'Remise Spéciale + Livraison Gratuite',
      },
      {
        id: 'off-1792584132500',
        title: 'Pack 3 Pièces',
        quantity: 3,
        priceMad: 340,
        discountPercent: 18,
        badge: 'Remise Spéciale + Livraison Gratuite',
      },
    ],
    agentInstructions: 'خف جلد طبيعي أصلي صناعة تقليدية فاسية عالية الجودة، مريح جداً ومبطن، مقاسات مغربية مضبوطة 40 إلى 45، لون أسود فاخر. أكد للزبون أن التوصيل سريع والدفع نقداً عند الاستلام بعد فتح وفحص الكولية وتجربة المقاس مع موزع Sendit.',
    sellingPoints: [
      'جلد طبيعي 100% صناعة فاسية أصيلة متينة',
      'نعل طبي مريح جداً خفيف على القدم',
      'توصيل سريع لكافة المدن والدفع نقداً عند الاستلام بعد المعاينة',
    ],
    objectionFaqs: [
      {
        question: 'واش نقدر نقيس الخف عاد نخلص؟',
        answer: 'أكيد أخي الكريم! مع Sendit عندك كامل الحق تفتح الكولية وتفحص جودة الجلد وتقيس عاد تخلص الموزع نقداً.',
      },
      {
        question: 'واش جلد طبيعي حر؟',
        answer: 'جلد طبيعي حر 100% أصلي مدبوغ ومخيط باليد بجودة فاسية تقليدية رفيعة.',
      },
    ],
  },
];

const globalForProducts = globalThis as unknown as {
  __senditProducts?: ProductItem[];
  __lastDbFetch?: number;
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

/**
 * Robust Product Resolver: Finds matching catalog product by SKU/Code or by Name/Keywords
 */
export function resolveProductBySkuOrName(rawSku?: string, rawName?: string): ProductItem | null {
  const products = getProducts();

  // 1. Direct SKU or ID match
  if (rawSku && rawSku.trim()) {
    const cleanSku = rawSku.trim().toLowerCase();
    const bySku = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase() === cleanSku) ||
        (p.id && p.id.toLowerCase() === cleanSku) ||
        (Array.isArray(p.keywords) && p.keywords.some((k) => k.toLowerCase() === cleanSku))
    );
    if (bySku) return bySku;
  }

  // 2. Direct Name or Keyword match
  if (rawName && rawName.trim()) {
    const byName = findProductByNameOrKeyword(rawName.trim());
    if (byName) return byName;
  }

  // 3. Fallback: Check if SKU is contained in name or keywords
  if (rawSku && rawSku.trim()) {
    const cleanSku = rawSku.trim().toLowerCase();
    const fuzzy = products.find(
      (p) =>
        p.name.toLowerCase().includes(cleanSku) ||
        p.nameAr.toLowerCase().includes(cleanSku)
    );
    if (fuzzy) return fuzzy;
  }

  return null;
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
