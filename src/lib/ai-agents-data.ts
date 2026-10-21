/**
 * ai-agents-data.ts
 * Shared types and preset data for the AI Agents page.
 * Extracted from page.tsx because Next.js App Router page files
 * may only export reserved fields (default, metadata, dynamic, etc.)
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  toolCalled?: string;
  toolDetails?: {
    name: string;
    args?: Record<string, any>;
    resultDescription?: string;
  };
  latencyMs?: number;
  mediaType?: 'text' | 'audio' | 'image';
  isVoice?: boolean;
  audioUrl?: string;
  voiceDuration?: string;
  voiceTranscription?: string;
  isImage?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  imageAnalysis?: {
    detectedCategory?: string;
    description?: string;
    extractedText?: string;
    suggestedAction?: string;
  };
}

export const MOROCCAN_VOICE_PRESETS = [
  {
    id: 'voice-1',
    title: 'Taille & Inspection Colis (COD)',
    badge: 'Taille & Controle',
    darija: 'عافاك بدل ليا المقاس لـ XL وخلي ليا الكولية حتى نفحصها ونقيسها عاد نخلص الموزع',
    duration: '0:06',
    desc: 'Demande orale de modification de taille + demande de verification du colis avant paiement COD.',
  },
  {
    id: 'voice-2',
    title: 'Confirmation Orale & Adresse',
    badge: 'Confirmation Explicite',
    darija: 'صافي أختي أكدي ليا الطلب وصيفطوه ليا للرباط، زنقة فال ولد عمير حي أكدال',
    duration: '0:05',
    desc: "Confirmation verbale claire declenchant l'outil confirm_order_and_address.",
  },
  {
    id: 'voice-3',
    title: 'Suivi Express de Colis',
    badge: 'Suivi Expedition',
    darija: 'سلام عليكم، فين وصل الكولي ديالي عافاك تعطل شوية؟ رقم التيليفون ديالي هو 0670114455',
    duration: '0:07',
    desc: 'Demande de statut avec mention du numero de telephone.',
  },
  {
    id: 'voice-4',
    title: 'Annulation de Commande',
    badge: 'Annulation',
    darija: 'سمحي ليا أختي راني سافرت ومابقيتش غادي نكون فالدار هاد السيمانة، لغيو الكوموند الله يخليك',
    duration: '0:06',
    desc: 'Annulation polie pour absence declenchant cancel_order.',
  },
];

export const COD_IMAGE_PRESETS = [
  {
    id: 'img-1',
    title: 'Montre Smart Watch S2 Pro',
    category: 'Demande Produit',
    badge: 'Fiche Produit',
    presetHint: 'smart watch s2 pro',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    caption: 'واش متوفرة فهاد اللون الأسود وشحال الثمن النهائي ديالها؟',
    desc: 'Vision AI reconnait la montre connectee AMOLED, cite le prix catalogue (599 MAD) et propose le Pack Duo.',
  },
  {
    id: 'img-2',
    title: 'Robe Traditionnelle Soie Brodee',
    category: 'Demande Essayage',
    badge: 'Mode & Soie',
    presetHint: 'robe traditionnelle soie',
    url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&auto=format&fit=crop&q=80',
    caption: 'عجباتني هاد الجلابة واش نقدرو نقيسوها عند الموزع قبل ما نخلصو؟',
    desc: "Vision AI identifie la robe en crepe de soie et confirme l'essayage gratuit a domicile avant paiement.",
  },
  {
    id: 'img-3',
    title: 'Colis Endommage / Reclamation Qualite',
    category: 'Reclamation Colis',
    badge: 'Garantie Sendit',
    presetHint: 'defect',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    caption: 'وصلاتني الكولية مقطعة ومضروبة، بغيت نبدلها عافاكم',
    desc: 'Vision AI detecte le carton abime, presente les excuses et active un echange gratuit immediat.',
  },
  {
    id: 'img-4',
    title: 'Recu de Virement Bancaire (CIH / Attijari)',
    category: 'Validation Paiement',
    badge: 'Recu Bancaire',
    presetHint: 'receipt',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    caption: 'ها هو وصل التحويل البنكي ديال 399 درهم باش تأكدو الطلب',
    desc: "Vision AI analyse le recu par OCR, extrait le montant et enregistre la commande comme payee d'avance.",
  },
  {
    id: 'img-5',
    title: "Capture d'ecran GPS / Google Maps WhatsApp",
    category: 'Localisation GPS',
    badge: 'Position GPS',
    presetHint: 'gps',
    url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80',
    caption: 'ها هو الموقع ديالي بالضبط فكازا قرب مقهى بالما',
    desc: 'Vision AI analyse les coordonnees geographiques et appelle save_gps_location pour la feuille de route du livreur.',
  },
];
