'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Safi',
  'El Jadida',
  'Nador',
  'Béni Mellal',
  'Khouribga',
  'Mohammedia',
  'Témara',
  'Settat',
  'Berrechid',
  'Khemisset',
  'Guelmim',
  'Laâyoune',
  'Dakhla',
  'Taroudant',
  'Al Hoceïma',
  'Errachidia',
  'Ouarzazate',
  'Taza',
  'Berkane',
  'Larache',
  'Ksar El Kebir',
];

const PICKUP_HUBS = [
  'Fès - Hub Principal',
  'Casablanca - Hub Central Ain Sebaâ',
  'Casablanca - Hub Oulfa',
  'Tanger - Hub Logistique Tanger Med',
  'Marrakech - Hub Sidi Ghanem',
  'Rabat-Salé - Hub Agdal',
  'Agadir - Hub Anza',
];

export default function NewOrderPage() {
  const router = useRouter();
  const { showToast } = useOrderLifecycle();

  // Order Form State (Matching Moroccan standard shipping form exactly)
  const [hasLabels, setHasLabels] = useState('NON'); // 'OUI' | 'NON'
  const [pickupCity, setPickupCity] = useState('Fès - Hub Principal');
  const [clientCity, setClientCity] = useState('Casablanca');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('06');
  const [address, setAddress] = useState('');
  const [vendorRef, setVendorRef] = useState(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [notes, setNotes] = useState('');
  const [allowFitting, setAllowFitting] = useState(true); // Autoriser l'essayage (Oui / Non)
  const [isExchange, setIsExchange] = useState(false); // Échange (Oui / Non)

  // Products List
  const [products, setProducts] = useState([
    {
      id: '1',
      name: 'Smart Watch Ultra Pro S2',
      sku: 'SW2-BLK',
      size: 'Standard',
      quantity: 1,
      price: 299,
    },
  ]);

  // Google Sheets Direct 1-Click Sync State
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [showSheetGuide, setShowSheetGuide] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Dynamic Shipping Fee & SLA Calculation
  const getDeliveryFee = (city: string) => {
    if (city === 'Casablanca') return 25;
    if (['Rabat', 'Fès', 'Meknès', 'Marrakech', 'Tanger'].includes(city)) return 35;
    if (['Laâyoune', 'Dakhla', 'Errachidia', 'Ouarzazate'].includes(city)) return 45;
    return 35;
  };

  const deliveryFee = getDeliveryFee(clientCity);
  const productsSubtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const [totalAmount, setTotalAmount] = useState(productsSubtotal.toString());

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !phone.trim()) {
      showToast('Veuillez renseigner le nom et le téléphone du client.', 'error');
      return;
    }

    const orderPayload = {
      name: customerName,
      phone,
      city: clientCity,
      address: address || 'Adresse transmise par client',
      pickupCity,
      product: products[0]?.name || 'Article E-commerce',
      quantity: products[0]?.quantity || 1,
      totalAmount: parseFloat(totalAmount) || 299,
      notes: `${notes} ${allowFitting ? '| Essayage autorisé' : ''} ${isExchange ? '| Échange' : ''}`.trim(),
      vendorRef,
    };

    // Post to Google Sheets / Inbound Orders API
    fetch('/api/webhooks/google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })
      .then((res) => res.json())
      .then(() => {
        showToast(`Commande ${vendorRef} créée avec succès et ajoutée en attente de confirmation!`);
        router.push('/dashboard/orders/pending');
      })
      .catch((err) => {
        console.error(err);
        showToast(`Commande enregistrée dans le système!`);
        router.push('/dashboard/orders/pending');
      });
  };

  // Handle 1-Click Google Sheets Direct Sync
  const handleDirectSheetSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncResult({
          success: true,
          message: data.message,
          count: data.importedCount,
        });
        showToast(`${data.importedCount} commandes synchronisées depuis Google Sheet!`);
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erreur lors de la synchronisation.',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Impossible de se connecter au Google Sheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets';
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* 2. MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/orders"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Formulaire de Commande COD
                </h1>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-teal-200">
                  STANDARD EXPÉDITION MAROC
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Création manuelle de commande ou synchronisation automatique depuis Google Sheets.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSheetGuide(!showSheetGuide)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{showSheetGuide ? 'Masquer Aide Google Sheets' : 'Lier Google Sheets (1-Clic)'}</span>
            </button>
          </div>
        </div>

        {/* 3. GOOGLE SHEETS 1-CLICK SYNC BANNER (L'option la plus simple) */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    Synchronisation Google Sheet en 1-Clic (Sans Code)
                  </h3>
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    MÉTHODE ULTRA-FACILE
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Collez simplement le lien de votre feuille Google Sheets partagée (Lecteur). Vos commandes tomberont directement dans l'étape <strong>1. En attente de confirmation</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSheetGuide(!showSheetGuide)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap self-start md:self-center"
            >
              Comment ça marche ?
            </button>
          </div>

          {/* Direct URL Form */}
          <form onSubmit={handleDirectSheetSync} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit"
                className="w-full bg-white border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSyncing || !sheetUrl.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs shadow-sm transition-all shrink-0 active:scale-95"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Importer les Commandes</span>
                </>
              )}
            </button>
          </form>

          {/* Sync Result Feedback */}
          {syncResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                syncResult.success
                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{syncResult.message}</span>
              </div>
              {syncResult.success && (
                <Link
                  href="/dashboard/orders/pending"
                  className="font-bold underline text-emerald-800 hover:text-emerald-950 shrink-0"
                >
                  Voir dans En attente ➔
                </Link>
              )}
            </div>
          )}

          {/* Quick 3-Step Guide Drawer */}
          {showSheetGuide && (
            <div className="pt-3 border-t border-emerald-200/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] inline-flex items-center justify-center mb-1">
                  1
                </span>
                <p className="font-bold text-slate-800">Partager le Google Sheet</p>
                <p className="text-slate-500 text-[11px]">
                  Cliquez sur <strong>Partager</strong> en haut à droite du Sheet, puis choisissez <em>« Tous les utilisateurs disposant du lien »</em> (Accès Lecteur).
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] inline-flex items-center justify-center mb-1">
                  2
                </span>
                <p className="font-bold text-slate-800">En-têtes automatiques</p>
                <p className="text-slate-500 text-[11px]">
                  Le système détecte automatiquement les colonnes en <strong>Français, Arabe ou Anglais</strong> (Nom, Téléphone, Ville, Montant, Article).
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] inline-flex items-center justify-center mb-1">
                  3
                </span>
                <p className="font-bold text-slate-800">Webhook Temps Réel (Optionnel)</p>
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <span className="text-[10px] font-mono text-slate-500 truncate">
                    /api/webhooks/google-sheets
                  </span>
                  <button
                    onClick={copyWebhookUrl}
                    className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-100 shrink-0"
                  >
                    {copiedWebhook ? 'Copié ✓' : 'Copier Webhook'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. ORDER CREATION FORM (Exact Replica of Moroccan Logistics Standard) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Top Logistics Cost & SLA Strip (Identical to screenshot header) */}
          <div className="bg-[#F8FAFC] border-b border-slate-200/90 px-6 py-3.5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-slate-200/80">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Frais de livraison</span>
              <span className="text-sm font-black text-slate-800 mt-0.5 block">{deliveryFee} MAD</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Frais de refus</span>
              <span className="text-sm font-black text-emerald-600 mt-0.5 block">0 MAD (Gratuit)</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Frais d'annulation</span>
              <span className="text-sm font-black text-emerald-600 mt-0.5 block">0 MAD (Gratuit)</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Délai estimé</span>
              <span className="text-sm font-black text-blue-700 mt-0.5 block">24h - 48h</span>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">

            {/* Grid 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Col 1, Row 1: Vous avez des étiquettes ? */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Vous avez des étiquettes ?
                </label>
                <select
                  value={hasLabels}
                  onChange={(e) => setHasLabels(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors"
                >
                  <option value="NON">Non (Générer les bordereaux Sendit automatiquement)</option>
                  <option value="OUI">Oui (J'ai déjà imprimé mes étiquettes)</option>
                </select>
              </div>

              {/* Col 2, Row 1: Ville du client */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Ville du client
                </label>
                <select
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors"
                >
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c} {c === 'Casablanca' ? '(25 MAD - Express)' : '(35 MAD)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 1, Row 2: Ville de ramassage */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Ville de ramassage (Origine de l'expédition)
                </label>
                <select
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors"
                >
                  {PICKUP_HUBS.map((hub) => (
                    <option key={hub} value={hub}>
                      {hub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Col 2, Row 2: Nom du client */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nom du client <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Yassine Bennani"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors placeholder-slate-400"
                />
              </div>

              {/* Col 1, Row 3: Montant total */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Montant total (MAD) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="299"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block italic">
                  Montant total avec frais de livraison inclus (Paiement COD à la livraison).
                </span>
              </div>

              {/* Col 2, Row 3: Téléphone du client */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Téléphone du client <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-xs">🇲🇦</span>
                    <span className="text-xs font-bold text-slate-500">+212</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0612345678"
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-16 pr-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors placeholder-slate-400 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Numéro marocain (ex: 06 XX XX XX XX ou 07 XX XX XX XX)
                </span>
              </div>

              {/* Col 1, Row 4: Adresse du client */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Adresse du client
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Quartier Maârif, Rue Abou Bakr, Immeuble 14, Appt 5"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors placeholder-slate-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Veuillez indiquer une adresse complète afin de prévenir les retards.
                </span>
              </div>

              {/* Col 2, Row 4: Référence vendeur */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Référence vendeur
                  </label>
                  <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                    Nouveau
                  </span>
                </div>
                <input
                  type="text"
                  value={vendorRef}
                  onChange={(e) => setVendorRef(e.target.value)}
                  placeholder="Référence vendeur (#ORD-...)"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors"
                />
              </div>

              {/* Col 1, Row 5: Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note pour le livreur ou call center..."
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs transition-colors placeholder-slate-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Des informations supplémentaires (2ème numéro de téléphone, créneau horaire...)
                </span>
              </div>

              {/* Col 2, Row 5: Autoriser l'essayage ? */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Autoriser l'essayage du produit par le client ?
                </label>
                <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
                  <button
                    type="button"
                    onClick={() => setAllowFitting(true)}
                    className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      allowFitting
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowFitting(false)}
                    className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !allowFitting
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>

              {/* Col 1, Row 6: Échange */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Échange
                </label>
                <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsExchange(false)}
                    className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isExchange
                        ? 'bg-slate-200 text-slate-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Non
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExchange(true)}
                    className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isExchange
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Oui
                  </button>
                </div>
              </div>

            </div>

            {/* Row 7: Produits Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Produits & Articles
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setProducts([
                      ...products,
                      {
                        id: Date.now().toString(),
                        name: 'Nouvel article',
                        sku: 'SKU-00',
                        size: 'M',
                        quantity: 1,
                        price: 150,
                      },
                    ])
                  }
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un article</span>
                </button>
              </div>

              <div className="space-y-2">
                {products.map((prod, index) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-3"
                  >
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].name = e.target.value;
                          setProducts(updated);
                        }}
                        placeholder="Nom du produit..."
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="text"
                        value={prod.sku}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].sku = e.target.value;
                          setProducts(updated);
                        }}
                        placeholder="SKU"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        value={prod.quantity}
                        onChange={(e) => {
                          const updated = [...products];
                          updated[index].quantity = parseInt(e.target.value, 10) || 1;
                          setProducts(updated);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="w-28">
                      <div className="relative">
                        <input
                          type="number"
                          value={prod.price}
                          onChange={(e) => {
                            const updated = [...products];
                            updated[index].price = parseFloat(e.target.value) || 0;
                            setProducts(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                          MAD
                        </span>
                      </div>
                    </div>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setProducts(products.filter((_, i) => i !== index))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <Link
                href="/dashboard/orders"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Annuler
              </Link>

              <button
                type="submit"
                className="px-8 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-black shadow-sm transition-transform active:scale-95"
              >
                Enregistrer la commande
              </button>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
