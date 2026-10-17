'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Phone,
  MapPin,
  ExternalLink,
  Barcode,
  QrCode
} from 'lucide-react';
import { LifecycleOrder } from '@/context/OrderLifecycleContext';

// ── 1. SHIPPING LABEL MODAL (WAYBILL / BORDEREAU DE LIVRAISON) ──────────
export function ShippingLabelModal({
  order,
  isOpen,
  onClose,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Bordereau d’Expédition Sendit (AWB) — {order.orderNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Label Paper */}
        <div className="p-6">
          <div className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-4 font-mono text-xs shadow-inner">
            {/* Top Bar with Courier Logo & Barcode */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <span className="text-xl font-black tracking-tighter text-slate-900 font-sans block">
                  SENDIT.MA
                </span>
                <span className="text-[10px] text-slate-500 font-sans uppercase font-bold tracking-wider">
                  Express COD Logistics
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black block font-sans">
                  {order.shipping?.courier || 'Sendit.ma Express'}
                </span>
                <span className="text-sm font-black text-slate-900 tracking-wider">
                  {order.shipping?.trackingNumber || 'SND-819204'}
                </span>
              </div>
            </div>

            {/* Barcode Simulated Graphics */}
            <div className="py-2 text-center border-b border-dashed border-slate-300">
              <div className="flex justify-center items-center gap-1 h-12 bg-slate-50 p-2 rounded">
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-2 h-full bg-slate-900" />
                <div className="w-1 h-full bg-slate-900" />
                <div className="w-3 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-2.5 h-full bg-slate-900" />
                <div className="w-1 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-3 h-full bg-slate-900" />
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-2 h-full bg-slate-900" />
              </div>
              <span className="text-[11px] font-bold tracking-widest text-slate-700">
                *{order.shipping?.trackingNumber || 'SND-819204'}*
              </span>
            </div>

            {/* Sender & Receiver Grid */}
            <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-3 font-sans">
              <div className="border-r border-slate-200 pr-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Expéditeur (From)
                </span>
                <p className="font-bold text-xs text-slate-900">EGROW STORE (Sendit Hub)</p>
                <p className="text-[11px] text-slate-600">Hub Central Ain Sebaa</p>
                <p className="text-[11px] text-slate-600">Casablanca, Maroc</p>
                <p className="text-[11px] text-slate-600">Tél: 0522-001122</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Destinataire (To)
                </span>
                <p className="font-bold text-xs text-slate-900">{order.customer.name}</p>
                <p className="text-[11px] text-slate-700 font-semibold">{order.customer.phone}</p>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  {order.customer.address}
                </p>
                <p className="text-[11px] font-black text-slate-900 mt-1 uppercase">
                  Ville: {order.customer.city}
                </p>
              </div>
            </div>

            {/* Big COD Cash Block */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between font-sans">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Mode de Paiement / Mode de Règlement
                </span>
                <span className="text-base font-black text-amber-950">
                  {order.payment.method === 'COD' ? 'CASH ON DELIVERY (نقداً عند الاستلام)' : 'PRÉPAYÉ (PAID)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Montant à Encaisser
                </span>
                <span className="text-xl font-black text-amber-950">
                  {order.payment.method === 'COD' ? `${order.payment.amount} MAD` : '0.00 MAD'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="font-sans">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Contenu du Colis ({order.items.length} article(s))
              </span>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                  <tr>
                    <th className="p-1.5">Article</th>
                    <th className="p-1.5 text-center">Qté</th>
                    <th className="p-1.5 text-right">Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5">
                        <span className="font-bold">{item.name}</span>
                        {item.size && (
                          <span className="text-[10px] text-slate-500 ml-1">
                            [{item.size}]
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-1.5 text-right font-semibold">
                        {item.price} {order.payment.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Notice */}
            <div className="pt-2 text-[10px] text-slate-400 text-center font-sans">
              En cas de non-livraison ou refus, retourner au Hub Central Sendit Casablanca.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. INVOICE MODAL (FACTURE COMMERCIALE) ──────────────────────────────
export function InvoiceModal({
  order,
  isOpen,
  onClose,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Facture / Bon de Vente — {order.orderNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black text-slate-900">EGROW E-COMMERCE</h2>
              <p className="text-slate-500 text-[11px]">R.C. 549102 • IF: 38291044 • ICE: 002948190000041</p>
              <p className="text-slate-500 text-[11px]">Casablanca, Maroc</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900">
                {order.fulfillment?.invoiceNumber || `INV-2026-${order.orderNumber.replace('#', '')}`}
              </span>
              <p className="text-slate-500 text-[11px]">Date: {order.fulfillment?.invoiceDate || '17 Oct 2026'}</p>
              <p className="text-slate-500 text-[11px]">Réf: {order.orderNumber}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Facturé à
            </span>
            <p className="font-bold text-slate-900">{order.customer.name}</p>
            <p className="text-slate-600">{order.customer.phone}</p>
            <p className="text-slate-600">{order.customer.address}, {order.customer.city}</p>
          </div>

          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2 text-center">Qté</th>
                <th className="py-2 text-right">Prix Unitaire</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 font-medium text-slate-900">{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{item.price} MAD</td>
                  <td className="py-2 text-right font-bold">{item.price * item.quantity} MAD</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 font-bold">
              <tr>
                <td colSpan={3} className="py-2 text-right">Sous-total:</td>
                <td className="py-2 text-right">{order.payment.amount} MAD</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 text-right text-slate-500">Livraison (Sendit):</td>
                <td className="py-1 text-right text-emerald-600">Gratuite</td>
              </tr>
              <tr className="text-sm font-black text-slate-900">
                <td colSpan={3} className="py-2 text-right">Total Net TTC:</td>
                <td className="py-2 text-right text-teal-800">{order.payment.amount} MAD</td>
              </tr>
            </tfoot>
          </table>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-center font-medium">
            Statut du Règlement: <span className="font-bold">{order.payment.status === 'SETTLED' ? 'Encaissé & Clôturé (Paid)' : 'Paiement à la réception (COD)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. EDIT ORDER MODAL ──────────────────────────────────────────────────
export function EditOrderModal({
  order,
  isOpen,
  onClose,
  onSave,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<LifecycleOrder>) => void;
}) {
  if (!isOpen || !order) return null;

  const [name, setName] = useState(order.customer.name);
  const [phone, setPhone] = useState(order.customer.phone);
  const [city, setCity] = useState(order.customer.city);
  const [address, setAddress] = useState(order.customer.address);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'PREPAID'>(order.payment.method);
  const [amount, setAmount] = useState(order.payment.amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(order.id, {
      customer: {
        ...order.customer,
        name,
        phone,
        city,
        address,
      },
      payment: {
        ...order.payment,
        method: paymentMethod,
        amount: Number(amount),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-slate-800">
            Modifier la commande — {order.orderNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nom du client</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Adresse de livraison</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mode de règlement</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'COD' | 'PREPAID')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
              >
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID">Prépayé (Carte CMI)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Montant Total (MAD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 4. CANCEL ORDER MODAL ────────────────────────────────────────────────
export function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onConfirmCancel,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => void;
}) {
  if (!isOpen || !order) return null;

  const [reason, setReason] = useState('Client injoignable au téléphone');

  const handleCancel = () => {
    onConfirmCancel(order.id, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2.5 text-rose-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">
            Annuler la commande {order.orderNumber} ?
          </h3>
        </div>
        <p className="text-slate-600">
          Veuillez préciser le motif de l’annulation pour mettre à jour les statistiques de conversion COD:
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
        >
          <option value="Client injoignable au téléphone">Client injoignable au téléphone</option>
          <option value="Commande en double (Doublon détecté)">Commande en double (Doublon)</option>
          <option value="Client a refusé la commande au WhatsApp">Client a refusé la commande</option>
          <option value="Rupture de stock produit">Rupture de stock produit</option>
          <option value="Faux numéro / Coordonnées erronées">Faux numéro / Coordonnées erronées</option>
        </select>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
          >
            Fermer
          </button>
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Confirmer l’Annulation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5. RESCHEDULE MODAL ──────────────────────────────────────────────────
export function RescheduleModal({
  order,
  isOpen,
  onClose,
  onReschedule,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (orderId: string, newDate: string, note?: string) => void;
}) {
  if (!isOpen || !order) return null;

  const [date, setDate] = useState('Demain matin (09h - 13h)');
  const [note, setNote] = useState('Le client a demandé de livrer à son bureau');

  const handleConfirm = () => {
    onReschedule(order.id, date, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2.5 text-indigo-600">
          <Calendar className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">
            Reprogrammer la livraison — {order.orderNumber}
          </h3>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Nouveau créneau horaire</label>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="Aujourd’hui après 16h00">Aujourd’hui après 16h00</option>
            <option value="Demain matin (09h - 13h)">Demain matin (09h - 13h)</option>
            <option value="Demain après-midi (14h - 18h)">Demain après-midi (14h - 18h)</option>
            <option value="Samedi prochain">Samedi prochain</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Note pour le livreur Sendit</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Rappeler avant d'arriver..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Reprogrammer & Notifier
          </button>
        </div>
      </div>
    </div>
  );
}
