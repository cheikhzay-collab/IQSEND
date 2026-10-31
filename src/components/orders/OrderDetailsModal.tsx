'use client';

import React, { useState, useEffect } from 'react';
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
  Truck,
  Bot,
  Sparkles,
  FileText
} from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/orders';
import { getStageMessageConfig } from '@/lib/order-stage-messages';
import { MOROCCAN_CITIES } from '@/lib/moroccan-cities';
import { Edit2 } from 'lucide-react';

interface OrderDetailsModalProps {
  order: OrderItem | null;
  isOpen?: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onSendWhatsApp: (order: OrderItem, message: string) => void;
  onOpenAgentIntervention?: (order: OrderItem) => void;
}

export function OrderDetailsModal({
  order,
  isOpen = true,
  onClose,
  onStatusChange,
  onSendWhatsApp,
  onOpenAgentIntervention,
}: OrderDetailsModalProps) {
  const [customMsg, setCustomMsg] = useState('');
  const [activeLang, setActiveLang] = useState<'french' | 'darija' | 'arabic'>('french');
  const [copied, setCopied] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string | null>(order?.trackingCode || null);
  const [waybillLink, setWaybillLink] = useState<string | null>(order?.waybillUrl || null);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [editableCity, setEditableCity] = useState(order?.city || '');
  const [editableAddress, setEditableAddress] = useState(order?.address || '');
  const [isSavingCity, setIsSavingCity] = useState(false);

  useEffect(() => {
    setPushSuccess(order?.trackingCode || null);
    setWaybillLink(order?.waybillUrl || null);
    if (order) {
      setEditableCity(order.city || '');
      setEditableAddress(order.address || '');
      setIsEditingCity(false);
    }
  }, [order]);

  
  const handleSaveCity = async () => {
    if (!order || isSavingCity) return;
    setIsSavingCity(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          city: editableCity.trim() || order.city,
          address: editableAddress.trim() || order.address,
          amount: order.amount,
          status: order.status,
          customer: {
            name: order.customerName,
            phone: order.phone,
            city: editableCity.trim() || order.city,
            address: editableAddress.trim() || order.address,
          },
        }),
      });
      if (res.ok) {
        order.city = editableCity.trim() || order.city;
        order.address = editableAddress.trim() || order.address;
        setIsEditingCity(false);
      }
    } catch (err) {
      console.warn('Error saving city:', err);
    } finally {
      setIsSavingCity(false);
    }
  };

  const handlePushToSendit = async () => {
    if (!order || isPushing) return;
    setIsPushing(true);
    try {
      const res = await fetch('/api/logistics/sendit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          name: order.customerName,
          phone: order.phone,
          city: order.city,
          address: order.address || `Ville: ${order.city}`,
          amount: order.amount,
          reference: order.orderNumber,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Échec de transmission du colis à Sendit.ma');
        return;
      }
      setPushSuccess(data.trackingCode);
      if (data.waybillPdfUrl || data.waybillUrl) {
        setWaybillLink(data.waybillPdfUrl || data.waybillUrl);
      }
      onStatusChange(order.id, 'IN_TRANSIT');
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  useEffect(() => {
    if (order) {
      const stageConfig = getStageMessageConfig(order.status);
      if (activeLang === 'french') {
        setCustomMsg(stageConfig.french(order));
      } else if (activeLang === 'darija') {
        setCustomMsg(stageConfig.darija(order));
      } else {
        setCustomMsg(stageConfig.arabic(order));
      }
    }
  }, [order, activeLang]);

  if (!order || !isOpen) return null;

  const stageConfig = getStageMessageConfig(order.status);

  const handleCopy = () => {
    navigator.clipboard?.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-black text-sm shrink-0">
              COD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">{order.orderNumber}</h3>
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="Copier le numéro de commande"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageConfig.badgeBg}`}
                >
                  {stageConfig.stageNameFr}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Créé il y a {order.timeAgo} • Destination : <strong className="text-slate-700">{order.city}, Maroc</strong>
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
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-emerald-600"
              >
                <option value="PENDING_CONFIRMATION">1. En attente (À confirmer)</option>
                <option value="PROCESSING">2. En préparation (Stock réservé)</option>
                <option value="IN_TRANSIT">3. En livraison (Sendit)</option>
                <option value="COMPLETED">4. Livré & Encaissé (Completed)</option>
                <option value="CANCELED">5. Annulé à la confirmation (0 DH)</option>
                <option value="RETURNED">6. Retourné chez transporteur (Sendit)</option>
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
                <span className="text-xs font-black text-emerald-700">
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
                <a href={`tel:${order.phone}`} className="font-bold text-emerald-700 hover:underline">
                  {order.phone}
                </a>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ville & Adresse de livraison (Maroc)</span>
                  </span>
                  {!isEditingCity ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingCity(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تعديل المدينة</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingCity(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded bg-slate-200/70"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCity}
                        disabled={isSavingCity}
                        className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-2xs disabled:opacity-50"
                      >
                        {isSavingCity ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingCity ? (
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">
                      {order.city}, Maroc {order.address ? `— ${order.address}` : ''}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {order.city}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <input
                        list="modal-moroccan-cities-list"
                        type="text"
                        value={editableCity}
                        onChange={(e) => setEditableCity(e.target.value)}
                        placeholder="المدينة..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <datalist id="modal-moroccan-cities-list">
                        {MOROCCAN_CITIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <input
                      type="text"
                      value={editableAddress}
                      onChange={(e) => setEditableAddress(e.target.value)}
                      placeholder="العنوان أو الحي بالتفصيل..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage-Adapted WhatsApp & Agent Action */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Message WhatsApp adapté à l'étape ({stageConfig.stageNameFr})</span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  onClick={() => setActiveLang('french')}
                  className={`px-2 py-0.5 rounded ${
                    activeLang === 'french' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Français
                </button>
                <button
                  onClick={() => setActiveLang('darija')}
                  className={`px-2 py-0.5 rounded ${
                    activeLang === 'darija' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Darija
                </button>
                <button
                  onClick={() => setActiveLang('arabic')}
                  className={`px-2 py-0.5 rounded ${
                    activeLang === 'arabic' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Arabe
                </button>
              </div>
            </div>

            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              rows={3}
              dir={activeLang === 'french' ? 'ltr' : 'rtl'}
              className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 bg-white text-slate-800 focus:outline-emerald-600 font-sans"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSendWhatsApp(order, customMsg)}
                className="btn-whatsapp flex-1"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer sur WhatsApp ({order.phone})
              </button>

              {onOpenAgentIntervention && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAgentIntervention(order);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  title="Ouvrir l'intervention Agent IA pour contrôle complet"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Agent IA</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-secondary btn-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer Bon
            </button>

            {waybillLink && (
              <a
                href={waybillLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl hover:bg-blue-100 transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Bordereau Sendit ({pushSuccess})
              </a>
            )}

            {!pushSuccess && (
              <button
                onClick={handlePushToSendit}
                disabled={isPushing}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" />
                {isPushing ? 'Génération AWB...' : 'Pousser vers Sendit (AWB)'}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn-dark"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
