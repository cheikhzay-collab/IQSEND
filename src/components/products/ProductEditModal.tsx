'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Image as ImageIcon,
  Layers,
  Tag,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Warehouse,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldCheck,
  Percent
} from 'lucide-react';
import {
  ProductItem,
  ProductVariantGroup,
  ProductOfferBundle,
  ProductObjectionFaq
} from '@/lib/products-store';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onSave: (savedProduct: ProductItem) => Promise<void> | void;
}

type TabType = 'general' | 'images' | 'variants' | 'offers' | 'ai_directives';

export function ProductEditModal({
  isOpen,
  onClose,
  product,
  onSave,
}: ProductEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('High-Tech');
  const [sellingPrice, setSellingPrice] = useState(299);
  const [costPrice, setCostPrice] = useState(80);
  const [deliveryFee, setDeliveryFee] = useState(35);
  const [totalStock, setTotalStock] = useState(50);
  const [hubs, setHubs] = useState({ casablanca: 30, fes: 10, marrakech: 10, tanger: 0 });
  const [descriptionAr, setDescriptionAr] = useState('');

  // Media
  const [image, setImage] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Variants
  const [variants, setVariants] = useState<ProductVariantGroup[]>([]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');

  // Offers
  const [offers, setOffers] = useState<ProductOfferBundle[]>([]);

  // AI Directives
  const [agentInstructions, setAgentInstructions] = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [objectionFaqs, setObjectionFaqs] = useState<ProductObjectionFaq[]>([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Populate state on open / product change
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setNameAr(product.nameAr || product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || 'High-Tech');
      setSellingPrice(product.sellingPrice || 299);
      setCostPrice(product.costPrice || 80);
      setDeliveryFee(product.deliveryFee || 35);
      setTotalStock(product.totalStock || 0);
      setHubs(product.hubs || { casablanca: product.totalStock || 0, fes: 0, marrakech: 0, tanger: 0 });
      setDescriptionAr(product.descriptionAr || '');
      setImage(product.image || '');
      setAdditionalImages(product.additionalImages || []);
      setVariants(product.variants || [
        { type: 'size', name: 'Taille', options: ['M', 'L', 'XL'] },
        { type: 'color', name: 'Couleur', options: ['Noir', 'Blanc'] },
      ]);
      setOffers(product.offers || [
        { id: 'off-1', title: 'Offre 1 Pièce', quantity: 1, priceMad: product.sellingPrice || 299, isDefault: true },
        { id: 'off-2', title: 'Pack Duo (2 Pièces)', quantity: 2, priceMad: Math.round((product.sellingPrice || 299) * 1.7), discountPercent: 15, badge: 'Plus Populaire - Livraison Gratuite' },
      ]);
      setAgentInstructions(product.agentInstructions || '');
      setSellingPoints(product.sellingPoints || []);
      setObjectionFaqs(product.objectionFaqs || []);
    } else {
      // New product defaults
      setName('');
      setNameAr('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('High-Tech');
      setSellingPrice(299);
      setCostPrice(80);
      setDeliveryFee(35);
      setTotalStock(50);
      setHubs({ casablanca: 30, fes: 10, marrakech: 10, tanger: 0 });
      setDescriptionAr('');
      setImage('');
      setAdditionalImages([]);
      setVariants([
        { type: 'size', name: 'Taille', options: ['M', 'L', 'XL'] },
        { type: 'color', name: 'Couleur', options: ['Noir', 'Blanc'] },
      ]);
      setOffers([
        { id: 'off-1', title: 'Offre 1 Pièce', quantity: 1, priceMad: 299, isDefault: true },
        { id: 'off-2', title: 'Pack Duo (2 Pièces)', quantity: 2, priceMad: 499, discountPercent: 17, badge: 'Plus Populaire - Livraison Gratuite' },
      ]);
      setAgentInstructions('Mettre en avant la haute qualité du produit, la rapidité de livraison et le paiement cash à la livraison après inspection.');
      setSellingPoints(['Livraison rapide et gratuite dans tout le Maroc', 'Qualité supérieure et garantie d échange']);
      setObjectionFaqs([
        { question: 'Est-ce que je peux vérifier le produit avant de payer ?', answer: 'Absolument ! Vous inspectez votre colis avant de régler le livreur.' },
      ]);
    }
    setActiveTab('general');
    setErrorMsg(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Margin Calculation
  const grossProfit = sellingPrice - costPrice - deliveryFee;
  const marginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;

  // Add / Remove Variant Options
  const handleAddOptionToVariant = (groupType: 'size' | 'color', val: string) => {
    if (!val.trim()) return;
    setVariants((prev) => {
      const idx = prev.findIndex((g) => g.type === groupType);
      if (idx >= 0) {
        const copy = [...prev];
        if (!copy[idx].options.includes(val.trim())) {
          copy[idx] = { ...copy[idx], options: [...copy[idx].options, val.trim()] };
        }
        return copy;
      } else {
        return [
          ...prev,
          {
            type: groupType,
            name: groupType === 'size' ? 'Taille' : 'Couleur',
            options: [val.trim()],
          },
        ];
      }
    });
  };

  const handleRemoveOption = (groupType: 'size' | 'color', optionToRemove: string) => {
    setVariants((prev) =>
      prev.map((g) => {
        if (g.type === groupType) {
          return { ...g, options: g.options.filter((o) => o !== optionToRemove) };
        }
        return g;
      })
    );
  };

  // Add / Remove Offer
  const handleAddOffer = () => {
    const nextQty = offers.length + 1;
    const estPrice = Math.round(sellingPrice * nextQty * 0.82);
    setOffers([
      ...offers,
      {
        id: `off-${Date.now()}`,
        title: `Pack ${nextQty} Pièces`,
        quantity: nextQty,
        priceMad: estPrice,
        discountPercent: 18,
        badge: 'Remise Spéciale + Livraison Gratuite',
      },
    ]);
  };

  const handleRemoveOffer = (offerId: string) => {
    setOffers(offers.filter((o) => o.id !== offerId));
  };

  const handleUpdateOffer = (offerId: string, updates: Partial<ProductOfferBundle>) => {
    setOffers(offers.map((o) => (o.id === offerId ? { ...o, ...updates } : o)));
  };

  // AI Directives handlers
  const handleAddSellingPoint = () => {
    if (!newSellingPoint.trim()) return;
    setSellingPoints([...sellingPoints, newSellingPoint.trim()]);
    setNewSellingPoint('');
  };

  const handleRemoveSellingPoint = (idx: number) => {
    setSellingPoints(sellingPoints.filter((_, i) => i !== idx));
  };

  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setObjectionFaqs([...objectionFaqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }]);
    setNewFaqQ('');
    setNewFaqA('');
  };

  const handleRemoveFaq = (idx: number) => {
    setObjectionFaqs(objectionFaqs.filter((_, i) => i !== idx));
  };

  // Save submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      setErrorMsg('Veuillez renseigner le nom et le SKU du produit.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload: ProductItem = {
      id: product?.id || `prod-${Date.now()}`,
      name: name.trim(),
      nameAr: nameAr.trim() || name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      image,
      additionalImages,
      sellingPrice: Number(sellingPrice),
      costPrice: Number(costPrice),
      deliveryFee: Number(deliveryFee),
      totalStock: Number(totalStock),
      hubs,
      status: Number(totalStock) > 15 ? 'IN_STOCK' : Number(totalStock) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
      pendingOrders: product?.pendingOrders || 0,
      descriptionAr: descriptionAr.trim(),
      keywords: [name.toLowerCase(), (nameAr || '').toLowerCase(), sku.toLowerCase()],
      variants,
      offers,
      agentInstructions: agentInstructions.trim(),
      sellingPoints,
      objectionFaqs,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l enregistrement du produit');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-black">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {product ? 'Modifier la Fiche Produit & Directives IA' : 'Nouveau Produit & Configuration COD'}
                </h2>
                <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
                  {sku || 'SKU'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Paramétrage complet : Offres packs, images, variantes (tailles/couleurs) et consignes pour l'agent IA WhatsApp.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-slate-50/70 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'general', label: '1. Général & Prix', icon: Package, badge: `${sellingPrice} MAD` },
            { id: 'images', label: '2. Images & Galerie', icon: ImageIcon, badge: additionalImages.length > 0 ? `+${additionalImages.length}` : undefined },
            { id: 'variants', label: '3. Variantes & Tailles', icon: Layers, badge: variants.reduce((acc, g) => acc + g.options.length, 0) },
            { id: 'offers', label: '4. Offres & Packs Promo', icon: Tag, badge: `${offers.length} Offres` },
            { id: 'ai_directives', label: '5. Directives Agent IA', icon: Sparkles, badge: 'Darija Agent' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ═══════════ TAB 1: GENERAL & PRIX ═══════════ */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nom du Produit (Français) *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Smart Watch Ultra Pro S2"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nom en Arabe / Darija (Client & WhatsApp) *
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="Smart Watch Ultra avec appels Bluetooth..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Référence SKU Unique *
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="SW2-AMOLED-BLK"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="High-Tech">High-Tech & Gadgets</option>
                    <option value="Mode & Habillement">Mode & Habillement</option>
                    <option value="Chaussures">Chaussures & Sneakers</option>
                    <option value="Parfumerie">Parfumerie & Fragrances</option>
                    <option value="Beauté & Soins">Beauté & Soins</option>
                    <option value="Artisanat & Mode">Artisanat Marocain & Caftans</option>
                    <option value="Maison & Décoration">Maison & Décoration</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Price & Economics Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Structure de Prix & Rentabilité Unitaire COD
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Marge Nette : +{grossProfit} MAD ({marginPercent}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Prix de Vente (MAD)
                    </label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Coût d'Achat Produit (MAD)
                    </label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Frais de Livraison Estimés (MAD)
                    </label>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Hub Stock */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    Inventaire Multi-Hubs Maroc (Total : {totalStock} unités)
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: 'casablanca', label: 'Casablanca (Central)' },
                    { key: 'fes', label: 'Fès Hub' },
                    { key: 'marrakech', label: 'Marrakech Hub' },
                    { key: 'tanger', label: 'Tanger Hub' },
                  ].map((hub) => (
                    <div key={hub.key} className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">{hub.label}</span>
                      <input
                        type="number"
                        value={(hubs as any)[hub.key] || 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          const nextHubs = { ...hubs, [hub.key]: val };
                          setHubs(nextHubs);
                          setTotalStock(
                            nextHubs.casablanca + nextHubs.fes + nextHubs.marrakech + nextHubs.tanger
                          );
                        }}
                        className="w-full mt-1 text-xs font-bold p-1 border-b border-slate-200 focus:border-blue-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description Commerciale (Darija / Français pour WhatsApp & Landing Page)
                </label>
                <textarea
                  rows={3}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  placeholder="Rédigez une description attractive présentant les avantages du produit..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ═══════════ TAB 2: IMAGES & GALERIE ═══════════ */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Photo Principale du Produit (URL) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Main Image Preview */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <img
                  src={image || 'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp'}
                  alt="Aperçu"
                  className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Photo de Couverture Principale</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Cette photo apparaît en tête de liste, dans le catalogue WhatsApp envoyé au client, et sur le bordereau de livraison.
                  </p>
                </div>
              </div>

              {/* Additional Gallery Images */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Galerie de Photos Secondaires ({additionalImages.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Photos sous différents angles, couleurs ou en situation réelle
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Coller l'URL d'une nouvelle photo (Shopify, Imgur, CDN...)"
                    className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newImageUrl.trim()) {
                        setAdditionalImages([...additionalImages, newImageUrl.trim()]);
                        setNewImageUrl('');
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter Photo
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {additionalImages.map((imgUrl, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                      <img src={imgUrl} alt={`Galerie ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAdditionalImages(additionalImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: VARIANTES DU PRODUIT ═══════════ */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Gestion des Variantes COD :</span> Les options configurées ici (Tailles et Couleurs) sont proposées automatiquement par l'agent IA lors des conversations WhatsApp pour affiner la commande du client avant validation.
                </div>
              </div>

              {/* Sizes Group */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Tailles Disponibles</span>
                    <span className="text-[11px] text-slate-500">Exemples : S, M, L, XL, XXL ou 39, 40, 41, 42, 43</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {variants
                    .find((g) => g.type === 'size')
                    ?.options.map((sz) => (
                      <span
                        key={sz}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        {sz}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption('size', sz)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    placeholder="Ajouter une taille (Ex: XL ou 42)"
                    className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleAddOptionToVariant('size', newSizeInput);
                      setNewSizeInput('');
                    }}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>

              {/* Colors Group */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Couleurs Disponibles</span>
                    <span className="text-[11px] text-slate-500">Exemples : Noir, Blanc, Bleu Ciel, Marron, Kaki</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {variants
                    .find((g) => g.type === 'color')
                    ?.options.map((col) => (
                      <span
                        key={col}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                        {col}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption('color', col)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    placeholder="Ajouter une couleur (Ex: Bleu Nuit ou Noir)"
                    className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleAddOptionToVariant('color', newColorInput);
                      setNewColorInput('');
                    }}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 4: OFFRES & PACKS PROMO (UPSELL) ═══════════ */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Offres & Packs d'Upsell (WhatsApp & Formulaire COD)</h3>
                  <p className="text-[11px] text-slate-500">
                    L'Agent IA propose ces offres aux clients pour augmenter le panier moyen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOffer}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une Offre Promo
                </button>
              </div>

              <div className="space-y-3">
                {offers.map((offer, idx) => (
                  <div
                    key={offer.id || idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={offer.title}
                          onChange={(e) => handleUpdateOffer(offer.id, { title: e.target.value })}
                          className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 w-64"
                          placeholder="Titre de l'offre (Ex: Pack Duo)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOffer(offer.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Supprimer cette offre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Quantité de Pièces
                        </label>
                        <input
                          type="number"
                          value={offer.quantity}
                          onChange={(e) =>
                            handleUpdateOffer(offer.id, { quantity: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Prix Total du Pack (MAD)
                        </label>
                        <input
                          type="number"
                          value={offer.priceMad}
                          onChange={(e) =>
                            handleUpdateOffer(offer.id, { priceMad: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl font-bold text-blue-700"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Badge d'Urgence / Avantage
                        </label>
                        <input
                          type="text"
                          value={offer.badge || ''}
                          onChange={(e) => handleUpdateOffer(offer.id, { badge: e.target.value })}
                          placeholder="Ex: Économisez 100 MAD + Livraison Gratuite"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl text-emerald-700 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ TAB 5: DIRECTIVES AGENT IA ═══════════ */}
          {activeTab === 'ai_directives' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Directives Agent IA (AI Prompt & Base de Connaissances) :</span> Définissez le comportement et les arguments de l'Agent IA pour ce produit lors des échanges WhatsApp.
                </div>
              </div>

              {/* Custom Agent Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Directives & Consignes Spécifiques pour l'Agent
                </label>
                <textarea
                  rows={4}
                  value={agentInstructions}
                  onChange={(e) => setAgentInstructions(e.target.value)}
                  placeholder="Ex: Mettre en avant la haute qualité, proposer le pack duo comme cadeau, rassurer sur les échanges de taille gratuits..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Selling Points */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Arguments de Vente Clés (Points Forts)
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sellingPoints.map((sp, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-slate-800 font-medium">{sp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSellingPoint(i)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newSellingPoint}
                    onChange={(e) => setNewSellingPoint(e.target.value)}
                    placeholder="Ajouter un argument de vente (Ex: Écran AMOLED lisible en plein soleil...)"
                    className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddSellingPoint}
                    className="px-3.5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>

              {/* Objection Handling FAQs */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Réponses Types aux Objections Fréquentes
                </span>

                <div className="space-y-2">
                  {objectionFaqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 relative text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 w-full pr-6">
                          ❓ {faq.question}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(i)}
                          className="text-slate-400 hover:text-rose-600 shrink-0 absolute top-2.5 right-2.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg">
                        💬 {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <input
                    type="text"
                    value={newFaqQ}
                    onChange={(e) => setNewFaqQ(e.target.value)}
                    placeholder="Question ou objection client (Ex: Est-ce que le prix est négociable ?)"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <textarea
                    rows={2}
                    value={newFaqA}
                    onChange={(e) => setNewFaqA(e.target.value)}
                    placeholder="Réponse convaincante de l'agent en Darija ou Français..."
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter l'objection et sa réponse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {product ? 'Mise à jour directe dans MySQL & Store IA' : 'Nouveau produit enregistré dans MySQL'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {product ? 'Enregistrer les Modifications' : 'Créer le Produit'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
