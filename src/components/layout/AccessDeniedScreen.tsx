'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Home, ArrowLeft, Users, RefreshCw, KeyRound } from 'lucide-react';

interface AccessDeniedScreenProps {
  pathname: string;
}

export function AccessDeniedScreen({ pathname }: AccessDeniedScreenProps) {
  const { currentUser, switchUser, allUsers } = useAuth();
  const adminUser = allUsers.find((u) => u.role === 'ADMIN');

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 border border-rose-100 shadow-xl shadow-rose-500/5 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glowing Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200/80 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading in Arabic and French */}
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight font-cairo">
            غير مصرح لك بالوصول إلى هذه الخاصية
          </h2>
          <p className="text-xs font-semibold text-rose-600">
            Accès non autorisé pour votre rôle ({currentUser?.jobTitle || currentUser?.role})
          </p>
        </div>

        {/* Informative Explanation */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2 text-right dir-rtl leading-relaxed font-cairo">
          <p>
            حسابك الحالي <strong className="text-slate-900 font-bold">{currentUser?.name}</strong> بصفتك{' '}
            <strong className="text-slate-900 font-bold">({currentUser?.jobTitle})</strong> لا يمتلك صلاحية الوصول إلى المسار:
          </p>
          <code className="block bg-white border border-slate-200 text-rose-700 font-mono text-[11px] px-3 py-1.5 rounded-xl font-bold text-left ltr">
            {pathname}
          </code>
          <p className="text-slate-500 text-[11px]">
            وفقاً لسياسة إدارة الصلاحيات (RBAC) في منصة IQSEND، تظهر لكل مستخدم الخصائص والأقسام المسندة إليه فقط.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {adminUser && adminUser.id !== currentUser?.id && (
            <button
              onClick={() => switchUser(adminUser.id)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>التبديل إلى حساب المدير (Admin)</span>
            </button>
          )}

          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>العودة إلى لوحة التحكم</span>
          </Link>
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>لطلب ترقية الصلاحيات يرجى التواصل مع المدير العام لمنصة IQSEND</span>
        </div>

      </div>
    </div>
  );
}
