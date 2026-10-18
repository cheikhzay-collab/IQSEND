'use client';

import React, { useState } from 'react';
import { X, Plus, Package, MapPin, Phone, User, DollarSign } from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/orders';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (order: OrderItem) => void;
}

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Mohammedia',
  'El Jadida',
  'Nador',
  'Béni Mellal',
];

export function CreateOrderModal({
  isOpen,
  onClose,
  onCreate,
}: CreateOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('06');
  const [city, setCity] = useState('Casablanca');
  const [address, setAddress] = useState('');
  const [productName, setProductName] = useState('Smart Watch S2');
  const [amount, setAmount] = useState('299');
  const [status, setStatus] = useState<OrderStatus>('PENDING_CONFIRMATION');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !productName.trim()) return;

    const newOrder: OrderItem = {
      id: `order-${Date.now()}`,
      orderNumber: `#AT${Math.floor(1000 + Math.random() * 9000)}`,
      status,
      badgeType: 'COD PENDING',
      amount: parseFloat(amount) || 299,
      currency: 'MAD',
      productName,
      productThumbnail:
        productName.toLowerCase().includes('watch')
          ? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80'
          : productName.toLowerCase().includes('perfume')
          ? 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80'
          : productName.toLowerCase().includes('jeans')
          ? 'https://images.unsplash.com/photo-1542272604-780c96856592?w=300&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=80',
      customerName,
      city,
      countryCode: 'MA',
      phone,
      address,
      timeAgo: '• NOW',
      assignedAgent: {
        type: 'initial',
        value: 'A',
        bgClass: 'bg-[#7c3aed]',
      },
    };

    onCreate(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#135d54] text-white flex items-center justify-center font-black shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Nouvelle Commande COD</h3>
              <p className="text-[11px] text-slate-500">Ajouter directement au pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nom du Client
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: Salma R."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Téléphone (Maroc)
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ville
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium bg-white"
              >
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adresse Complète (Optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Boulevard Mohammed V, N° 12"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Article / Produit
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Smart Watch S2"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Montant COD (MAD)
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Colonne de départ
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-teal-600 font-medium bg-white"
            >
              <option value="PENDING_CONFIRMATION">1. En attente de confirmation</option>
              <option value="PROCESSING">2. En préparation</option>
              <option value="IN_TRANSIT">3. En cours de livraison</option>
              <option value="COMPLETED">4. Livrées & Encaissées</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black bg-[#135d54] hover:bg-[#0f4a42] text-white rounded-lg shadow-sm transition-colors"
            >
              Enregistrer Commande
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
