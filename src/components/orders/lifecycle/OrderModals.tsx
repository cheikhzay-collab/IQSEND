'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Phone,
  MapPin,
  ExternalLink,
  Barcode,
  QrCode,
  ChevronDown,
  Plus,
  Save,
  Package,
  FileEdit
} from 'lucide-react';
import { LifecycleOrder, LifecycleStage, OrderItemDetail } from '@/context/OrderLifecycleContext';
import { MOROCCAN_CITIES } from '@/lib/moroccan-cities';
import { CATALOG_PRODUCTS } from '@/lib/products-store';

interface DistrictOption {
  id: number;
  ville: string;
  name: string;
  arabic_name?: string;
  price?: number;
  delais?: string;
}

// ── 1. SHIPPING LABEL MODAL (WAYBILL / BORDEREAU DE LIVRAISON) ──────────
export function ShippingLabelModal({
  order,
  isOpen,
  onClose,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Bordereau d’Expédition Sendit (AWB) — {order.orderNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Label Paper */}
        <div className="p-6">
          <div className="border-2 border-slate-900 rounded-xl p-5 bg-white text-slate-900 space-y-4 font-mono text-xs shadow-inner">
            {/* Top Bar with Courier Logo & Barcode */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <span className="text-xl font-black tracking-tighter text-slate-900 font-sans block">
                  SENDIT.MA
                </span>
                <span className="text-[10px] text-slate-500 font-sans uppercase font-bold tracking-wider">
                  Express COD Logistics
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black block font-sans">
                  {order.shipping?.courier || 'Sendit.ma Express'}
                </span>
                <span className="text-sm font-black text-slate-900 tracking-wider">
                  {order.shipping?.trackingNumber || 'SND-819204'}
                </span>
              </div>
            </div>

            {/* Barcode Simulated Graphics */}
            <div className="py-2 text-center border-b border-dashed border-slate-300">
              <div className="flex justify-center items-center gap-1 h-12 bg-slate-50 p-2 rounded">
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-2 h-full bg-slate-900" />
                <div className="w-1 h-full bg-slate-900" />
                <div className="w-3 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-2.5 h-full bg-slate-900" />
                <div className="w-1 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-3 h-full bg-slate-900" />
                <div className="w-1.5 h-full bg-slate-900" />
                <div className="w-0.5 h-full bg-slate-900" />
                <div className="w-2 h-full bg-slate-900" />
              </div>
              <span className="text-[11px] font-bold tracking-widest text-slate-700">
                *{order.shipping?.trackingNumber || 'SND-819204'}*
              </span>
            </div>

            {/* Sender & Receiver Grid */}
            <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-3 font-sans">
              <div className="border-r border-slate-200 pr-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Expéditeur (From)
                </span>
                <p className="font-bold text-xs text-slate-900">EGROW STORE (Sendit Hub)</p>
                <p className="text-[11px] text-slate-600">Hub Central Ain Sebaa</p>
                <p className="text-[11px] text-slate-600">Casablanca, Maroc</p>
                <p className="text-[11px] text-slate-600">Tél: 0522-001122</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Destinataire (To)
                </span>
                <p className="font-bold text-xs text-slate-900">{order.customer.name}</p>
                <p className="text-[11px] text-slate-700 font-semibold">{order.customer.phone}</p>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  {order.customer.address}
                </p>
                <p className="text-[11px] font-black text-slate-900 mt-1 uppercase">
                  Ville: {order.customer.city}
                </p>
              </div>
            </div>

            {/* Big COD Cash Block */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between font-sans">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Mode de Paiement
                </span>
                <span className="text-base font-black text-amber-950">
                  CASH ON DELIVERY (COD)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Montant Cash à Encaisser
                </span>
                <span className="text-xl font-black text-amber-950">
                  {order.payment.amount} MAD
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="font-sans">
              <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Contenu du Colis ({order.items.length} article(s))
              </span>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                  <tr>
                    <th className="p-1.5">Article</th>
                    <th className="p-1.5 text-center">Qté</th>
                    <th className="p-1.5 text-right">Prix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5">
                        <span className="font-bold">{item.name}</span>
                        {item.size && (
                          <span className="text-[10px] text-slate-500 ml-1">
                            [{item.size}]
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-1.5 text-right font-semibold">
                        {item.price} {order.payment.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Notice */}
            <div className="pt-2 text-[10px] text-slate-400 text-center font-sans">
              En cas de non-livraison ou refus, retourner au Hub Central Sendit Casablanca.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. INVOICE MODAL (FACTURE COMMERCIALE) ──────────────────────────────
export function InvoiceModal({
  order,
  isOpen,
  onClose,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-800">
              Facture / Bon de Vente — {order.orderNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black text-slate-900">EGROW E-COMMERCE</h2>
              <p className="text-slate-500 text-[11px]">R.C. 549102 • IF: 38291044 • ICE: 002948190000041</p>
              <p className="text-slate-500 text-[11px]">Casablanca, Maroc</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900">
                {order.fulfillment?.invoiceNumber || `INV-2026-${order.orderNumber.replace('#', '')}`}
              </span>
              <p className="text-slate-500 text-[11px]">Date: {order.fulfillment?.invoiceDate || '17 Oct 2026'}</p>
              <p className="text-slate-500 text-[11px]">Réf: {order.orderNumber}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Facturé à
            </span>
            <p className="font-bold text-slate-900">{order.customer.name}</p>
            <p className="text-slate-600">{order.customer.phone}</p>
            <p className="text-slate-600">{order.customer.address}, {order.customer.city}</p>
          </div>

          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2 text-center">Qté</th>
                <th className="py-2 text-right">Prix Unitaire</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 font-medium text-slate-900">{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{item.price} MAD</td>
                  <td className="py-2 text-right font-bold">{item.price * item.quantity} MAD</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 font-bold">
              <tr>
                <td colSpan={3} className="py-2 text-right">Sous-total:</td>
                <td className="py-2 text-right">{order.payment.amount} MAD</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 text-right text-slate-500">Livraison (Sendit):</td>
                <td className="py-1 text-right text-emerald-600">Gratuite</td>
              </tr>
              <tr className="text-sm font-black text-slate-900">
                <td colSpan={3} className="py-2 text-right">Total Net TTC:</td>
                <td className="py-2 text-right text-emerald-800">{order.payment.amount} MAD</td>
              </tr>
            </tfoot>
          </table>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center font-medium">
            Statut du Règlement: <span className="font-bold">{order.payment.status === 'SETTLED' ? 'Encaissé & Clôturé (Paid)' : 'Paiement à la réception (COD)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. EDIT ORDER MODAL (IDENTIQUE AU FORMULAIRE OFFICIEL D'ENTRÉE DE COMMANDE) ──
export function EditOrderModal({
  order,
  isOpen,
  onClose,
  onSave,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<LifecycleOrder>) => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('06');
  const [city, setCity] = useState('Casablanca');
  const [cityInput, setCityInput] = useState('Casablanca');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('custom');
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<string>('299');
  const [productThumbnail, setProductThumbnail] = useState<string>('');
  const [stage, setStage] = useState<LifecycleStage>('PENDING_CONFIRMATION');

  // Sendit Districts State (Synchronized with Sendit.ma)
  const [senditDistricts, setSenditDistricts] = useState<DistrictOption[]>([]);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Sendit official districts on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch('/api/logistics/sendit/districts')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.districts) && data.districts.length > 0) {
          const sorted = [...data.districts].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
          );
          setSenditDistricts(sorted);
        }
      })
      .catch((err) => {
        console.warn('[EditOrderModal] Could not load Sendit districts:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Synchronize state when order changes
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer?.name || '');
      setPhone(order.customer?.phone || '');
      const currentCity = order.customer?.city || 'Casablanca';
      setCity(currentCity);
      setCityInput(currentCity);
      setAddress(order.customer?.address || '');
      setNote(order.customer?.notes || '');
      setStage(order.stage || 'PENDING_CONFIRMATION');
      setAmount(String(order.payment?.amount || 299));

      const firstItem = order.items?.[0];
      const prodName = firstItem?.name || 'Pack E-commerce';
      setProductName(prodName);
      setSku(firstItem?.sku || '');
      const itemQty = firstItem?.quantity || 1;
      setQuantity(itemQty);
      setProductThumbnail(firstItem?.thumbnail || '');

      // Match catalog product
      const match = CATALOG_PRODUCTS.find(
        (p) =>
          p.name.trim().toLowerCase() === prodName.trim().toLowerCase() ||
          (firstItem?.sku && p.sku && p.sku.toLowerCase() === firstItem.sku.toLowerCase())
      );
      if (match) {
        setSelectedCatalogId(match.id);
      } else {
        setSelectedCatalogId('custom');
      }
    }
  }, [order]);

  // Current selected district details (for price & delay info)
  const selectedDistrictInfo = useMemo(() => {
    if (!senditDistricts.length) return null;
    const lowerCity = city.trim().toLowerCase();
    return (
      senditDistricts.find(
        (d) =>
          d.name.toLowerCase() === lowerCity ||
          d.ville.toLowerCase() === lowerCity ||
          (d.arabic_name && d.arabic_name.includes(city.trim()))
      ) || null
    );
  }, [city, senditDistricts]);

  // Filtered districts based on user typing
  const filteredDistricts = useMemo(() => {
    if (!senditDistricts.length) return [];
    if (!cityInput.trim()) return senditDistricts;
    const q = cityInput.trim().toLowerCase();
    return senditDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.ville.toLowerCase().includes(q) ||
        (d.arabic_name && d.arabic_name.toLowerCase().includes(q))
    );
  }, [cityInput, senditDistricts]);

  if (!isOpen || !order) return null;

  const handleSelectProduct = (productId: string) => {
    setSelectedCatalogId(productId);
    if (productId === 'custom') return;
    const found = CATALOG_PRODUCTS.find((p) => p.id === productId);
    if (found) {
      setProductName(found.name);
      const qty = Number(quantity) || 1;
      setAmount(String(found.sellingPrice * qty));
      setProductThumbnail(found.image);
      if (found.sku) setSku(found.sku);
    }
  };

  const handleSelectCity = (chosenDistrict: DistrictOption) => {
    const finalName = chosenDistrict.ville || chosenDistrict.name;
    setCity(finalName);
    setCityInput(chosenDistrict.name);
    setIsCityDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !productName.trim()) return;

    const totalAmount = parseFloat(amount) || 0;
    const qty = Number(quantity) || 1;
    const unitPrice = qty > 0 ? totalAmount / qty : totalAmount;

    const updatedItem: OrderItemDetail = {
      id: order.items?.[0]?.id || `item-${Date.now()}`,
      name: productName.trim(),
      sku: sku.trim() || order.items?.[0]?.sku || 'SKU-COD',
      thumbnail: productThumbnail || order.items?.[0]?.thumbnail || '',
      quantity: qty,
      price: unitPrice,
    };

    onSave(order.id, {
      customer: {
        ...order.customer,
        name: customerName.trim(),
        phone: phone.trim(),
        city: (city || cityInput).trim(),
        address: address.trim(),
        notes: note.trim() || undefined,
      },
      items: [updatedItem, ...(order.items?.slice(1) || [])],
      payment: {
        ...order.payment,
        method: 'COD',
        amount: totalAmount,
      },
      stage,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">
                  Modifier la commande — {order.orderNumber}
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> 517 Villes Sendit (A-Z)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Mise à jour des informations client, produit et logistique COD</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Nom du Client */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nom du Client <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: Salma R. أو رشيد العلوي"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Téléphone */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Téléphone (Maroc) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06******** أو 07********"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>

            {/* Ville avec Autocomplete A-Z Sendit */}
            <div className="relative" ref={cityDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Ville (Maroc) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  A-Z
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCity(e.target.value);
                    setIsCityDropdownOpen(true);
                  }}
                  onFocus={() => setIsCityDropdownOpen(true)}
                  placeholder="Tapez les 1ères lettres (ex: Ca, Fa, Rabat...)"
                  className="w-full text-xs p-2.5 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium bg-white"
                />
                <button
                  type="button"
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isCityDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Autocomplete / Dropdown list */}
              {isCityDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  {filteredDistricts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Aucune ville trouvée. Saisie personnalisée conservée.
                    </div>
                  ) : (
                    filteredDistricts.slice(0, 80).map((d) => (
                      <button
                        key={`city-edit-${d.id}`}
                        type="button"
                        onClick={() => handleSelectCity(d)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-[#135d54] truncate">
                            {d.name}
                          </p>
                          {d.arabic_name && (
                            <p className="text-[11px] text-slate-500 font-sans truncate">
                              {d.arabic_name}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
                          {d.price} MAD
                        </span>
                      </button>
                    ))
                  )}
                  {filteredDistricts.length > 80 && (
                    <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">
                      + {filteredDistricts.length - 80} autres villes... Tapez plus de lettres pour affiner
                    </div>
                  )}
                </div>
              )}

              {/* Delivery fee & SLA info */}
              {selectedDistrictInfo && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span>
                    Sendit: {selectedDistrictInfo.price} MAD • Délai: {selectedDistrictInfo.delais}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Adresse Complète */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adresse Complète (Optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Boulevard Mohammed V, Immeuble 12, Quartier Agdal"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>

          {/* NOTE / Instructions */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                NOTE / Instructions (Optionnel)
              </span>
              <span className="text-[10px] text-slate-400">Pour le livreur Sendit ou l'équipe</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: ملاحظات للطلب أو للمندوب (القياس 42، اللون أسود، يفضل التوصيل بعد العصر، الاتصال قبل المجيء...)"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Sélectionner dans le catalogue */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Sélectionner dans le catalogue
            </label>
            <select
              value={selectedCatalogId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium bg-white"
            >
              {CATALOG_PRODUCTS.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.sellingPrice} MAD • Stock: {prod.totalStock})
                </option>
              ))}
              <option value="custom">Autre article personnalisé...</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nom de l'Article <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Smart Watch S2"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Quantité <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setQuantity(val);
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Code SKU (Optionnel)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex: SKU-KHUF-42"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Montant COD (MAD) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-black text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Étape / Statut du cycle de vente
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as LifecycleStage)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium bg-white"
            >
              <option value="PENDING_CONFIRMATION">1. En attente de confirmation</option>
              <option value="PROCESSING">2. En préparation (AWB)</option>
              <option value="IN_TRANSIT">3. En cours de livraison (Sendit)</option>
              <option value="COMPLETED">4. Livrées & Encaissées</option>
              <option value="CANCELED">5. Annulée à la confirmation (0 DH)</option>
              <option value="RETURNED">6. Retournée chez transporteur (Sendit)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 4. CANCEL ORDER MODAL ────────────────────────────────────────────────
export function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onConfirmCancel,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => void;
}) {
  const [reason, setReason] = useState('Client injoignable au téléphone');

  if (!isOpen || !order) return null;

  const handleCancel = () => {
    onConfirmCancel(order.id, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2.5 text-rose-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">
            Annuler la commande {order.orderNumber} ?
          </h3>
        </div>
        <p className="text-slate-600">
          Veuillez préciser le motif de l’annulation pour mettre à jour les statistiques de conversion COD:
        </p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
        >
          <option value="Client injoignable au téléphone">Client injoignable au téléphone</option>
          <option value="Commande en double (Doublon détecté)">Commande en double (Doublon)</option>
          <option value="Client a refusé la commande au WhatsApp">Client a refusé la commande</option>
          <option value="Rupture de stock produit">Rupture de stock produit</option>
          <option value="Faux numéro / Coordonnées erronées">Faux numéro / Coordonnées erronées</option>
        </select>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
          >
            Fermer
          </button>
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Confirmer l’Annulation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5. RESCHEDULE MODAL ──────────────────────────────────────────────────
export function RescheduleModal({
  order,
  isOpen,
  onClose,
  onReschedule,
}: {
  order: LifecycleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (orderId: string, newDate: string, note?: string) => void;
}) {
  const [date, setDate] = useState('Demain matin (09h - 13h)');
  const [note, setNote] = useState('Le client a demandé de livrer à son bureau');

  if (!isOpen || !order) return null;

  const handleConfirm = () => {
    onReschedule(order.id, date, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2.5 text-indigo-600">
          <Calendar className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">
            Reprogrammer la livraison — {order.orderNumber}
          </h3>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Nouveau créneau horaire</label>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="Aujourd’hui après 16h00">Aujourd’hui après 16h00</option>
            <option value="Demain matin (09h - 13h)">Demain matin (09h - 13h)</option>
            <option value="Demain après-midi (14h - 18h)">Demain après-midi (14h - 18h)</option>
            <option value="Samedi prochain">Samedi prochain</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Note pour le livreur Sendit</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Rappeler avant d'arriver..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Reprogrammer & Notifier
          </button>
        </div>
      </div>
    </div>
  );
}
