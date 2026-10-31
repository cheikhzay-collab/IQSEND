'use client';

import React, { useState } from 'react';
import {
  Package,
  RotateCcw,
  CheckCircle2,
  X,
  ScanLine,
  User,
  AlertTriangle,
  Warehouse
} from 'lucide-react';
import { LifecycleOrder } from '@/context/OrderLifecycleContext';

interface PhysicalReturnModalProps {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onReceived?: (orderId: string) => void;
}

export function PhysicalReturnModal({
  order,
  isOpen,
  onClose,
  onReceived,
}: PhysicalReturnModalProps) {
  const [inspectorName, setInspectorName] = useState('Youssef - Magasinier Hub Casablanca');
  const [notes, setNotes] = useState('Colis retourné inspecté physiquement, article intact et réintégré au stock.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/orders/returns/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          inspectorName,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onReceived) onReceived(order.id);
        onClose();
      } else {
        setErrorMessage(data.error || 'Erreur lors de la réception');
      }
    } catch (err: any) {
      setErrorMessage('Erreur réseau: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Réception Physique du Colis au Stock
              </h2>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Vérification réelle avant réintégration de l'inventaire dans la base
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-rose-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Règle de Gestion Stock :</strong> Ne réintégrez un article que si le carton est physiquement entre vos mains dans l'entrepôt et son contenu vérifié intact.
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Commande :</span>
              <span className="font-mono font-black text-slate-900">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Client :</span>
              <span className="font-semibold text-slate-800">{order.customer.name} ({order.customer.city})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Article à réintégrer :</span>
              <span className="font-bold text-blue-800">
                {order.items[0]?.name} (Qté: {order.items[0]?.quantity || 1})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>Code Suivi Sendit :</span>
              <span>{order.shipping?.trackingNumber || 'SND-RETOUR'}</span>
            </div>
          </div>

          {/* Inspector Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Nom de l'agent / Magasinier réceptionnaire
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-rose-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Constat d'inspection physique
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-500"
            />
          </div>

          {errorMessage && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Warehouse className="w-4 h-4" />
              <span>{isSubmitting ? 'Mise à jour...' : 'Confirmer & Réintégrer au Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

