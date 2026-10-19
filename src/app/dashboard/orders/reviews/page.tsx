'use client';

import React, { useState } from 'react';
import {
  Star,
  Search,
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  User,
  Calendar
} from 'lucide-react';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';

interface CustomerReview {
  id: string;
  orderNumber: string;
  customerName: string;
  city: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  verified: boolean;
}

const REVIEWS_DATA: CustomerReview[] = [
  {
    id: 'rev-1',
    orderNumber: '#AT1033',
    customerName: 'Samira Belkacem',
    city: 'Rabat',
    rating: 5,
    comment: 'Très satisfaite de la rapidité de livraison et de la qualité de la montre ! Le livreur Sendit était très poli.',
    productName: 'Montre Automatique Édition Noire',
    date: '16 Oct 2026',
    verified: true,
  },
  {
    id: 'rev-2',
    orderNumber: '#AT1036',
    customerName: 'Ibtissam Berrada',
    city: 'Fès',
    rating: 5,
    comment: 'Magnifique finition artisanale, emballage très soigné. Arrivé en 24h chrono à Fès.',
    productName: 'Sac à Main Artisanal en Cuir Maroquin',
    date: '15 Oct 2026',
    verified: true,
  },
  {
    id: 'rev-3',
    orderNumber: '#AT1029',
    customerName: 'Reda Mansouri',
    city: 'Casablanca',
    rating: 4,
    comment: 'Produit conforme, taille impeccable. Seul petit bémol le livreur est passé à 13h au lieu du matin.',
    productName: 'White Leather Sneakers Classic',
    date: '14 Oct 2026',
    verified: true,
  },
];

export default function ReviewsPage() {
  const [reviews] = useState<CustomerReview[]>(REVIEWS_DATA);
  const [search, setSearch] = useState('');

  const filteredReviews = reviews.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Avis Clients
                </h1>
                <span className="text-xs font-bold text-slate-400">
                  (Retours & Témoignages)
                </span>
                <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                  ★ 4.9 / 5.0 (98% Satisfaction)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Retours clients collectés automatiquement par WhatsApp après livraison réussie
              </p>
            </div>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher avis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">{rev.customerName}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        Acheteur Vérifié
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {rev.city} • Commande {rev.orderNumber}
                  </span>
                </div>
                <div className="flex items-center text-amber-500 text-xs font-bold">
                  {'★'.repeat(rev.rating)}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                "{rev.comment}"
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span className="font-medium text-slate-600 truncate max-w-[180px]">
                  {rev.productName}
                </span>
                <span>{rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
