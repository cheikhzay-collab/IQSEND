'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  RefreshCw,
  Database,
  X,
  FileText,
  Check,
  Scan,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';
import { DispatchManifestModal } from '@/components/packing/DispatchManifestModal';

interface PackingRow {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
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

export default function PackingPage() {
  const {
    orders: lifecycleOrders,
    processingCount,
    shipOrder,
    showToast,
  } = useOrderLifecycle();

  const [dbItems, setDbItems] = useState<PackingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [packedMap, setPackedMap] = useState<Record<string, boolean>>({});
  const [previewAwbItem, setPreviewAwbItem] = useState<PackingRow | null>(null);
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const [pushingMap, setPushingMap] = useState<Record<string, boolean>>({});

  // Fetch from MySQL Packing API
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/packing');
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        setDbItems(data.items);
        setIsLiveDb(true);
      }
    } catch (e) {
      console.warn('Error fetching packing items from DB:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Merge lifecycle orders in PROCESSING stage with DB items for complete cohesion
  // EXCLUSIVELY confirmed orders waiting to be packed & pushed to Sendit (Once pushed, they leave this stage!)
  const items: PackingRow[] = useMemo(() => {
    const combined: PackingRow[] = [];
    const seenIds = new Set<string>();

    // 1. From DB items (already strictly filtered in /api/packing to confirmed & unpushed)
    dbItems.forEach((d) => {
      if (!seenIds.has(d.id) && !d.trackingCode && d.senditStatus !== 'PUSHED') {
        seenIds.add(d.id);
        const isItemPacked = packedMap[d.id] !== undefined ? packedMap[d.id] : d.isPacked;
        combined.push({
          ...d,
          isPacked: isItemPacked,
        });
      }
    });

    // 2. From OrderLifecycleContext (only PROCESSING orders that have no tracking and not pushed)
    const processingLifecycle = lifecycleOrders.filter(
      (o) => o.stage === 'PROCESSING' && !o.shipping?.trackingNumber && o.fulfillment?.status !== 'READY_FOR_PICKUP'
    );
    processingLifecycle.forEach((o) => {
      if (!seenIds.has(o.id)) {
        seenIds.add(o.id);
        const isItemPacked = packedMap[o.id] !== undefined ? packedMap[o.id] : false;

        combined.push({
          id: o.id,
          orderNumber: o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`,
          customerName: o.customer.name,
          phone: o.customer.phone,
          address: o.customer.address,
          city: o.customer.city,
          productName: o.items[0]?.name || 'Produit COD Sendit',
          sku: o.items[0]?.sku || 'SKU-GEN',
          size: o.items[0]?.size,
          color: o.items[0]?.color,
          quantity: o.items[0]?.quantity || 1,
          totalAmount: o.payment.amount,
          stockAvailable: 28,
          isPacked: isItemPacked,
          senditStatus: 'PENDING',
          trackingCode: undefined,
        });
      }
    });

    return combined;
  }, [lifecycleOrders, dbItems, packedMap]);

  // Filtered rows
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCity = selectedCity === 'ALL' || item.city.toLowerCase() === selectedCity.toLowerCase();

      return matchSearch && matchCity;
    });
  }, [items, searchQuery, selectedCity]);

  // Cities list
  const cities = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.city)));
  }, [items]);

  // Toggle packed state
  const togglePacked = (id: string) => {
    const current = packedMap[id] !== undefined ? packedMap[id] : items.find((i) => i.id === id)?.isPacked ?? false;
    const nextPacked = !current;
    setPackedMap((prev) => ({ ...prev, [id]: nextPacked }));

    // Sync to MySQL
    fetch('/api/packing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, action: 'TOGGLE_PACKED', isPacked: nextPacked }),
    }).catch((e) => console.warn('Packing toggle DB error:', e));
  };

  // Push single order to Sendit
  const handlePushSingle = async (item: PackingRow) => {
    if (pushingMap[item.id]) return;
    setPushingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      // 1. Sync to MySQL and push to Sendit API (Reel)
      const res = await fetch('/api/packing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: item.id, action: 'PUSH_SENDIT' }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Échec de transmission du colis à Sendit');
      }

      const realTracking = data.trackingCode;

      // 2. Immediately remove from local state so it DISAPPEARS from Packing station!
      setDbItems((prev) => prev.filter((i) => i.id !== item.id));

      // 3. Move order in context to IN_TRANSIT (Stage 3 Tracking)
      shipOrder(item.id);

      showToast(`✅ Colis ${item.orderNumber} transmis avec succès à Sendit (${realTracking}) ! Transféré vers "3. En livraison"`, 'success');

      // 4. Refresh background DB items
      fetchItems();
    } catch (e: any) {
      showToast('Erreur Sendit: ' + e.message, 'error');
    } finally {
      setPushingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Push all packed orders
  const handlePushAllPacked = async () => {
    const packedPending = items.filter((i) => i.isPacked);
    if (packedPending.length === 0) {
      showToast("Veuillez d'abord emballer (ou scanner) au moins un colis avant de le transmettre à Sendit.", 'info');
      return;
    }

    for (const item of packedPending) {
      await handlePushSingle(item);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Station d'Emballage & Bordereaux Sendit
            </h1>
            {isLiveDb && (
              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 font-bold">
                <Database className="w-2.5 h-2.5" /> Base MySQL Connectée
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vérification physique des articles, scan code-barres, étiquetage thermique AWB et transmission directe au ramassage Sendit.ma
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchItems}
            disabled={isLoading}
            className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Actualiser depuis la base de données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={handlePushAllPacked}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Truck className="w-3.5 h-3.5" />
            Tout Transmettre à Sendit ({items.filter((i) => i.isPacked && i.senditStatus === 'PENDING').length})
          </button>
          <button
            onClick={() => setIsManifestOpen(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
            title="Générer le bordereau de remise au chauffeur Sendit pour signature"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Bon de Ramassage (Manifeste)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-app-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">À emballer aujourd'hui</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {items.filter((i) => !i.isPacked).length} <span className="text-xs font-bold text-slate-400">colis</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-app-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Emballés & Prêts pour Sendit</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {items.filter((i) => i.isPacked && i.senditStatus === 'PENDING').length}{' '}
            <span className="text-xs font-bold text-emerald-700/60">colis</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-app-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Transmis au Hub Sendit (AWB Actif)</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">
            {items.filter((i) => i.senditStatus === 'PUSHED').length}{' '}
            <span className="text-xs font-bold text-blue-700/60">colis en transit</span>
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 p-3 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par commande, client, SKU, ville..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL">Toutes les villes ({cities.length})</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 pl-2">
            <Scan className="w-3.5 h-3.5" /> Scan actif
          </div>
        </div>
      </div>

      {/* Packing Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-app-card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              File de Préparation des Colis
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              ({filteredItems.length} commandes affichées)
            </span>
          </div>
          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Intégration Sendit.ma API Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 text-center">Emballé</th>
                <th className="p-3.5">Commande</th>
                <th className="p-3.5">Client & Destination</th>
                <th className="p-3.5">Article & SKU</th>
                <th className="p-3.5">Stock Hub</th>
                <th className="p-3.5">Montant COD</th>
                <th className="p-3.5">Statut Sendit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="font-black text-sm text-slate-800">
                        Tous les colis ont été emballés et transmis à Sendit !
                      </p>
                      <p className="text-xs text-slate-500">
                        Chaque commande poussée a disparu de cet atelier et est maintenant visible dans l'étape <strong>3. En livraison (Sendit)</strong> prête pour le ramassage.
                      </p>
                      <a
                        href="/dashboard/tracking"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Voir les colis en livraison (Sendit) →</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={item.isPacked}
                        onChange={() => togglePacked(item.id)}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        title="Cocher quand l'article est physiquement vérifié et emballé"
                      />
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-black text-blue-600 block">{item.orderNumber}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.phone}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold block text-slate-900">{item.customerName}</span>
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.city} {item.address ? `• ${item.address.slice(0, 25)}...` : ''}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 block">{item.productName}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {item.sku} {item.size ? `• Taille: ${item.size}` : ''} {item.color ? `• ${item.color}` : ''}
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
                    <td className="p-3.5">
                      <span className="font-black text-slate-900">{item.totalAmount} MAD</span>
                      <span className="block text-[10px] font-bold text-amber-600 uppercase">Espèces COD</span>
                    </td>
                    <td className="p-3.5">
                      {item.senditStatus === 'PUSHED' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {item.trackingCode}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-1 rounded-lg font-medium inline-block">
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setPreviewAwbItem(item)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Aperçu et impression du bordereau AWB Sendit"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        AWB
                      </button>

                      {item.senditStatus === 'PENDING' ? (
                        <button
                          onClick={() => handlePushSingle(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                        >
                          Créer Sendit ➔
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          AWB Généré ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AWB THERMAL LABEL PREVIEW MODAL */}
      {previewAwbItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Bordereau Thermique Sendit.ma (Format 10x15cm)
                </h3>
              </div>
              <button
                onClick={() => setPreviewAwbItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Thermal Shipping Label */}
            <div className="p-6">
              <div className="border-2 border-dashed border-slate-400 p-4 rounded-xl bg-white space-y-4 font-mono text-slate-900 shadow-xs">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                  <div>
                    <h2 className="text-xl font-black tracking-tighter">SENDIT.MA</h2>
                    <p className="text-[9px] uppercase tracking-wider font-bold">Express COD Logistics Maroc</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                      STANDARD 24H
                    </span>
                    <p className="text-[10px] font-bold mt-1">{previewAwbItem.city.toUpperCase()}</p>
                  </div>
                </div>

                {/* Barcode & Tracking */}
                <div className="text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-center items-center gap-1 font-mono tracking-widest text-lg font-black">
                    ||| | |||| | |||||| | ||| | |||
                  </div>
                  <p className="font-mono font-bold text-xs mt-1 tracking-wider text-slate-800">
                    {previewAwbItem.trackingCode || `SND-${Math.floor(800000 + Math.random() * 99999)}`}
                  </p>
                  <p className="text-[9px] text-slate-400">Réf. Commande: {previewAwbItem.orderNumber}</p>
                </div>

                {/* Sender & Recipient */}
                <div className="grid grid-cols-2 gap-3 text-[10px] border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase">Expéditeur:</span>
                    <strong className="block text-slate-900">IQSEND Hub Central</strong>
                    <span>Zone Industrielle Ain Sebaa</span>
                    <span className="block font-semibold">Casablanca • 0522000000</span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="font-bold text-slate-400 block uppercase">Destinataire:</span>
                    <strong className="block text-slate-900">{previewAwbItem.customerName}</strong>
                    <span>{previewAwbItem.address || 'Adresse à confirmer'}</span>
                    <span className="block font-bold text-blue-700">{previewAwbItem.phone}</span>
                    <span className="block font-black text-slate-900">{previewAwbItem.city}</span>
                  </div>
                </div>

                {/* Item Details */}
                <div className="text-[10px] space-y-1 border-b border-slate-200 pb-3">
                  <div className="flex justify-between font-bold">
                    <span>{previewAwbItem.productName}</span>
                    <span>Qté: {previewAwbItem.quantity}</span>
                  </div>
                  <p className="text-slate-500 font-mono text-[9px]">SKU: {previewAwbItem.sku}</p>
                </div>

                {/* COD Cash Amount */}
                <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-900 uppercase block">Montant COD à Encaisser:</span>
                    <span className="text-[9px] text-amber-700">Paiement Cash à la livraison</span>
                  </div>
                  <span className="text-lg font-black text-amber-950 font-mono">
                    {previewAwbItem.totalAmount} MAD
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewAwbItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer l'Étiquette AWB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
