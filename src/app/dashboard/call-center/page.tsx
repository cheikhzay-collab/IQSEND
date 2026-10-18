'use client';

import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Package,
  Calendar,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Database
} from 'lucide-react';

interface CallTask {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  product: string;
  amount: number;
  priority: 'URGENT' | 'RAPPEL' | 'NOUVEAU';
  scheduledTime?: string;
  attempts: number;
  status?: string;
}

const DEFAULT_CALL_TASK: CallTask = {
  id: 'call-1',
  orderNumber: '#AT1044',
  customerName: 'Omar El Fassi',
  phone: '0661223344',
  city: 'Tanger',
  address: 'Boulevard Pasteur, Tanger Centre',
  product: 'Black Bomber Jacket (Taille L)',
  amount: 349,
  priority: 'RAPPEL',
  scheduledTime: 'Rappel prévu à 16h00',
  attempts: 1,
};

export default function CallCenterPage() {
  const [tasks, setTasks] = useState<CallTask[]>([DEFAULT_CALL_TASK]);
  const [activeTask, setActiveTask] = useState<CallTask>(DEFAULT_CALL_TASK);
  const [callStatus, setCallStatus] = useState<'IDLE' | 'CALLING' | 'LOGGED'>('IDLE');
  const [upsellAccepted, setUpsellAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/call-center');
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks) && data.tasks.length > 0) {
        setTasks(data.tasks);
        setActiveTask(data.tasks[0]);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Call center fetch fallback:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOutcome = async (outcome: 'CONFIRMED' | 'RAPPEL' | 'CANCELED') => {
    if (!activeTask) return;
    try {
      const res = await fetch('/api/call-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.id,
          outcome,
          notes: note || undefined,
          upsellAmount: upsellAccepted ? 179 : undefined,
          verifiedAddress: activeTask.address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Décision enregistrée en base : ${outcome === 'CONFIRMED' ? 'Confirmé ✅' : outcome === 'RAPPEL' ? 'Rappel programmé 📞' : 'Annulé ❌'}`);
        setTimeout(() => setToast(null), 3500);

        // Remove active task and advance to next
        const remaining = tasks.filter((t) => t.id !== activeTask.id);
        setTasks(remaining);
        if (remaining.length > 0) {
          setActiveTask(remaining[0]);
        }
        setNote('');
        setUpsellAccepted(false);
      }
    } catch (e) {
      console.warn('Error saving call outcome:', e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="bg-emerald-600 text-white font-bold text-xs p-3 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-2">
            <Headphones className="w-3.5 h-3.5 text-teal-600" />
            Poste Téléphonique & Confirmation d'Appels COD
            {isLiveDb && (
              <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <Database className="w-2.5 h-2.5" /> Base MySQL ({tasks.length} Leads)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Centre d'Appels & Télé-opérateurs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            File d'appels prioritaires, script interactif en Darija et validation directe des adresses synchronisées avec MySQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
            title="Actualiser depuis la base de données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Agent en ligne: Opérateur COD
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Appels en Attente</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{tasks.length}</p>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {tasks.filter((t) => t.priority === 'RAPPEL').length} rappels prioritaires
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Leads Base</span>
          <p className="text-2xl font-black text-blue-600 mt-2">{tasks.length}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Synchronisé avec Hostinger MySQL
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Taux de Confirmation Manuel</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">83.5%</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            +4.1% par rapport à hier
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Taux d'Upsell Téléphonique</span>
          <p className="text-2xl font-black text-purple-600 mt-2">26.8%</p>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            Offre 2ème pièce active
          </div>
        </div>
      </div>

      {/* Main Workspace: Queue (Left) & Active Dialer / Script (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Call Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
            File d'Attente des Appels ({tasks.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveTask(task)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTask?.id === task.id
                    ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">{task.customerName}</span>
                  <span className="font-mono text-[11px] text-slate-400">{task.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>{task.city}</span>
                  <span className="font-bold text-slate-800">{task.amount} MAD</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                    {task.attempts} tentative(s)
                  </span>
                  {task.scheduledTime && (
                    <span className="text-amber-700 font-bold truncate max-w-[140px]">{task.scheduledTime}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Call Workspace & Script */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            
            {/* Customer Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  Appel en cours • {activeTask.orderNumber}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">{activeTask.customerName}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-bold text-slate-800">{activeTask.phone}</span>
                  <span>•</span>
                  <span>{activeTask.city}</span>
                  <span>•</span>
                  <span>{activeTask.product}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${activeTask.phone}`}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  Appeler ({activeTask.phone})
                </a>
                <a
                  href={`https://wa.me/212${activeTask.phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Interactive Darija Call Script */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Script d'Appel Recommandé (الدارجة المغربية)
                </span>
                <span className="text-[10px] text-slate-400">À lire au client</span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-100">
                « Alo Salam Si {activeTask.customerName.split(' ')[0]}, labas 3lik ? M3ak le service confirmation. 3la wad l'commande dyalk dyal <strong>{activeTask.product}</strong> li derti f site b <strong>{activeTask.amount} MAD</strong>. Bghit ghir n2aked m3ak l3onwan f {activeTask.city} : wach {activeTask.address} ? »
              </p>

              {/* Upsell Suggestion */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-xs font-bold text-teal-900 block">
                    Offre Spéciale Appel : 2ème pièce à -30% (+179 MAD)
                  </strong>
                  <span className="text-[11px] text-teal-700">
                    « Ila bghiti tzid piece khera lik wla l chi 7ed, katakhodha b remise 30% »
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={upsellAccepted}
                  onChange={(e) => setUpsellAccepted(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Remarque ou note d'appel (Optionnel) :
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Le client confirme l'adresse, rappeler vers 17h, etc."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Quick Outcome Logger Buttons */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Résultat de l'Appel & Décision Immédiate :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleOutcome('CONFIRMED')}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-xs transition-colors active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer & Expédier</span>
                </button>
                <button
                  onClick={() => handleOutcome('RAPPEL')}
                  className="p-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-xs transition-colors active:scale-95"
                >
                  <PhoneForwarded className="w-4 h-4" />
                  <span>Ne répond pas (Rappeler)</span>
                </button>
                <button
                  onClick={() => handleOutcome('RAPPEL')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95"
                >
                  <Clock className="w-4 h-4" />
                  <span>Reporter à demain</span>
                </button>
                <button
                  onClick={() => handleOutcome('CANCELED')}
                  className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Annulé / Faux Numéro</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
