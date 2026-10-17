'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck,
  Package,
  Truck,
  CheckCircle2,
  FileText,
  ShoppingCart,
  Star,
  Kanban,
  Plus
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

export function OrderLifecycleTabs() {
  const pathname = usePathname();
  const { pendingCount, processingCount, inTransitCount, completedCount } = useOrderLifecycle();

  const tabs = [
    {
      id: 'pending',
      href: '/dashboard/orders/pending',
      step: '1',
      label: 'En attente de confirmation',
      icon: ClipboardCheck,
      badge: pendingCount,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
      activeColor: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
    },
    {
      id: 'processing',
      href: '/dashboard/orders/processing',
      step: '2',
      label: 'En préparation',
      icon: Package,
      badge: processingCount,
      badgeColor: 'bg-blue-100 text-blue-700 font-bold',
      activeColor: 'bg-blue-50 text-blue-900 border-blue-300 font-bold',
    },
    {
      id: 'in-transit',
      href: '/dashboard/orders/in-transit',
      step: '3',
      label: 'En cours de livraison',
      icon: Truck,
      badge: inTransitCount,
      badgeColor: 'bg-indigo-100 text-indigo-700 font-bold',
      activeColor: 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold',
    },
    {
      id: 'completed',
      href: '/dashboard/orders/completed',
      step: '4',
      label: 'Livrées & Encaissées',
      icon: CheckCircle2,
      badge: completedCount,
      badgeColor: 'bg-emerald-100 text-emerald-700 font-bold',
      activeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
    },
  ];

  const secondaryTabs = [
    {
      id: 'drafts',
      href: '/dashboard/orders/drafts',
      label: 'Brouillons',
      icon: FileText,
    },
    {
      id: 'abandoned',
      href: '/dashboard/orders/abandoned',
      label: 'Paniers abandonnés',
      icon: ShoppingCart,
      badge: 3,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'reviews',
      href: '/dashboard/orders/reviews',
      label: 'Avis clients',
      icon: Star,
      badgeText: '★ 4.9',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto shadow-2xs sticky top-0 z-30">
      {/* Left: Tab pills */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Kanban Board overview */}
        <Link
          href="/dashboard/orders"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border ${
            pathname === '/dashboard/orders'
              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Vue Kanban</span>
        </Link>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Fulfillment Lifecycle Stepper */}
        <div className="flex items-center gap-1 shrink-0">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <React.Fragment key={tab.id}>
                <Link
                  href={tab.href}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all border ${
                    isActive
                      ? tab.activeColor + ' shadow-xs ring-1 ring-slate-900/5'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {tab.step}
                  </div>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-current' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="font-bold tracking-tight">{tab.label}</span>
                  {typeof tab.badge === 'number' && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>

                {/* Arrow connector between stages */}
                {idx < tabs.length - 1 && (
                  <div className="text-slate-300 mx-0.5 shrink-0 select-none">
                    <span className="text-xs font-bold text-slate-300">→</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1.5 shrink-0" />

        {/* Secondary Pages */}
        {secondaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all border shrink-0 ${
                isActive
                  ? 'bg-slate-200 text-slate-900 font-bold border-slate-300 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.badgeText && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded">
                  {tab.badgeText}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Right: Quick CTA */}
      <Link
        href="/dashboard/orders/new"
        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 shadow-xs transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Nouvelle Commande</span>
      </Link>
    </div>
  );
}
