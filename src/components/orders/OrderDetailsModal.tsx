'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Printer,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  ExternalLink,
  Truck
} from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/orders';

interface OrderDetailsModalProps {
  order: OrderItem | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onSendWhatsApp: (order: OrderItem, message: string) => void;
}

export function OrderDetailsModal({
  order,
  onClose,
  onStatusChange,
  onSendWhatsApp,
}: OrderDetailsModalProps) {
  const [customMsg, setCustomMsg] = useState(
    order
      ? `السلام عليكم ${order.customerName}، معكم خدمة تأكيد الطلبات بخصوص طلبكم #${order.orderNumber} لـ ${order.productName}. واش نأكدو معكم الإرسال إلى ${order.city}؟`
      : ''
  );
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-black text-sm">
              COD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">{order.orderNumber}</h3>
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="Copier le numéro"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Créé il y a {order.timeAgo} • Destination: <strong className="text-slate-700">{order.city}, Maroc</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Status Bar & Quick Switcher */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Statut Actuel
              </span>
              <span className="text-xs font-black text-slate-800">
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-teal-600"
              >
                <option value="NEW_ORDERS">Nouveaux (New Orders)</option>
                <option value="CONFIRMED">Confirmé (Confirmed)</option>
                <option value="PACKING">En Packing</option>
                <option value="SHIPPED">Expédié (Shipped)</option>
                <option value="DELIVERED">Livré & Payé (Delivered)</option>
              </select>
            </div>
          </div>

          {/* Product & Payment Grid */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white">
            <img
              src={order.productThumbnail}
              alt={order.productName}
              className="w-16 h-16 rounded-xl object-cover border border-slate-100"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-900 block">{order.productName}</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-black text-teal-700">
                  {order.amount} {order.currency}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {order.badgeLabel || order.badgeType}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Coordonnées Client & Livraison
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 text-[11px] block">Client</span>
                <span className="font-bold text-slate-800">{order.customerName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 text-[11px] block">Téléphone</span>
                <a href={`tel:${order.phone}`} className="font-bold text-teal-700 hover:underline">
                  {order.phone}
                </a>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 col-span-2">
                <span className="text-slate-400 text-[11px] block">Ville & Adresse</span>
                <span className="font-bold text-slate-800">
                  {order.city}, Maroc {order.address ? `— ${order.address}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Action in Darija */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Message WhatsApp Rapide (Darija)</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Gemini COD
              </span>
            </div>

            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              rows={3}
              dir="rtl"
              className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 bg-white text-slate-800 focus:outline-emerald-600 font-sans"
            />

            <button
              onClick={() => onSendWhatsApp(order, customMsg)}
              className="w-full bg-[#25D366] hover:bg-[#20be5a] text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer sur WhatsApp ({order.phone})
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer Bon de Commande
          </button>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
