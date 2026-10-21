'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MoreVertical,
  RefreshCw,
  Database,
  Trash2,
  X,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Activity,
  Check,
  Sparkles,
  Lock,
  UserCheck,
  Save,
  Laptop,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth, AuthUser } from '@/context/AuthContext';
import { UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '@/types/rbac';

export default function TeamAndPermissionsPage() {
  const {
    currentUser,
    allUsers,
    isLoading,
    isLiveDb,
    switchUser,
    refreshUsers,
    updatePermissions,
    updateUser,
  } = useAuth();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<AuthUser | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AuthUser | null>(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('Agent de Confirmation');
  const [newRole, setNewRole] = useState<'ADMIN' | 'CONFIRMATION_AGENT' | 'PACKER' | 'TRACKING_AGENT' | 'CALL_AGENT'>('CONFIRMATION_AGENT');
  const [newPhone, setNewPhone] = useState('+212 600000000');
  const [newPassword, setNewPassword] = useState('Sendit2026Pass');
  const [isSaving, setIsSaving] = useState(false);

  // Edit user state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'CONFIRMATION_AGENT' | 'PACKER' | 'TRACKING_AGENT' | 'CALL_AGENT'>('CONFIRMATION_AGENT');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permissions state for modal
  const [permsState, setPermsState] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT);

  const onlineUsersCount = allUsers.filter((u) => u.isOnline).length;

  const handleOpenPermsModal = (user: AuthUser) => {
    setSelectedUserForPerms(user);
    setPermsState({
      ...DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT,
      ...user.permissions,
    });
  };

  const handleOpenEditModal = (user: AuthUser) => {
    setSelectedUserForEdit(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditJobTitle(user.jobTitle || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditPassword('');
    setShowPassword(false);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    setIsSaving(true);
    try {
      const ok = await updatePermissions(selectedUserForPerms.id, permsState);
      if (ok) {
        setSelectedUserForPerms(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        jobTitle: editJobTitle.trim(),
        phone: editPhone.trim(),
        role: editRole,
      };
      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }
      const ok = await updateUser(selectedUserForEdit.id, payload);
      if (ok) {
        setSelectedUserForEdit(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    setIsSaving(true);
    try {
      const basePerms = DEFAULT_ROLE_PERMISSIONS[newRole] || DEFAULT_ROLE_PERMISSIONS.CONFIRMATION_AGENT;
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          jobTitle: newJobTitle.trim(),
          role: newRole,
          phone: newPhone.trim(),
          password: newPassword.trim(),
          permissions: basePerms,
          isOnline: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewJobTitle('Agent de Confirmation');
        setNewPassword('Sendit2026Pass');
        await refreshUsers();
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout du collaborateur:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le collaborateur "${name}" de la base de données MySQL ?`)) return;
    try {
      await fetch(`/api/team?id=${id}`, { method: 'DELETE' });
      await refreshUsers();
    } catch (err) {
      console.error('Erreur lors de la suppression du collaborateur:', err);
    }
  };

  const handleToggleOnline = async (user: AuthUser) => {
    try {
      await updateUser(user.id, { isOnline: !user.isOnline });
    } catch (err) {
      console.error('Erreur lors du changement de statut de présence:', err);
    }
  };

  const applyPresetRole = (roleKey: string) => {
    if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
      setPermsState(DEFAULT_ROLE_PERMISSIONS[roleKey]);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">👑 Directeur Général (Admin)</span>;
      case 'CONFIRMATION_AGENT':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">📞 Agent de Confirmation</span>;
      case 'PACKER':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">📦 Responsable Hub & Emballage</span>;
      case 'TRACKING_AGENT':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">🚚 Agent Suivi Sendit</span>;
      case 'CALL_AGENT':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">🎧 Agent Centre d'Appels</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">{role}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & DATABASE PERSISTENCE BANNER                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Gestion des Membres & Permissions (RBAC)
                </h1>
                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                  Comptes Collaborateurs & Droits d'Accès
                </span>
                {isLiveDb && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" /> Connecté à Hostinger Cloud MySQL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gérez les identifiants de connexion, les intitulés de poste, les autorisations granulaires par module et le statut de présence de vos équipes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => refreshUsers()}
            disabled={isLoading}
            className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Rafraîchir les données de l'équipe"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-700 to-slate-900 hover:from-teal-800 hover:to-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-teal-300" />
            <span>Ajouter un collaborateur</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STATS OVERVIEW CARDS                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Users */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-700">Total Collaborateurs</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {allUsers.length}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Enregistrés dans la table MySQL <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-700 font-mono">users</code>
          </span>
        </div>

        {/* Live Online Presence Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En ligne actuellement
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono flex items-center gap-2">
            <span>{onlineUsersCount}</span>
            <span className="text-xs font-bold text-slate-400">/ {allUsers.length}</span>
          </div>
          
          {/* Visual Avatar Stack */}
          <div className="flex items-center -space-x-1.5 mt-2">
            {allUsers.slice(0, 3).map((u) => (
              <div key={u.id} className="relative">
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className="w-5 h-5 rounded-full border border-white object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {u.isOnline && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1 ring-white" />
                )}
              </div>
            ))}
            {allUsers.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center border border-white">
                +{allUsers.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Distributed Roles */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-700">Rôles configurés</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {new Set(allUsers.map((u) => u.role)).size}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Profils d'accès distincts avec permissions dédiées
          </span>
        </div>

        {/* Security Isolation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-700">Sécurité & Cloisonnement</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2 font-mono">
            100%
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            ✓ Chaque rôle accède uniquement à ses modules
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. QUICK RBAC ROLE TESTER & ACTIVE USER SWITCHER BANNER      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                Simulateur de rôle actif pour tester la plateforme :
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Vous naviguez actuellement en tant que :{' '}
              <strong className="text-white font-bold">{currentUser?.name}</strong>{' '}
              <span className="text-teal-300">({currentUser?.jobTitle})</span> — La barre latérale et les autorisations de modules s'adaptent instantanément au collaborateur sélectionné.
            </p>
          </div>

          {/* Quick switcher buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {allUsers.map((u) => {
              const isSelected = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500 text-white shadow-sm ring-2 ring-teal-300/50 scale-102'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{u.name.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-80 font-normal">
                    ({u.role === 'ADMIN' ? 'Admin' : u.role === 'CONFIRMATION_AGENT' ? 'Confirmation' : u.role === 'PACKER' ? 'Emballage' : 'Suivi'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. USERS & PERMISSIONS TABLE                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Liste des Membres de l'Équipe ({allUsers.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configuration des accès, mots de passe et modules autorisés pour chaque utilisateur
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Données synchronisées en temps réel avec MySQL
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-4 text-left">Collaborateur & Compte</th>
                <th className="p-4 text-left">Intitulé de Poste</th>
                <th className="p-4 text-center">Rôle Système</th>
                <th className="p-4 text-center">Statut de Présence</th>
                <th className="p-4 text-left">Modules & Droits Accordés</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading && allUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Chargement des collaborateurs depuis la base de données MySQL...
                  </td>
                </tr>
              ) : allUsers.map((user) => {
                const isCurrentActive = currentUser?.id === user.id;
                const perms = user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role];

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isCurrentActive ? 'bg-teal-50/30' : ''
                    }`}
                  >
                    {/* User & Login Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`w-3 h-3 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-white ${
                              user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                            title={user.isOnline ? 'En ligne' : 'Hors ligne'}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{user.name}</span>
                            {isCurrentActive && (
                              <span className="bg-teal-100 text-teal-800 text-[9px] font-black px-1.5 py-0.2 rounded">
                                Votre compte actif
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Job Title */}
                    <td className="p-4 text-left">
                      <div className="font-bold text-slate-800 text-xs">
                        {user.jobTitle || 'Collaborateur plateforme'}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {user.assignedCity || 'Toutes les régions'}
                      </span>
                    </td>

                    {/* System Role */}
                    <td className="p-4 text-center">
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Online Status Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleOnline(user)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          user.isOnline
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Cliquer pour basculer le statut en ligne / hors ligne"
                      >
                        <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{user.isOnline ? 'En ligne' : 'Hors ligne'}</span>
                      </button>
                    </td>

                    {/* Granted Permissions Badges Summary */}
                    <td className="p-4 text-left">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {perms?.canAccessOrders && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            📦 Commandes
                          </span>
                        )}
                        {perms?.canAccessConfirmation && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            📞 Confirmation
                          </span>
                        )}
                        {perms?.canAccessInbox && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            💬 WhatsApp
                          </span>
                        )}
                        {perms?.canAccessAiAgents && (
                          <span className="bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            🤖 Agents IA
                          </span>
                        )}
                        {perms?.canAccessPacking && (
                          <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            🏷️ Emballage AWB
                          </span>
                        )}
                        {perms?.canAccessTracking && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            🚚 Suivi Sendit
                          </span>
                        )}
                        {perms?.canAccessFinance && (
                          <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                            💰 Finances COD
                          </span>
                        )}
                        {user.role === 'ADMIN' && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-md font-black">
                            👑 Accès Intégral
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Manage Permissions */}
                        <button
                          onClick={() => handleOpenPermsModal(user)}
                          className="flex items-center gap-1 text-slate-700 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Gérer les droits d'accès et modules"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Permissions</span>
                        </button>

                        {/* Edit Account & Login Credentials */}
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="flex items-center gap-1 text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Modifier le compte et le mot de passe"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>Modifier</span>
                        </button>

                        {/* Delete User */}
                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteMember(user.id, user.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Supprimer définitivement le collaborateur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. GRANULAR PERMISSIONS MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-5 my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Modifier les autorisations d'accès : {selectedUserForPerms.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Poste : {selectedUserForPerms.jobTitle} • {getRoleBadge(selectedUserForPerms.role)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">
                Modèles d'autorisations prédéfinis (Presets) :
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetRole('ADMIN')}
                  className="text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  👑 Modèle Administrateur (Tous les accès)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRole('CONFIRMATION_AGENT')}
                  className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  📞 Modèle Agent Confirmation
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRole('PACKER')}
                  className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  📦 Modèle Responsable Hub & Emballage
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRole('TRACKING_AGENT')}
                  className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  🚚 Modèle Suivi Sendit
                </button>
              </div>
            </div>

            {/* Permissions Toggles Grid */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              
              {/* Category 1: Sales & Orders */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                  1. Ventes & Traitement des Commandes (Orders & Sales)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Tableau de bord principal</span>
                      <span className="text-[10px] text-slate-400">Statistiques et indicateurs globaux</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessDashboard}
                      onChange={(e) => setPermsState({ ...permsState, canAccessDashboard: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Gestion des commandes</span>
                      <span className="text-[10px] text-slate-400">Toutes les commandes et modifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessOrders}
                      onChange={(e) => setPermsState({ ...permsState, canAccessOrders: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Centre d'appels (Call Center)</span>
                      <span className="text-[10px] text-slate-400">Validation téléphonique des commandes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessConfirmation}
                      onChange={(e) => setPermsState({ ...permsState, canAccessConfirmation: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Gestion des Leads & Capture</span>
                      <span className="text-[10px] text-slate-400">Qualification et intention d'achat</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessLeads}
                      onChange={(e) => setPermsState({ ...permsState, canAccessLeads: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Category 2: Communications & AI */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                  2. Messagerie & Intelligence Artificielle (Messaging & AI)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Messagerie WhatsApp</span>
                      <span className="text-[10px] text-slate-400">WhatsApp Live Inbox et échanges</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessInbox}
                      onChange={(e) => setPermsState({ ...permsState, canAccessInbox: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Agents IA Gemini (Darija)</span>
                      <span className="text-[10px] text-slate-400">Confirmation automatique et réponses</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessAiAgents}
                      onChange={(e) => setPermsState({ ...permsState, canAccessAiAgents: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Category 3: Logistics & Sendit */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                  3. Préparation & Expéditions Sendit.ma (Fulfillment & Logistics)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Station d'emballage (AWB)</span>
                      <span className="text-[10px] text-slate-400">Impression bordereaux et scan code-barres</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessPacking}
                      onChange={(e) => setPermsState({ ...permsState, canAccessPacking: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Suivi & Sauvetage Colis</span>
                      <span className="text-[10px] text-slate-400">Statuts de livraison Sendit en direct</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessTracking}
                      onChange={(e) => setPermsState({ ...permsState, canAccessTracking: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Category 4: Products, Customers, Finance & Admin */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                  4. Produits, Finances & Administration Système
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Catalogue & Stocks Hubs</span>
                      <span className="text-[10px] text-slate-400">Gestion des articles et inventaire</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessProducts}
                      onChange={(e) => setPermsState({ ...permsState, canAccessProducts: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Clients & CRM</span>
                      <span className="text-[10px] text-slate-400">Fiches clients et score de confiance</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessCustomers}
                      onChange={(e) => setPermsState({ ...permsState, canAccessCustomers: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Finances & Virements COD</span>
                      <span className="text-[10px] text-slate-400">Rapprochements bancaires et encaissements</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessFinance}
                      onChange={(e) => setPermsState({ ...permsState, canAccessFinance: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Règles d'automatisation</span>
                      <span className="text-[10px] text-slate-400">Workflows et dispatching automatique</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessAutomations}
                      onChange={(e) => setPermsState({ ...permsState, canAccessAutomations: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Intégrations & Passerelles</span>
                      <span className="text-[10px] text-slate-400">Sendit API, Google Sheets et Webhooks</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessIntegrations}
                      onChange={(e) => setPermsState({ ...permsState, canAccessIntegrations: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-teal-500 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Gestion de l'Équipe (RBAC)</span>
                      <span className="text-[10px] text-slate-400">Ajout et gestion des droits collaborateurs</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={permsState.canAccessTeam}
                      onChange={(e) => setPermsState({ ...permsState, canAccessTeam: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePermissions}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement dans MySQL...' : 'Enregistrer les permissions dans MySQL'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. EDIT ACCOUNT & CREDENTIALS MODAL                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Modifier le compte et les accès de connexion
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom complet :</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé de poste (Job Title) :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Spécialiste Confirmation & Vente Additionnelle"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse email de connexion :</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nouveau mot de passe (laisser vide pour conserver l'actuel) :
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Saisir un nouveau mot de passe"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro de téléphone :</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rôle principal dans le système :</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setEditRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-blue-600 font-medium cursor-pointer"
                >
                  <option value="CONFIRMATION_AGENT">Agent de Confirmation (Validation des commandes)</option>
                  <option value="PACKER">Responsable Hub & Emballage (Packer AWB)</option>
                  <option value="TRACKING_AGENT">Agent Suivi & Sauvetage Colis (Sendit)</option>
                  <option value="CALL_AGENT">Agent Centre d'Appels (Call Center)</option>
                  <option value="ADMIN">Directeur Général (Administrateur complet)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Enregistrement...' : 'Mettre à jour dans MySQL'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. ADD NEW USER MODAL                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  Ajouter un nouveau collaborateur dans MySQL
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom complet :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Younes El Alami"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé de poste (Job Title) :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Agent de Confirmation Call Center"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse email professionnelle :</label>
                <input
                  type="email"
                  required
                  placeholder="younes@sendit.ma"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mot de passe initial :</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro de téléphone :</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rôle attribué (Role) :</label>
                <select
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-teal-600 font-medium cursor-pointer"
                >
                  <option value="CONFIRMATION_AGENT">Agent de Confirmation (Validation des commandes)</option>
                  <option value="PACKER">Responsable Hub & Emballage (Packer AWB)</option>
                  <option value="TRACKING_AGENT">Agent Suivi & Sauvetage Colis (Sendit)</option>
                  <option value="CALL_AGENT">Agent Centre d'Appels (Call Center)</option>
                  <option value="ADMIN">Directeur Général (Administrateur complet)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Enregistrement dans MySQL...' : 'Créer le collaborateur dans MySQL'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
