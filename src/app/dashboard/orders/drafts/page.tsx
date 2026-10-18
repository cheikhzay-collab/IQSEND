'use client';

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Send,
  Edit2,
  Calendar,
  User,
  ShoppingBag
} from 'lucide-react';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface DraftOrder {
  id: string;
  draftNumber: string;
  customerName: string;
  phone: string;
  city: string;
  itemsCount: number;
  totalAmount: number;
  lastSaved: string;
}

const INITIAL_DRAFTS: DraftOrder[] = [
  {
    id: 'drf-01',
    draftNumber: '#DFT-1082',
    customerName: 'Yassir Bennani',
    phone: '0661992211',
    city: 'Casablanca',
    itemsCount: 2,
    totalAmount: 420,
    lastSaved: 'Il y a 1 heure',
  },
  {
    id: 'drf-02',
    draftNumber: '#DFT-1083',
    customerName: 'Hafsa Cherkaoui',
    phone: '0672110044',
    city: 'Rabat',
    itemsCount: 1,
    totalAmount: 290,
    lastSaved: 'Il y a 3 heures',
  },
];

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftOrder[]>(INITIAL_DRAFTS);
  const [search, setSearch] = useState('');
  const { confirmOrder } = useOrderLifecycle();

  const filteredDrafts = drafts.filter(
    (d) =>
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.draftNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <div className="md:hidden">
        <OrderLifecycleTabs />
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Draft Orders
                </h1>
                <span className="text-xs font-bold text-slate-400 font-arabic">
                  (المسودات)
                </span>
                <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {drafts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Commandes en cours de saisie par vos agents ou reçues par WhatsApp avant validation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher brouillon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <button
              onClick={() => {}}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Créer Brouillon
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Draft ID</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Ville</th>
                <th className="py-3.5 px-4">Articles</th>
                <th className="py-3.5 px-4">Montant Estimé</th>
                <th className="py-3.5 px-4">Dernière Sauvegarde</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{draft.draftNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{draft.customerName}</p>
                    <p className="text-[10px] text-slate-400">{draft.phone}</p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{draft.city}</td>
                  <td className="py-3.5 px-4 font-medium">{draft.itemsCount} article(s)</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{draft.totalAmount} MAD</td>
                  <td className="py-3.5 px-4 text-slate-500">{draft.lastSaved}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Supprimer le brouillon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
