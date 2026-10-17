'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Copy,
  Kanban,
  List,
  Columns,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCw,
  Filter,
  Plus,
  ChevronDown,
  Search,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/orders';
import { OrderCard } from './OrderCard';
import { OrderDetailsModal } from './OrderDetailsModal';
import { CreateOrderModal } from './CreateOrderModal';

// -------------------------------------------------------------
// EXACT ORDERS FROM THE SCREENSHOT
// -------------------------------------------------------------
const INITIAL_ORDERS: OrderItem[] = [
  // 1. In NEW ORDERS
  {
    id: 'ord-1044',
    orderNumber: '#AT1044',
    status: 'NEW_ORDERS',
    badgeType: 'CALLBACK',
    badgeLabel: 'Callback - 4pm',
    amount: 349,
    currency: 'MAD',
    productName: 'Black Bomber J...',
    productThumbnail: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&auto=format&fit=crop&q=80',
    customerName: 'Omar E.',
    city: 'Tanger',
    countryCode: 'MA',
    phone: '0661223344',
    timeAgo: '3h ago',
    address: 'Boulevard Pasteur, Tanger Centre',
    assignedAgent: { type: 'initial', value: 'A', bgClass: 'bg-[#7c3aed]' },
  },

  // 2. In CONFIRMED (Floating / Elevated card in the screenshot)
  {
    id: 'ord-1046',
    orderNumber: '#AT1046',
    status: 'CONFIRMED',
    badgeType: 'COD PENDING',
    amount: 599,
    currency: 'MAD',
    productName: 'Smart Watch S2',
    productThumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
    customerName: 'Salma R.',
    city: 'Marrakech',
    countryCode: 'MA',
    phone: '0654998877',
    timeAgo: '6h AGO',
    address: 'Gueliz, Rue Tarik Ibn Ziad',
    floatingBadge: { type: 'agent', colorClass: 'bg-[#0d9488]' },
    assignedAgent: { type: 'initial', value: 'A', bgClass: 'bg-[#7c3aed]' },
  },

  // 3. In CONFIRMED
  {
    id: 'ord-1041-conf',
    orderNumber: '#AT1041',
    status: 'CONFIRMED',
    badgeType: 'COD PENDING',
    amount: 249,
    currency: 'MAD',
    productName: 'Baggy Denim Jeans',
    productThumbnail: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80',
    customerName: 'Rachid E.',
    city: 'Meknès',
    countryCode: 'MA',
    phone: '0671882233',
    timeAgo: '• NOW',
    address: 'Hamria, Av. des FAR',
    assignedAgent: { type: 'initial', value: 'A', bgClass: 'bg-[#7c3aed]' },
  },

  // 4. In CONFIRMED
  {
    id: 'ord-1042',
    orderNumber: '#AT1042',
    status: 'CONFIRMED',
    badgeType: 'COD PENDING',
    amount: 249,
    currency: 'MAD',
    productName: 'Baggy Denim Jeans',
    productThumbnail: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80',
    customerName: 'Karim L.',
    city: 'Fès',
    countryCode: 'MA',
    phone: '0663445566',
    timeAgo: '2h AGO',
    address: 'Route d’Immouzer, Résidence Atlas',
    metaBadge: { type: 'ai-call', text: 'AI call' },
    assignedAgent: { type: 'initial', value: 'A', bgClass: 'bg-[#7c3aed]' },
  },

  // 5. In PACKING (Tilted in screenshot)
  {
    id: 'ord-1045',
    orderNumber: '#AT1045',
    status: 'PACKING',
    badgeType: 'COD PENDING',
    amount: 299,
    currency: 'MAD',
    productName: 'Amber Perfume 50ml',
    productThumbnail: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=300&auto=format&fit=crop&q=80',
    customerName: 'Noura S.',
    city: 'Agadir',
    countryCode: 'MA',
    phone: '0677112299',
    timeAgo: '5h AGO',
    address: 'Hassan II, Immeuble Al Amal',
    floatingBadge: {
      type: 'photo',
      imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      colorClass: '',
    },
    assignedAgent: { type: 'initial', value: 'A', bgClass: 'bg-[#7c3aed]' },
  },

  // 6. In SHIPPED
  {
    id: 'ord-1041-ship',
    orderNumber: '#AT1041',
    status: 'SHIPPED',
    badgeType: 'COD PENDING',
    amount: 399,
    currency: 'MAD',
    productName: 'White Leather Sneakers',
    productThumbnail: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80',
    customerName: 'Amine T.',
    city: 'Casablanca',
    countryCode: 'MA',
    phone: '0661123456',
    timeAgo: 'DHL 4829 3170',
    address: '24 Rue Abou Al Alaa, Maarif',
    metaBadge: { type: 'tracking', text: 'DHL 4829 3170' },
    assignedAgent: {
      type: 'avatar',
      value: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    },
  },

  // 7. In DELIVERED
  {
    id: 'ord-1043',
    orderNumber: '#AT1043',
    status: 'DELIVERED',
    badgeType: 'PAID',
    amount: 459,
    currency: 'MAD',
    productName: 'Linen Kaftan',
    productThumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&auto=format&fit=crop&q=80',
    customerName: 'Dounia S.',
    city: 'Rabat',
    countryCode: 'MA',
    phone: '0662998811',
    timeAgo: 'AM 0482 931 MA',
    address: 'Hay Riad, Secteur 14',
    floatingBadge: { type: 'delivery', colorClass: 'bg-[#135d54]' },
    metaBadge: { type: 'tracking', text: 'AM 0482 931 MA' },
    hasReview: true,
    assignedAgent: {
      type: 'avatar',
      value: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  },
];

// COLUMN CONFIGURATION MATCHING SCREENSHOT PASTEL TONES
const COLUMNS_CONFIG: {
  id: OrderStatus;
  title: string;
  pillBg: string;
  pillBorder: string;
  textColor: string;
  counterBg: string;
  displayCount?: string;
  displayAmount?: string;
}[] = [
  {
    id: 'NEW_ORDERS',
    title: 'NOUVELLES COMMANDES',
    pillBg: 'bg-[#e8f3fc]',
    pillBorder: 'border-[#bfdbfe]',
    textColor: 'text-[#1e40af]',
    counterBg: 'bg-[#dbeafe]',
    displayCount: '2',
    displayAmount: '948 MAD',
  },
  {
    id: 'CONFIRMED',
    title: 'CONFIRMÉES',
    pillBg: 'bg-[#eaf7f2]',
    pillBorder: 'border-[#99f6e4]',
    textColor: 'text-[#0f766e]',
    counterBg: 'bg-[#ccfbf1]',
    displayCount: '3',
    displayAmount: '797 MAD',
  },
  {
    id: 'PACKING',
    title: 'EN PRÉPARATION',
    pillBg: 'bg-[#fef7e7]',
    pillBorder: 'border-[#fde68a]',
    textColor: 'text-[#b45309]',
    counterBg: 'bg-[#fef3c7]',
    displayCount: '0',
    displayAmount: '0 MAD',
  },
  {
    id: 'SHIPPED',
    title: 'EXPÉDIÉES',
    pillBg: 'bg-[#f1edfc]',
    pillBorder: 'border-[#ddd6fe]',
    textColor: 'text-[#6d28d9]',
    counterBg: 'bg-[#ede9fe]',
    displayCount: '1',
    displayAmount: '399 MAD',
  },
  {
    id: 'DELIVERED',
    title: 'LIVRÉES & ENCAISSÉES',
    pillBg: 'bg-[#edf9f0]',
    pillBorder: 'border-[#bbf7d0]',
    textColor: 'text-[#15803d]',
    counterBg: 'bg-[#dcfce7]',
    displayAmount: '459 MAD',
  },
];

export function OrdersBoard() {
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'columns'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<OrderItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.phone.includes(q)
    );
  }, [orders, searchQuery]);

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

  const handleDragOver = (e: React.DragEvent, columnId: OrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumn: OrderStatus) => {
    e.preventDefault();
    if (!draggedOrder) return;

    if (draggedOrder.status !== targetColumn) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === draggedOrder.id
            ? { ...o, status: targetColumn, isFloatingDemo: false }
            : o
        )
      );
      showToast(`Commande ${draggedOrder.orderNumber} déplacée vers ${targetColumn}!`);
    }

    setDraggedOrder(null);
    setDragOverColumn(null);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showToast(`Statut mis à jour.`);
  };

  const handleQuickWhatsApp = (order: OrderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const phoneClean = order.phone.replace(/\D/g, '');
    const intlPhone = phoneClean.startsWith('0') ? '212' + phoneClean.slice(1) : phoneClean;
    const msg = encodeURIComponent(
      `السلام عليكم ${order.customerName}، معكم متجرنا بخصوص طلبك #${order.orderNumber} لـ ${order.productName}. واش نأكدو الإرسال اليوم؟`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  const handleCreateOrder = (newOrder: OrderItem) => {
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`Nouvelle commande ${newOrder.orderNumber} créée avec succès!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP ACTION TOOLBAR (Identical to screenshot) */}
      <div className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between relative z-10 shadow-2xs">
        
        {/* Left: Back Arrow + Page Title + Setup Guide */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-xl font-black text-slate-900 tracking-tight">Commandes</h1>

          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-[#0d9488] bg-[#f0fdfa] border border-[#ccfbf1] hover:bg-[#ccfbf1]/60 transition-colors">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Guide de configuration</span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Duplicated orders button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs">
            <span className="w-4 h-4 rounded border border-amber-500 bg-amber-50 text-amber-600 flex items-center justify-center text-[10px]">
              ⊞
            </span>
            <span>Commandes en double</span>
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
              title="Vue Kanban"
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
              title="Colonnes"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>

          {/* Icon Controls */}
          <button className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors" title="Trier">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors" title="Colonnes">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setOrders([...INITIAL_ORDERS]);
              showToast('Données réinitialisées!');
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Rafraîchir"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors" title="Filtrer">
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* More actions dropdown */}
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <span>Actions groupées</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* + Create Order Primary Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#135d54] hover:bg-[#0f4a42] shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Commande</span>
          </button>
        </div>

      </div>

      {/* MAIN KANBAN BOARD CONTAINER */}
      <div className="p-6">
        
        {/* Search & Filter Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom, commande, ville..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-teal-600 shadow-2xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Total commandes: <strong className="text-slate-800">{orders.length}</strong></span>
            <span>•</span>
            <span className="text-teal-700 font-bold">
              Total valeur: {orders.reduce((sum, o) => sum + o.amount, 0)} MAD
            </span>
          </div>
        </div>

        {/* 5 COLUMNS BOARD */}
        <div className="flex gap-4 overflow-x-auto pb-8 items-start select-none min-h-[calc(100vh-230px)]">
          {COLUMNS_CONFIG.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.id);
            const isTarget = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-[290px] shrink-0 flex flex-col transition-colors rounded-2xl ${
                  isTarget ? 'bg-teal-50/50 ring-2 ring-teal-400' : ''
                }`}
              >
                {/* COLUMN HEADER PILL */}
                <div
                  className={`px-3 py-2 rounded-xl border flex items-center justify-between mb-3 shadow-2xs ${col.pillBg} ${col.pillBorder} ${col.textColor}`}
                >
                  {/* Left: Drag dots + Title + Count Pill + Amount */}
                  <div className="flex items-center gap-1.5 text-xs font-black tracking-tight">
                    <span className="text-slate-400">⋮⋮</span>
                    <span>{col.title}</span>

                    {/* Count badge */}
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${col.counterBg}`}
                    >
                      {col.displayCount ?? colOrders.length}
                    </span>

                    {/* Column Total MAD */}
                    <span className="text-[11px] font-bold opacity-80">
                      {col.displayAmount ?? `${colOrders.reduce((s, o) => s + o.amount, 0)} MAD`}
                    </span>
                  </div>

                  {/* Right options icon */}
                  <button className="text-slate-400 hover:text-slate-700 p-0.5">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* CARDS LIST IN COLUMN */}
                <div className="space-y-3 min-h-[400px]">
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

                  {/* If column is empty */}
                  {colOrders.length === 0 && (
                    <div className="h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 text-xs font-medium">
                      <span>Glisser une commande ici</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

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
