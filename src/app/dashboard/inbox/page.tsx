'use client';

import React, { useState } from 'react';
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
  Pause,
  Clock,
  ShieldAlert,
  Sparkles,
  Paperclip,
  CheckCheck
} from 'lucide-react';

interface ChatConversation {
  id: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  totalAmount: number;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  isAiActive: boolean;
  needsHumanTakeover: boolean;
  takeoverReason?: string;
  hasVoiceNote?: boolean;
}

const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'c1',
    orderNumber: 'MA-20492',
    customerName: 'Khadija El Amrani',
    phoneNumber: '0655819033',
    city: 'Marrakech',
    totalAmount: 249,
    lastMessage: 'كنت فالحمام ماسمعتش، عفاك صيفطوها مورا الـ 3',
    lastTime: '09:20',
    unreadCount: 1,
    isAiActive: true,
    needsHumanTakeover: false,
    hasVoiceNote: true,
  },
  {
    id: 'c2',
    orderNumber: 'MA-20495',
    customerName: 'Othmane Jabri',
    phoneNumber: '0612398471',
    city: 'Tanger',
    totalAmount: 320,
    lastMessage: 'مرحبا، راني كنسكن فمالاباطا، يتصل بيا الموزع',
    lastTime: '18:45',
    unreadCount: 0,
    isAiActive: false,
    needsHumanTakeover: true,
    takeoverReason: 'Risque élevé de retour & Demande contact humain',
  },
  {
    id: 'c3',
    orderNumber: 'MA-20491',
    customerName: 'Yassine Benkirane',
    phoneNumber: '0661294821',
    city: 'Casablanca',
    totalAmount: 399,
    lastMessage: 'وعليكم السلام، نعم المقاس مزيان والعنوان هو هذاك',
    lastTime: '14:22',
    unreadCount: 0,
    isAiActive: true,
    needsHumanTakeover: false,
  },
];

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedChatId, setSelectedChatId] = useState<string>('c1');
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [inputMessage, setInputMessage] = useState('');

  const currentChat = conversations.find((c) => c.id === selectedChatId) || conversations[0];

  const handleToggleTakeover = (chatId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, isAiActive: !c.isAiActive, needsHumanTakeover: false } : c
      )
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    setInputMessage('');
    // Auto turn off AI when human sends message
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedChatId ? { ...c, isAiActive: false } : c))
    );
  };

  const insertCannedText = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="h-[calc(100vh-2px)] flex flex-col bg-white">
      {/* Inbox Header */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Boîte de Réception Omnicanale WhatsApp
            </h1>
            <p className="text-[11px] text-slate-500">
              Gestion centralisée des conversations clients • Passage Humain/IA en un clic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
            Passerelle: Evolution API (WhatsApp Connecté)
          </span>
        </div>
      </div>

      {/* Main Inbox Body: Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Chat List */}
        <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
          {/* Search & Filter */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                className="w-full bg-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1 rounded-md font-medium text-center ${
                  filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('ai')}
                className={`flex-1 py-1 rounded-md font-medium text-center ${
                  filter === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                IA Bot
              </button>
              <button
                onClick={() => setFilter('human')}
                className={`flex-1 py-1 rounded-md font-medium text-center ${
                  filter === 'human' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                À Traiter
              </button>
            </div>
          </div>

          {/* Conversations Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations
              .filter((c) => {
                if (filter === 'ai') return c.isAiActive;
                if (filter === 'human') return c.needsHumanTakeover || !c.isAiActive;
                return true;
              })
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedChatId === chat.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate">{chat.customerName}</span>
                    <span className="text-[10px] text-slate-400">{chat.lastTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono">{chat.city} • {chat.orderNumber}</span>
                    <span className="font-bold text-emerald-600">{chat.totalAmount} MAD</span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-1">
                    {chat.lastMessage}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {chat.isAiActive ? (
                        <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          AI Actif
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Humain
                        </span>
                      )}
                      {chat.needsHumanTakeover && (
                        <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          Aide Requise
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Column: Chat Conversation Thread */}
        <div className="flex-1 flex flex-col bg-slate-50/30">
          
          {/* Thread Header */}
          <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900">{currentChat.customerName}</h2>
                <span className="font-mono text-[11px] text-slate-400">({currentChat.phoneNumber})</span>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {currentChat.city}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Commande {currentChat.orderNumber} • Montant: {currentChat.totalAmount} MAD
              </p>
            </div>

            {/* AI Takeover Switch */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleTakeover(currentChat.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                  currentChat.isAiActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {currentChat.isAiActive ? (
                  <>
                    <Headphones className="w-3.5 h-3.5" />
                    Prendre la main (Stop Bot)
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    Réactiver l'IA Gemini
                  </>
                )}
              </button>

              <a
                href={`tel:${currentChat.phoneNumber}`}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            
            {/* AI Status Banner */}
            <div className="text-center">
              <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium px-3 py-1 rounded-full">
                {currentChat.isAiActive
                  ? '🤖 Gemini 1.5 Flash gère automatiquement cette conversation en Darija'
                  : '👤 Mode manuel: Un agent humain répond actuellement'}
              </span>
            </div>

            {/* Sample Messages */}
            <div className="flex flex-col items-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-2 text-xs max-w-md shadow-xs">
                أهلاً لالة خديجة، حاول موزع Sendit يتواصل معاك قبل قليل ولكن تعذر الوصول ليك. واش تحبي نبرمجوا التوصيل لغداً في نفس الوقت؟
              </div>
              <span className="text-[10px] text-slate-400 mt-1">09:16 • Gemini Bot</span>
            </div>

            {/* Voice Note Simulation */}
            <div className="flex flex-col items-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-xs max-w-md shadow-xs space-y-2">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                  <button className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <div className="flex-1">
                    <div className="h-1 bg-slate-300 rounded-full w-32" />
                    <span className="text-[10px] text-slate-400 mt-1 block">0:14 • Note Vocale WhatsApp</span>
                  </div>
                </div>
                <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold block text-[10px] text-emerald-900">📝 نص الرسالة الصوتية (Whisper):</span>
                  "كنت فالحمام ماسمعتش التيليفون، عفاك صيفطوه ليا مورا 3 دالعشية راني فدار"
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">09:20 • الزبونة</span>
            </div>
          </div>

          {/* Darija Quick Canned Responses */}
          <div className="px-6 py-2 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 text-[10px] shrink-0 font-medium">Réponses Rapides:</span>
            <button
              onClick={() => insertCannedText('مرحبا بك أخي، تم تأكيد طلبك وغادي توصلك الكولية غدا مع موزع Sendit.')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap"
            >
              تأكيد الطلب ✓
            </button>
            <button
              onClick={() => insertCannedText('عفاك واش تقدر تشارك معنا الموقع ديالك بالخريطة (Localisation WhatsApp)؟')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap"
            >
              طلب الـ Localisation 📍
            </button>
            <button
              onClick={() => insertCannedText('الموزع في الطريق لعندك اليوم، المرجو تجهيز المبلغ نقداً.')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap"
            >
              تنبيه الموزع 🚚
            </button>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrire un message en Darija ou Français..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
