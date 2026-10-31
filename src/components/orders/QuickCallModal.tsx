'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Sparkles
} from 'lucide-react';
import { OrderItem } from '@/types/orders';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface QuickCallModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAgentIntervention?: (order: OrderItem) => void;
}

export function QuickCallModal({
  order,
  isOpen,
  onClose,
  onOpenAgentIntervention,
}: QuickCallModalProps) {
  const { confirmOrder, cancelOrder, editOrder, showToast } = useOrderLifecycle();
  const [callNote, setCallNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(order.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOutcome = (outcome: 'CONFIRMED' | 'NO_ANSWER' | 'CALLBACK' | 'CANCELED') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (outcome === 'CONFIRMED') {
      confirmOrder(order.id);
      showToast(`Commande ${order.orderNumber} confirmée avec succès par appel !`, 'success');
    } else if (outcome === 'CANCELED') {
      cancelOrder(order.id, callNote || 'Annulée suite à l’appel téléphonique');
      showToast(`Commande ${order.orderNumber} annulée.`, 'info');
    } else if (outcome === 'NO_ANSWER') {
      editOrder(order.id, {
        customer: {
          name: order.customerName,
          phone: order.phone,
          address: order.address || '',
          city: order.city,
          notes: `Appel sans réponse à ${timestamp}${callNote ? ` - ${callNote}` : ''}`,
        },
      });
      showToast(`Statut "Sans réponse" enregistré pour ${order.orderNumber}`, 'info');
    } else if (outcome === 'CALLBACK') {
      editOrder(order.id, {
        customer: {
          name: order.customerName,
          phone: order.phone,
          address: order.address || '',
          city: order.city,
          notes: `À rappeler vers 16h / plus tard (${timestamp})${
            callNote ? ` - ${callNote}` : ''
          }`,
        },
      });
      showToast(`Rappel programmé pour ${order.orderNumber}`, 'info');
    }

    setIsLogged(true);
    setTimeout(() => {
      setIsLogged(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <PhoneCall className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Appel Rapide Client</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {order.customerName} • {order.city}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Main Dial Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {order.phone}
              </span>
              <button
                onClick={handleCopyPhone}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                title="Copier le numéro"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Article : <strong className="text-slate-900">{order.productName}</strong> • Montant :{' '}
              <span className="font-black text-emerald-700">
                {order.amount} {order.currency}
              </span>
            </p>

            {/* Big Call Button */}
            <a
              href={`tel:${order.phone}`}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Lancer l'appel téléphonique maintenant</span>
            </a>
          </div>

          {/* Quick Outcome Logger */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block">
              Enregistrer le résultat de l'appel en un clic :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOutcome('CONFIRMED')}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Confirmée (Confirmé)</span>
              </button>

              <button
                onClick={() => handleOutcome('CALLBACK')}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">À rappeler (Rappel)</span>
              </button>

              <button
                onClick={() => handleOutcome('NO_ANSWER')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Sans réponse (Injoignable)</span>
              </button>

              <button
                onClick={() => handleOutcome('CANCELED')}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">Annulée (Annulé)</span>
              </button>
            </div>
          </div>

          {/* Custom Note */}
          <div className="space-y-1">
            <textarea
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="Ajouter une note rapide sur l'appel (optionnel)..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Agent Intervention shortcut */}
          {onOpenAgentIntervention && (
            <button
              onClick={() => {
                onClose();
                onOpenAgentIntervention(order);
              }}
              className="w-full py-2 px-3 rounded-xl border border-violet-200 bg-violet-50/70 hover:bg-violet-100 text-violet-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Ou ouvrir l'intervention Agent IA pour envoyer un message</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
