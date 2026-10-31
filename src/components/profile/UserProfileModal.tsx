'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  User,
  Camera,
  Upload,
  Link as LinkIcon,
  Check,
  Shield,
  KeyRound,
  Phone,
  Mail,
  Briefcase,
  AlertCircle,
  Sparkles,
  Lock,
  Save,
  CheckCircle2,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Curated high quality avatars for instant selection
const PRESET_AVATARS = [
  {
    id: 'avatar-1',
    label: 'Directeur / Pro Homme',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-2',
    label: 'Directrice / Pro Femme',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-3',
    label: 'Manager Moderne',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-4',
    label: 'Experte COD',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-5',
    label: 'Agent Call Center',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-6',
    label: 'Responsable Logistique',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160&auto=format&fit=crop&q=80',
  },
];

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { currentUser, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  
  // Password change state
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setJobTitle(currentUser.jobTitle || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setCustomUrlInput(currentUser.avatarUrl || '');
      setChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setSaveSuccess(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Handle local image upload via file reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('La taille de l\'image ne doit pas dépasser 3 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      setCustomUrlInput('');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setAvatarUrl(customUrlInput.trim());
      setShowUrlField(false);
    }
  };

  const handleResetAvatar = () => {
    setAvatarUrl('');
    setCustomUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!name.trim()) {
      alert('Veuillez renseigner votre nom complet.');
      return;
    }

    if (changePassword) {
      if (newPassword.length < 6) {
        setPasswordError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
        setActiveTab('security');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Les mots de passe ne correspondent pas.');
        setActiveTab('security');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: any = {
        id: currentUser.id,
        name: name.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        avatarUrl: avatarUrl,
      };

      if (changePassword && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.user) {
        await updateUser(currentUser.id, {
          name: data.user.name,
          phone: data.user.phone,
          jobTitle: data.user.jobTitle,
          avatarUrl: data.user.avatarUrl,
        });

        setSaveSuccess(true);
        setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(false);
          onClose();
        }, 800);
      } else {
        alert(data.error || 'Erreur lors de la mise à jour du profil.');
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert('Erreur réseau lors de la mise à jour.');
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: '👑 Directeur Admin (Tous accès)', style: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'CONFIRMATION_AGENT':
        return { label: '📞 Agent Confirmation COD', style: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'PACKER':
        return { label: '📦 Responsable Emballage & Hub', style: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'TRACKING_AGENT':
        return { label: '🚚 Agent Suivi Sendit', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'CALL_AGENT':
        return { label: '🎧 Agent Call Center', style: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      default:
        return { label: `👤 ${role}`, style: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Mon Profil Personnel</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.style}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Mise à jour des coordonnées et photo de profil (dans la limite des droits)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-100 px-5 sm:px-6 bg-slate-50/40 text-xs font-bold gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identité & Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sécurité & Mot de passe</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Mes Droits & Rôle</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: IDENTITÉ & PHOTO */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Profile Avatar Selection Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Photo de Profil Personnelle (الصورة الشخصية)
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative group shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Aperçu de profil"
                        className="w-18 h-18 rounded-full object-cover border-3 border-emerald-500 shadow-md"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-full bg-emerald-700 text-white font-black text-2xl flex items-center justify-center border-3 border-emerald-500 shadow-md">
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                      title="Téléverser une image"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Upload & Reset Buttons */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer une photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlField(!showUrlField)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Coller un lien (URL)</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleResetAvatar}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          title="Supprimer la photo et utiliser les initiales"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Initiales</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Formats acceptés: PNG, JPG, WebP. Poids max recommandé: 3 Mo.
                    </p>
                  </div>
                </div>

                {/* Paste URL Input (if toggled) */}
                {showUrlField && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-100">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://exemple.com/ma-photo.jpg"
                      className="flex-1 text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    >
                      Appliquer
                    </button>
                  </div>
                )}

                {/* Quick Preset Avatars Gallery */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Ou choisissez un avatar prêt à l'emploi :
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(item.url);
                          setCustomUrlInput('');
                        }}
                        className={`relative rounded-full overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                          avatarUrl === item.url
                            ? 'border-emerald-600 scale-105 shadow-sm'
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                        title={item.label}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        {avatarUrl === item.url && (
                          <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center rounded-full">
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nom Complet */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nom Complet <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Youssef El Amrani أو يوسف العمراني"
                    className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Téléphone */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Téléphone (Maroc)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0661****** أو 07********"
                      className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Intitulé de Poste / Spécialité */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Intitulé de Poste / Spécialité
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ex: Confirmation Spécialiste"
                      className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Email (Identifiant de connexion non modifiable) */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>Adresse Email (Identifiant de connexion)</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Non modifiable
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SÉCURITÉ & MOT DE PASSE */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Changer de Mot de Passe</h4>
                    <p className="text-[11px] text-slate-500">Mettez à jour vos identifiants pour sécuriser votre compte</p>
                  </div>
                  <input
                    type="checkbox"
                    id="togglePwd"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {changePassword && (
                  <div className="space-y-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-150">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Nouveau mot de passe <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 6 caractères"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Confirmer le nouveau mot de passe <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
                      />
                    </div>

                    {passwordError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{passwordError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/70 text-[11px] text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Vos informations de connexion sont chiffrées de façon sécurisée (Argon2/Bcrypt) dans la base MySQL.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: MES DROITS & RÔLE (LIMITES DE PERMISSIONS) */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Role banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Rôle Actuel Attribué</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.style}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Votre rôle détermine vos permissions opérationnelles sur la suite Sendit COD (confirmation des commandes, accès au stock, vue financière ou gestion des bordereaux).
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Modification des rôles et permissions réservée au Directeur Administrateur.</span>
                </div>
              </div>

              {/* Active Permissions List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Permissions Actives Associées à Votre Compte :
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {currentUser.role === 'ADMIN' ? (
                    <div className="col-span-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Accès Directeur Général : Vous disposez de l'ensemble des droits d'administration, d'exportation et de configuration.</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-slate-700">Accès aux Commandes</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-slate-700">Validation & Appels COD</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-slate-700">Messagerie WhatsApp Live</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-slate-700">Recherche & Villes Sendit</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Toutes les modifications sont enregistrées en direct dans MySQL.
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Enregistré !</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer mon profil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

