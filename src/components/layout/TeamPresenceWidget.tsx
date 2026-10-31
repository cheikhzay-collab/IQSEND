'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Shield,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export function TeamPresenceWidget() {
  const { currentUser, allUsers, switchUser, toggleMyOnlineStatus, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onlineMembers = allUsers.filter((u) => u.isOnline);
  const displayUsers = allUsers.slice(0, 3);
  const remainingCount = Math.max(0, allUsers.length - 3);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'CONFIRMATION_AGENT':
        return 'Confirmation';
      case 'PACKER':
        return 'Emballage & Hub';
      case 'TRACKING_AGENT':
        return 'Suivi Sendit';
      case 'CALL_AGENT':
        return 'Call Center';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CONFIRMATION_AGENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PACKER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TRACKING_AGENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* AVATAR STACK - EXACT VISUAL MATCH TO USER'S SCREENSHOT       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-2xl hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200 active:scale-98 group"
        title="Équipe Sendit & Statut de connexion en ligne"
        aria-label="Statut des utilisateurs"
      >
        {/* Stacked Round Avatars */}
        <div className="flex items-center -space-x-1.5">
          {allUsers.length > 0 ? (
            <>
              {/* Avatar 1 (Sarah / Female portrait) */}
              <div className="relative">
                <img
                  src={
                    allUsers[1]?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                  }
                  alt={allUsers[1]?.name || 'Collaborateur 1'}
                  className="w-6 h-6 rounded-full border border-white object-cover shadow-2xs"
                />
                {allUsers[1]?.isOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white animate-pulse" />
                )}
              </div>

              {/* Avatar 2 (Mohamed / Male portrait) */}
              <div className="relative">
                <img
                  src={
                    allUsers[2]?.avatarUrl ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'
                  }
                  alt={allUsers[2]?.name || 'Collaborateur 2'}
                  className="w-6 h-6 rounded-full border border-white object-cover shadow-2xs"
                />
                {allUsers[2]?.isOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white animate-pulse" />
                )}
              </div>

              {/* Purple Circle 'A' (Admin) */}
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-[#7c3aed] text-white text-[10px] font-black flex items-center justify-center border border-white shadow-2xs">
                  {allUsers[0]?.name ? allUsers[0].name.charAt(0).toUpperCase() : 'A'}
                </div>
                {allUsers[0]?.isOnline && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white animate-pulse" />
                )}
              </div>

              {/* Count Circle (+2 or total remaining) */}
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center border border-white shadow-2xs">
                +{remainingCount > 0 ? remainingCount : 2}
              </div>
            </>
          ) : (
            // Fallback matching mockup
            <>
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                alt="Sarah"
                className="w-6 h-6 rounded-full border border-white object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                alt="Mohamed"
                className="w-6 h-6 rounded-full border border-white object-cover"
              />
              <div className="w-6 h-6 rounded-full bg-[#7c3aed] text-white text-[10px] font-bold flex items-center justify-center border border-white">
                A
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center border border-white">
                +2
              </div>
            </>
          )}
        </div>

        {/* Small live badge & role indicator */}
        <div className="hidden lg:flex flex-col text-left items-start">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-800 truncate max-w-[100px]">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Connecté'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-transform" />
          </div>
          <span className="text-[9px] font-semibold text-slate-400 -mt-0.5">
            {currentUser?.role === 'ADMIN' ? '👑 Admin' : currentUser?.role === 'CONFIRMATION_AGENT' ? '📞 Confirmation' : currentUser?.role === 'PACKER' ? '📦 Emballage' : '🚚 Suivi'}
          </span>
        </div>
      </button>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE POPOVER: RBAC SWITCHER & LIVE TEAM PRESENCE       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">
                  Équipe & Statut En Ligne
                </h4>
                <p className="text-[10px] text-slate-400">
                  {onlineMembers.length} connecté(s) sur {allUsers.length} collaborateurs
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/team"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition-colors flex items-center gap-1"
            >
              <span>Gérer</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Active Session Card */}
          {currentUser && (
            <div className="my-3 p-3 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">
                  Compte Actuellement Actif
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-2">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center border-2 border-emerald-300/40 shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="En ligne" />
                  </div>
                  <div className="text-[10px] text-emerald-200 truncate">{currentUser.jobTitle}</div>
                  <div className="text-[9px] text-slate-400 truncate">{currentUser.email}</div>
                </div>
              </div>

              {/* Online Toggle */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-300 font-medium">Mon statut de présence :</span>
                <button
                  onClick={toggleMyOnlineStatus}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    currentUser.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{currentUser.isOnline ? 'En ligne (Disponible)' : 'Absent (Hors ligne)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick RBAC User Switcher */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-1">
              Tester les Rôles & Permissions (Changement Rapide) :
            </span>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
              {allUsers.map((user) => {
                const isSelected = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchUser(user.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#7c3aed] text-white text-[11px] font-bold flex items-center justify-center">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-white ${
                            user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                          <span>{user.name}</span>
                          {isSelected && <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1 rounded font-black">Actif</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{user.jobTitle}</div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 pl-2">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${getRoleBadgeStyle(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer notice */}
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 font-medium">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Chaque utilisateur ne voit que les modules autorisés dans ses permissions</span>
          </div>
        </div>
      )}
    </div>
  );
}
