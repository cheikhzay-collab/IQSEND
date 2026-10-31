'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  MessageSquare,
  ShieldCheck,
  User,
  Calendar,
  Loader2
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

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

export default function ReviewsPage() {
  const { orders, isLoading } = useOrderLifecycle();
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [search, setSearch] = useState('');

  // Extraire les avis réels soumis depuis les commandes en base
  useEffect(() => {
    if (!Array.isArray(orders)) return;

    const realReviews: CustomerReview[] = [];

    for (const o of orders) {
      const comment = o.completed?.reviewComment;
      if (comment && comment.trim().length > 0) {
        realReviews.push({
          id: `rev-${o.id}`,
          orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
          customerName: o.customer?.name || 'Client',
          city: o.customer?.city || 'Maroc',
          rating: o.completed?.reviewScore || 5,
          comment: comment.trim(),
          productName: o.items?.[0]?.name || 'Produit COD',
          date: o.completed?.deliveredAt
            ? new Date(o.completed.deliveredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Récemment',
          verified: true,
        });
      }
    }

    setReviews(realReviews);
  }, [orders]);

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
                  (Retours &amp; Témoignages réels)
                </span>
                <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                  {reviews.length} {reviews.length > 1 ? 'avis collectés' : 'avis collecté'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Retours clients authentiques collectés automatiquement par WhatsApp après livraison Sendit
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

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Chargement des avis clients...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-black text-slate-800">Aucun avis client pour le moment</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Les avis réels des clients s'afficheront ici automatiquement dès qu'ils répondront aux sondages de satisfaction envoyés via WhatsApp après la livraison de leurs colis.
              </p>
            </div>
          </div>
        ) : (
          /* Reviews Cards Grid */
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
        )}
      </div>
    </div>
  );
}
