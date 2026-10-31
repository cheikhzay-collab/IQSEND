'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Warehouse,
  Truck,
  DollarSign,
  ArrowUpDown,
  MoreVertical,
  Layers,
  Sparkles,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Check,
  Tag,
  Image as ImageIcon,
  MessageSquare,
  XCircle,
  RotateCcw,
  TrendingDown,
  ShieldAlert
} from 'lucide-react';
import { ProductItem, CATALOG_PRODUCTS } from '@/lib/products-store';
import { ProductEditModal } from '@/components/products/ProductEditModal';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Add Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveSuccessAlert, setSaveSuccessAlert] = useState<string | null>(null);

  // Load products directly from Hostinger MySQL Database
  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          const mapped: ProductItem[] = data.products.map((p: any) => ({
            id: p.id || `prod-${Math.random().toString(36).slice(2, 7)}`,
            name: p.name || 'Produit COD',
            nameAr: p.nameAr || p.name || 'Produit',
            sku: p.sku || 'SKU-UNKNOWN',
            category: p.category || 'High-Tech',
            image: p.image || p.imageUrl || '',
            additionalImages: Array.isArray(p.additionalImages) ? p.additionalImages : [],
            sellingPrice: Number(p.sellingPrice || p.basePrice || 299),
            costPrice: Number(p.costPrice || 80),
            deliveryFee: Number(p.deliveryFee || 35),
            totalStock: Number(p.totalStock ?? p.stockQuantity ?? 50),
            hubs: p.hubs || {
              casablanca: Math.round(Number(p.totalStock ?? p.stockQuantity ?? 50) * 0.6),
              fes: Math.round(Number(p.totalStock ?? p.stockQuantity ?? 50) * 0.25),
              marrakech: Math.round(Number(p.totalStock ?? p.stockQuantity ?? 50) * 0.15),
              tanger: 0,
            },
            status: (p.totalStock ?? p.stockQuantity ?? 50) > 15 ? 'IN_STOCK' : (p.totalStock ?? p.stockQuantity ?? 50) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
            pendingOrders: p.pendingOrders || 0,
            descriptionAr: p.descriptionAr || '',
            keywords: Array.isArray(p.keywords) ? p.keywords : [],
            variants: Array.isArray(p.variants) ? p.variants : [],
            offers: Array.isArray(p.offers) ? p.offers : [],
            agentInstructions: p.agentInstructions || '',
            sellingPoints: Array.isArray(p.sellingPoints) ? p.sellingPoints : [],
            objectionFaqs: Array.isArray(p.objectionFaqs) ? p.objectionFaqs : [],
          }));
          setProducts(mapped);
        }
      } catch (err) {
        console.warn('[ProductsPage] DB fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDbProducts();
  }, []);

  // Save handler passed to ProductEditModal
  const handleSaveProduct = async (savedProduct: ProductItem) => {
    // Optimistic local state update
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === savedProduct.id);
      if (exists) {
        return prev.map((p) => (p.id === savedProduct.id ? savedProduct : p));
      }
      return [savedProduct, ...prev];
    });

    // Call API to persist to MySQL database & in-memory store
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedProduct),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur lors de l enregistrement dans la base MySQL');
    }

    setSaveSuccessAlert(`Produit "${savedProduct.name || savedProduct.nameAr}" enregistré et mis à jour avec succès.`);
    setTimeout(() => setSaveSuccessAlert(null), 5000);
  };

  // Delete handler
  const handleDeleteProduct = async (p: ProductItem) => {
    const confirmDelete = window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${p.name || p.nameAr}" de la base de données ?`);
    if (!confirmDelete) return;

    // Optimistic local update
    setProducts((prev) => prev.filter((item) => item.id !== p.id && item.sku !== p.sku));
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(p.id)}&sku=${encodeURIComponent(p.sku || '')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Échec de la suppression du produit');
      }

      setSaveSuccessAlert(`Produit "${p.name || p.nameAr}" supprimé définitivement avec succès.`);
      setTimeout(() => setSaveSuccessAlert(null), 4000);
    } catch (err: any) {
      console.warn('[ProductsPage] Delete error:', err);
      // Revert if deletion failed
      setProducts((prev) => [...prev, p]);
      setSaveSuccessAlert(`Erreur lors de la suppression : ${err?.message || 'Impossible de supprimer le produit'}`);
      setTimeout(() => setSaveSuccessAlert(null), 5000);
    }
  };

  const { orders } = useOrderLifecycle();
  const [cancellationFilter, setCancellationFilter] = useState<'ALL' | 'CANCELED_CONFIRMATION' | 'RETURNED_DELIVERY' | 'LOW_STOCK'>('ALL');

  // Strict separation of Confirmation Cancellations (0 DH shipping) vs Delivery Returns (Sendit fees)
  const productOrderMetrics = useMemo(() => {
    const map: Record<string, {
      totalOrders: number;
      deliveredCount: number;
      canceledAtConfirmation: number; // Annulés lors de l'appel de confirmation (avant expédition)
      returnedAtDelivery: number;     // Colis refusés / retournés chez le transporteur Sendit
    }> = {};

    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const skuKey = (item.sku || '').toUpperCase().trim();
        const nameKey = (item.name || '').toLowerCase().trim();

        const recordMetric = (key: string) => {
          if (!key) return;
          if (!map[key]) {
            map[key] = { totalOrders: 0, deliveredCount: 0, canceledAtConfirmation: 0, returnedAtDelivery: 0 };
          }
          map[key].totalOrders += (item.quantity || 1);
          if (o.stage === 'CANCELED') {
            map[key].canceledAtConfirmation += (item.quantity || 1);
          } else if (o.stage === 'RETURNED' || (o.stage === 'IN_TRANSIT' && o.shipping?.liveStatus === 'FAILED_ATTEMPT')) {
            map[key].returnedAtDelivery += (item.quantity || 1);
          } else if (o.stage === 'COMPLETED') {
            map[key].deliveredCount += (item.quantity || 1);
          }
        };

        if (skuKey) recordMetric(skuKey);
        if (nameKey) recordMetric(nameKey);
      });
    });

    return map;
  }, [orders]);

  const getMetricsForProduct = (p: ProductItem) => {
    const bySku = p.sku ? productOrderMetrics[p.sku.toUpperCase().trim()] : null;
    const byName = p.name ? productOrderMetrics[p.name.toLowerCase().trim()] : null;
    return bySku || byName || { totalOrders: 0, deliveredCount: 0, canceledAtConfirmation: 0, returnedAtDelivery: 0 };
  };

  const totalCanceledConfirmationUnits = useMemo(() => {
    return orders.filter((o) => o.stage === 'CANCELED').reduce((sum, o) => {
      const q = (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
      return sum + (q || 1);
    }, 0);
  }, [orders]);

  const totalReturnedDeliveryUnits = useMemo(() => {
    return orders.filter((o) => o.stage === 'RETURNED' || (o.stage === 'IN_TRANSIT' && o.shipping?.liveStatus === 'FAILED_ATTEMPT')).reduce((sum, o) => {
      const q = (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
      return sum + (q || 1);
    }, 0);
  }, [orders]);

  // Calculations
  const totalStockValue = products.reduce((acc, p) => acc + p.totalStock * p.costPrice, 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + p.totalStock * p.sellingPrice, 0);
  const lowStockCount = products.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK').length;

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.nameAr || '').toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    const metrics = getMetricsForProduct(p);
    let matchesCancellation = true;
    if (cancellationFilter === 'CANCELED_CONFIRMATION') {
      matchesCancellation = metrics.canceledAtConfirmation > 0;
    } else if (cancellationFilter === 'RETURNED_DELIVERY') {
      matchesCancellation = metrics.returnedAtDelivery > 0;
    } else if (cancellationFilter === 'LOW_STOCK') {
      matchesCancellation = p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK';
    }

    return matchesSearch && matchesCategory && matchesCancellation;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Success Notification Alert */}
      {saveSuccessAlert && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">{saveSuccessAlert}</p>
              <p className="text-[11px] text-emerald-700">Offres, visuels, déclinaisons et directives IA mis à jour avec succès.</p>
            </div>
          </div>
          <button
            onClick={() => setSaveSuccessAlert(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
            <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
            Gestion Multi-Hubs Maroc & Sendit Fulfillment
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Produits & Stocks COD
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Catalogue articles, suivi des stocks par ville, gestion des offres (bundles), variantes et directives de l&apos;agent IA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/ai-agents"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Tester Agent WhatsApp
          </Link>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsEditModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </button>
        </div>
      </div>

      {/* KPI Cards: Stock & Strict Separation between Confirmation Cancellations vs Delivery Returns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Références Actives</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{products.length}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Articles catalogués COD
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Valeur d&apos;Achat Stock</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2 truncate">
            {totalStockValue.toLocaleString()} MAD
          </p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 truncate">
            Vente: {totalPotentialRevenue.toLocaleString()} MAD
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unités Physiques</span>
            <Warehouse className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {products.reduce((acc, p) => acc + p.totalStock, 0)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            En stock dans les Hubs
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alertes Réassort</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{lowStockCount}</p>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Stock critique ou épuisé
          </div>
        </div>

        {/* 1. SEPARATED: Annulations à la confirmation (0 DH de frais Sendit) */}
        <div className="bg-gradient-to-br from-rose-50/70 to-white border border-rose-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">Annulés Confirmation</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{totalCanceledConfirmationUnits}</p>
          <div className="text-[11px] text-rose-800 font-semibold mt-1">
            0 DH frais • Avant expédition
          </div>
        </div>

        {/* 2. SEPARATED: Retours chez le transporteur Sendit (Frais de retour engagés) */}
        <div className="bg-gradient-to-br from-amber-50/70 to-white border border-amber-200 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Retours Transporteur</span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{totalReturnedDeliveryUnits}</p>
          <div className="text-[11px] text-amber-800 font-semibold mt-1">
            Colis refusés • Frais Sendit
          </div>
        </div>
      </div>

      {/* Distinction Filter Tabs & Search */}
      <div className="space-y-3">
        {/* Quick Filter Tabs for Cancellations vs Returns */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setCancellationFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              cancellationFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tous les Produits ({products.length})
          </button>

          <button
            onClick={() => setCancellationFilter('CANCELED_CONFIRMATION')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              cancellationFilter === 'CANCELED_CONFIRMATION'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Articles Annulés à la Confirmation ({products.filter(p => getMetricsForProduct(p).canceledAtConfirmation > 0).length})</span>
          </button>

          <button
            onClick={() => setCancellationFilter('RETURNED_DELIVERY')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              cancellationFilter === 'RETURNED_DELIVERY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Articles avec Retours Transporteur Sendit ({products.filter(p => getMetricsForProduct(p).returnedAtDelivery > 0).length})</span>
          </button>

          <button
            onClick={() => setCancellationFilter('LOW_STOCK')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              cancellationFilter === 'LOW_STOCK'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Stock Faible ({lowStockCount})</span>
          </button>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, arabe, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-emerald-600 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-emerald-600 text-slate-700"
            >
              <option value="ALL">Toutes les catégories</option>
              <option value="High-Tech">High-Tech</option>
              <option value="Mode & Habillement">Mode & Habillement</option>
              <option value="Parfumerie">Parfumerie</option>
              <option value="Artisanat & Mode">Artisanat & Mode</option>
              <option value="Beauté & Soins">Beauté & Soins</option>
              <option value="Chaussures">Chaussures</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Produit, Variantes & IA</th>
                <th className="py-3 px-3">Catégorie</th>
                <th className="py-3 px-3">Prix Unitaire</th>
                <th className="py-3 px-3">Coût d&apos;achat</th>
                <th className="py-3 px-3">Marge Nette</th>
                <th className="py-3 px-3 text-center">Stock Global</th>
                <th className="py-3 px-3">Répartition Hubs</th>
                <th className="py-3 px-3">Annulations vs Retours</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 animate-bounce text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">Chargement du catalogue produits…</p>
                      <p className="text-[11px] text-slate-400">Synchronisation avec la base MySQL</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Aucun produit dans cette sélection.</p>
                      <p className="text-[11px] text-slate-400">Modifiez vos filtres ou ajoutez un nouveau produit.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                const grossProfit = p.sellingPrice - p.costPrice - p.deliveryFee;
                const marginPercent = p.sellingPrice > 0 ? Math.round((grossProfit / p.sellingPrice) * 100) : 0;
                const totalOptions = (p.variants || []).reduce((acc, v) => acc + (v.options?.length || 0), 0);
                const offersCount = p.offers?.length || 0;
                const hasAdditionalImages = p.additionalImages && p.additionalImages.length > 0;
                const metrics = getMetricsForProduct(p);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Product & Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          />
                          {hasAdditionalImages && (
                            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-1 rounded-md shadow-xs">
                              +{p.additionalImages!.length}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight max-w-sm">{p.name}</p>
                          {p.nameAr && (
                            <p className="text-[11px] font-semibold text-slate-600 mt-0.5" dir="rtl">
                              {p.nameAr}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.sku}
                            </span>

                            {offersCount > 0 && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full"
                                title="Offres d'upsell et packs configurés"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {offersCount} Packs / Offres
                              </span>
                            )}

                            {totalOptions > 0 && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
                                title="Variantes de tailles et couleurs"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                {totalOptions} déclinaisons
                              </span>
                            )}

                            {p.agentInstructions && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                                title="Directives personnalisées pour l'Agent IA WhatsApp"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                Directives IA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap">
                        {p.category}
                      </span>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {p.sellingPrice} MAD
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {p.costPrice} MAD
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-emerald-700 font-bold">
                        +{grossProfit} MAD
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({marginPercent}% net)
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900">
                        {p.totalStock}
                      </span>
                      {(p.pendingOrders ?? 0) > 0 && (
                        <span className="text-[10px] text-blue-600 font-bold block">
                          {p.pendingOrders} en commande
                        </span>
                      )}
                    </td>

                    {/* Hubs breakdown */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Casablanca Hub">
                          Casa: {p.hubs?.casablanca ?? p.totalStock}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Fès Hub">
                          Fès: {p.hubs?.fes ?? 0}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Marrakech Hub">
                          Kech: {p.hubs?.marrakech ?? 0}
                        </span>
                      </div>
                    </td>

                    {/* Annulations Confirmation vs Retours Transporteur */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1.5 min-w-[170px]">
                        <div className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border ${
                          metrics.canceledAtConfirmation > 0 
                            ? 'bg-rose-50 text-rose-800 border-rose-200' 
                            : 'bg-slate-50/80 text-slate-400 border-slate-100'
                        }`}>
                          <span className="flex items-center gap-1 font-semibold">
                            <XCircle className={`w-3 h-3 ${metrics.canceledAtConfirmation > 0 ? 'text-rose-600' : 'text-slate-300'}`} />
                            <span>Annulé Confirmation:</span>
                          </span>
                          <span className="font-black bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {metrics.canceledAtConfirmation} <span className="text-[9px] font-normal text-slate-400">(0 DH)</span>
                          </span>
                        </div>

                        <div className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-lg border ${
                          metrics.returnedAtDelivery > 0 
                            ? 'bg-amber-50 text-amber-900 border-amber-200' 
                            : 'bg-slate-50/80 text-slate-400 border-slate-100'
                        }`}>
                          <span className="flex items-center gap-1 font-semibold">
                            <RotateCcw className={`w-3 h-3 ${metrics.returnedAtDelivery > 0 ? 'text-amber-600' : 'text-slate-300'}`} />
                            <span>Retour Transporteur:</span>
                          </span>
                          <span className="font-black bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {metrics.returnedAtDelivery} <span className="text-[9px] font-normal text-amber-700">(Sendit)</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {p.status === 'IN_STOCK' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disponible
                        </span>
                      ) : p.status === 'LOW_STOCK' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Stock Faible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Rupture
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Modifier le produit, offres, images, variantes et directives IA"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer / Désactiver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full 5-Tab Interactive Product Editor Modal */}
      <ProductEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
