'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  MessageSquare,
  Clock,
  ArrowUpRight,
  Sparkles,
  Phone,
  Send
} from 'lucide-react';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface AbandonedCart {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  productName: string;
  productThumbnail: string;
  cartTotal: number;
  abandonedAgo: string;
  whatsappSent: boolean;
}

const INITIAL_CARTS: AbandonedCart[] = [
  {
    id: 'cart-1',
    customerName: 'Zineb Alaoui',
    phone: '0663441199',
    city: 'Casablanca',
    productName: 'Robe Traditionnelle Soie Bordée (Taille M)',
    productThumbnail: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=300&auto=format&fit=crop&q=80',
    cartTotal: 490,
    abandonedAgo: 'Il y a 40 min',
    whatsappSent: false,
  },
  {
    id: 'cart-2',
    customerName: 'Karim Filali',
    phone: '0655118833',
    city: 'Tanger',
    productName: 'Smart Watch S2 Pro Retina (Noir)',
    productThumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    cartTotal: 599,
    abandonedAgo: 'Il y a 2h',
    whatsappSent: true,
  },
  {
    id: 'cart-3',
    customerName: 'Anas Lahlou',
    phone: '0670992255',
    city: 'Marrakech',
    productName: 'White Leather Sneakers Classic 42',
    productThumbnail: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
    cartTotal: 399,
    abandonedAgo: 'Il y a 5h',
    whatsappSent: false,
  },
];

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>(INITIAL_CARTS);
  const [search, setSearch] = useState('');
  const { clearToast } = useOrderLifecycle();
  const [sentToast, setSentToast] = useState<string | null>(null);

  const handleSendRecovery = (id: string, name: string) => {
    setCarts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, whatsappSent: true } : c))
    );
    setSentToast(`Message de relance WhatsApp avec remise de 5% envoyé à ${name}!`);
    setTimeout(() => setSentToast(null), 3500);
  };

  const filteredCarts = carts.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.productName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <OrderLifecycleTabs />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Abandoned Carts
                </h1>
                <span className="text-xs font-bold text-slate-400 font-arabic">
                  (السلات المتروكة)
                </span>
                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded-full border border-rose-200">
                  {carts.length} paniers
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Paniers commencés mais non finalisés sur le formulaire COD • Relance automatique via WhatsApp Bot
              </p>
            </div>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher client, panier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {sentToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{sentToast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Produit Abandonné</th>
                <th className="py-3.5 px-4">Valeur du Panier</th>
                <th className="py-3.5 px-4">Temps Écoulé</th>
                <th className="py-3.5 px-4">Statut Relance</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCarts.map((cart) => (
                <tr key={cart.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <p>{cart.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {cart.phone} • {cart.city}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={cart.productThumbnail}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-semibold text-slate-800 max-w-[220px] line-clamp-1">
                        {cart.productName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{cart.cartTotal} MAD</td>
                  <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cart.abandonedAgo}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {cart.whatsappSent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        WhatsApp Envoyé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        En Attente de Relance
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleSendRecovery(cart.id, cart.customerName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Relancer WhatsApp</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
