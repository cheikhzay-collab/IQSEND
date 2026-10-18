'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Headphones,
  Package,
  Users,
  Inbox,
  Bot,
  Zap,
  Puzzle,
  Folder,
  Megaphone,
  Settings,
  ChevronDown,
  Search,
  Sparkles,
  MessageSquare,
  Bell,
  Scan,
  ClipboardCheck,
  Truck,
  CheckCircle2,
  FileText,
  ShoppingCart,
  Star,
  Menu,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    pendingCount,
    processingCount,
    inTransitCount,
    completedCount,
    toast,
    clearToast,
  } = useOrderLifecycle();

  const isOrdersActive =
    pathname === '/dashboard/orders' ||
    pathname.startsWith('/dashboard/orders') ||
    pathname === '/';

  // Navigation Links Definition
  const mainNavItems = [
    {
      label: 'Tableau de bord',
      href: '/dashboard',
      icon: Home,
      exact: true,
    },
    {
      label: 'Centres d\'appels',
      href: '/dashboard/call-center',
      icon: Headphones,
    },
    {
      label: 'Produits & Stock',
      href: '/dashboard/products',
      icon: Package,
    },
    {
      label: 'Clients',
      href: '/dashboard/customers',
      icon: Users,
    },
    {
      label: 'Messagerie (WhatsApp)',
      href: '/dashboard/inbox',
      icon: Inbox,
      badge: 4,
      isWhatsapp: true,
    },
    {
      label: 'Agents IA (Gemini)',
      href: '/dashboard/ai-agents',
      icon: Bot,
      highlight: true,
    },
    {
      label: 'Automatisations',
      href: '/dashboard/automations',
      icon: Zap,
    },
    {
      label: 'Intégrations',
      href: '/dashboard/integrations',
      icon: Puzzle,
    },
    {
      label: 'Suivi Chauffeurs Sendit',
      href: '/dashboard/tracking',
      icon: Truck,
    },
    {
      label: 'Contenu & Templates',
      href: '/dashboard/content',
      icon: Folder,
    },
  ];

  const orderStages = [
    {
      label: '1. En attente',
      href: '/dashboard/orders/pending',
      icon: ClipboardCheck,
      count: pendingCount,
      countClass: 'bg-amber-500 text-white animate-pulse',
      activeClass: 'bg-amber-50 text-amber-900 font-bold',
      iconColor: 'text-amber-600',
    },
    {
      label: '2. En préparation',
      href: '/dashboard/orders/processing',
      icon: Package,
      count: processingCount,
      countClass: 'bg-blue-100 text-blue-700 font-bold',
      activeClass: 'bg-blue-50 text-blue-900 font-bold',
      iconColor: 'text-blue-600',
    },
    {
      label: '3. En livraison',
      href: '/dashboard/orders/in-transit',
      icon: Truck,
      count: inTransitCount,
      countClass: 'bg-indigo-100 text-indigo-700 font-bold',
      activeClass: 'bg-indigo-50 text-indigo-900 font-bold',
      iconColor: 'text-indigo-600',
    },
    {
      label: '4. Livrées & Encaissées',
      href: '/dashboard/orders/completed',
      icon: CheckCircle2,
      count: completedCount,
      countClass: 'bg-emerald-100 text-emerald-700 font-bold',
      activeClass: 'bg-emerald-50 text-emerald-900 font-bold',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800 antialiased selection:bg-teal-500 selection:text-white">

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP GLOBAL NAVIGATION BAR (DESKTOP + MOBILE)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      
      {/* 1A. DESKTOP HEADER (MD & UP) */}
      <header className="hidden md:flex h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-5 items-center justify-between sticky top-0 z-40 transition-shadow duration-200 shadow-2xs">
        {/* Left: Brand Logo & Global Search */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard/orders" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              ◧
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-slate-900 leading-none">
                SENDIT <span className="text-teal-600 font-extrabold text-xs ml-0.5">COD</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                Logistique Maroc
              </span>
            </div>
          </Link>

          {/* Search bar with ⌘K & Scan icon */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all w-80 bg-slate-50/70 ${
              searchFocused
                ? 'border-teal-500 bg-white ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher commandes, clients, colis..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none flex-1 font-medium"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                ⌘ K
              </span>
              <Scan className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
          </div>
        </div>

        {/* Right: Team, Balance, Assistant IA, Messages, Notifications, Workspace */}
        <div className="flex items-center gap-3">
          {/* Team Members Overlapping Avatars */}
          <div className="flex items-center -space-x-1.5">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
              alt="Team"
              className="w-6 h-6 rounded-full border border-white object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
              alt="Team"
              className="w-6 h-6 rounded-full border border-white object-cover"
            />
            <div className="w-6 h-6 rounded-full bg-[#7c3aed] text-white text-[10px] font-bold flex items-center justify-center border border-white">
              A
            </div>
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center border border-white">
              +2
            </div>
          </div>

          {/* Balance Pill */}
          <div className="px-3 py-1 rounded-full border border-amber-200 bg-amber-50/70 text-amber-800 text-xs font-black shadow-2xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            240.00 MAD
          </div>

          {/* AI Sparkles */}
          <Link
            href="/dashboard/ai-agents"
            className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Assistant IA Gemini"
          >
            <Sparkles className="w-4 h-4 text-slate-500 hover:text-teal-600" />
          </Link>

          {/* Messages with notification dot */}
          <Link
            href="/dashboard/inbox"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
            title="Messagerie WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1 right-1 ring-2 ring-white animate-pulse" />
          </Link>

          {/* Bell Notifications with count badge (38) */}
          <button
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
              38
            </span>
          </button>

          {/* Workspace Selector */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center tracking-tighter">
              AT
            </div>
            <span className="text-xs font-black text-slate-800">ATLAS</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </header>

      {/* 1B. MOBILE APP HEADER (< MD) */}
      <header className="md:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        {/* Left: Hamburger Button + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs">
              ◧
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-slate-900">
                SENDIT
              </span>
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.2 rounded">
                COD
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Quick Search, Balance Chip & Notification */}
        <div className="flex items-center gap-2">
          {/* Quick search button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Recherche rapide"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile Balance Chip */}
          <div className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-black">
            240 DH
          </div>

          {/* Notifications bell */}
          <Link
            href="/dashboard/inbox"
            className="p-1.5 text-slate-600 hover:text-slate-900 relative rounded-xl"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 ring-2 ring-white" />
          </Link>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE QUICK SEARCH OVERLAY                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 max-w-lg w-full mx-auto space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-xs text-slate-900">Recherche Mobile Rapide</h3>
              </div>
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="N° commande, client, ville, téléphone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-teal-600 focus:bg-white"
              />
            </div>

            <div className="pt-1 flex flex-wrap gap-1.5">
              <Link
                href="/dashboard/orders/pending"
                onClick={() => setMobileSearchOpen(false)}
                className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg"
              >
                1. À confirmer ({pendingCount})
              </Link>
              <Link
                href="/dashboard/orders/processing"
                onClick={() => setMobileSearchOpen(false)}
                className="text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg"
              >
                2. En préparation ({processingCount})
              </Link>
              <Link
                href="/dashboard/orders/in-transit"
                onClick={() => setMobileSearchOpen(false)}
                className="text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg"
              >
                3. En livraison ({inTransitCount})
              </Link>
              <Link
                href="/dashboard/inbox"
                onClick={() => setMobileSearchOpen(false)}
                className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg"
              >
                💬 WhatsApp Inbox
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE SLIDE-OVER DRAWER MENU (< MD)                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="fixed inset-y-0 left-0 max-w-[85vw] w-72 bg-white shadow-2xl flex flex-col justify-between z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                    ◧
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900">SENDIT COD</h2>
                    <p className="text-[10px] text-slate-400">Navigation Complète</p>
                  </div>
                </Link>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links Scrollable */}
              <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
                {/* 1. Home */}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>Tableau de bord</span>
                </Link>

                {/* 2. Orders with sub-stages */}
                <div className="pt-1">
                  <Link
                    href="/dashboard/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isOrdersActive
                        ? 'bg-teal-50 text-teal-950 font-black border border-teal-200/80'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Toutes les Commandes</span>
                    </div>
                    {pendingCount > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                        {pendingCount}
                      </span>
                    )}
                  </Link>

                  {/* 4 Stages Submenu */}
                  <div className="ml-4 pl-3 border-l-2 border-slate-200 mt-1.5 space-y-1">
                    {orderStages.map((stage) => {
                      const Icon = stage.icon;
                      const isActive = pathname === stage.href;
                      return (
                        <Link
                          key={stage.href}
                          href={stage.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                            isActive
                              ? stage.activeClass
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${stage.iconColor}`} />
                            <span className="truncate">{stage.label}</span>
                          </div>
                          {stage.count > 0 && (
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${stage.countClass}`}
                            >
                              {stage.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Other Main Links */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  {mainNavItems.slice(1).map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${item.highlight ? 'text-teal-600' : 'text-slate-500'}`} />
                          <span className={item.highlight ? 'font-bold text-teal-900' : ''}>
                            {item.label}
                          </span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Paramètres & Passerelles</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. DESKTOP SIDEBAR + MAIN CONTENT AREA                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-w-0">
        
        {/* DESKTOP SIDEBAR (MD & UP) */}
        <aside className="hidden md:flex w-56 lg:w-60 bg-white border-r border-slate-200/90 flex-col justify-between shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] shadow-2xs">
          
          <div className="p-3 space-y-1 overflow-y-auto">
            
            {/* Home */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Tableau de bord</span>
            </Link>

            {/* Orders (Active Parent) */}
            <div>
              <Link
                href="/dashboard/orders"
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isOrdersActive
                    ? 'bg-teal-50 text-teal-950 font-bold border border-teal-200/60'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-teal-700" />
                  <span>Commandes</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* Submenu for Orders (Desktop) */}
              {isOrdersActive && (
                <div className="ml-3 mt-1.5 pl-3 border-l-2 border-slate-200/80 space-y-1 text-xs">
                  {orderStages.map((stage) => {
                    const Icon = stage.icon;
                    const isActive = pathname === stage.href;
                    return (
                      <Link
                        key={stage.href}
                        href={stage.href}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? stage.activeClass
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${stage.iconColor}`} />
                          <span className="truncate">{stage.label}</span>
                        </div>
                        {stage.count > 0 && (
                          <span
                            className={`shrink-0 ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs ${stage.countClass}`}
                          >
                            {stage.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {/* Divider */}
                  <div className="my-1.5 border-t border-slate-200/70" />

                  {/* Drafts */}
                  <Link
                    href="/dashboard/orders/drafts"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/drafts'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Brouillons</span>
                  </Link>

                  {/* Abandoned Carts */}
                  <Link
                    href="/dashboard/orders/abandoned"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/abandoned'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Paniers abandonnés</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200 shrink-0">
                      3
                    </span>
                  </Link>

                  {/* Reviews */}
                  <Link
                    href="/dashboard/orders/reviews"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/reviews'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Star className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Avis clients</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 shrink-0">
                      ★ 4.9
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Other Sidebar Links */}
            <Link
              href="/dashboard/call-center"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/call-center'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Headphones className="w-4 h-4 text-slate-500" />
              <span>Centres d'appels</span>
            </Link>

            <Link
              href="/dashboard/products"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/products'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>Produits & Stock</span>
            </Link>

            <Link
              href="/dashboard/customers"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/customers'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Clients</span>
            </Link>

            {/* Inbox WhatsApp */}
            <Link
              href="/dashboard/inbox"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/inbox'
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-emerald-600" />
                <span>Messagerie</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">4</span>
                <div className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.529 1.838.805 2.791.805h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.767-5.769-5.767zm3.364 8.204c-.14.394-.809.734-1.121.78-.31.047-.704.067-1.139-.074-.27-.087-.621-.202-1.071-.399-1.905-.829-3.14-2.76-3.235-2.888-.094-.128-.775-1.03-.775-1.964 0-.935.49-1.393.664-1.583.174-.19.38-.238.507-.238.127 0 .254.002.364.007.117.006.273-.044.428.328.16.38.547 1.332.595 1.429.047.097.079.21.016.335-.063.125-.095.203-.189.314-.094.111-.198.247-.283.332-.095.095-.194.198-.083.388.111.19.493.813 1.057 1.315.727.646 1.34.846 1.53.941.19.095.301.079.412-.048.111-.127.476-.554.603-.744.127-.19.254-.159.428-.095.174.063 1.109.523 1.299.618.19.095.317.143.364.222.048.079.048.459-.092.853z" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* AI Agents */}
            <Link
              href="/dashboard/ai-agents"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/ai-agents'
                  ? 'bg-teal-50 text-teal-950 font-bold border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-teal-600" />
              <span>Agents IA</span>
            </Link>

            <Link
              href="/dashboard/automations"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/automations'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4 text-slate-500" />
              <span>Automatisations</span>
            </Link>

            <Link
              href="/dashboard/integrations"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/integrations'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Puzzle className="w-4 h-4 text-slate-500" />
              <span>Intégrations</span>
            </Link>

            <Link
              href="/dashboard/tracking"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/tracking'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-slate-500" />
              <span>Suivi Chauffeurs</span>
            </Link>

            {/* Marketing (Collapsible) */}
            <div>
              <Link
                href="/dashboard/marketing"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/marketing'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Megaphone className="w-4 h-4 text-slate-500" />
                  <span>Marketing</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setMarketingOpen(!marketingOpen);
                  }}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      marketingOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </Link>

              {marketingOpen && (
                <div className="ml-8 mt-1 space-y-1 text-xs">
                  <Link href="/dashboard/marketing" className="block py-1 text-slate-500 hover:text-slate-900 font-medium">
                    Campagnes WhatsApp
                  </Link>
                  <Link href="/dashboard/content" className="block py-1 text-slate-500 hover:text-slate-900 font-medium">
                    Modèles de Vente
                  </Link>
                  <Link href="/dashboard/finance" className="block py-1 text-slate-500 hover:text-slate-900 font-medium">
                    Dépenses & ROI
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Sidebar: Dedicated Support Card & Settings */}
          <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/40">
            <div className="bg-[#135d54] text-white p-3.5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-xs">Assistance & Support Dédié</h4>
              <p className="text-[10px] text-teal-100 mt-1 leading-tight">
                Accompagnement expert pour votre logistique COD Maroc
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Paramètres</span>
            </Link>
          </div>

        </aside>

        {/* MAIN VIEW CONTENT CONTAINER */}
        <main className="flex-1 min-w-0 overflow-x-auto pb-20 md:pb-6">
          {children}
        </main>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. NATIVE MOBILE APP BOTTOM NAVIGATION BAR (< MD)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-app-bottom px-2 py-1.5 flex items-center justify-around pb-safe">
        
        {/* Tab 1: Home */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            pathname === '/dashboard'
              ? 'text-slate-950 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 ${pathname === '/dashboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Accueil</span>
        </Link>

        {/* Tab 2: Orders */}
        <Link
          href="/dashboard/orders"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative transition-all ${
            isOrdersActive
              ? 'text-teal-700 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className={`w-5 h-5 ${isOrdersActive ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Commandes</span>
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 right-1.5 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
              {pendingCount}
            </span>
          )}
        </Link>

        {/* Tab 3: WhatsApp Inbox */}
        <Link
          href="/dashboard/inbox"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative transition-all ${
            pathname === '/dashboard/inbox'
              ? 'text-emerald-700 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${pathname === '/dashboard/inbox' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Messages</span>
          <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-[#25D366] ring-2 ring-white" />
        </Link>

        {/* Tab 4: AI Agents */}
        <Link
          href="/dashboard/ai-agents"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            pathname === '/dashboard/ai-agents'
              ? 'text-teal-700 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className={`w-5 h-5 ${pathname === '/dashboard/ai-agents' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px]">Agents IA</span>
        </Link>

        {/* Tab 5: Menu / More */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 hover:text-slate-800 active:scale-95 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>

      </nav>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. FLOATING ACTION TOAST                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-sm">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
          <span className="line-clamp-2">{toast.message}</span>
          <button
            onClick={clearToast}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
