import { OrderItem, OrderStatus, PaymentBadge } from '@/types/orders';
import { LifecycleStage, LifecycleOrder } from '@/context/OrderLifecycleContext';

export interface StageTemplate {
  title: string;
  shortLabel: string;
  stageNameAr: string;
  stageNameFr: string;
  colorClass: string;
  badgeBg: string;
  buttonBorder: string;
  french: (order: OrderItem) => string;
  darija: (order: OrderItem) => string;
  arabic: (order: OrderItem) => string;
  quickPrompts: Array<{ label: string; prompt: string }>;
}

export const STAGE_MESSAGE_TEMPLATES: Record<string, StageTemplate> = {
  PENDING_CONFIRMATION: {
    title: 'Confirmation de commande & adresse',
    shortLabel: 'Confirmer',
    stageNameAr: 'في انتظار التأكيد',
    stageNameFr: 'En attente de confirmation',
    colorClass: 'text-amber-800',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    buttonBorder: 'border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100',
    french: (o) =>
      `Bonjour ${o.customerName}, nous vous contactons de la part de notre boutique concernant votre commande #${o.orderNumber} pour "${o.productName}" d'un montant de ${o.amount} ${o.currency} (Paiement à la livraison - COD). Pouvez-vous nous confirmer votre adresse à ${o.city} ainsi que votre disponibilité pour expédier votre colis dès aujourd'hui ? Merci pour votre confiance !`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}، معكم متجرنا بخصوص طلبكم #${o.orderNumber} لمنتج "${o.productName}" بمبلغ ${o.amount} ${o.currency} (الدفع عند الاستلام). واش نأكدو معكم الإرسال إلى ${o.city} اليوم؟ المرجو تأكيد العنوان وموعد الاستلام المناسب لكم. شكراً!`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، معكم خدمة تأكيد الطلبات بخصوص طلبكم رقم #${o.orderNumber} لمنتج "${o.productName}" بمبلغ ${o.amount} ${o.currency} (الدفع عند الاستلام). يرجى تأكيد العنوان في مدينة ${o.city} وتوقيت الاستلام المناسب لنقوم بشحن طلبكم اليوم. شكراً لثقتكم!`,
    quickPrompts: [
      {
        label: 'Confirmation immédiate',
        prompt: 'Demander au client de confirmer sa commande, son adresse et son créneau de disponibilité pour expédition express.',
      },
      {
        label: 'Validation taille & couleur',
        prompt: 'Demander au client de valider sa taille et sa couleur préférée avant la mise en colisage.',
      },
      {
        label: 'Demande position GPS WhatsApp',
        prompt: 'Demander au client de partager sa position GPS (Location Pin) sur WhatsApp pour faciliter la livraison à domicile.',
      },
      {
        label: 'Offre 2ème article (-30% Upsell)',
        prompt: 'Proposer au client d ajouter un second article avec 30% de réduction immédiate et livraison gratuite offerte.',
      },
    ],
  },
  NEW_ORDERS: {
    title: 'Confirmation de commande & adresse',
    shortLabel: 'Confirmer',
    stageNameAr: 'طلب جديد',
    stageNameFr: 'Nouvelle commande',
    colorClass: 'text-amber-800',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    buttonBorder: 'border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100',
    french: (o) =>
      `Bonjour ${o.customerName}, nous avons bien reçu votre nouvelle commande #${o.orderNumber} pour "${o.productName}" (${o.amount} ${o.currency} en paiement à la livraison). Merci de nous confirmer votre adresse à ${o.city} pour expédition rapide.`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}، معكم متجرنا بخصوص طلبكم #${o.orderNumber} لمنتج "${o.productName}" بمبلغ ${o.amount} ${o.currency} (الدفع عند الاستلام). واش نأكدو معكم الإرسال إلى ${o.city} اليوم؟ المرجو تأكيد العنوان وموعد الاستلام المناسب لكم.`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، معكم خدمة تأكيد الطلبات بخصوص طلبكم رقم #${o.orderNumber} لمنتج "${o.productName}" بمبلغ ${o.amount} ${o.currency} (الدفع عند الاستلام). يرجى تأكيد العنوان في ${o.city}.`,
    quickPrompts: [
      {
        label: 'Validation rapide',
        prompt: 'Confirmer rapidement la nouvelle commande et vérifier le numéro de téléphone.',
      },
      {
        label: 'Précision quartier & rue',
        prompt: 'Demander des précisions sur le quartier et le numéro de rue pour éviter tout retard.',
      },
    ],
  },
  PROCESSING: {
    title: 'Préparation & emballage soigné',
    shortLabel: 'En préparation',
    stageNameAr: 'قيد التجهيز والتغليف',
    stageNameFr: 'En préparation',
    colorClass: 'text-blue-800',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    buttonBorder: 'border-blue-300 text-blue-900 bg-blue-50/70 hover:bg-blue-100',
    french: (o) =>
      `Bonjour ${o.customerName}, nous vous informons que votre commande #${o.orderNumber} ("${o.productName}") est actuellement en cours de préparation et d'emballage soigné dans nos entrepôts. Elle sera remise au livreur dans les plus brefs délais pour une livraison à ${o.city}. Bonne journée !`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! كنعلموك بلي الطلب ديالك #${o.orderNumber} ("${o.productName}") راه دابا ف التغليف والتجهيز بعناية ف المستودع ديالنا. غادي نسلموه للموزع ف أقرب وقت باش يوصلك ل ${o.city}. نهارك مبروك!`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، نبشركم بأن طلبكم رقم #${o.orderNumber} ("${o.productName}") قيد التجهيز والتغليف بعناية الآن في مستودعاتنا، وسيتم تسليمه لشركة التوصيل في أقرب وقت ليصلكم إلى ${o.city}.`,
    quickPrompts: [
      {
        label: 'Qualité & emballage soigné',
        prompt: 'Rassurer le client sur le contrôle qualité rigoureux et l emballage soigné avant expédition.',
      },
      {
        label: 'Départ imminent avec le livreur',
        prompt: 'Informer le client que le colis partira avec la première tournée du transporteur aujourd hui.',
      },
      {
        label: 'Ajout de produit avant fermeture',
        prompt: 'Demander au client s il souhaite ajouter un autre produit dans le même colis avec frais de port offerts.',
      },
    ],
  },
  PACKING: {
    title: 'Préparation & emballage final',
    shortLabel: 'En préparation',
    stageNameAr: 'قيد التغليف',
    stageNameFr: 'En cours d\'emballage',
    colorClass: 'text-blue-800',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    buttonBorder: 'border-blue-300 text-blue-900 bg-blue-50/70 hover:bg-blue-100',
    french: (o) =>
      `Bonjour ${o.customerName}, votre colis #${o.orderNumber} est en cours de scellage et étiquetage final pour remise immédiate au transporteur à destination de ${o.city}.`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! الطلب ديالك #${o.orderNumber} راه ف مرحلة التغليف دابا وغادي يتسيفط ليك فقريب الوقت ل ${o.city}. شكراً لصبركم!`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، طلبكم #${o.orderNumber} في مرحلة التغليف والتجهيز النهائي للشحن إلى ${o.city}.`,
    quickPrompts: [
      {
        label: 'Prêt pour l’expédition',
        prompt: 'Informer que le colis est emballé et prêt à être pris en charge par le coursier.',
      },
    ],
  },
  IN_TRANSIT: {
    title: 'Acheminement & livraison en cours',
    shortLabel: 'En livraison',
    stageNameAr: 'قيد التوصيل والشحن',
    stageNameFr: 'En cours de livraison',
    colorClass: 'text-indigo-800',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    buttonBorder: 'border-indigo-300 text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100',
    french: (o) =>
      `Bonjour ${o.customerName}, bonne nouvelle ! Votre colis #${o.orderNumber} est actuellement en cours de livraison avec notre chauffeur vers ${o.city}. Merci de garder votre téléphone accessible et de préparer le montant de ${o.amount} ${o.currency} à régler en espèces à la livraison. Le livreur vous appellera avant son arrivée !`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! كنعلموك بلي الكولية ديالك #${o.orderNumber} راها دابا ف الطريق مع الموزع لمدينة ${o.city}. عفاك خلي هاتفك مفتوح وجد معاك مبلغ ${o.amount} ${o.currency} عند الاستلام. الموزع غادي يتصل بيك قبل ما يوصل.`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، طلبكم رقم #${o.orderNumber} الآن في الطريق إليكم إلى ${o.city} مع موزع التوصيل. يرجى إبقاء هاتفكم متاحاً وتجهيز مبلغ ${o.amount} ${o.currency} نقداً عند الاستلام. سيتصل بكم الموزع قبل الوصول.`,
    quickPrompts: [
      {
        label: 'Chauffeur en route aujourd’hui',
        prompt: 'Informer le client que le livreur est dans sa zone aujourd hui et qu il doit garder son téléphone joignable.',
      },
      {
        label: 'Rappel montant espèces COD',
        prompt: 'Rappeler avec bienveillance le montant exact en Dirhams à préparer pour faciliter l encaissement sans monnaie.',
      },
      {
        label: 'Client injoignable (Relance)',
        prompt: 'Informer le client que le livreur a essayé de le joindre sans succès, et demander un nouveau créneau ou un autre numéro.',
      },
      {
        label: 'Reprogrammation de créneau',
        prompt: 'Proposer au client un horaire ou un jour alternatif adapté s il n est pas disponible aujourd hui.',
      },
    ],
  },
  SHIPPED: {
    title: 'Expédition & prise en charge chauffeur',
    shortLabel: 'En livraison',
    stageNameAr: 'تم الشحن',
    stageNameFr: 'Expédiée',
    colorClass: 'text-indigo-800',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    buttonBorder: 'border-indigo-300 text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100',
    french: (o) =>
      `Bonjour ${o.customerName}, votre colis #${o.orderNumber} a été expédié et est en cours d'acheminement vers ${o.city}. Merci de préparer ${o.amount} ${o.currency} en espèces à l'arrivée du chauffeur.`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! الطلب ديالك #${o.orderNumber} راه تسيفط وموجود مع خدمة التوصيل. المرجو تجهيز مبلغ ${o.amount} ${o.currency} عند الاستلام.`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، تم شحن طلبكم رقم #${o.orderNumber} وهو في الطريق إليكم إلى ${o.city}. يرجى إبقاء الهاتف متاحاً وتجهيز مبلغ ${o.amount} ${o.currency}.`,
    quickPrompts: [
      {
        label: 'Suivi de livraison',
        prompt: 'Donner des nouvelles de l acheminement du colis et inviter à préparer le règlement.',
      },
    ],
  },
  COMPLETED: {
    title: 'Livraison réussie & Demande d’avis',
    shortLabel: 'Avis client',
    stageNameAr: 'تم التوصيل والتحصيل',
    stageNameFr: 'Livrées & Encaissées',
    colorClass: 'text-emerald-800',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    buttonBorder: 'border-emerald-300 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100',
    french: (o) =>
      `Bonjour ${o.customerName}, votre commande #${o.orderNumber} ("${o.productName}") vous a été livrée avec succès ! Nous vous remercions sincèrement pour votre confiance. Quel est votre retour sur la qualité du produit et notre service de livraison ? Votre avis compte énormément pour toute notre équipe !`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! تم بحمد الله تسليم الطلب ديالك #${o.orderNumber} ("${o.productName}"). شكراً جزيلاً على ثقتك ف المتجر ديالنا! كيف جاتك الجودة والخدمة؟ الرأي ديالك كيهمنا بزاف، وغادي نكونو فرحانين بالتقييم ديالك!`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، تم بنجاح تسليم طلبكم رقم #${o.orderNumber} ("${o.productName}"). شكراً جزيلاً لثقتكم بنا واختياركم لمتجرنا! يسعدنا جداً معرفة رأيكم وتقييمكم لجودة المنتج والخدمة. نتمنى أن نكون دائماً عند حسن ظنكم!`,
    quickPrompts: [
      {
        label: 'Demande avis 5 étoiles',
        prompt: 'Demander poliment au client de partager son avis 5 étoiles et ses impressions sur le produit reçu.',
      },
      {
        label: 'Code promo fidélité (-15%)',
        prompt: 'Remercier chaleureusement le client et lui offrir un code promo exclusif (VIP15) valable sur sa prochaine commande.',
      },
      {
        label: 'Garantie & Service après-vente',
        prompt: 'Rappeler au client que son achat est garanti et que le service après-vente reste à sa disposition pour toute question.',
      },
    ],
  },
  DELIVERED: {
    title: 'Livraison réussie & Demande d’avis',
    shortLabel: 'Avis client',
    stageNameAr: 'تم التوصيل',
    stageNameFr: 'Livrée',
    colorClass: 'text-emerald-800',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    buttonBorder: 'border-emerald-300 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100',
    french: (o) =>
      `Bonjour ${o.customerName}, votre commande #${o.orderNumber} a été livrée avec succès. Merci pour votre achat ! Comment évaluez-vous votre expérience avec nous ?`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}! تم تسليم الطلب #${o.orderNumber}. شكراً بزاف على ثقتك بنا ونتمنى ينال إعجابك!`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، تم تسليم طلبكم #${o.orderNumber} بنجاح. شكراً لثقتكم ويسعدنا تقييمكم لخدمتنا!`,
    quickPrompts: [
      {
        label: 'Demande de note',
        prompt: 'Demander une note rapide sur l expérience de livraison.',
      },
    ],
  },
  CANCELED: {
    title: 'Suivi et relance d’annulation',
    shortLabel: 'Relance',
    stageNameAr: 'طلب ملغى',
    stageNameFr: 'Commande annulée',
    colorClass: 'text-rose-800',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    buttonBorder: 'border-rose-300 text-rose-900 bg-rose-50/70 hover:bg-rose-100',
    french: (o) =>
      `Bonjour ${o.customerName}, concernant votre commande #${o.orderNumber}, nous avons constaté qu'elle n'a pas pu aboutir. Y a-t-il eu un empêchement concernant la taille, le modèle ou l'horaire de livraison ? Si vous souhaitez modifier ou reprogrammer votre commande, notre équipe reste à votre entière disposition.`,
    darija: (o) =>
      `السلام عليكم ${o.customerName}، بخصوص طلبكم #${o.orderNumber}، لاحظنا بلي تم الإلغاء ديالو. واش كان شي إشكال ف المقاس، الثمن، أو وقت التوصيل؟ يلا بغيتي نبدلو ليك أي حاجة راه حنا ف الخدمة ديالك ف أي وقت.`,
    arabic: (o) =>
      `السلام عليكم ${o.customerName}، نأسف لعدم إتمام طلبكم رقم #${o.orderNumber} هذه المرة. إذا كان لديكم أي ملاحظة بخصوص المقاس، السعر أو موعد الاستلام، أو ترغبون في إعادة جدولته يسعدنا دائماً خدمتكم ومساعدتكم.`,
    quickPrompts: [
      {
        label: 'Comprendre le motif',
        prompt: 'Demander poliment la raison de l annulation pour voir si une solution ou un échange est possible.',
      },
      {
        label: 'Offre spéciale de sauvetage',
        prompt: 'Proposer une réduction immédiate de 20% pour encourager le client à revalider sa commande.',
      },
      {
        label: 'Reporter la livraison',
        prompt: 'Proposer de décaler la livraison à la fin du mois ou au jour de paie du client.',
      },
    ],
  },
};

/**
 * Returns the stage configuration and localized template for any given order
 */
export function getStageMessageConfig(status: OrderStatus | LifecycleStage | string): StageTemplate {
  const normalizedKey = String(status).toUpperCase();
  return (
    STAGE_MESSAGE_TEMPLATES[normalizedKey] ||
    STAGE_MESSAGE_TEMPLATES['PENDING_CONFIRMATION']
  );
}

/**
 * Formats a clean Moroccan international phone for WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) {
    return '212' + digits.slice(1);
  }
  if (digits.startsWith('212')) {
    return digits;
  }
  return '212' + digits;
}

/**
  * Converts a LifecycleOrder into an OrderItem compatible with OrderCard, modals and actions
  */
export function lifecycleToOrderItem(o: LifecycleOrder): OrderItem {
  const firstItem = o.items?.[0];
  const isPaid =
    o.payment?.status === 'COLLECTED' ||
    o.payment?.status === 'SETTLED' ||
    o.payment?.method === 'PREPAID';

  let badgeType: PaymentBadge = isPaid ? 'PAID' : 'COD PENDING';
  let badgeLabel: string | undefined = undefined;

  if (
    o.customer?.notes?.toLowerCase().includes('rappeler') ||
    o.customer?.notes?.toLowerCase().includes('callback')
  ) {
    badgeType = 'CALLBACK';
    badgeLabel = 'Callback 16h';
  } else if (o.aiVerification?.status === 'CONFIRMED_BY_AI') {
    badgeLabel = 'Validé IA';
  } else if (o.aiVerification?.status === 'NEEDS_REVIEW') {
    badgeLabel = 'À vérifier';
  }

  let metaBadge: { type: 'ai-call' | 'tracking'; text: string } | undefined = undefined;
  if (o.shipping?.trackingNumber) {
    metaBadge = { type: 'tracking', text: o.shipping.trackingNumber };
  } else if (o.aiVerification?.status === 'CONFIRMED_BY_AI') {
    metaBadge = { type: 'ai-call', text: 'AI Call' };
  }

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.stage as OrderStatus,
    badgeType,
    badgeLabel,
    amount: o.payment?.amount || 0,
    currency: o.payment?.currency || 'MAD',
    productName: firstItem
      ? o.items.length > 1
        ? `${firstItem.name} (+${o.items.length - 1})`
        : firstItem.name
      : 'Article COD',
    productThumbnail:
      firstItem?.thumbnail ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    customerName: o.customer?.name || 'Client',
    city: o.customer?.city || 'Maroc',
    countryCode: 'MA',
    phone: o.customer?.phone || '',
    timeAgo: o.createdAt || 'À l’instant',
    address: o.customer?.address,
    metaBadge,
    hasWhatsapp: true,
    hasCall: true,
    hasNote: !!o.customer?.notes,
    hasReview: !!o.completed?.reviewScore,
    assignedAgent: {
      type: 'initial',
      value: o.aiVerification?.status === 'CONFIRMED_BY_AI' ? 'IA' : 'A',
      bgClass: o.aiVerification?.status === 'CONFIRMED_BY_AI' ? 'bg-emerald-600' : 'bg-[#7c3aed]',
    },
  };
}

