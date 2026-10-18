'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  Kanban,
  List,
  Columns,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCw,
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  ClipboardCheck,
  Package,
  Truck,
  ExternalLink,
  Phone,
  MessageCircle
} from 'lucide-react';
import { OrderItem, OrderStatus, PaymentBadge } from '@/types/orders';
import { useOrderLifecycle, LifecycleOrder, LifecycleStage } from '@/context/OrderLifecycleContext';
import { OrderCard } from './OrderCard';
import { OrderDetailsModal } from './OrderDetailsModal';
import { CreateOrderModal } from './CreateOrderModal';

// Helper to convert LifecycleOrder to OrderItem for OrderCard rendering
function lifecycleToOrderItem(o: LifecycleOrder): OrderItem {
  const firstItem = o.items?.[0];
  const isPaid =
    o.payment?.status === 'COLLECTED' ||
    o.payment?.status === 'SETTLED' ||
    o.payment?.method === 'PREPAID';

  let badgeType: PaymentBadge = isPaid ? 'PAID' : 'COD PENDING';
  let badgeLabel: string | undefined = undefined;

  if (
    o.customer?.notes?.toLowerCase().includes('rappeler') ||
    o.customer?.notes?.toLowerCase().includes('callback')
  ) {
    badgeType = 'CALLBACK';
    badgeLabel = 'Callback 16h';
  } else if (o.aiVerification?.status === 'CONFIRMED_BY_AI') {
    badgeLabel = 'Validé IA';
  } else if (o.aiVerification?.status === 'NEEDS_REVIEW') {
    badgeLabel = 'À vérifier';
  }

  let metaBadge: { type: 'ai-call' | 'tracking'; text: string } | undefined = undefined;
  if (o.shipping?.trackingNumber) {
    metaBadge = { type: 'tracking', text: o.shipping.trackingNumber };
  } else if (o.aiVerification?.status === 'CONFIRMED_BY_AI') {
    metaBadge = { type: 'ai-call', text: 'AI Call' };
  }

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.stage as OrderStatus,
    badgeType,
    badgeLabel,
    amount: o.payment?.amount || 0,
    currency: o.payment?.currency || 'MAD',
    productName: firstItem
      ? o.items.length > 1
        ? `${firstItem.name} (+${o.items.length - 1})`
        : firstItem.name
      : 'Article COD',
    productThumbnail:
      firstItem?.thumbnail ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    customerName: o.customer?.name || 'Client',
    city: o.customer?.city || 'Maroc',
    countryCode: 'MA',
    phone: o.customer?.phone || '',
    timeAgo: o.createdAt || 'À l’instant',
    address: o.customer?.address,
    metaBadge,
    hasWhatsapp: true,
    hasCall: true,
    hasNote: !!o.customer?.notes,
    hasReview: !!o.completed?.reviewScore,
    assignedAgent: {
      type: 'initial',
      value: o.aiVerification?.status === 'CONFIRMED_BY_AI' ? 'IA' : 'A',
      bgClass: o.aiVerification?.status === 'CONFIRMED_BY_AI' ? 'bg-emerald-600' : 'bg-[#7c3aed]',
    },
  };
}

// 4 STAGES EXACTLY MATCHING THE RED BOX IN THE USER'S SCREENSHOT
interface ColumnConfig {
  id: LifecycleStage;
  step: string;
  title: string;
  subText: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  pillBg: string;
  pillBorder: string;
  textColor: string;
  counterBg: string;
  stepBg: string;
}

const COLUMNS_CONFIG: ColumnConfig[] = [
  {
    id: 'PENDING_CONFIRMATION',
    step: '1',
    title: 'En attente de confirmation',
    subText: 'Validation & Appels IA',
    href: '/dashboard/orders/pending',
    icon: ClipboardCheck,
    pillBg: 'bg-amber-50/90',
    pillBorder: 'border-amber-200/90',
    textColor: 'text-amber-900',
    counterBg: 'bg-amber-100 text-amber-900 border border-amber-200',
    stepBg: 'bg-amber-500 text-white',
  },
  {
    id: 'PROCESSING',
    step: '2',
    title: 'En préparation',
    subText: 'Colisage & Bordereaux Sendit',
    href: '/dashboard/orders/processing',
    icon: Package,
    pillBg: 'bg-blue-50/90',
    pillBorder: 'border-blue-200/90',
    textColor: 'text-blue-900',
    counterBg: 'bg-blue-100 text-blue-900 border border-blue-200',
    stepBg: 'bg-blue-600 text-white',
  },
  {
    id: 'IN_TRANSIT',
    step: '3',
    title: 'En cours de livraison',
    subText: 'Expédition & Suivi Chauffeur',
    href: '/dashboard/orders/in-transit',
    icon: Truck,
    pillBg: 'bg-indigo-50/90',
    pillBorder: 'border-indigo-200/90',
    textColor: 'text-indigo-900',
    counterBg: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    stepBg: 'bg-indigo-600 text-white',
  },
  {
    id: 'COMPLETED',
    step: '4',
    title: 'Livrées & Encaissées',
    subText: 'Fonds COD Collectés & POD',
    href: '/dashboard/orders/completed',
    icon: CheckCircle2,
    pillBg: 'bg-emerald-50/90',
    pillBorder: 'border-emerald-200/90',
    textColor: 'text-emerald-900',
    counterBg: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    stepBg: 'bg-emerald-600 text-white',
  },
];

export function OrdersBoard() {
  const {
    orders: lifecycleOrders,
    pendingCount,
    processingCount,
    inTransitCount,
    completedCount,
    moveOrderStage,
    addOrder,
    refreshInboundOrders,
    showToast,
  } = useOrderLifecycle();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'columns'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<OrderItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LifecycleStage | null>(null);

  // Convert lifecycle orders to OrderItem for display
  const orders: OrderItem[] = useMemo(() => {
    return lifecycleOrders.map(lifecycleToOrderItem);
  }, [lifecycleOrders]);

  // Unique Moroccan cities from active orders
  const cities = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.city) set.add(o.city);
    });
    return Array.from(set);
  }, [orders]);

  // Filtered orders by search query and city
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.phone.includes(q);

      const matchesCity = selectedCity === 'ALL' || o.city === selectedCity;
      return matchesSearch && matchesCity;
    });
  }, [orders, searchQuery, selectedCity]);

  // Total metrics
  const totalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.amount, 0);
  }, [filteredOrders]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, order: OrderItem) => {
    setDraggedOrder(order);
    e.dataTransfer.setData('text/plain', order.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: LifecycleStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumn: LifecycleStage) => {
    e.preventDefault();
    if (!draggedOrder) return;

    if (draggedOrder.status !== targetColumn) {
      moveOrderStage(draggedOrder.id, targetColumn);
      const targetConfig = COLUMNS_CONFIG.find((c) => c.id === targetColumn);
      showToast(
        `Commande ${draggedOrder.orderNumber} déplacée vers "${targetConfig?.title || targetColumn}"!`
      );
    }

    setDraggedOrder(null);
    setDragOverColumn(null);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    moveOrderStage(orderId, newStatus as LifecycleStage);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleQuickWhatsApp = (order: OrderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const phoneClean = order.phone.replace(/\D/g, '');
    const intlPhone = phoneClean.startsWith('0') ? '212' + phoneClean.slice(1) : phoneClean;
    const msg = encodeURIComponent(
      `Salam ${order.customerName}, m3ak service de livraison bkhosous talab #${order.orderNumber} dyal ${order.productName}. Wach t2akkad lina l'envoi l ${order.city} ?`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  const handleCreateOrder = (newOrder: OrderItem) => {
    const newLifecycle: LifecycleOrder = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      stage: (newOrder.status as LifecycleStage) || 'PENDING_CONFIRMATION',
      createdAt: 'À l’instant',
      customer: {
        name: newOrder.customerName,
        phone: newOrder.phone,
        address: newOrder.address || '',
        city: newOrder.city,
      },
      items: [
        {
          id: `item-${Date.now()}`,
          name: newOrder.productName,
          sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
          thumbnail: newOrder.productThumbnail,
          quantity: 1,
          price: newOrder.amount,
        },
      ],
      payment: {
        method: 'COD',
        amount: newOrder.amount,
        currency: newOrder.currency || 'MAD',
        status: 'PENDING',
      },
      aiVerification: {
        status: 'NEEDS_REVIEW',
        riskScore: 10,
        notes: 'Commande enregistrée manuellement depuis le Kanban.',
      },
    };
    addOrder(newLifecycle);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* TOP ACTION TOOLBAR */}
      <div className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between relative z-10 shadow-2xs">
        {/* Left: Back Arrow + Page Title + Setup Guide */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Vue Kanban des Commandes
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                Cycle COD 4 Étapes
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Glissez et déposez les commandes entre les 4 étapes du cycle logistique
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* New Order Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle commande</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveView('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeView === 'kanban'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Vue Kanban (4 Colonnes)"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeView === 'list'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Vue Liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveView('columns')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeView === 'columns'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Colonnes condensées"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Data */}
          <button
            onClick={() => {
              refreshInboundOrders();
              showToast('Synchronisation avec la base de données effectuée!', 'info');
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Rafraîchir"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-6">
        {/* Search & Filter Bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par N° commande, client, ville, téléphone, article..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-teal-600 shadow-2xs font-medium transition-colors"
              />
            </div>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-teal-600 shadow-2xs"
            >
              <option value="ALL">Toutes les villes ({cities.length})</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Metrics summary */}
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-slate-500">Commandes actives:</span>
              <strong className="text-slate-900">{filteredOrders.length}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span>Valeur pipeline:</span>
              <strong className="font-mono">{totalAmount.toLocaleString()} MAD</strong>
            </div>
          </div>
        </div>

        {/* ── KANBAN VIEW (4 MAIN STAGES FROM THE RED BOX) ── */}
        {activeView === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start select-none">
            {COLUMNS_CONFIG.map((col) => {
              const colOrders = filteredOrders.filter((o) => o.status === col.id);
              const colTotal = colOrders.reduce((sum, o) => sum + o.amount, 0);
              const isTarget = dragOverColumn === col.id;
              const Icon = col.icon;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col rounded-2xl transition-all duration-200 border border-slate-200/90 bg-white/70 backdrop-blur-xs p-3 shadow-2xs ${
                    isTarget ? 'bg-teal-50/70 ring-2 ring-teal-500 border-teal-300' : ''
                  }`}
                >
                  {/* COLUMN HEADER */}
                  <div
                    className={`px-3 py-2.5 rounded-xl border flex items-center justify-between mb-3 shadow-2xs transition-colors ${col.pillBg} ${col.pillBorder}`}
                  >
                    {/* Left: Step Badge + Icon + Title + Count */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs ${col.stepBg}`}
                      >
                        {col.step}
                      </div>

                      <Icon className={`w-4 h-4 shrink-0 ${col.textColor}`} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black tracking-tight truncate ${col.textColor}`}
                          >
                            {col.title}
                          </span>

                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs ${col.counterBg}`}
                          >
                            {colOrders.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Link to Dedicated Stage Page */}
                    <Link
                      href={col.href}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
                      title={`Voir la table détaillée ${col.title}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Subtitle / Volume MAD */}
                  <div className="px-1.5 pb-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-3">
                    <span className="truncate">{col.subText}</span>
                    <span className="font-mono text-slate-800 shrink-0">
                      {colTotal.toLocaleString()} MAD
                    </span>
                  </div>

                  {/* CARDS LIST IN COLUMN */}
                  <div className="space-y-3 min-h-[480px]">
                    {colOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isFloating={false}
                        onSelect={setSelectedOrder}
                        onQuickWhatsApp={handleQuickWhatsApp}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}

                    {/* Empty Drop Zone */}
                    {colOrders.length === 0 && (
                      <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200/90 flex flex-col items-center justify-center text-slate-400 text-xs font-medium p-4 text-center bg-slate-50/50">
                        <Icon className="w-6 h-6 mb-1.5 opacity-30" />
                        <span>Aucune commande dans cette étape</span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Glissez une commande ici pour la passer à l'étape {col.step}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LIST VIEW (FALLBACK TABLE) ── */}
        {activeView !== 'kanban' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Commande</th>
                  <th className="py-3 px-4">Étape Pipeline</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Ville</th>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.map((order) => {
                  const currentStageConfig = COLUMNS_CONFIG.find((c) => c.id === order.status);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-black text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            currentStageConfig?.counterBg || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>Étape {currentStageConfig?.step || '•'}</span>
                          <span>{currentStageConfig?.title || order.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-bold">
                        {order.customerName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{order.city}</td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[200px]">
                        {order.productName}
                      </td>
                      <td className="py-3 px-4 font-black font-mono text-slate-900">
                        {order.amount} {order.currency}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handleQuickWhatsApp(order, e)}
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Envoyer WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <a
                            href={`tel:${order.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                            title="Appeler"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
        onSendWhatsApp={(order, msg) => {
          const phoneClean = order.phone.replace(/\D/g, '');
          const intlPhone = phoneClean.startsWith('0') ? '212' + phoneClean.slice(1) : phoneClean;
          window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOrder}
      />
    </div>
  );
}
