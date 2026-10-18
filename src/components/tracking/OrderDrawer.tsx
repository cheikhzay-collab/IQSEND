'use client';

import React, { useState } from 'react';
import {
  X,
  Clock,
  MessageSquare,
  FileText,
  Send,
  Phone,
  MapPin,
  ExternalLink,
  Bot,
  User,
  ShieldAlert,
  CheckCircle,
  Truck,
  RotateCcw,
  Download,
  AlertCircle,
  Headphones
} from 'lucide-react';
import { TrackingOrder } from '@/types';

interface OrderDrawerProps {
  order: TrackingOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleAi: (orderId: string, enabled: boolean) => void;
  onSendMessage: (orderId: string, text: string) => void;
}

export function OrderDrawer({
  order,
  isOpen,
  onClose,
  onToggleAi,
  onSendMessage,
}: OrderDrawerProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'chat' | 'details'>('chat');
  const [replyInput, setReplyInput] = useState('');

  if (!isOpen || !order) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    onSendMessage(order.id, replyInput.trim());
    setReplyInput('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-xs font-medium">Prêt Ramassage</span>;
      case 'IN_TRANSIT':
        return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">En Transit</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">En Livraison</span>;
      case 'DELIVERY_FAILED':
        return <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-xs font-medium">Échec Livraison</span>;
      case 'DELIVERED_PAID':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">Livré & Payé</span>;
      case 'RETURNED':
        return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Retourné</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col sm:border-l border-slate-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{order.orderNumber}</h2>
                  {getStatusBadge(order.shipmentStatus)}
                  {order.riskScore >= 60 && (
                    <span className="flex items-center gap-1 bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-md font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" /> Risque Élevé ({order.riskScore}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sendit Tracking: <span className="font-mono font-medium text-slate-700">{order.trackingNumber}</span> • {order.city}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Takeover Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${order.aiConversationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-800">
                {order.aiConversationEnabled ? 'Gemini 1.5 Flash AI Actif (Auto-Confirmation & Récupération)' : 'Intervention Humaine Exclusive (Bot en pause)'}
              </span>
            </div>
            <button
              onClick={() => onToggleAi(order.id, !order.aiConversationEnabled)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                order.aiConversationEnabled
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {order.aiConversationEnabled ? 'Force Human Takeover' : 'Réactiver l’IA'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 gap-6 bg-white">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Conversation WhatsApp ({order.chatMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              Chronologie des Événements
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Fiche Colis & Sendit
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {/* TAB 1: WHATSAPP CHAT */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {order.chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'CUSTOMER' ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {msg.sender === 'CUSTOMER' && (
                          <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                            <User className="w-3 h-3" /> {order.customerName}
                          </span>
                        )}
                        {msg.sender === 'AI_BOT' && (
                          <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Gemini Assistant (Darija)
                          </span>
                        )}
                        {msg.sender === 'AGENT' && (
                          <span className="text-[11px] font-medium text-purple-600 flex items-center gap-1">
                            <Headphones className="w-3 h-3" /> Agent Humain
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">• {msg.time}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          msg.sender === 'CUSTOMER'
                            ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                            : msg.sender === 'AI_BOT'
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : 'bg-slate-800 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.isAudio && (
                          <div className="flex items-center gap-2 mb-1 opacity-90 text-[10px] font-mono">
                            <span>🎤 Note Vocale transcrite:</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Écrire une réponse manuelle au client (WhatsApp)..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {order.timeline.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* Bullet icon */}
                      <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                      <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800">{event.title}</span>
                          <span className="text-[11px] text-slate-400">{event.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600">{event.description}</p>
                        <span className="inline-block mt-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Source: {event.actor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PACKAGE & SENDIT DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-5 text-xs text-slate-700">
                {/* Sendit Logistics Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-900 text-sm">Informations Sendit.ma</span>
                    </div>
                    {order.waybillUrl && (
                      <a
                        href={order.waybillUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Télécharger Bordereau AWB
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-[11px]">Numéro de Barcode</p>
                      <p className="font-mono font-bold text-slate-800 text-sm">{order.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Tentatives de Livraison</p>
                      <p className="font-semibold text-slate-800">{order.deliveryAttempts} tentative(s)</p>
                    </div>
                    {order.driverName && (
                      <div>
                        <p className="text-slate-400 text-[11px]">Livreur Assigné</p>
                        <p className="font-semibold text-slate-800">{order.driverName} ({order.driverPhone})</p>
                      </div>
                    )}
                    {order.failedReason && (
                      <div className="col-span-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-rose-700">
                        <span className="font-bold">Motif du dernier échec:</span> {order.failedReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <h4 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    Destinataire & Adresse
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 text-[11px]">Client</span>
                      <p className="font-medium text-slate-800">{order.customerName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Téléphone</span>
                      <p className="font-medium text-slate-800">{order.phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Ville</span>
                      <p className="font-medium text-slate-800">{order.city}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Montant COD à Encaisser</span>
                      <p className="font-bold text-emerald-600 text-sm">{order.totalAmount} MAD</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px]">Adresse Complète</span>
                      <p className="font-medium text-slate-800">{order.address}</p>
                    </div>
                    {order.gpsLocationUrl && (
                      <div className="col-span-2 mt-1">
                        <a
                          href={order.gpsLocationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Ouvrir Position GPS WhatsApp (Google Maps)
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items in Parcel */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <h4 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-3">
                    Contenu du Colis
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{order.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        Qté: {order.productQuantity}
                        {order.productAttributes?.size ? ` • Taille: ${order.productAttributes.size}` : ''}
                        {order.productAttributes?.color ? ` • Couleur: ${order.productAttributes.color}` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{order.totalAmount} MAD</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Dernière mise à jour: {order.lastUpdatedAt}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
