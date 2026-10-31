'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Package,
  MapPin,
  Phone,
  User,
  DollarSign,
  FileText,
  CheckCircle2,
  Search,
  ChevronDown,
} from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/orders';
import { CATALOG_PRODUCTS } from '@/lib/products-store';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (order: OrderItem & { notes?: string }) => void;
}

interface DistrictOption {
  id: number;
  ville: string;
  name: string;
  arabic_name?: string;
  price?: number;
  delais?: string;
}

const DEFAULT_POPULAR_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Salé',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'El Jadida',
  'Mohammedia',
  'Nador',
  'Béni Mellal',
  'Safi',
  'Khouribga',
  'Berrechid',
  'Settat',
  'Témara',
  'Jerada',
];

export function CreateOrderModal({
  isOpen,
  onClose,
  onCreate,
}: CreateOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('06');
  const [city, setCity] = useState('Casablanca');
  const [cityInput, setCityInput] = useState('Casablanca');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(CATALOG_PRODUCTS[0]?.id || 'custom');
  const [productName, setProductName] = useState(CATALOG_PRODUCTS[0]?.name || 'Pack 2x Chemises Lin');
  const [amount, setAmount] = useState(String(CATALOG_PRODUCTS[0]?.sellingPrice || 399));
  const [productThumbnail, setProductThumbnail] = useState(CATALOG_PRODUCTS[0]?.image || '');
  const [status, setStatus] = useState<OrderStatus>('PENDING_CONFIRMATION');

  // Sendit Districts State (Synchronized with Sendit.ma)
  const [senditDistricts, setSenditDistricts] = useState<DistrictOption[]>([]);
  const [isDistrictsLoaded, setIsDistrictsLoaded] = useState(false);

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
          // Ensure alphabetical sorting
          const sorted = [...data.districts].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
          );
          setSenditDistricts(sorted);
          setIsDistrictsLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('Could not load Sendit districts, using fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  // Filtered districts based on user typing first letters (alphabetically sorted)
  const filteredDistricts = useMemo(() => {
    if (!senditDistricts.length) return [];
    if (!cityInput.trim()) {
      return senditDistricts;
    }
    const q = cityInput.trim().toLowerCase();
    return senditDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.ville.toLowerCase().includes(q) ||
        (d.arabic_name && d.arabic_name.toLowerCase().includes(q))
    );
  }, [cityInput, senditDistricts]);

  if (!isOpen) return null;

  const handleSelectProduct = (productId: string) => {
    setSelectedCatalogId(productId);
    if (productId === 'custom') {
      return;
    }
    const found = CATALOG_PRODUCTS.find((p) => p.id === productId);
    if (found) {
      setProductName(found.name);
      setAmount(String(found.sellingPrice));
      setProductThumbnail(found.image);
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

    const newOrder: OrderItem & { notes?: string } = {
      id: `order-${Date.now()}`,
      orderNumber: `#AT${Math.floor(1000 + Math.random() * 9000)}`,
      status,
      badgeType: 'COD PENDING',
      amount: parseFloat(amount) || 299,
      currency: 'MAD',
      productName,
      productThumbnail:
        productThumbnail ||
        'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
      customerName,
      city: city || cityInput,
      countryCode: 'MA',
      phone,
      address,
      notes: note.trim() || undefined,
      timeAgo: '• NOW',
      assignedAgent: {
        type: 'initial',
        value: 'A',
        bgClass: 'bg-[#7c3aed]',
      },
    };

    onCreate(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#135d54] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Nouvelle Commande COD</h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> 517 Villes Sendit (A-Z)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Ajouter directement au pipeline de vente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium"
              />
            </div>

            {/* 🌟 VILLE RECHERCHABLE PAR LETTRES & TRIÉE PAR ORDRE ALPHABÉTIQUE (A-Z) */}
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
                  className="w-full text-xs p-2.5 pr-8 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium bg-white"
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
                        key={`city-${d.id}`}
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

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adresse Complète (Optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Boulevard Mohammed V, Immeuble 12, Quartier Agdal"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium"
            />
          </div>

          {/* 🌟 Champ NOTE / Instructions pour le livreur ou le manager */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#135d54]" />
                NOTE / Instructions (Optionnel)
              </span>
              <span className="text-[10px] text-slate-400">Pour le livreur Sendit ou l'équipe</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: ملاحظات للطلب أو للمندوب (القياس 42، اللون أسود، يفضل التوصيل بعد العصر، الاتصال قبل المجيء...)"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium placeholder:text-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Sélectionner dans le catalogue
            </label>
            <select
              value={selectedCatalogId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium bg-white"
            >
              {CATALOG_PRODUCTS.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.sellingPrice} MAD • Stock: {prod.totalStock})
                </option>
              ))}
              <option value="custom">Autre article personnalisé...</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nom de l'Article <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Smart Watch S2"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium"
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
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Colonne de départ
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-[#135d54] font-medium bg-white"
            >
              <option value="PENDING_CONFIRMATION">1. En attente de confirmation</option>
              <option value="PROCESSING">2. En préparation (AWB)</option>
              <option value="IN_TRANSIT">3. En cours de livraison (Sendit)</option>
              <option value="COMPLETED">4. Livrées & Encaissées</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black bg-[#135d54] hover:bg-[#0f4a42] text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer Commande</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
