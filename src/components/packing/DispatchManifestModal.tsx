'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  CheckCircle2,
  X,
  Truck,
  Calendar,
  User,
  Phone,
  Banknote,
  AlertCircle
} from 'lucide-react';

interface ManifestItem {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  totalAmount: number;
  trackingCode?: string;
}

interface DispatchManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ManifestItem[];
  onManifestCreated?: (manifestId: string) => void;
}

export function DispatchManifestModal({
  isOpen,
  onClose,
  items,
  onManifestCreated,
}: DispatchManifestModalProps) {
  const [driverName, setDriverName] = useState('Chauffeur Sendit.ma Express');
  const [driverPhone, setDriverPhone] = useState('0661009988');
  const [vehicleMatricule, setVehicleMatricule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manifestData, setManifestData] = useState<{
    manifestId: string;
    date: string;
  } | null>(null);

  if (!isOpen) return null;

  const totalCod = items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleGenerateAndPrint = async () => {
    setIsSubmitting(true);
    try {
      const orderIds = items.map((i) => i.id);
      const res = await fetch('/api/logistics/sendit/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds,
          driverName,
          driverPhone,
          actor: 'Responsable Expéditions',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setManifestData({
          manifestId: data.manifestId,
          date: todayDate,
        });
        if (onManifestCreated) onManifestCreated(data.manifestId);
        setTimeout(() => {
          window.print();
        }, 500);
      } else {
        alert(data.error || 'Erreur lors de la création du manifeste');
      }
    } catch (err: any) {
      alert('Erreur serveur: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  Bon de Ramassage Sendit.ma (Manifeste d'Expédition)
                </h2>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  {items.length} colis prêts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bordereau officiel de prise en charge avec décharge et signature du chauffeur Sendit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Interactive Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-0 print:m-0" id="printable-manifest">
          {/* Driver & Warehouse Info Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Chauffeur Sendit.ma
              </label>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-900 focus:outline-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tél. Chauffeur
              </label>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-900 focus:outline-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Matricule Véhicule
              </label>
              <input
                type="text"
                placeholder="Ex: 12-A-34567"
                value={vehicleMatricule}
                onChange={(e) => setVehicleMatricule(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-900 focus:outline-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Manifest Official Meta */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-blue-700">
                RÉF MANIFESTE : {manifestData?.manifestId || 'MAN-EN-ATTENTE'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Date d'émission : <strong>{manifestData?.date || todayDate}</strong> • Hub Central Casablanca
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold border border-slate-200">
                {items.length} Colis
              </span>
              <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl text-xs font-black border border-emerald-200">
                Total COD : {totalCod.toLocaleString()} MAD
              </span>
            </div>
          </div>

          {/* Table of Parcels */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">N°</th>
                  <th className="py-2.5 px-3">Code AWB Sendit</th>
                  <th className="py-2.5 px-3">N° Commande</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Ville</th>
                  <th className="py-2.5 px-3 text-right">Montant COD</th>
                  <th className="py-2.5 px-3 text-center">Contrôle Chauffeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {item.trackingCode || `SND-${item.id.slice(-6)}`}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.orderNumber}</td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {item.customerName}
                      <span className="text-[10px] text-slate-400 block font-normal">{item.phone}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{item.city}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {item.totalAmount} MAD
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-4 h-4 border border-slate-300 rounded mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legal Signatures Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                1. Remis par l'Expéditeur (Magasinier)
              </span>
              <p className="text-[10px] text-slate-400 mb-8">
                Je certifie avoir conditionné et remis {items.length} colis conformes.
              </p>
              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between text-[10px] text-slate-400">
                <span>Date & Heure</span>
                <span>Signature</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-blue-50/50 text-xs border-blue-200">
              <span className="font-bold text-blue-900 block mb-1">
                2. Décharge Transporteur (Chauffeur Sendit.ma)
              </span>
              <p className="text-[10px] text-blue-700 mb-8">
                Je soussigné atteste avoir pris en charge {items.length} colis pour une valeur COD de{' '}
                <strong>{totalCod.toLocaleString()} MAD</strong>.
              </p>
              <div className="pt-2 border-t border-dashed border-blue-300 flex justify-between text-[10px] text-blue-500">
                <span>Nom & Téléphone</span>
                <span>Signature & Cachet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>La transition vers "En livraison" sera confirmée au premier scan du chauffeur Sendit.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Fermer
            </button>

            <button
              onClick={handleGenerateAndPrint}
              disabled={isSubmitting || items.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Génération...' : 'Valider & Imprimer Bon de Ramassage'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

