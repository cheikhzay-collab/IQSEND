'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Truck,
  AlertCircle,
  HelpCircle,
  User,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login, isLoading } = useAuth();

  const [email, setEmail] = useState('admin@sendit.ma');
  const [password, setPassword] = useState('admin123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/dashboard/orders');
    }
  }, [currentUser, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Veuillez renseigner votre adresse email et votre mot de passe.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setSuccessMessage('Connexion réussie ! Redirection vers le tableau de bord...');
        router.push('/dashboard/orders');
      } else {
        setErrorMessage(res.error || 'Identifiants invalides. Veuillez vérifier vos accès.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de la connexion au serveur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdminFill = () => {
    setEmail('admin@sendit.ma');
    setPassword('admin123456');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white">
      {/* Background Ambient Glows & Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[550px] h-[550px] rounded-full bg-teal-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-3 bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center font-black text-base shadow-lg shadow-teal-500/20">
              IQ
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white leading-none">
                  IQ<span className="text-teal-400 font-extrabold text-sm ml-0.5">SEND</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                  COD MAROC
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide block mt-0.5">
                Sendit.ma Logistics & AI Management
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-3">
              Connexion Administrateur
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Espace Sécurisé • Pilotage Logistique & Commandes COD
            </p>
          </div>
        </div>

        {/* Admin Credentials Quick Info Banner */}
        <div className="bg-gradient-to-r from-teal-950/60 via-slate-900/80 to-slate-900/60 border border-teal-500/30 rounded-2xl p-3.5 backdrop-blur-md shadow-xl text-left relative overflow-hidden group">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-emerald-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-teal-300">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <span>Identifiants Administrateur (Admin Credentials)</span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5 pl-5 font-mono">
                <div>Email : <span className="text-teal-200 font-bold">admin@sendit.ma</span></div>
                <div>Mot de passe : <span className="text-teal-200 font-bold">admin123456</span></div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickAdminFill}
              className="text-[11px] font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 px-2.5 py-1.5 rounded-xl transition-all shrink-0 active:scale-95 shadow-sm"
              title="Remplir automatiquement les identifiants administrateur"
            >
              Remplir Admin ⚡
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          
          {/* Error / Success Notifications */}
          {errorMessage && (
            <div className="bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-teal-950/50 border border-teal-500/40 text-teal-200 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Adresse Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sendit.ma"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Mot de passe
                </label>
                <span className="text-[11px] text-teal-400 hover:text-teal-300 cursor-pointer transition-colors font-medium">
                  Aide à la connexion
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 font-medium">Se souvenir de moi</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sécurisé SSL</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Account Switch Bar */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 text-center mb-2 font-medium">
              Rôles Système Prédéfinis (RBAC)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleQuickAdminFill}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 text-slate-300 transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-white text-[10px]">Directeur Général (Admin)</div>
                  <div className="text-[9px] text-slate-400 truncate">admin@sendit.ma</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('sarah@sendit.ma');
                  setPassword('admin123456');
                  setErrorMessage(null);
                }}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 text-slate-300 transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-white text-[10px]">Chargée de Confirmation</div>
                  <div className="text-[9px] text-slate-400 truncate">sarah@sendit.ma</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Info */}
        <div className="text-center space-y-1.5 text-slate-500 text-xs">
          <div className="flex items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-teal-500" />
              Connexion directe Sendit.ma
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Confirmation intelligente COD Maroc
            </span>
          </div>
          <p className="text-[10px] text-slate-600">
            IQSEND COD Platform &copy; {new Date().getFullYear()} • Casablanca, Maroc
          </p>
        </div>

      </div>
    </div>
  );
}
