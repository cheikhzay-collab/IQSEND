'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Banknote,
  FileText,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { TrackingOrder } from '@/types';

interface OrderEditModalProps {
  order: TrackingOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: 'EDIT' | 'DELETE', message: string) => void;
}

export function OrderEditModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: OrderEditModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber]   = useState('');
  const [city, setCity]                 = useState('');
  const [address, setAddress]           = useState('');
  const [totalAmount, setTotalAmount]   = useState<number>(0);
  const [notes, setNotes]               = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setPhoneNumber(order.phoneNumber || '');
      setCity(order.city || '');
      setAddress(order.address || '');
      setTotalAmount(order.totalAmount || 0);
      setNotes('');
      setErrorMessage(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const isPreSendit =
    order.shipmentStatus === 'READY_FOR_PICKUP' ||
    order.leadStatus === 'CONFIRMED' ||
    order.leadStatus === 'PACKING';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      setErrorMessage('Le nom et le numéro de téléphone sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/tracking/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          city: city.trim(),
          address: address.trim(),
          totalAmount: Number(totalAmount),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess('EDIT', data.message || 'Commande modifiée avec succès.');
        onClose();
      } else {
        setErrorMessage(data.error || 'Erreur lors de la modification.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmMsg =
      `Êtes-vous certain de vouloir annuler et supprimer la commande ${order.orderNumber} ?\n` +
      `- Le bordereau Sendit sera annulé\n` +
      `- Le stock réservé sera immédiatement libéré`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/tracking/manage?orderId=${encodeURIComponent(order.id)}&reason=${encodeURIComponent('Supprimé par le manager')}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        onSuccess('DELETE', data.message || 'Commande annulée et stock libéré avec succès.');
        onClose();
      } else {
        setErrorMessage(data.error || "Erreur lors de l'annulation.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur réseau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/80 text-white px-2 py-0.5 rounded-md">
              Espace Manager
            </span>
            <span className="text-xs text-indigo-200">
              {isPreSendit ? 'Étape pré-ramassage (Modifiable)' : 'Commande en cours de transport'}
            </span>
          </div>

          <h2 className="text-lg font-black mt-1">Modifier la commande {order.orderNumber}</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            AWB: <span className="font-mono">{order.trackingNumber}</span> • {order.productName} (Qté: {order.productQuantity})
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Customer Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nom complet du client :
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Numéro de téléphone :
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* City & COD Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ville de destination :
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Montant COD (MAD) :
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-emerald-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adresse complète de livraison :
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Note interne du manager (Audit Log) :
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Changement de créneau suite à l'accord du client..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Buttons Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors disabled:opacity-50"
              title="Annuler définitivement la commande et libérer le stock réservé"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Annuler la commande</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Fermer
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

