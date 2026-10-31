'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Shield,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Circle,
  Sparkles,
  Wifi,
  WifiOff
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

  // Filter ONLY members who are actually online
  const onlineMembers = useMemo(() => {
    return allUsers.filter((u) => u.isOnline);
  }, [allUsers]);

  // Filter offline members
  const offlineMembers = useMemo(() => {
    return allUsers.filter((u) => !u.isOnline);
  }, [allUsers]);

  // Active avatars to display in stack (MAX 3)
  const displayOnlineUsers = useMemo(() => {
    if (onlineMembers.length > 0) {
      return onlineMembers.slice(0, 3);
    }
    // If no one is online in list, show currentUser as fallback
    if (currentUser) {
      return [currentUser];
    }
    return [];
  }, [onlineMembers, currentUser]);

  // Extra count of online users beyond 3
  const extraOnlineCount = Math.max(0, onlineMembers.length - 3);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Directeur Admin';
      case 'CONFIRMATION_AGENT':
        return 'Agent Confirmation';
      case 'PACKER':
        return 'Emballage & Hub';
      case 'TRACKING_AGENT':
        return 'Suivi Sendit';
      case 'CALL_AGENT':
        return 'Centre d\'Appels';
      default:
        return role;
    }
  };

  const getRoleShortBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '👑 Admin';
      case 'CONFIRMATION_AGENT':
        return '📞 Confirmation';
      case 'PACKER':
        return '📦 Emballage';
      case 'TRACKING_AGENT':
        return '🚚 Suivi';
      default:
        return '👤 Agent';
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

  const getRoleColorBg = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[#7c3aed]';
      case 'CONFIRMATION_AGENT':
        return 'bg-blue-600';
      case 'PACKER':
        return 'bg-amber-600';
      case 'TRACKING_AGENT':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* AVATAR STACK: ONLY SHOW ACTUALLY CONNECTED USERS              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-2xl hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200 active:scale-98 group cursor-pointer"
        title="Équipe Sendit & Statut des personnes connectées en direct"
        aria-label="Statut des utilisateurs en ligne"
      >
        {/* Stacked Round Avatars (ONLY ONLINE MEMBERS) */}
        <div className="flex items-center -space-x-1.5">
          {displayOnlineUsers.map((user) => {
            const isUserOnline = user.isOnline ?? true;
            return (
              <div
                key={user.id}
                className="relative group/avatar"
                title={`${user.name} (${getRoleLabel(user.role)}) — ${isUserOnline ? 'En ligne' : 'Hors ligne'}`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-6 h-6 rounded-full border border-white object-cover shadow-2xs"
                  />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full ${getRoleColorBg(
                      user.role
                    )} text-white text-[10px] font-black flex items-center justify-center border border-white shadow-2xs`}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                {/* Live Online Pulsing Green Dot (ONLY IF ONLINE) */}
                {isUserOnline ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 absolute -bottom-0.5 -right-0.5 ring-1.5 ring-white" />
                )}
              </div>
            );
          })}

          {/* Extra Online Count Badge (ONLY SHOWN IF MORE THAN 3 USERS ARE ONLINE) */}
          {extraOnlineCount > 0 && (
            <div
              className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black flex items-center justify-center border border-white shadow-2xs"
              title={`+${extraOnlineCount} autre(s) collaborateur(s) connecté(s) en direct`}
            >
              +{extraOnlineCount}
            </div>
          )}
        </div>

        {/* Small live badge & role indicator */}
        <div className="hidden lg:flex flex-col text-left items-start">
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentUser?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-800 truncate max-w-[110px]">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-transform" />
          </div>
          <span className="text-[9px] font-semibold text-slate-400 -mt-0.5">
            {currentUser?.role ? getRoleShortBadge(currentUser.role) : '👑 Admin'}
          </span>
        </div>
      </button>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE POPOVER: LIVE ONLINE TEAM & RBAC SWITCHER         */}
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
                <p className="text-[10px] text-slate-500">
                  <strong className="text-emerald-700 font-bold">{onlineMembers.length} connecté(s)</strong> actuellement sur {allUsers.length} membres
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
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                    currentUser.role
                  )}`}
                >
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-2">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center border-2 border-emerald-300/40 shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        currentUser.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                      }`}
                      title={currentUser.isOnline ? 'En ligne' : 'Absent'}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-200 truncate">{currentUser.jobTitle}</div>
                  <div className="text-[9px] text-slate-400 truncate">{currentUser.email}</div>
                </div>
              </div>

              {/* Online Toggle */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-300 font-medium">Mon statut de présence :</span>
                <button
                  type="button"
                  onClick={toggleMyOnlineStatus}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    currentUser.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{currentUser.isOnline ? 'En ligne (Disponible)' : 'Absent (Hors ligne)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Categorized Team Lists: Online vs Offline */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {/* Section 1: Connectés Actuellement */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connectés حالياً ({onlineMembers.length})
                </span>
              </div>

              {onlineMembers.length === 0 ? (
                <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 rounded-xl">
                  Aucun autre collaborateur connecté pour le moment
                </div>
              ) : (
                <div className="space-y-1">
                  {onlineMembers.map((user) => {
                    const isSelected = currentUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          switchUser(user.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-300/80'
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
                              <div
                                className={`w-7 h-7 rounded-full ${getRoleColorBg(
                                  user.role
                                )} text-white text-[11px] font-bold flex items-center justify-center`}
                              >
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-white bg-emerald-500 animate-pulse" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                              <span>{user.name}</span>
                              {isSelected && (
                                <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1 rounded font-black">
                                  Moi
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{user.jobTitle}</div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 pl-2">
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                              user.role
                            )}`}
                          >
                            {getRoleShortBadge(user.role)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Hors ligne */}
            {offlineMembers.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-1">
                  Hors ligne ({offlineMembers.length})
                </span>

                <div className="space-y-1">
                  {offlineMembers.map((user) => {
                    const isSelected = currentUser?.id === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          switchUser(user.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all opacity-70 hover:opacity-100 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 border border-slate-300'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 grayscale"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-400 text-white text-[11px] font-bold flex items-center justify-center">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-white bg-slate-300" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{user.jobTitle}</div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 pl-2">
                          <span className="text-[9px] text-slate-500 font-semibold">
                            {getRoleShortBadge(user.role)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer notice */}
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 font-medium">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Chaque rôle dispose de permissions et vues adaptées à ses fonctions</span>
          </div>
        </div>
      )}
    </div>
  );
}
