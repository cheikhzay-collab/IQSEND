// Centralized Products Catalog for Sendit COD Platform & WhatsApp AI Agent

export interface ProductItem {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  image: string;
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
}

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Smart Watch Ultra Pro S2',
    nameAr: 'ساعة ذكية Smart Watch Ultra Pro S2',
    sku: 'SW2-AMOLED-BLK',
    category: 'High-Tech',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 299,
    costPrice: 85,
    deliveryFee: 35,
    totalStock: 142,
    status: 'IN_STOCK',
    descriptionAr: 'شاشة AMOLED فائقة الوضوح، مكالمات بلوتوث عالية الجودة، بطارية تدوم حتى 5 أيام، مقاومة للماء مع تتبع دقيق للصحة والرياضة.',
    keywords: ['ساعة', 'ساعات', 'سمارت', 'watch', 'smart watch', 's2', 'ultra', 'مونتر'],
  },
  {
    id: 'prod-2',
    name: 'Baggy Denim Jeans Vintage Brut',
    nameAr: 'سروال جينز باجي أصلي Baggy Denim',
    sku: 'JNS-VNTG-BLU',
    category: 'Mode & Habillement',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 249,
    costPrice: 65,
    deliveryFee: 35,
    totalStock: 68,
    status: 'IN_STOCK',
    descriptionAr: 'جينز قطني أصلي 100% قصة باجي عريضة ومريحة عصرية، متوفر بجميع المقاسات (30 إلى 38).',
    keywords: ['سروال', 'جينز', 'باجي', 'jeans', 'baggy', 'pantalon', 'سراول'],
  },
  {
    id: 'prod-3',
    name: 'Parfum Royal Amber Boisé 50ml',
    nameAr: 'عطر رويال عنبر الملكي 50 مل',
    sku: 'PRF-AMB-50ML',
    category: 'Parfumerie',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 349,
    costPrice: 90,
    deliveryFee: 35,
    totalStock: 9,
    status: 'LOW_STOCK',
    descriptionAr: 'عطر شرقي فاخر بتركيبة العنبر والعود وخشب الصندل، ثبات يدوم أكثر من 48 ساعة مع فوحان استثنائي.',
    keywords: ['عطر', 'بارفان', 'ريحة', 'عنبر', 'parfum', 'amber', 'عود', 'رويال'],
  },
  {
    id: 'prod-4',
    name: 'Kaftan Moderne en Lin Pur Brodé',
    nameAr: 'قفطان عصري كتان خالص مطرز',
    sku: 'KFT-LIN-PUR',
    category: 'Artisanat & Mode',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 459,
    costPrice: 150,
    deliveryFee: 35,
    totalStock: 24,
    status: 'IN_STOCK',
    descriptionAr: 'قفطان صيفي راقي مصنوع من الكتان الأصلي بتطريز تقليدي يدوي معاصر، خفيف ومريح للمناسبات واليوميات.',
    keywords: ['قفطان', 'تكشيطة', 'جلابة', 'كتان', 'kaftan', 'caftan', 'lin'],
  },
  {
    id: 'prod-5',
    name: 'Pack Sérum Argan Bio & Vitamine C',
    nameAr: 'باك سيروم زيت أركان وفيتامين سي',
    sku: 'BIO-ARG-VITC',
    category: 'Beauté & Soins',
    image: 'https://images.unsplash.com/photo-1608248597359-58b76020556c?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 199,
    costPrice: 42,
    deliveryFee: 35,
    totalStock: 15,
    status: 'IN_STOCK',
    descriptionAr: 'باقة عناية طبيعية متكاملة لتفتيح ونضارة البشرة ومحاربة التجاعيد، مستخلصة من أركان الصويرة العضوي.',
    keywords: ['سيروم', 'أركان', 'فيتامين', 'بشرة', 'تجميل', 'argan', 'serum', 'creme'],
  },
  {
    id: 'prod-6',
    name: 'Sneakers Cuir Minimalistes Blanc',
    nameAr: 'حذاء سنيكرز جلد أصلي أبيض',
    sku: 'SNK-WHT-LTHR',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 399,
    costPrice: 110,
    deliveryFee: 35,
    totalStock: 53,
    status: 'IN_STOCK',
    descriptionAr: 'حذاء كاجوال فخم مصنوع من الجلد الطبيعي مع نعل مريح ومضاد للانزلاق، تصميم كلاسيكي أبيض.',
    keywords: ['سبرديلة', 'حذاء', 'سنيكرز', 'جلد', 'sneakers', 'chaussure', 'سباط', 'باطا'],
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

export function findProductByNameOrKeyword(query: string): ProductItem | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  const products = getProducts();

  // 1. Direct name match
  const exact = products.find((p) => p.name.toLowerCase().includes(q) || p.nameAr.toLowerCase().includes(q));
  if (exact) return exact;

  // 2. Keyword match
  return products.find((p) => p.keywords.some((kw) => q.includes(kw.toLowerCase()) || kw.toLowerCase().includes(q)));
}

export function formatProductListForWhatsApp(): string {
  const products = getProducts();
  const lines = products.map((p, idx) => {
    const stockNote = p.totalStock > 0 ? 'متوفر ✅' : 'نفد المخزون ❌';
    return `*${idx + 1}. ${p.nameAr}*\n💰 الثمن: *${p.sellingPrice} درهم* (${stockNote})\n📝 ${p.descriptionAr}\n`;
  });

  return `مرحبا بيك في متجرنا! 🛍️✨\nها هي قائمة المنتجات المتوفرة عندنا حالياً:\n\n${lines.join('\n')}\n🚚 التوصيل بالمجان وسريع لكافة مدن المغرب مع الدفع عند الاستلام بعد الفحص والتجربة!\n\n👉 *للطلب:* كتب لينا اسم المنتج، مدينتك، ورقم هاتفك وغادي نسجلوا طلبك دابا! 📦`;
}
