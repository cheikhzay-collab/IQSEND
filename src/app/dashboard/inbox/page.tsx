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
  ChevronLeft
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '@/lib/inbox-store';

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // Poll every 3.5s for live incoming messages from WhatsApp
    const timer = setInterval(fetchConversations, 3500);
    return () => clearInterval(timer);
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedChatId]);

  const currentChat =
    conversations.find((c) => c.id === selectedChatId) || conversations[0];

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
                      {chat.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400">{chat.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono text-[10px]">
                      {chat.city} • {chat.orderNumber}
                    </span>
                    <span className="font-bold text-emerald-600">
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
                      {currentChat.customerName}
                    </h2>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                      {currentChat.city}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentChat.phoneNumber} • {currentChat.orderNumber} ({currentChat.totalAmount} MAD)
                  </p>
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
                  href={`tel:${currentChat.phoneNumber}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Appeler le client"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-4">
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
                className="font-arabic bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                تأكيد الطلب ✓
              </button>
              <button
                onClick={() =>
                  insertCannedText(
                    'عفاك واش تقدر تشارك معنا الموقع ديالك بالخريطة (Localisation WhatsApp)؟'
                  )
                }
                className="font-arabic bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                طلب الـ Localisation 📍
              </button>
              <button
                onClick={() =>
                  insertCannedText(
                    'الموزع في الطريق لعندك اليوم، المرجو تجهيز المبلغ نقداً.'
                  )
                }
                className="font-arabic bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap active:scale-95 transition-transform"
              >
                تنبيه الموزع 🚚
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Sélectionnez une conversation pour afficher les messages.
          </div>
        )}
      </div>
    </div>
  );
}
