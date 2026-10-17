'use client';

import React, { useState } from 'react';
import {
  PackageCheck,
  Printer,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Box,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PackingItem {
  id: string;
  orderNumber: string;
  customerName: string;
  city: string;
  productName: string;
  sku: string;
  size?: string;
  color?: string;
  quantity: number;
  totalAmount: number;
  stockAvailable: number;
  isPacked: boolean;
  senditStatus: 'PENDING' | 'PUSHED';
  trackingCode?: string;
}

const INITIAL_PACKING: PackingItem[] = [
  {
    id: 'pk-1',
    orderNumber: 'MA-20496',
    customerName: 'Anas Benmoussa',
    city: 'Casablanca',
    productName: 'Pack 2x Chemises Lin',
    sku: 'CHM-LIN-WHT-L',
    size: 'L',
    color: 'Blanc',
    quantity: 2,
    totalAmount: 399,
    stockAvailable: 42,
    isPacked: true,
    senditStatus: 'PENDING',
  },
  {
    id: 'pk-2',
    orderNumber: 'MA-20497',
    customerName: 'Salma Idrissi',
    city: 'Rabat',
    productName: 'Robe Brodée Traditionnelle',
    sku: 'ROB-TRAD-BLU-M',
    size: 'M',
    color: 'Bleu',
    quantity: 1,
    totalAmount: 249,
    stockAvailable: 15,
    isPacked: false,
    senditStatus: 'PENDING',
  },
  {
    id: 'pk-3',
    orderNumber: 'MA-20498',
    customerName: 'Tariq Alami',
    city: 'Fes',
    productName: 'Chaussures Cuir Véritable',
    sku: 'CHS-CUIR-BRN-43',
    size: '43',
    color: 'Marron',
    quantity: 1,
    totalAmount: 550,
    stockAvailable: 6,
    isPacked: true,
    senditStatus: 'PUSHED',
    trackingCode: 'SND-910291',
  },
];

export default function PackingPage() {
  const [items, setItems] = useState<PackingItem[]>(INITIAL_PACKING);

  const togglePacked = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isPacked: !i.isPacked } : i))
    );
  };

  const handlePushSingle = (id: string) => {
    const tracking = `SND-${Math.floor(100000 + Math.random() * 900000)}`;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, senditStatus: 'PUSHED', trackingCode: tracking } : i
      )
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Packing & Préparation des Expéditions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vérification des stocks, impression des bordereaux thermiques AWB et transmission groupée à Sendit.ma
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
            <Printer className="w-3.5 h-3.5" /> Imprimer les Bordereaux Prêts (AWB)
          </button>
        </div>
      </div>

      {/* Quick Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">À emballer aujourd'hui</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {items.filter((i) => !i.isPacked).length} colis
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">Emballés & Prêts pour Sendit</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {items.filter((i) => i.isPacked && i.senditStatus === 'PENDING').length} colis
          </p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">Transmis à Sendit (AWB Actif)</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {items.filter((i) => i.senditStatus === 'PUSHED').length} colis
          </p>
        </div>
      </div>

      {/* Packing Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">File d'Attente de Préparation</h2>
          <span className="text-xs text-slate-400">Scan code-barres actif 📷</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5">Vérifié</th>
                <th className="p-3.5">Commande</th>
                <th className="p-3.5">Client & Ville</th>
                <th className="p-3.5">Article & SKU</th>
                <th className="p-3.5">Stock Dispo</th>
                <th className="p-3.5">Montant COD</th>
                <th className="p-3.5">Statut Sendit</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      checked={item.isPacked}
                      onChange={() => togglePacked(item.id)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-3.5 font-mono font-bold text-blue-600">{item.orderNumber}</td>
                  <td className="p-3.5">
                    <span className="font-bold block text-slate-900">{item.customerName}</span>
                    <span className="text-slate-400 text-[11px]">{item.city}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-medium text-slate-800 block">{item.productName}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.sku} {item.size ? `• Taille: ${item.size}` : ''}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.stockAvailable > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.stockAvailable} en stock
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{item.totalAmount} MAD</td>
                  <td className="p-3.5">
                    {item.senditStatus === 'PUSHED' ? (
                      <span className="bg-emerald-50 text-emerald-700 font-mono text-[11px] px-2 py-0.5 rounded font-bold">
                        {item.trackingCode}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {item.senditStatus === 'PENDING' ? (
                      <button
                        onClick={() => handlePushSingle(item.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Créer Sendit ➔
                      </button>
                    ) : (
                      <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] px-3 py-1.5 rounded-lg">
                        AWB Prêt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
