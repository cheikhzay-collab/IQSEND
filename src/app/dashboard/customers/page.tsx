'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  AlertOctagon,
  UserCheck,
  UserX,
  X,
  RefreshCw,
  Database
} from 'lucide-react';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  totalOrders: number;
  deliveredOrders: number;
  refusedOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  reliabilityScore: 'VIP' | 'FIABLE' | 'NOUVEAU' | 'RISQUE' | 'BLACKLIST';
  notes: string;
}

const INITIAL_CUSTOMERS: CustomerItem[] = [];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveDb, setIsLiveDb] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Failed to load customers from DB:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Stats
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.reliabilityScore === 'VIP' || c.reliabilityScore === 'FIABLE').length;
  const blacklistCount = customers.filter((c) => c.reliabilityScore === 'BLACKLIST' || c.reliabilityScore === 'RISQUE').length;
  const totalRevenueFromCustomers = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterScore === 'ALL' || c.reliabilityScore === filterScore;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-2">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            CRM & Score de Fiabilité Client COD Maroc
            {isLiveDb && (
              <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <Database className="w-2.5 h-2.5" /> Base MySQL ({totalCustomers} Clients)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Base Clients & Anti-Fraude
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Détection automatique des clients fiables, historique des réceptions d'argent et liste noire des refus abusifs synchronisés depuis la base de données.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors"
            title="Rafraîchir depuis la base de données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={() => {
              const csvData = customers.map((c) => `${c.name},${c.phone},${c.city},${c.totalSpent},${c.reliabilityScore}`).join('\n');
              const blob = new Blob([`Nom,Téléphone,Ville,Dépense_MAD,Score\n${csvData}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `clients_sendit_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors"
          >
            Exporter Base CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Clients Enregistrés</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCustomers}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Acheteurs uniques dans le CRM
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Clients Fiables & VIP</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{vipCount}</p>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Taux de livraison 100% garanti
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Numéros à Risque / Blacklist</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{blacklistCount}</p>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            Alertés avant expédition Sendit
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Volume Total Encaissé</span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalRevenueFromCustomers.toLocaleString()} MAD
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            Panier moyen: ~{Math.round(totalRevenueFromCustomers / totalCustomers)} MAD
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone 06..., ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-teal-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-teal-600 text-slate-700"
          >
            <option value="ALL">Tous les profils</option>
            <option value="VIP">⭐ VIP & Ambassadeurs</option>
            <option value="FIABLE">✅ Clients Fiables</option>
            <option value="NOUVEAU">🆕 Nouveaux Clients</option>
            <option value="RISQUE">⚠️ Risque d'Échec</option>
            <option value="BLACKLIST">⛔ Liste Noire (Refus)</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-3">Téléphone & WhatsApp</th>
                <th className="py-3 px-3">Ville</th>
                <th className="py-3 px-3 text-center">Commandes</th>
                <th className="py-3 px-3 text-center">Taux Succès</th>
                <th className="py-3 px-3">Total Dépensé</th>
                <th className="py-3 px-3">Score Fiabilité</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading && customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                      <p className="text-xs font-semibold text-slate-600">Chargement de la base clients…</p>
                      <p className="text-[11px] text-slate-400">Synchronisation en direct avec la base de données</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <p className="text-xs font-medium text-slate-500">Aucun client trouvé dans la base de données.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                const successRate = c.totalOrders > 0 ? Math.round((c.deliveredOrders / c.totalOrders) * 100) : 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                          <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-xs">
                            {c.address}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone & WhatsApp */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-700 font-bold">{c.phone}</span>
                        <a
                          href={`https://wa.me/212${c.phone.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                          title="Ouvrir WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    {/* City */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.city}
                      </span>
                    </td>

                    {/* Orders count */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold text-slate-900">{c.totalOrders}</span>
                      <span className="text-[10px] text-slate-400 block">
                        ({c.deliveredOrders} livrées)
                      </span>
                    </td>

                    {/* Success Rate */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`text-xs font-black ${
                          successRate >= 80
                            ? 'text-emerald-600'
                            : successRate >= 50
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {successRate}%
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {c.totalSpent} MAD
                    </td>

                    {/* Reliability Badge */}
                    <td className="py-3.5 px-3">
                      {c.reliabilityScore === 'VIP' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          ⭐ VIP
                        </span>
                      ) : c.reliabilityScore === 'FIABLE' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Fiable
                        </span>
                      ) : c.reliabilityScore === 'NOUVEAU' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          🆕 Nouveau
                        </span>
                      ) : c.reliabilityScore === 'RISQUE' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-amber-600" /> Risque
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <AlertOctagon className="w-3 h-3 text-rose-600" /> Blacklisté
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-black text-xs">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{selectedCustomer.name}</h3>
                  <p className="text-[11px] text-slate-500">Profil Acheteur COD & Historique</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block">Téléphone</span>
                  <strong className="text-slate-900 text-sm font-mono mt-0.5 block">
                    {selectedCustomer.phone}
                  </strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block">Ville Principale</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">
                    {selectedCustomer.city}
                  </strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400 block">Adresse de livraison enregistrée</span>
                <p className="text-slate-800 font-medium mt-1 leading-relaxed">
                  {selectedCustomer.address}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Score de Fiabilité Client & Anti-Fraude (Base de Données) :
                </label>
                <select
                  value={selectedCustomer.reliabilityScore}
                  onChange={async (e) => {
                    const newScore = e.target.value as any;
                    setSelectedCustomer({ ...selectedCustomer, reliabilityScore: newScore });
                    setCustomers((prev) =>
                      prev.map((c) => (c.phone === selectedCustomer.phone ? { ...c, reliabilityScore: newScore } : c))
                    );
                    try {
                      await fetch('/api/customers', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: selectedCustomer.phone, trustScore: newScore }),
                      });
                    } catch (err) {
                      console.error('Failed to update customer score:', err);
                    }
                  }}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="VIP">⭐ VIP & Ambassadeur</option>
                  <option value="FIABLE">✅ Client Fiable</option>
                  <option value="NOUVEAU">🆕 Nouveau Client</option>
                  <option value="RISQUE">⚠️ Risque d'Échec</option>
                  <option value="BLACKLIST">⛔ Liste Noire (Refus Abusifs)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Notes d'expérience de livraison & Commentaires :
                </label>
                <textarea
                  value={selectedCustomer.notes}
                  onChange={(e) => setSelectedCustomer({ ...selectedCustomer, notes: e.target.value })}
                  onBlur={async () => {
                    try {
                      await fetch('/api/customers', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: selectedCustomer.phone, notes: selectedCustomer.notes }),
                      });
                      setCustomers((prev) =>
                        prev.map((c) => (c.phone === selectedCustomer.phone ? { ...c, notes: selectedCustomer.notes } : c))
                      );
                    } catch (err) {
                      console.error('Failed to update customer notes:', err);
                    }
                  }}
                  rows={2}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-teal-600"
                  placeholder="Ajouter une note persistante..."
                />
                <span className="text-[10px] text-slate-400 block">Enregistrement automatique dans MySQL dès que vous quittez le champ.</span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <a
                  href={`https://wa.me/212${selectedCustomer.phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contacter sur WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
