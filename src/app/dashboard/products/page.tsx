'use client';

import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  image: string;
  sellingPrice: number;
  costPrice: number;
  deliveryFee: number;
  totalStock: number;
  hubs: {
    casablanca: number;
    fes: number;
    marrakech: number;
    tanger: number;
  };
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  pendingOrders: number;
}

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Smart Watch Ultra Pro S2 (Écran AMOLED & Appels BT)',
    sku: 'SW2-AMOLED-BLK',
    category: 'High-Tech',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 299,
    costPrice: 85,
    deliveryFee: 35,
    totalStock: 142,
    hubs: { casablanca: 75, fes: 32, marrakech: 20, tanger: 15 },
    status: 'IN_STOCK',
    pendingOrders: 18,
  },
  {
    id: 'prod-2',
    name: 'Baggy Denim Jeans Coupe Vintage Brut',
    sku: 'JNS-VNTG-BLU',
    category: 'Mode & Habillement',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 249,
    costPrice: 65,
    deliveryFee: 35,
    totalStock: 68,
    hubs: { casablanca: 40, fes: 18, marrakech: 10, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 12,
  },
  {
    id: 'prod-3',
    name: 'Parfum Royal Amber Boisé 50ml Haute Tenue',
    sku: 'PRF-AMB-50ML',
    category: 'Parfumerie',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 349,
    costPrice: 90,
    deliveryFee: 35,
    totalStock: 9,
    hubs: { casablanca: 5, fes: 4, marrakech: 0, tanger: 0 },
    status: 'LOW_STOCK',
    pendingOrders: 14,
  },
  {
    id: 'prod-4',
    name: 'Kaftan Moderne en Lin Pur Brodé Main',
    sku: 'KFT-LIN-PUR',
    category: 'Artisanat & Mode',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 459,
    costPrice: 150,
    deliveryFee: 35,
    totalStock: 24,
    hubs: { casablanca: 12, fes: 12, marrakech: 0, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 6,
  },
  {
    id: 'prod-5',
    name: 'Pack Sérum Huile d’Argan Bio & Vitamine C 60ml',
    sku: 'BIO-ARG-VITC',
    category: 'Beauté & Soins',
    image: 'https://images.unsplash.com/photo-1608248597359-58b76020556c?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 199,
    costPrice: 42,
    deliveryFee: 35,
    totalStock: 0,
    hubs: { casablanca: 0, fes: 0, marrakech: 0, tanger: 0 },
    status: 'OUT_OF_STOCK',
    pendingOrders: 21,
  },
  {
    id: 'prod-6',
    name: 'Baskets Sneakers Cuir Minimalistes Blanc Pur',
    sku: 'SNK-WHT-LTHR',
    category: 'Chaussures',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
    sellingPrice: 399,
    costPrice: 110,
    deliveryFee: 35,
    totalStock: 53,
    hubs: { casablanca: 30, fes: 13, marrakech: 10, tanger: 0 },
    status: 'IN_STOCK',
    pendingOrders: 8,
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load products directly from Hostinger MySQL Database
  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          const mapped: ProductItem[] = data.products.map((p: any) => ({
            id: p.id || `prod-${Math.random().toString(36).slice(2, 7)}`,
            name: p.name || p.nameAr || 'Produit COD',
            sku: p.sku || 'SKU-UNKNOWN',
            category: p.category || 'High-Tech',
            image: p.image || p.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
            sellingPrice: Number(p.sellingPrice || p.basePrice || 299),
            costPrice: Number(p.costPrice || 80),
            deliveryFee: Number(p.deliveryFee || 35),
            totalStock: Number(p.totalStock ?? p.stockQuantity ?? 50),
            hubs: p.hubs || { casablanca: Number(p.totalStock ?? p.stockQuantity ?? 50), fes: 0, marrakech: 0, tanger: 0 },
            status: (p.totalStock ?? p.stockQuantity ?? 50) > 15 ? 'IN_STOCK' : (p.totalStock ?? p.stockQuantity ?? 50) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
            pendingOrders: p.pendingOrders || 0,
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

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('High-Tech');
  const [newProdPrice, setNewProdPrice] = useState('299');
  const [newProdCost, setNewProdCost] = useState('80');
  const [newProdStock, setNewProdStock] = useState('50');

  // Calculations
  const totalStockValue = products.reduce((acc, p) => acc + p.totalStock * p.costPrice, 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + p.totalStock * p.sellingPrice, 0);
  const lowStockCount = products.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK').length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) return;

    const item: ProductItem = {
      id: `prod-${Date.now()}`,
      name: newProdName,
      sku: newProdSku,
      category: newProdCategory,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
      sellingPrice: parseFloat(newProdPrice) || 299,
      costPrice: parseFloat(newProdCost) || 80,
      deliveryFee: 35,
      totalStock: parseInt(newProdStock) || 0,
      hubs: {
        casablanca: parseInt(newProdStock) || 0,
        fes: 0,
        marrakech: 0,
        tanger: 0,
      },
      status: parseInt(newProdStock) > 15 ? 'IN_STOCK' : parseInt(newProdStock) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
      pendingOrders: 0,
    };

    setProducts([item, ...products]);
    setIsAddModalOpen(false);
    setNewProdName('');
    setNewProdSku('');

    // Persist new product to MySQL Database
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          nameAr: item.name,
          sku: item.sku,
          basePrice: item.sellingPrice,
          costPrice: item.costPrice,
          stockQuantity: item.totalStock,
          category: item.category,
          imageUrl: item.image,
        }),
      }).catch((err) => console.warn('[ProductsPage] DB persistence error:', err));
    } catch {}
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-2">
            <Warehouse className="w-3.5 h-3.5 text-teal-600" />
            Gestion Multi-Hubs Maroc & Sendit Fulfillment
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Produits & Stocks COD
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Catalogue articles, suivi des niveaux d'inventaire par ville et rentabilité unitaire après livraison.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/ai-agents"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Configurer Fiche IA
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-xs font-semibold text-slate-500">Valeur d'Achat en Stock</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalStockValue.toLocaleString()} MAD
          </p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Potentiel vente: {totalPotentialRevenue.toLocaleString()} MAD
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
            Réparties sur 4 hubs Sendit
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
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom de produit, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-teal-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-teal-600 text-slate-700"
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

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Produit & Référence</th>
                <th className="py-3 px-3">Catégorie</th>
                <th className="py-3 px-3">Prix COD</th>
                <th className="py-3 px-3">Coût d'achat</th>
                <th className="py-3 px-3">Marge Brute</th>
                <th className="py-3 px-3 text-center">Stock Global</th>
                <th className="py-3 px-3">Répartition Hubs</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProducts.map((p) => {
                const grossProfit = p.sellingPrice - p.costPrice - p.deliveryFee;
                const marginPercent = Math.round((grossProfit / p.sellingPrice) * 100);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Product */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight max-w-xs">{p.name}</p>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            SKU: {p.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                        {p.category}
                      </span>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {p.sellingPrice} MAD
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-3 text-slate-500">
                      {p.costPrice} MAD
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-3">
                      <span className="text-emerald-700 font-bold">
                        +{grossProfit} MAD
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({marginPercent}% net)
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="text-sm font-black text-slate-900">
                        {p.totalStock}
                      </span>
                      {p.pendingOrders > 0 && (
                        <span className="text-[10px] text-blue-600 font-bold block">
                          {p.pendingOrders} en commande
                        </span>
                      )}
                    </td>

                    {/* Hubs breakdown */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Casablanca Hub">
                          Casa: {p.hubs.casablanca}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Fès Hub">
                          Fès: {p.hubs.fes}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold" title="Marrakech Hub">
                          Kech: {p.hubs.marrakech}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href="/dashboard/ai-agents"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600 transition-colors"
                          title="Fiche IA & Upsell"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Ajouter un Produit</h3>
                  <p className="text-[11px] text-slate-500">Enregistrer dans l'inventaire COD</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nom du Produit
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: T-Shirt Oversize Coton 100%"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    SKU / Référence
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TSH-OVR-BLK"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium bg-white"
                  >
                    <option value="High-Tech">High-Tech</option>
                    <option value="Mode & Habillement">Mode & Habillement</option>
                    <option value="Parfumerie">Parfumerie</option>
                    <option value="Beauté & Soins">Beauté & Soins</option>
                    <option value="Chaussures">Chaussures</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prix de Vente (MAD)
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Coût d'Achat (MAD)
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                >
                  Enregistrer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
