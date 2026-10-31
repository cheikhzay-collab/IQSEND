'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ArrowRight,
  PackageCheck,
  Banknote,
  XCircle,
  RotateCcw,
  Shield,
  ShieldCheck,
  UserCheck,
  User,
  LogOut,
  Power
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';
import { useAuth } from '@/context/AuthContext';
import { TeamPresenceWidget } from '@/components/layout/TeamPresenceWidget';
import { AccessDeniedScreen } from '@/components/layout/AccessDeniedScreen';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const {
    pendingCount,
    processingCount,
    inTransitCount,
    completedCount,
    canceledCount,
    returnedCount,
    toast,
    clearToast,
  } = useOrderLifecycle();

  const { currentUser, hasPermission, canAccessRoute, logout, isLoading } = useAuth();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [isLoading, currentUser, router]);

  const isOrdersActive =
    pathname === '/dashboard/orders' ||
    pathname.startsWith('/dashboard/orders') ||
    pathname === '/dashboard/packing' ||
    pathname === '/dashboard/tracking' ||
    pathname === '/';

  const orderStages = [
    {
      label: '1. Confirmation',
      href: '/dashboard/orders/pending',
      icon: ClipboardCheck,
      count: pendingCount,
      countClass: 'bg-amber-500 text-white animate-pulse',
      activeClass: 'bg-amber-50 text-amber-900 font-bold',
      iconColor: 'text-amber-600',
    },
    {
      label: '2. En préparation (AWB)',
      href: '/dashboard/packing',
      icon: PackageCheck,
      count: processingCount,
      countClass: 'bg-blue-100 text-blue-700 font-bold',
      activeClass: 'bg-blue-50 text-blue-900 font-bold',
      iconColor: 'text-blue-600',
    },
    {
      label: '3. En livraison (Sendit)',
      href: '/dashboard/tracking',
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
    {
      label: '5. Retours (Transporteur Sendit)',
      href: '/dashboard/orders/returns',
      icon: RotateCcw,
      count: returnedCount,
      countClass: 'bg-amber-100 text-amber-800 font-bold',
      activeClass: 'bg-amber-50 text-amber-900 font-bold',
      iconColor: 'text-amber-600',
    },
    {
      label: '6. Annulées (Confirmation - 0 DH)',
      href: '/dashboard/orders/canceled',
      icon: XCircle,
      count: canceledCount,
      countClass: 'bg-rose-100 text-rose-700 font-bold',
      activeClass: 'bg-rose-50 text-rose-900 font-bold',
      iconColor: 'text-rose-600',
    },
  ];

  const isRouteAllowed = canAccessRoute(pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP GLOBAL NAVIGATION BAR (DESKTOP + MOBILE)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      
      {/* 1A. DESKTOP HEADER (MD & UP) */}
      <header className="hidden md:flex h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-5 items-center justify-between sticky top-0 z-40 transition-shadow duration-200 shadow-2xs gap-4">
        {/* Left: Brand Logo & Search */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              IQ
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-slate-900 leading-none">
                IQ<span className="text-emerald-600 font-extrabold text-xs ml-0.5">SEND</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                COD Suite Maroc • Sendit.ma
              </span>
            </div>
          </Link>

          {/* Search bar with ⌘K & Scan icon */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all w-80 bg-slate-50/70 ${
              searchFocused
                ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
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

        {/* Right: Team Presence Widget, Assistant IA, Messages, Notifications, Workspace */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Team Members Overlapping Avatars with Online Status Indicator */}
          <TeamPresenceWidget />

          {/* AI Sparkles */}
          {hasPermission('canAccessAiAgents') && (
            <Link
              href="/dashboard/ai-agents"
              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Assistant IA Gemini"
            >
              <Sparkles className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
            </Link>
          )}

          {/* Messages with notification dot */}
          {hasPermission('canAccessInbox') && (
            <Link
              href="/dashboard/inbox"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
              title="Messagerie WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1 right-1 ring-2 ring-white animate-pulse" />
            </Link>
          )}

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

          {/* Top Header User Profile & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100/90 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-200"
              title="Modifier mon profil et ma photo (تعديل البروفايل)"
            >
              <div className="relative">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500 transition-all"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center tracking-tighter">
                    {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                )}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 text-white absolute -bottom-0.5 -right-0.5 flex items-center justify-center ring-1 ring-white">
                  <User className="w-1.5 h-1.5" />
                </span>
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px] group-hover:text-emerald-700">
                  {currentUser?.name || 'Admin'}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <span>{currentUser?.role === 'ADMIN' ? 'Directeur Admin' : currentUser?.role || 'Agent'}</span>
                  <span className="text-[8px] text-slate-400 group-hover:text-emerald-600 font-normal">✏️</span>
                </span>
              </div>
            </button>

            {/* Top Logout Button */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200/80 transition-all cursor-pointer shadow-2xs active:scale-95 group"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* 1B. MOBILE APP HEADER (< MD) */}
      <header className="md:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        {/* Left: Hamburger Button + Brand with Live Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors active:scale-95 cursor-pointer relative"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 active:scale-95 transition-transform">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs">
              IQ
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm tracking-tight text-slate-900">
                  IQSEND
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                COD Suite Maroc
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Quick Team Presence, WhatsApp shortcut & Search */}
        <div className="flex items-center gap-1.5">
          <TeamPresenceWidget />

          {/* Quick WhatsApp shortcut on mobile */}
          {hasPermission('canAccessInbox') && (
            <Link
              href="/dashboard/inbox"
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors relative active:scale-95"
              title="Messagerie WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
            </Link>
          )}

          {/* Search Button */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
            aria-label="Recherche rapide"
          >
            <Search className="w-4 h-4" />
          </button>
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
                <Search className="w-4 h-4 text-emerald-600" />
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-600 focus:bg-white"
              />
            </div>

            <div className="pt-1 flex flex-wrap gap-1.5">
              {hasPermission('canAccessConfirmation') && (
                <Link
                  href="/dashboard/orders/pending"
                  onClick={() => setMobileSearchOpen(false)}
                  className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg"
                >
                  1. À confirmer ({pendingCount})
                </Link>
              )}
              {hasPermission('canAccessPacking') && (
                <Link
                  href="/dashboard/packing"
                  onClick={() => setMobileSearchOpen(false)}
                  className="text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg"
                >
                  2. En préparation ({processingCount})
                </Link>
              )}
              {hasPermission('canAccessTracking') && (
                <Link
                  href="/dashboard/tracking"
                  onClick={() => setMobileSearchOpen(false)}
                  className="text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg"
                >
                  3. En livraison ({inTransitCount})
                </Link>
              )}
              {hasPermission('canAccessInbox') && (
                <Link
                  href="/dashboard/inbox"
                  onClick={() => setMobileSearchOpen(false)}
                  className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg"
                >
                  💬 WhatsApp Inbox
                </Link>
              )}
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

          {/* Drawer Body - Native Mobile App Navigation Hub */}
          <div className="fixed inset-y-0 left-0 max-w-[88vw] w-80 bg-white shadow-2xl flex flex-col justify-between z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header & User Profile Card */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      IQ
                    </div>
                    <div>
                      <h2 className="font-black text-sm text-white tracking-tight leading-none">IQSEND COD</h2>
                      <span className="text-[10px] text-emerald-400 font-bold">Suite E-commerce Maroc</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Fermer le menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile pill (Clickable to edit profile) */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/10 transition-colors text-left cursor-pointer group"
                  title="Modifier mon profil et ma photo"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-400 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AD'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white truncate">{currentUser?.name || 'Administrateur'}</p>
                      <span className="text-[10px] text-emerald-300 font-semibold block">
                        {currentUser?.role === 'ADMIN' ? '👑 Directeur Admin' : currentUser?.role || 'Agent Confirmateur'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-400/30 font-bold shrink-0">
                    Modifier ✏️
                  </span>
                </button>
              </div>

              {/* Navigation Links Scrollable (Categorized for Native App Experience) */}
              <div className="p-3.5 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* Section 1: Dashboard Home */}
                <div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
                      pathname === '/dashboard'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 shrink-0" />
                      <span>Tableau de bord</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Vue Globale
                    </span>
                  </Link>
                </div>

                {/* Section 2: Cycle des Commandes (6 Étapes Clés) */}
                {hasPermission('canAccessOrders') && (
                  <div className="space-y-1">
                    <div className="px-2 pb-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        📦 Cycle des Commandes (6 Étapes)
                      </span>
                      {pendingCount > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                          {pendingCount} urgent
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 bg-slate-50/70 p-1.5 rounded-2xl border border-slate-200/70">
                      {orderStages.map((stage) => {
                        const Icon = stage.icon;
                        const isActive = pathname === stage.href;
                        return (
                          <Link
                            key={stage.href}
                            href={stage.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all active:scale-95 ${
                              isActive
                                ? stage.activeClass
                                : 'text-slate-700 hover:bg-white hover:text-slate-900 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Icon className={`w-4 h-4 shrink-0 ${stage.iconColor}`} />
                              <span className="truncate">{stage.label}</span>
                            </div>
                            {stage.count > 0 && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${stage.countClass}`}>
                                {stage.count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Vente & Intelligence Artificielle */}
                {(hasPermission('canAccessLeads') || hasPermission('canAccessConfirmation') || hasPermission('canAccessInbox') || hasPermission('canAccessAiAgents')) && (
                  <div className="space-y-1">
                    <div className="px-2 pb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        🤖 Vente & Intelligence Artificielle
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-50/70 p-1.5 rounded-2xl border border-slate-200/70">
                      {hasPermission('canAccessLeads') && (
                        <Link
                          href="/dashboard/leads"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                            pathname === '/dashboard/leads' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Leads & Capture IA</span>
                          </div>
                        </Link>
                      )}

                      {hasPermission('canAccessConfirmation') && (
                        <Link
                          href="/dashboard/call-center"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                            pathname === '/dashboard/call-center' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Headphones className="w-4 h-4 text-amber-600" />
                            <span>Centre d'appels</span>
                          </div>
                          {pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                              {pendingCount}
                            </span>
                          )}
                        </Link>
                      )}

                      {hasPermission('canAccessInbox') && (
                        <Link
                          href="/dashboard/inbox"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                            pathname === '/dashboard/inbox' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Inbox className="w-4 h-4 text-emerald-600" />
                            <span>Messagerie WhatsApp</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </Link>
                      )}

                      {hasPermission('canAccessAiAgents') && (
                        <Link
                          href="/dashboard/ai-agents"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                            pathname === '/dashboard/ai-agents' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Bot className="w-4 h-4 text-emerald-600" />
                            <span>Agents IA (Gemini Darija)</span>
                          </div>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Auto
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Logistique, Produits & Finances */}
                <div className="space-y-1">
                  <div className="px-2 pb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      📊 Logistique, Produits & Finances
                    </span>
                  </div>

                  <div className="space-y-1 bg-slate-50/70 p-1.5 rounded-2xl border border-slate-200/70">
                    {hasPermission('canAccessProducts') && (
                      <Link
                        href="/dashboard/products"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                          pathname === '/dashboard/products' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-slate-600" />
                          <span>Produits & Stock Hubs</span>
                        </div>
                      </Link>
                    )}

                    {hasPermission('canAccessCustomers') && (
                      <Link
                        href="/dashboard/customers"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                          pathname === '/dashboard/customers' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-slate-600" />
                          <span>Clients & CRM</span>
                        </div>
                      </Link>
                    )}

                    {hasPermission('canAccessFinance') && (
                      <Link
                        href="/dashboard/finance"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                          pathname === '/dashboard/finance' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Finances & Virements COD</span>
                        </div>
                      </Link>
                    )}

                    {hasPermission('canAccessTeam') && (
                      <Link
                        href="/dashboard/team"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold transition-all active:scale-95 ${
                          pathname === '/dashboard/team' ? 'bg-purple-50 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span>Équipe & Permissions (RBAC)</span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Drawer Footer with Settings & Logout */}
            <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/70 shrink-0">
              {hasPermission('canAccessSettings') && (
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Paramètres & Passerelles</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
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

            {/* Commandes Section (Filtered by canAccessOrders) */}
            {hasPermission('canAccessOrders') && (
              <div>
                <Link
                  href="/dashboard/orders"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isOrdersActive
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/60'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
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
                            <span className={`shrink-0 ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs ${stage.countClass}`}>
                              {stage.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Leads & Ingestion */}
            {hasPermission('canAccessLeads') && (
              <Link
                href="/dashboard/leads"
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/leads'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Leads & Capture IA</span>
                </div>
              </Link>
            )}

            {/* SECTION 2: CONFIRMATION & VENTE */}
            {(hasPermission('canAccessConfirmation') || hasPermission('canAccessInbox') || hasPermission('canAccessAiAgents')) && (
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Confirmation & Vente
                </span>
              </div>
            )}

            {hasPermission('canAccessConfirmation') && (
              <Link
                href="/dashboard/call-center"
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/call-center'
                    ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-amber-600" />
                  <span>Centre d'appels</span>
                </div>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}

            {/* Inbox WhatsApp */}
            {hasPermission('canAccessInbox') && (
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
                  <span>Messagerie WhatsApp</span>
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
            )}

            {/* AI Agents */}
            {hasPermission('canAccessAiAgents') && (
              <Link
                href="/dashboard/ai-agents"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/ai-agents'
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>Agents IA (Gemini Darija)</span>
              </Link>
            )}

            {/* SECTION 4: CATALOGUE & CLIENTS */}
            {(hasPermission('canAccessProducts') || hasPermission('canAccessCustomers')) && (
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Catalogue & CRM
                </span>
              </div>
            )}

            {hasPermission('canAccessProducts') && (
              <Link
                href="/dashboard/products"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/products'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>Produits & Stock Hubs</span>
              </Link>
            )}

            {hasPermission('canAccessCustomers') && (
              <Link
                href="/dashboard/customers"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/customers'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Clients & CRM</span>
              </Link>
            )}

            {/* SECTION 5: FINANCES & AUTOMATISATIONS */}
            {(hasPermission('canAccessFinance') || hasPermission('canAccessAutomations') || hasPermission('canAccessIntegrations')) && (
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Finances & Pilotage
                </span>
              </div>
            )}

            {hasPermission('canAccessFinance') && (
              <Link
                href="/dashboard/finance"
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/finance'
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Finances & Virements COD</span>
                </div>
              </Link>
            )}

            {hasPermission('canAccessAutomations') && (
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
            )}

            {hasPermission('canAccessIntegrations') && (
              <Link
                href="/dashboard/integrations"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/dashboard/integrations'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Puzzle className="w-4 h-4 text-slate-500" />
                <span>Intégrations & API Sendit</span>
              </Link>
            )}

            {/* SECTION 6: ADMINISTRATION & ÉQUIPE RBAC */}
            {hasPermission('canAccessTeam') && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Équipe & Rôles
                  </span>
                </div>

                <Link
                  href="/dashboard/team"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    pathname === '/dashboard/team' || pathname === '/dashboard/users'
                      ? 'bg-purple-50 text-purple-950 font-bold border border-purple-200/80'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Membres & Permissions</span>
                  </div>
                  <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                    RBAC
                  </span>
                </Link>
              </>
            )}

          </div>

          {/* Bottom Sidebar: Dedicated Support Card & Settings */}
          <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/40">
            <div className="bg-[#135d54] text-white p-3.5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-xs">Assistance & Support Dédié</h4>
              <p className="text-[10px] text-emerald-100 mt-1 leading-tight">
                Accompagnement expert pour votre logistique COD Maroc
              </p>
            </div>

            {hasPermission('canAccessSettings') && (
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Paramètres</span>
              </Link>
            )}

            {/* Active User Card & Dedicated Logout Button in Sidebar */}
            <div className="pt-2 border-t border-slate-200/60 space-y-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-all text-left cursor-pointer group"
                title="Modifier mon profil et ma photo (تعديل البروفايل)"
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300 group-hover:ring-emerald-500 transition-all"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 flex items-center gap-1">
                    <span>{currentUser?.name || 'Administrateur'}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-600">✏️</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    {currentUser?.email || 'admin@sendit.ma'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200/80 transition-all cursor-pointer shadow-2xs group"
                title="Se déconnecter du compte"
              >
                <LogOut className="w-4 h-4 text-rose-500 group-hover:text-white transition-colors" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>

        </aside>

        {/* MAIN VIEW CONTENT CONTAINER (With Route Protection) */}
        <main className="flex-1 min-w-0 overflow-x-auto pb-20 md:pb-6">
          {isRouteAllowed ? children : <AccessDeniedScreen pathname={pathname} />}
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

        {/* Tab 2: Orders (Confirmation Queue) */}
        {hasPermission('canAccessOrders') && (
          <Link
            href="/dashboard/orders/pending"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative transition-all active:scale-95 ${
              pathname.includes('/orders') || isOrdersActive
                ? 'text-emerald-700 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className={`w-5 h-5 ${pathname.includes('/orders') ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Commandes</span>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 right-1.5 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {pendingCount}
              </span>
            )}
          </Link>
        )}

        {/* Tab 3: WhatsApp Inbox */}
        {hasPermission('canAccessInbox') && (
          <Link
            href="/dashboard/inbox"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative transition-all active:scale-95 ${
              pathname === '/dashboard/inbox'
                ? 'text-emerald-700 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${pathname === '/dashboard/inbox' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">WhatsApp</span>
            <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-[#25D366] ring-2 ring-white animate-pulse" />
          </Link>
        )}

        {/* Tab 4: Sendit Logistics Tracking */}
        {hasPermission('canAccessTracking') ? (
          <Link
            href="/dashboard/tracking"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95 relative ${
              pathname === '/dashboard/tracking'
                ? 'text-indigo-700 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className={`w-5 h-5 ${pathname === '/dashboard/tracking' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Sendit</span>
            {inTransitCount > 0 && (
              <span className="absolute -top-0.5 right-1.5 bg-indigo-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {inTransitCount}
              </span>
            )}
          </Link>
        ) : hasPermission('canAccessAiAgents') ? (
          <Link
            href="/dashboard/ai-agents"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-95 ${
              pathname === '/dashboard/ai-agents'
                ? 'text-emerald-700 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bot className={`w-5 h-5 ${pathname === '/dashboard/ai-agents' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Agents IA</span>
          </Link>
        ) : null}

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
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="line-clamp-2">{toast.message}</span>
          <button
            onClick={clearToast}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. USER PROFILE MODAL (EDIT PROFILE & PICTURE)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

    </div>
  );
}
