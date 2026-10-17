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
  LayoutTemplate,
  Tag,
  Receipt,
  Settings,
  ChevronDown,
  ChevronRight,
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
  Check,
  X
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const {
    pendingCount,
    processingCount,
    inTransitCount,
    completedCount,
    toast,
    clearToast
  } = useOrderLifecycle();

  const isOrdersActive =
    pathname === '/dashboard/orders' ||
    pathname.startsWith('/dashboard/orders') ||
    pathname === '/';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800">
      
      {/* 1. TOP GLOBAL NAVIGATION BAR (EGROW STYLE) */}
      <header className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-40">
        
        {/* Left: Brand Logo & Search */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard/orders" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              ◧
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900">
              EGROW
            </span>
          </Link>

          {/* Search bar with ⌘K & Scan icon */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all w-80 bg-slate-50/60 ${
              searchFocused
                ? 'border-teal-500 bg-white ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none flex-1 font-medium"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                ⌘ K
              </span>
              <Scan className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
          </div>
        </div>

        {/* Right: Team Avatars, Balance, Icons, Workspace */}
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
          <div className="px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50/60 text-amber-700 text-xs font-bold">
            240.00 MAD
          </div>

          {/* AI Sparkles */}
          <button className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors" title="Assistant IA">
            <Sparkles className="w-4 h-4 text-slate-500 hover:text-teal-600" />
          </button>

          {/* Messages with notification dot */}
          <button className="p-1.5 text-slate-500 hover:text-slate-800 relative transition-colors" title="Messagerie">
            <MessageSquare className="w-4 h-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 right-1" />
          </button>

          {/* Bell Notifications with count badge (38) */}
          <button className="p-1.5 text-slate-500 hover:text-slate-800 relative transition-colors" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1 rounded-full">
              38
            </span>
          </button>

          {/* Workspace Selector (ATLAS) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-[9px] flex items-center justify-center tracking-tighter">
              AT
            </div>
            <span className="text-xs font-black text-slate-800">ATLAS</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

      </header>

      {/* 2. BODY: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex">
        
        {/* SIDEBAR (EGROW STYLE) */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
          
          <div className="p-3 space-y-1">
            
            {/* Home */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>Tableau de bord</span>
            </Link>

            {/* Orders (Active Parent) */}
            <div>
              <Link
                href="/dashboard/orders"
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isOrdersActive
                    ? 'bg-[#edf2f7] text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                  <span>Commandes</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* Submenu for Orders */}
              {isOrdersActive && (
                <div className="ml-3 mt-1.5 pl-3 border-l-2 border-slate-200/80 space-y-1 text-xs">
                  {/* 1. Pending Confirmation */}
                  <Link
                    href="/dashboard/orders/pending"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/pending'
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ClipboardCheck
                        className={`w-3.5 h-3.5 shrink-0 ${
                          pathname === '/dashboard/orders/pending'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">1. En attente</span>
                    </div>
                    {pendingCount > 0 && (
                      <span className="shrink-0 ml-1.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </Link>

                  {/* 2. Processing (قيد التجهيز) */}
                  <Link
                    href="/dashboard/orders/processing"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/processing'
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Package
                        className={`w-3.5 h-3.5 shrink-0 ${
                          pathname === '/dashboard/orders/processing'
                            ? 'text-blue-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">2. En préparation</span>
                    </div>
                    {processingCount > 0 && (
                      <span className="shrink-0 ml-1.5 text-slate-400 text-[10px] font-semibold">
                        {processingCount}
                      </span>
                    )}
                  </Link>

                  {/* 3. In Transit */}
                  <Link
                    href="/dashboard/orders/in-transit"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/in-transit'
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Truck
                        className={`w-3.5 h-3.5 shrink-0 ${
                          pathname === '/dashboard/orders/in-transit'
                            ? 'text-indigo-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">3. En livraison</span>
                    </div>
                    {inTransitCount > 0 && (
                      <span className="shrink-0 ml-1.5 text-blue-600 text-[10px] font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full">
                        {inTransitCount}
                      </span>
                    )}
                  </Link>

                  {/* 4. Completed */}
                  <Link
                    href="/dashboard/orders/completed"
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      pathname === '/dashboard/orders/completed'
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          pathname === '/dashboard/orders/completed'
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">4. Livrées & Encaissées</span>
                    </div>
                    {completedCount > 0 && (
                      <span className="shrink-0 ml-1.5 text-emerald-600 text-[10px] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        {completedCount}
                      </span>
                    )}
                  </Link>

                  {/* Divider separating lifecycle from secondary pages */}
                  <div className="my-1.5 border-t border-slate-200/70" />

                  {/* 5. Drafts */}
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

                  {/* 6. Abandoned Carts */}
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

                  {/* 7. Reviews */}
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

            {/* Centers */}
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

            {/* Products */}
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

            {/* Customers */}
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

            {/* Inbox with Clean Aligned WhatsApp Badge */}
            <Link
              href="/dashboard/inbox"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/inbox'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-slate-500" />
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
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-slate-500" />
              <span>Agents IA</span>
            </Link>

            {/* Automations */}
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

            {/* Integrations */}
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

            {/* Content */}
            <Link
              href="/dashboard/content"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === '/dashboard/content'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="w-4 h-4 text-slate-500" />
              <span>Contenu</span>
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
                  <Link href="/dashboard/ai-agents" className="block py-1 text-slate-500 hover:text-slate-900 font-medium">
                    Promotions & Upsells
                  </Link>
                  <Link href="/dashboard/finance" className="block py-1 text-slate-500 hover:text-slate-900 font-medium">
                    Dépenses & ROI
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Sidebar: Book a Setup Call Card & Settings */}
          <div className="p-3 space-y-2 border-t border-slate-100">
            {/* Book a Setup Call Card (Teal Banner) */}
            <div className="bg-[#135d54] text-white p-3.5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-xs">Assistance & Support Dédié</h4>
              <p className="text-[10px] text-teal-100 mt-1 leading-tight">
                Accompagnement expert pour votre logistique COD
              </p>
            </div>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Paramètres</span>
            </Link>
          </div>

        </aside>

        {/* MAIN VIEW CONTENT */}
        <main className="flex-1 overflow-x-auto">
          {children}
        </main>

      </div>

      {/* Floating Action Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>{toast.message}</span>
          <button
            onClick={clearToast}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
