'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck,
  Package,
  Truck,
  CheckCircle2,
  Kanban,
  RotateCcw
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface OrderLifecycleTabsProps {
  inHeader?: boolean;
}

export function OrderLifecycleTabs({ inHeader = false }: OrderLifecycleTabsProps) {
  const pathname = usePathname();
  const {
    pendingCount,
    processingCount,
    inTransitCount,
    completedCount,
    returnedCount
  } = useOrderLifecycle();

  const tabs = [
    {
      id: 'pending',
      href: '/dashboard/orders/pending',
      step: '1',
      label: 'En attente de confirmation',
      mediumLabel: 'En attente',
      shortLabel: '1. Confirmation',
      icon: ClipboardCheck,
      badge: pendingCount,
      badgeColor: 'bg-[#F59E0B] text-white',
    },
    {
      id: 'processing',
      href: '/dashboard/orders/processing',
      step: '2',
      label: 'En préparation',
      mediumLabel: 'En préparation',
      shortLabel: '2. Préparation',
      icon: Package,
      badge: processingCount,
      badgeColor: 'bg-[#3B82F6] text-white',
    },
    {
      id: 'in-transit',
      href: '/dashboard/tracking',
      step: '3',
      label: 'En cours de livraison (Sendit)',
      mediumLabel: 'En livraison (Sendit)',
      shortLabel: '3. En livraison',
      icon: Truck,
      badge: inTransitCount,
      badgeColor: 'bg-[#6366F1] text-white',
    },
    {
      id: 'completed',
      href: '/dashboard/orders/completed',
      step: '4',
      label: 'Livrées & Encaissées',
      mediumLabel: 'Livrées & Encaissées',
      shortLabel: '4. Livrées',
      icon: CheckCircle2,
      badge: completedCount,
      badgeColor: 'bg-[#10B981] text-white',
    },
  ];

  const secondaryTabs = [
    {
      id: 'returns',
      href: '/dashboard/orders/returns',
      label: 'Retours & Refusés',
      icon: RotateCcw,
      badge: returnedCount,
      badgeColor: 'bg-amber-600 text-white',
    },
  ];

  return (
    <div
      className={
        inHeader
          ? 'flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5'
          : 'bg-white border-b border-slate-200/90 px-3 md:px-6 py-2 md:py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-2xs sticky top-14 z-30'
      }
    >
      {/* 1. Vue Kanban Pill */}
      <Link
        href="/dashboard/orders"
        className={`flex items-center gap-1.5 ${
          inHeader ? 'px-2.5 py-1 rounded-xl text-xs' : 'px-3.5 py-1.5 rounded-xl text-xs'
        } transition-all shrink-0 ${
          pathname === '/dashboard/orders'
            ? 'bg-[#0F172A] text-white font-bold shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 font-bold'
        }`}
      >
        <Kanban className="w-3.5 h-3.5 text-current" />
        <span className="font-bold">Vue Kanban</span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* 2. 4 COD Lifecycle Stages Stepper */}
      <div className="flex items-center gap-1 shrink-0">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'in-transit'
            ? (pathname === '/dashboard/tracking' || pathname === '/dashboard/orders/in-transit')
            : pathname === tab.href;

          return (
            <React.Fragment key={tab.id}>
              <Link
                href={tab.href}
                className={`group flex items-center gap-1.5 ${
                  inHeader ? 'px-2 py-1 rounded-xl text-xs' : 'px-3 py-1.5 rounded-2xl text-xs'
                } transition-all border shrink-0 ${
                  isActive
                    ? 'bg-white border-slate-900/40 text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Step Number Circle */}
                <div className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {tab.step}
                </div>

                {/* Step Icon */}
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />

                {/* Step Label */}
                <span className="font-bold tracking-tight hidden 2xl:inline">{tab.label}</span>
                <span className="font-bold tracking-tight hidden md:inline 2xl:hidden">{tab.mediumLabel}</span>
                <span className="font-bold tracking-tight md:hidden">{tab.shortLabel}</span>

                {/* Step Counter Badge */}
                {typeof tab.badge === 'number' && (
                  <span
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>

              {/* Arrow Connector */}
              {idx < tabs.length - 1 && (
                <span className="text-slate-300 text-[11px] font-bold mx-0.5 shrink-0 select-none">
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

      {/* 3. Secondary Tabs (Brouillons, etc.) */}
      <div className="flex items-center gap-1 shrink-0">
        {secondaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 ${
                inHeader ? 'px-2 py-1 rounded-xl text-xs' : 'px-3 py-1.5 rounded-2xl text-xs'
              } transition-all border shrink-0 ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-bold border-slate-300 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-bold">{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

