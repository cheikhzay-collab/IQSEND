'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Bot,
  User,
  Headphones,
  Phone,
  Send,
  MapPin,
  Mic,
  Play,
  Clock,
  Sparkles,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Pencil,
  Check,
  X,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
  Box
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '@/lib/inbox-store';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';

export default function WhatsAppInboxPage() {
  const {
    orders: lifecycleOrders,
    confirmOrder,
    shipOrder,
    markDelivered,
    cancelOrder,
    editOrder,
    showToast,
  } = useOrderLifecycle();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLidNumber = (phone?: string) => {
    if (!phone) return false;
    const digits = phone.replace(/[^\d]/g, '');
    return phone.includes('@lid') || (digits.length >= 14 && (digits.startsWith('1') || !digits.startsWith('212')));
  };

  const formatDisplayPhone = (phone?: string, realPhone?: string) => {
    const target = realPhone || phone;
    if (!target) return '';
    if (isLidNumber(target) && !realPhone) {
      return `LID: ${target.slice(0, 4)}...${target.slice(-4)}`;
    }
    let p = target.replace(/[^\d]/g, '');
    if (p.startsWith('212')) p = '0' + p.slice(3);
    if (p.length === 10 && (p.startsWith('06') || p.startsWith('07') || p.startsWith('05'))) {
      return `${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, 6)} ${p.slice(6, 8)} ${p.slice(8, 10)}`;
    }
    return target;
  };

  // Fetch live conversations from API
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp/inbox');
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          if (!selectedChatId && data.conversations.length > 0) {
            setSelectedChatId(data.conversations[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll every 4s for live incoming messages from WhatsApp (only when tab is visible)
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchConversations();
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedChatId]);

  const currentChat =
    conversations.find((c) => c.id === selectedChatId) || conversations[0];

  const matchingOrder: LifecycleOrder | undefined = React.useMemo(() => {
    if (!currentChat) return undefined;
    const rawClean = (currentChat.realPhoneNumber || currentChat.phoneNumber || '').replace(/[^\d]/g, '');
    const cleanOrderNum = (currentChat.orderNumber || '').replace(/[#\s]/g, '').toLowerCase();

    return lifecycleOrders.find((o) => {
      const orderPhone = (o.customer.phone || '').replace(/[^\d]/g, '');
      const phoneMatch = Boolean(rawClean && orderPhone && (rawClean.endsWith(orderPhone) || orderPhone.endsWith(rawClean)));
      const numMatch = Boolean(cleanOrderNum && o.orderNumber.toLowerCase().includes(cleanOrderNum));
      const nameMatch = Boolean(currentChat.customerName && o.customer.name.toLowerCase().trim() === currentChat.customerName.toLowerCase().trim());
      return phoneMatch || numMatch || nameMatch;
    });
  }, [lifecycleOrders, currentChat]);

  const handleToggleTakeover = async (chatId: string) => {
    if (!currentChat) return;
    const newAiState = !currentChat.isAiActive;

    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, isAiActive: newAiState, needsHumanTakeover: false }
          : c
      )
    );

    try {
      await fetch('/api/whatsapp/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, isAiActive: newAiState }),
      });
    } catch (e) {
      console.error('Failed to toggle AI state on server:', e);
    }
  };

  const handleSaveRealPhone = async () => {
    if (!editPhoneInput.trim() || !currentChat) return;
    setSavingPhone(true);
    try {
      const res = await fetch('/api/whatsapp/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChat.id,
          realPhone: editPhoneInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setConversations((prev) =>
            prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
          );
        }
        setIsEditingPhone(false);
      }
    } catch (err) {
      console.error('Failed to save real customer phone:', err);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentChat || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const optimisticMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'AGENT',
      text: messageText,
      timestamp: timeStr,
    };

    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentChat.id
          ? {
              ...c,
              isAiActive: false,
              needsHumanTakeover: false,
              lastMessage: messageText,
              lastTime: timeStr,
              messages: [...(c.messages || []), optimisticMsg],
            }
          : c
      )
    );

    try {
      await fetch('/api/whatsapp/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentChat.phoneNumber,
          text: messageText,
        }),
      });
    } catch (e) {
      console.error('Failed to send direct WhatsApp message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const insertCannedText = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="h-[calc(100dvh-64px)] md:h-[calc(100vh-2px)] flex flex-col bg-white pb-16 md:pb-0">
      {/* Inbox Header (Hidden on mobile when in chat view for native feel) */}
      <div className={`h-16 border-b border-slate-200 px-4 md:px-6 items-center justify-between shrink-0 bg-white ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Boîte de Réception Omnicanale WhatsApp
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Gestion centralisée des conversations clients • Passage Humain/IA en un clic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            WhatsApp Connecté
          </span>
          <button
            onClick={fetchConversations}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Actualiser les messages"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Inbox Body: Responsive Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Chat List */}
        <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & Filter */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                className="w-full bg-slate-100 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('ai')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors ${
                  filter === 'ai'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                IA Bot
              </button>
              <button
                onClick={() => setFilter('human')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors ${
                  filter === 'human'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                À Traiter
              </button>
            </div>
          </div>

          {/* Conversations Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
            {conversations
              .filter((c) => {
                if (filter === 'ai') return c.isAiActive;
                if (filter === 'human') return c.needsHumanTakeover || !c.isAiActive;
                return true;
              })
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setSelectedChatId(chat.id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 cursor-pointer transition-colors active:bg-slate-100 ${
                    (currentChat && currentChat.id === chat.id)
                      ? 'bg-blue-50/90 border-l-4 border-blue-600'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate">
                      {chat.customerName.includes('Client (+19') || chat.customerName.includes('Client (+')
                        ? (chat.realPhoneNumber ? `Client (${formatDisplayPhone(chat.realPhoneNumber)})` : chat.pushName || 'Nouveau client WhatsApp')
                        : chat.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400">{chat.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono text-[10px] flex items-center gap-1.5 truncate">
                      <span>{chat.city}</span>
                      <span>•</span>
                      <span className={chat.realPhoneNumber ? 'text-emerald-700 font-bold' : isLidNumber(chat.phoneNumber) ? 'text-amber-700 font-semibold' : ''}>
                        {formatDisplayPhone(chat.phoneNumber, chat.realPhoneNumber)}
                      </span>
                      {isLidNumber(chat.phoneNumber) && !chat.realPhoneNumber && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-sans font-bold">LID</span>
                      )}
                    </span>
                    <span className="font-bold text-emerald-600 shrink-0">
                      {chat.totalAmount} MAD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-1">
                    {chat.lastMessage}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {chat.isAiActive ? (
                        <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          AI Actif
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          Humain
                        </span>
                      )}
                      {chat.needsHumanTakeover && (
                        <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                          Aide Requise
                        </span>
                      )}
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Column: Chat Conversation Thread */}
        {currentChat ? (
          <>
            <div className={`w-full flex-1 flex flex-col bg-[#F0F2F5]/60 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
            {/* Thread Header */}
            <div className="h-14 border-b border-slate-200 bg-white px-3 md:px-6 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 mr-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                  title="Retour à la liste"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-900 truncate">
                      {currentChat.customerName.includes('Client (+19') || currentChat.customerName.includes('Client (+')
                        ? (currentChat.realPhoneNumber ? `Client (${formatDisplayPhone(currentChat.realPhoneNumber)})` : currentChat.pushName || 'Nouveau client WhatsApp')
                        : currentChat.customerName}
                    </h2>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                      {currentChat.city}
                    </span>
                  </div>

                  {isEditingPhone ? (
                    <div className="flex items-center gap-1.5 mt-1 bg-amber-50 p-1 rounded-lg border border-amber-200">
                      <input
                        type="text"
                        value={editPhoneInput}
                        onChange={(e) => setEditPhoneInput(e.target.value)}
                        placeholder="Numéro réel du client (ex: 0612345678)"
                        className="text-xs px-2 py-0.5 rounded bg-white border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 font-mono"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRealPhone}
                        disabled={savingPhone || !editPhoneInput.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>{savingPhone ? '...' : 'Enregistrer'}</span>
                      </button>
                      <button
                        onClick={() => setIsEditingPhone(false)}
                        className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                      <span className={`font-mono font-bold ${currentChat.realPhoneNumber ? 'text-emerald-700' : isLidNumber(currentChat.phoneNumber) ? 'text-amber-800' : 'text-slate-700'}`}>
                        {formatDisplayPhone(currentChat.phoneNumber, currentChat.realPhoneNumber)}
                      </span>
                      {isLidNumber(currentChat.phoneNumber) && !currentChat.realPhoneNumber && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded">
                          WhatsApp LID
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditPhoneInput(currentChat.realPhoneNumber || (!isLidNumber(currentChat.phoneNumber) ? currentChat.phoneNumber : ''));
                          setIsEditingPhone(true);
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline font-semibold ml-1 cursor-pointer"
                        title="Modifier ou saisir le numéro de téléphone réel du client"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>{isLidNumber(currentChat.phoneNumber) && !currentChat.realPhoneNumber ? 'Définir numéro réel' : 'Modifier numéro'}</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 font-mono">
                        {currentChat.orderNumber} ({currentChat.totalAmount} MAD)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Takeover Switch & Call */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleTakeover(currentChat.id)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors ${
                    currentChat.isAiActive
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {currentChat.isAiActive ? (
                    <>
                      <Headphones className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prendre la main</span>
                      <span className="sm:hidden">Stop Bot</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Réactiver l'IA</span>
                      <span className="sm:hidden">IA</span>
                    </>
                  )}
                </button>

                <a
                  href={`tel:${currentChat.realPhoneNumber || currentChat.phoneNumber}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Appeler le client"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => setShowOrderPanel(!showOrderPanel)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showOrderPanel
                      ? 'bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Détails de la commande liée & logistique"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Commande</span>
                  {matchingOrder && (
                    <span className="text-[9px] bg-blue-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
                      {matchingOrder.orderNumber}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-4">
              {/* Alert Banner for LID without confirmed real phone */}
              {isLidNumber(currentChat.phoneNumber) && !currentChat.realPhoneNumber && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <div>
                      <span className="font-bold">Identifiant WhatsApp (WhatsApp LID) :</span>
                      <span className="ml-1">Cette conversation provient d'un identifiant temporaire (+{currentChat.phoneNumber}). Saisissez le numéro réel du client (06... / 07...) pour la relier à sa commande.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditPhoneInput('');
                      setIsEditingPhone(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-colors cursor-pointer"
                  >
                    Saisir le numéro réel
                  </button>
                </div>
              )}

              {/* AI Status Banner */}
              <div className="text-center">
                <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium px-3 py-1 rounded-full">
                  {currentChat.isAiActive
                    ? '🤖 Agent IA (Darija Maroc) gère automatiquement cette conversation'
                    : '👤 Mode manuel: Un agent humain répond actuellement via WhatsApp'}
                </span>
              </div>

              {/* Dynamic Conversation Messages */}
              {currentChat.messages && currentChat.messages.length > 0 ? (
                currentChat.messages.map((msg) => {
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const isAgent = msg.sender === 'AGENT';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isCustomer ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] sm:max-w-md shadow-xs ${
                          isCustomer
                            ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                            : isAgent
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-blue-600 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.isLocation && msg.locationUrl ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-rose-500">
                              <MapPin className="w-4 h-4" />
                              <span>Localisation GPS Reçue</span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Le client a partagé son emplacement WhatsApp précis:
                            </p>
                            <a
                              href={msg.locationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold px-2 py-1 rounded-md"
                            >
                              Ouvrir dans Google Maps
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : msg.isVoice ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl text-slate-800">
                              <button className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                              <div className="flex-1">
                                <div className="h-1 bg-slate-300 rounded-full w-24" />
                                <span className="text-[9px] text-slate-400 mt-1 block">
                                  Note Vocale WhatsApp
                                </span>
                              </div>
                            </div>
                            {msg.voiceTranscription && (
                              <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2 rounded-lg border border-emerald-100">
                                <span className="font-bold block text-[10px] text-emerald-900">
                                  📝 Transcription Whisper:
                                </span>
                                "{msg.voiceTranscription}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        {msg.timestamp} •{' '}
                        {isCustomer
                          ? currentChat.customerName
                          : isAgent
                          ? 'Agent Humain'
                          : 'IA Bot (Darija)'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-slate-400 py-10">
                  Aucun message échangé pour le moment.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Darija Quick Canned Responses */}
            <div className="px-3 md:px-6 py-2 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-slate-400 text-[10px] shrink-0 font-medium">
                Réponses Rapides:
              </span>
              <button
                onClick={() =>
                  insertCannedText(
                    'مرحبا بك أخي، تم تأكيد طلبك وغادي توصلك الكولية غدا مع موزع Sendit.'
                  )
                }
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                Confirmer commande ✓
              </button>
              <button
                onClick={() =>
                  insertCannedText(
                    'عفاك واش تقدر تشارك معنا الموقع ديالك بالخريطة (Localisation WhatsApp)؟'
                  )
                }
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                Demander Localisation 📍
              </button>
              <button
                onClick={() =>
                  insertCannedText(
                    'الموزع في الطريق لعندك اليوم، المرجو تجهيز المبلغ نقداً.'
                  )
                }
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                Avis Livreur en route 🚚
              </button>
            </div>

            {/* Reply Form */}
            <form
              onSubmit={handleSend}
              className="p-3 md:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Écrire un message en Darija ou Français..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-xs shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{isSending ? 'Envoi...' : 'Envoyer'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Linked Order & Sendit Tracking Context */}
            {showOrderPanel && (
              <div className="w-80 lg:w-88 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-teal-600" />
                    <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                      Commande & Logistique
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowOrderPanel(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {matchingOrder ? (
                  <div className="space-y-4 text-xs">
                    {/* Stage & Order Number Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {matchingOrder.orderNumber}
                        </span>
                        {matchingOrder.stage === 'PENDING_CONFIRMATION' && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <ClipboardCheck className="w-3 h-3 text-amber-600" /> 1. À Confirmer
                          </span>
                        )}
                        {matchingOrder.stage === 'PROCESSING' && (
                          <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <Package className="w-3 h-3 text-blue-600" /> 2. En Préparation
                          </span>
                        )}
                        {matchingOrder.stage === 'IN_TRANSIT' && (
                          <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <Truck className="w-3 h-3 text-indigo-600" /> 3. En Livraison
                          </span>
                        )}
                        {matchingOrder.stage === 'COMPLETED' && (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 4. Livrée & Encaissée
                          </span>
                        )}
                        {matchingOrder.stage === 'CANCELED' && (
                          <span className="bg-rose-100 text-rose-900 border border-rose-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Annulée
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>Créée: {matchingOrder.createdAt}</span>
                        <span className="font-bold text-slate-700">Méthode: {matchingOrder.payment.method}</span>
                      </div>
                    </div>

                    {/* Customer Destination Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Destinataire & Adresse
                      </span>
                      <p className="font-bold text-slate-900">{matchingOrder.customer.name}</p>
                      <p className="text-slate-600 font-mono text-[11px]">{matchingOrder.customer.phone}</p>
                      <p className="text-slate-700 text-[11px] flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{matchingOrder.customer.city} • {matchingOrder.customer.address || 'Adresse à confirmer'}</span>
                      </p>
                      {matchingOrder.customer.notes && (
                        <div className="bg-amber-50 text-amber-900 p-2 rounded-xl text-[10px] border border-amber-200/60 font-medium">
                          Note: {matchingOrder.customer.notes}
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Articles du Panier
                      </span>
                      {matchingOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 py-1.5 border-b border-slate-100 last:border-0">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <Box className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{item.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Qté: {item.quantity} {item.size ? `• Taille: ${item.size}` : ''}
                            </span>
                          </div>
                          <span className="font-black text-slate-900 font-mono shrink-0">
                            {item.price * item.quantity} MAD
                          </span>
                        </div>
                      ))}

                      {/* Total Cash to Collect */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">Total COD à encaisser:</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">
                          {matchingOrder.payment.amount} MAD
                        </span>
                      </div>
                    </div>

                    {/* Shipping & Sendit Status */}
                    {matchingOrder.shipping && (
                      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                            Transporteur Sendit.ma
                          </span>
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <p className="font-mono font-bold text-xs text-blue-950">
                          N° Suivi: {matchingOrder.shipping.trackingNumber || 'En attente d\'attribution'}
                        </p>
                        <p className="text-[11px] text-blue-800">
                          Statut: <strong>{matchingOrder.shipping.liveStatus}</strong>
                        </p>
                        {matchingOrder.shipping.driverName && (
                          <p className="text-[10px] text-blue-700">
                            Livreur: {matchingOrder.shipping.driverName} ({matchingOrder.shipping.driverPhone})
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quick Lifecycle Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Actions Directes sur la Commande
                      </span>

                      {matchingOrder.stage === 'PENDING_CONFIRMATION' && (
                        <button
                          type="button"
                          onClick={() => {
                            confirmOrder(matchingOrder.id);
                            showToast(`Commande ${matchingOrder.orderNumber} confirmée et transmise au packing !`, 'success');
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirmer la Commande (➔ Packing)
                        </button>
                      )}

                      {matchingOrder.stage === 'PROCESSING' && (
                        <button
                          type="button"
                          onClick={() => {
                            shipOrder(matchingOrder.id);
                            showToast(`Colis ${matchingOrder.orderNumber} étiqueté et prêt pour ramassage Sendit !`, 'success');
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Expédier Sendit (➔ En livraison)
                        </button>
                      )}

                      {matchingOrder.stage === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          onClick={() => {
                            markDelivered(matchingOrder.id);
                            showToast(`Commande ${matchingOrder.orderNumber} marquée livrée et fonds encaissés !`, 'success');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marquer Livrée & Encaissée (POD)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          cancelOrder(matchingOrder.id, 'Annulée suite à la conversation WhatsApp');
                          showToast(`Commande ${matchingOrder.orderNumber} annulée.`, 'info');
                        }}
                        className="w-full bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        Annuler la commande
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                    <ShoppingBag className="w-6 h-6 text-slate-400 mx-auto" />
                    <div>
                      <p className="font-bold text-slate-700">Aucune commande directement liée</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Numéro provisoire: {currentChat.orderNumber || '#NON-LIÉ'} • {currentChat.totalAmount || 0} MAD
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Sélectionnez une conversation pour afficher les messages.
          </div>
        )}
      </div>
    </div>
  );
}
