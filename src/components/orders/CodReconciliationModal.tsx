'use client';

import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { LifecycleOrder } from '@/context/OrderLifecycleContext';

interface CodReconciliationModalProps {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onReconciled?: (orderId: string, virementRef: string, netPayout: number) => void;
}

export function CodReconciliationModal({
  order,
  isOpen,
  onClose,
  onReconciled,
}: CodReconciliationModalProps) {
  const [virementRef, setVirementRef] = useState(`VIR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [bankAccount, setBankAccount] = useState('Attijariwafa Bank (RIB: 007...)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const codAmount = Number(order.payment.amount) || 0;
  const shippingFee = 35; // Standard Sendit fee
  const netPayout = Math.max(0, codAmount - shippingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!virementRef.trim()) {
      setErrorMessage('Veuillez saisir la référence du virement bancaire.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          virementRef: virementRef.trim(),
          bankAccount,
          actor: 'Direction Financière',
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onReconciled) {
          onReconciled(order.id, virementRef.trim(), netPayout);
        }
        onClose();
      } else {
        setErrorMessage(data.error || 'Erreur lors de la réconciliation');
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
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Réconciliation Financière Virement COD
              </h2>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Commande {order.orderNumber} • Client : {order.customer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Financial Breakdown Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Montant COD collecté auprès du client :</span>
              <strong className="font-mono text-slate-900 text-sm">{codAmount.toLocaleString()} MAD</strong>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Frais de livraison Sendit.ma Express :</span>
              <span className="font-mono font-bold text-rose-600">-{shippingFee} MAD</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Net réel à virer sur votre compte :</span>
              <span className="font-mono font-black text-emerald-700 text-base">
                {netPayout.toLocaleString()} MAD
              </span>
            </div>
          </div>

          {/* Virement Reference Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Référence du Virement Sendit (Réf. Virement) *
            </label>
            <div className="relative">
              <FileCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={virementRef}
                onChange={(e) => setVirementRef(e.target.value)}
                placeholder="Ex: VIR-SENDIT-2026-9481"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-emerald-600"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Fourni sur le bordereau de virement bancaire hebdomadaire de Sendit.ma
            </p>
          </div>

          {/* Bank Account Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Compte Bancaire de Réception
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-emerald-600"
              >
                <option value="Attijariwafa Bank (RIB: 007...)">Attijariwafa Bank (Compte Principal)</option>
                <option value="CIH Bank (RIB: 230...)">CIH Bank</option>
                <option value="Bank of Africa / BMCE (RIB: 011...)">Bank of Africa / BMCE</option>
                <option value="Banque Populaire (RIB: 127...)">Banque Populaire</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
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
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Validation...' : 'Valider la Réconciliation & Clôturer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

