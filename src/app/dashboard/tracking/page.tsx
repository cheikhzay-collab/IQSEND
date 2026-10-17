'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Wifi,
  Bot,
  Truck,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { TrackingOrder, ShipmentStatus, TrackingKpis } from '@/types';
import { KpiCards } from '@/components/tracking/KpiCards';
import { TrackingKanban } from '@/components/tracking/TrackingKanban';
import { OrderDrawer } from '@/components/tracking/OrderDrawer';

// -------------------------------------------------------------
// REALISTIC MOCK DATA (Moroccan COD Scenarios)
// -------------------------------------------------------------
const INITIAL_ORDERS: TrackingOrder[] = [
  {
    id: 'ord-01',
    orderNumber: 'MA-20491',
    customerName: 'Yassine Benkirane',
    phoneNumber: '0661294821',
    city: 'Casablanca',
    address: '24 Rue Abou Al Alaa Al Maarri, Maarif',
    gpsLocationUrl: 'https://maps.google.com/?q=33.5883,-7.6324',
    totalAmount: 399,
    productName: 'Pack 2x Chemises Lin Premium',
    productQuantity: 2,
    productAttributes: { size: 'L', color: 'Blanc & Beige' },
    leadStatus: 'CONFIRMED',
    shipmentStatus: 'OUT_FOR_DELIVERY',
    trackingNumber: 'SND-819204',
    waybillUrl: 'https://sendit.ma/awb/SND-819204.pdf',
    driverName: 'Mohamed Tazi',
    driverPhone: '0670112233',
    deliveryAttempts: 1,
    aiHandoverRequired: false,
    aiConversationEnabled: true,
    riskScore: 12,
    createdAt: '2026-10-15 14:20',
    lastUpdatedAt: '2026-10-16 08:30',
    timeline: [
      { id: 't1', timestamp: '15 Oct 14:20', title: 'Nouvelle commande enregistrée', description: 'Storefront Shopify Form', actor: 'SYSTEM' },
      { id: 't2', timestamp: '15 Oct 14:22', title: 'Confirmation automatique WhatsApp', description: 'Le client a confirmé sa commande et sa taille en Darija', actor: 'AI_BOT' },
      { id: 't3', timestamp: '15 Oct 17:00', title: 'Colis créé sur Sendit.ma', description: 'Bordereau AWB généré (SND-819204)', actor: 'SYSTEM' },
      { id: 't4', timestamp: '16 Oct 08:30', title: 'En cours de livraison', description: 'Pris en charge par le livreur Mohamed Tazi', actor: 'SENDIT' },
      { id: 't5', timestamp: '16 Oct 08:35', title: 'Notification pré-livraison envoyée', description: 'Rappel WhatsApp du montant de 399 MAD', actor: 'AI_BOT' },
    ],
    chatMessages: [
      { id: 'm1', sender: 'AI_BOT', text: 'السلام عليكم أخي Yassine، شكراً على طلبك لـ Pack 2x Chemises Lin. واش تأكد لينا مقاس L ونفس العنوان في المعارف الدار البيضاء؟', time: '14:21' },
      { id: 'm2', sender: 'CUSTOMER', text: 'وعليكم السلام، نعم المقاس مزيان والعنوان هو هذاك. واش التوصيل اليوم؟', time: '14:22' },
      { id: 'm3', sender: 'AI_BOT', text: 'شكراً بزاف! الطلب تأكد وغادي يوصلك غداً مع موزع Sendit. الدفع نقداً 399 درهم عند المعاينة.', time: '14:22' },
      { id: 'm4', sender: 'AI_BOT', text: 'صباح الخير سيدي Yassine! الطرد ديالك راه مع الموزع اليوم في كازا. عفاك خلي هاتفك شغال ووجدي 399 درهم. نهارك مبروك!', time: '08:35' },
    ],
  },
  {
    id: 'ord-02',
    orderNumber: 'MA-20492',
    customerName: 'Khadija El Amrani',
    phoneNumber: '0655819033',
    city: 'Marrakech',
    address: 'Résidence Jnane Gueliz, Appt 14',
    gpsLocationUrl: 'https://maps.google.com/?q=31.6346,-8.0163',
    totalAmount: 249,
    productName: 'Robe Brodée Traditionnelle',
    productQuantity: 1,
    productAttributes: { size: 'M', color: 'Bleu Majorelle' },
    leadStatus: 'CONFIRMED',
    shipmentStatus: 'DELIVERY_FAILED',
    trackingNumber: 'SND-819205',
    waybillUrl: 'https://sendit.ma/awb/SND-819205.pdf',
    driverName: 'Hamid Mansour',
    driverPhone: '0662884411',
    deliveryAttempts: 1,
    failedReason: 'Client Injoignable (Premier appel sans réponse)',
    aiHandoverRequired: false,
    aiConversationEnabled: true,
    riskScore: 35,
    createdAt: '2026-10-15 11:10',
    lastUpdatedAt: '2026-10-16 09:15',
    timeline: [
      { id: 't20', timestamp: '15 Oct 11:10', title: 'Commande reçue', description: 'Boutique en ligne', actor: 'SYSTEM' },
      { id: 't21', timestamp: '15 Oct 11:12', title: 'Confirmé par Gemini AI', description: 'Adresse et ville vérifiées', actor: 'AI_BOT' },
      { id: 't22', timestamp: '16 Oct 09:15', title: 'Tentative échouée', description: 'Sendit Webhook: Injoignable', actor: 'SENDIT' },
      { id: 't23', timestamp: '16 Oct 09:16', title: 'Bot de sauvetage déclenché', description: 'Demande de reprogrammation envoyée par WhatsApp', actor: 'AI_BOT' },
    ],
    chatMessages: [
      { id: 'mc1', sender: 'AI_BOT', text: 'أهلاً لالة Khadija، حاول موزع Sendit يتواصل معاك قبل قليل ولكن تعذر الوصول ليك. واش تحبي نعاودو نصيفطو الموزع في العشية أو نأجلوه لغداً؟', time: '09:16' },
      { id: 'mc2', sender: 'CUSTOMER', text: 'كنت فالحمام ماسمعتش التيليفون، عفاك صيفطوه ليا مورا 3 دالعشية.', time: '09:20' },
      { id: 'mc3', sender: 'AI_BOT', text: 'مرحبا لالة، تم تحديث الموعد وغيتصل بيك الموزع بعد الساعة 3 إن شاء الله.', time: '09:21' },
    ],
  },
  {
    id: 'ord-03',
    orderNumber: 'MA-20493',
    customerName: 'Hamza Chraibi',
    phoneNumber: '0678239014',
    city: 'Fes',
    address: 'Quartier Narjiss, Boulevard Allal Ben Abdellah',
    totalAmount: 550,
    productName: 'Chaussures Cuir Véritable',
    productQuantity: 1,
    productAttributes: { size: '43', color: 'Marron Foncé' },
    leadStatus: 'PACKING',
    shipmentStatus: 'READY_FOR_PICKUP',
    trackingNumber: 'SND-819206',
    waybillUrl: 'https://sendit.ma/awb/SND-819206.pdf',
    deliveryAttempts: 0,
    aiHandoverRequired: false,
    aiConversationEnabled: true,
    riskScore: 10,
    createdAt: '2026-10-16 07:15',
    lastUpdatedAt: '2026-10-16 08:45',
    timeline: [
      { id: 't30', timestamp: '16 Oct 07:15', title: 'Commande passée', description: 'Formulaire COD', actor: 'SYSTEM' },
      { id: 't31', timestamp: '16 Oct 07:17', title: 'Confirmée par AI', description: 'Taille 43 confirmée', actor: 'AI_BOT' },
      { id: 't32', timestamp: '16 Oct 08:45', title: 'Prêt pour ramassage', description: 'Bordereau Sendit imprimé', actor: 'SYSTEM' },
    ],
    chatMessages: [
      { id: 'm31', sender: 'AI_BOT', text: 'السلام عليكم أخي Hamza، تم تأكيد طلبك للأحذية مقاس 43 لمدينة فاس.', time: '07:17' },
      { id: 'm32', sender: 'CUSTOMER', text: 'شكراً، في انتظار الكولية.', time: '07:20' },
    ],
  },
  {
    id: 'ord-04',
    orderNumber: 'MA-20494',
    customerName: 'Samira Belkacem',
    phoneNumber: '0663412099',
    city: 'Rabat',
    address: 'Avenue Fal Ould Oumeir, Agdal',
    totalAmount: 450,
    productName: 'Montre Automatique Édition Noire',
    productQuantity: 1,
    productAttributes: { color: 'Full Black' },
    leadStatus: 'CONFIRMED',
    shipmentStatus: 'DELIVERED_PAID',
    trackingNumber: 'SND-819207',
    waybillUrl: 'https://sendit.ma/awb/SND-819207.pdf',
    deliveryAttempts: 1,
    aiHandoverRequired: false,
    aiConversationEnabled: false,
    riskScore: 8,
    createdAt: '2026-10-14 16:30',
    lastUpdatedAt: '2026-10-16 07:40',
    timeline: [
      { id: 't40', timestamp: '14 Oct 16:30', title: 'Commande créée', description: 'YouCan Store', actor: 'SYSTEM' },
      { id: 't41', timestamp: '15 Oct 10:00', title: 'Ramassé par Sendit', description: 'Hub Rabat Agdal', actor: 'SENDIT' },
      { id: 't42', timestamp: '16 Oct 07:40', title: 'Colis Livré et Encaissé', description: 'Montant COD: 450 MAD collecté', actor: 'SENDIT' },
    ],
    chatMessages: [
      { id: 'm41', sender: 'AI_BOT', text: 'بصحتك لالة Samira! تأكدنا من استلامك للساعة ديالك. نتمنى تنال إعجابك.', time: '07:42' },
      { id: 'm42', sender: 'CUSTOMER', text: 'شكراً وصلات زوينة بزاف وكتخدم مزيان.', time: '07:50' },
    ],
  },
  {
    id: 'ord-05',
    orderNumber: 'MA-20495',
    customerName: 'Othmane Jabri',
    phoneNumber: '0612398471',
    city: 'Tanger',
    address: 'Quartier Malabata, En face Hôtel Tarik',
    gpsLocationUrl: 'https://maps.google.com/?q=35.7725,-5.7928',
    totalAmount: 320,
    productName: 'Survêtement Sport Performance',
    productQuantity: 1,
    productAttributes: { size: 'XL', color: 'Gris Chiné' },
    leadStatus: 'CONFIRMED',
    shipmentStatus: 'IN_TRANSIT',
    trackingNumber: 'SND-819208',
    deliveryAttempts: 0,
    aiHandoverRequired: true,
    aiConversationEnabled: false,
    riskScore: 68,
    createdAt: '2026-10-15 18:20',
    lastUpdatedAt: '2026-10-16 06:10',
    timeline: [
      { id: 't50', timestamp: '15 Oct 18:20', title: 'Commande passée', description: 'Risque élevé détecté (Historique de retour)', actor: 'SYSTEM' },
      { id: 't51', timestamp: '15 Oct 18:25', title: 'Transfert Agent Humain', description: 'Vérification manuelle requise', actor: 'AGENT' },
      { id: 't52', timestamp: '16 Oct 06:10', title: 'Transfert Hub Tanger', description: 'En route vers l’agence locale', actor: 'SENDIT' },
    ],
    chatMessages: [
      { id: 'm51', sender: 'AGENT', text: 'السلام عليكم سي عثمان، كنشكروك على الطلب. تأكدنا من الموقع الجغرافي ديالك والكولية ديالك في الطريق لطنجة.', time: '18:30' },
      { id: 'm52', sender: 'CUSTOMER', text: 'مرحبا، راني كنسكن فمالاباطا، يتصل بيا الموزع فاش يقرب.', time: '18:45' },
    ],
  },
];

export default function TrackingPage() {
  const [orders, setOrders] = useState<TrackingOrder[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<TrackingOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Compute dynamic KPIs
  const kpis: TrackingKpis = useMemo(() => {
    const totalShipments = orders.length;
    const outForDeliveryCount = orders.filter((o) => o.shipmentStatus === 'OUT_FOR_DELIVERY').length;
    const deliveredCount = orders.filter((o) => o.shipmentStatus === 'DELIVERED_PAID').length;
    const failedAtRiskCount = orders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED').length;
    const totalCodCollected = orders
      .filter((o) => o.shipmentStatus === 'DELIVERED_PAID')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingCodAmount = orders
      .filter((o) => o.shipmentStatus !== 'DELIVERED_PAID' && o.shipmentStatus !== 'RETURNED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const deliveryRate = totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 100) : 0;

    return {
      totalShipments,
      outForDeliveryCount,
      deliveredCount,
      deliveryRate,
      failedAtRiskCount,
      totalCodCollected,
      pendingCodAmount,
    };
  }, [orders]);

  // Extract unique cities for the filter dropdown
  const cities = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.city)));
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.phoneNumber.includes(searchQuery) ||
        order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = selectedCity === 'ALL' || order.city === selectedCity;

      return matchesSearch && matchesCity;
    });
  }, [orders, searchQuery, selectedCity]);

  // Handlers
  const handleSelectOrder = (order: TrackingOrder) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: ShipmentStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const newTimelineEvent = {
          id: `t-${Date.now()}`,
          timestamp: 'À l’instant',
          title: `Statut changé vers: ${newStatus}`,
          description: 'Mise à jour manuelle via le tableau de bord',
          actor: 'AGENT' as const,
        };

        return {
          ...order,
          shipmentStatus: newStatus,
          lastUpdatedAt: 'À l’instant',
          timeline: [newTimelineEvent, ...order.timeline],
        };
      })
    );

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, shipmentStatus: newStatus } : null));
    }
  };

  const handleToggleAi = (orderId: string, enabled: boolean) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, aiConversationEnabled: enabled } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, aiConversationEnabled: enabled } : null));
    }
  };

  const handleSendMessage = (orderId: string, text: string) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'AGENT' as const,
      text: text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              chatMessages: [...o.chatMessages, newMessage],
              // Automatically switch off AI when human sends message to avoid overlapping
              aiConversationEnabled: false,
            }
          : o
      )
    );

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              aiConversationEnabled: false,
              chatMessages: [...prev.chatMessages, newMessage],
            }
          : null
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      
      {/* 1. Global Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-6 py-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Connectivity Telemetry */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Suivi Logistique & Expéditions Sendit.ma
                </h1>
                <p className="text-xs text-slate-500">
                  Pipeline COD en temps réel • Synchronisation Webhooks active
                </p>
              </div>
            </div>

            {/* Live Badges */}
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sendit API: Connecté
              </span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-200">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
                Gemini 1.5 Flash (WhatsApp Bot)
              </span>
            </div>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (Client, Tél, Code Sendit, Ville)..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* City Filter */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Toutes les villes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => {}}
              className="p-2 border border-slate-200/90 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Exporter rapport de bord"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 space-y-6 max-w-400 mx-auto">
        
        {/* 2. Telemetry KPI Cards */}
        <KpiCards kpis={kpis} />

        {/* 2.b Emergency Rescue Panel (Pilier 2: Needs Attention Engine) */}
        {kpis.failedAtRiskCount > 0 && (
          <div className="bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 border-2 border-rose-200/90 rounded-2xl p-4.5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm shadow-rose-600/30">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      🚨 Cellule d'Urgence Sauvetage : {kpis.failedAtRiskCount} colis en risque de retour
                    </h3>
                    <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Délai Sendit : &lt; 24h
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Ces colis sont signalés en échec (Injoignable, Reporté, ou Adresse imprécise). Déclenchez l'assistance WhatsApp en 1-clic pour éviter le retour au stock.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const atRisk = orders.filter((o) => o.shipmentStatus === 'DELIVERY_FAILED');
                    atRisk.forEach((ord) => handleSendMessage(ord.id, `مرحباً ${ord.customerName}، لاحظنا أن الموزع واجه صعوبة في تسليم طلبك اليوم (${ord.failedReason || 'تعذر الوصول'}). كيفاش تفضل نكملوا التوصيل؟`));
                    alert(`✅ Message de sauvetage WhatsApp envoyé avec succès aux ${atRisk.length} clients en échec !`);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Bot className="w-3.5 h-3.5" /> Relancer Tout par Bot WhatsApp
                </button>
              </div>
            </div>

            {/* List of at-risk shipments */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {orders
                .filter((o) => o.shipmentStatus === 'DELIVERY_FAILED')
                .map((atRiskOrder) => (
                  <div
                    key={atRiskOrder.id}
                    className="bg-white border border-rose-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-rose-400 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{atRiskOrder.orderNumber}</span>
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                        {atRiskOrder.city} • {atRiskOrder.totalAmount} MAD
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      <strong>{atRiskOrder.customerName}</strong> ({atRiskOrder.phoneNumber})
                      <div className="text-[11px] text-rose-600 font-medium mt-0.5 truncate">
                        ⚠️ Motif : {atRiskOrder.failedReason || 'Client Injoignable'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          handleSendMessage(
                            atRiskOrder.id,
                            `مرحباً ${atRiskOrder.customerName}، لاحظنا أن موزع Sendit حاول يتصل بك اليوم بخصوص طلبيتك. هل تفضل استلامها غداً، أو تحديد توقيت آخر يناسبك؟ 🚚`
                          );
                          alert(`✅ Message de sauvetage envoyé à ${atRiskOrder.customerName}`);
                        }}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold py-1.5 rounded-lg text-center transition-colors"
                      >
                        📱 Sauvetage WhatsApp
                      </button>
                      <button
                        onClick={() => handleSelectOrder(atRiskOrder)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 3. Pipeline Header & Filter info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Pipeline des Colis ({filteredOrders.length})</span>
            {searchQuery && (
              <span className="text-slate-400">
                — Résultats filtrés pour "{searchQuery}"
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            Glissez ou cliquez sur une carte pour ouvrir le volet d'action WhatsApp & Sendit
          </span>
        </div>

        {/* 4. Kanban Columns */}
        <TrackingKanban
          orders={filteredOrders}
          onSelectOrder={handleSelectOrder}
          onStatusChange={handleStatusChange}
        />
      </main>

      {/* 5. Slide-over Detail Drawer */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onToggleAi={handleToggleAi}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
