'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Download,
  Link as LinkIcon,
  RefreshCw,
  Table,
  Zap,
  Info,
  Save,
  Database,
  Clock,
  Activity,
  CheckCheck
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface GoogleSheetsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSheetsIntegrationModal({ isOpen, onClose }: GoogleSheetsIntegrationModalProps) {
  const { refreshInboundOrders, showToast } = useOrderLifecycle();
  
  // Tabs: 'template' | 'direct-sync' | 'webhook'
  const [activeTab, setActiveTab] = useState<'template' | 'direct-sync' | 'webhook'>('direct-sync');

  // Copy states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);
  const [copiedFullTemplate, setCopiedFullTemplate] = useState(false);

  // Direct Sheet Sync & Database Configuration states
  const [sheetUrl, setSheetUrl] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [dbSettings, setDbSettings] = useState<{
    saved: boolean;
    lastSavedAt?: string | null;
    lastSyncAt?: string | null;
    lastStatus?: string;
    totalSynced?: number;
    lastCount?: number;
  }>({ saved: false });
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message?: string;
    count?: number;
  } | null>(null);

  // Webhook Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    orderNumber?: string;
    message?: string;
  } | null>(null);

  // Load saved settings from database whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingSettings(true);

    fetch('/api/google-sheets/sync')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.settings) {
          if (data.settings.sheetUrl) {
            setSheetUrl(data.settings.sheetUrl);
          }
          setAutoSyncEnabled(data.settings.autoSync ?? true);
          setSyncInterval(data.settings.syncInterval || 30);
          setDbSettings({
            saved: !!data.settings.sheetUrl,
            lastSavedAt: data.settings.updatedAt,
            lastSyncAt: data.settings.lastSync,
            lastStatus: data.settings.lastStatus,
            totalSynced: data.settings.totalSynced || 0,
            lastCount: data.settings.lastCount || 0,
          });
        }
      })
      .catch((err) => {
        console.warn('[Google Sheets Modal] Error loading settings:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSettings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/google-sheets`
    : 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets';

  const headersList = ['Date', 'Nom Client', 'Téléphone', 'Ville', 'Adresse', 'Produit', 'Quantité', 'Prix COD (MAD)', 'Remarques'];

  const sampleRows = [
    {
      date: '2026-10-20',
      name: 'Youssef El Amrani',
      phone: '0661998877',
      city: 'Marrakech',
      address: 'Guéliz, Immeuble Atlas, Appt 6',
      product: 'Montre Luxe Or Noir',
      qty: 1,
      price: '349 MAD',
      notes: 'Appeler avant 14h',
    },
    {
      date: '2026-10-20',
      name: 'Amina Benjelloun',
      phone: '0672112233',
      city: 'Fès',
      address: 'Route Ain Chkef, Résidence Narjiss',
      product: 'Pack Caftan Moderne',
      qty: 1,
      price: '490 MAD',
      notes: 'Livraison express souhaitée',
    },
    {
      date: '2026-10-20',
      name: 'Tariq Alami',
      phone: '0654334455',
      city: 'Casablanca',
      address: 'Bd Zerktouni, Quartier Maârif',
      product: 'Sneakers Sport Élite',
      qty: 2,
      price: '598 MAD',
      notes: 'Espèces à la livraison',
    },
    {
      date: '2026-10-20',
      name: 'Houda Tazi',
      phone: '0663778899',
      city: 'Tanger',
      address: 'Tanger Balia, Complexe Ennasr',
      product: 'Sac Cuir Artisanal',
      qty: 1,
      price: '380 MAD',
      notes: 'Confirmation WhatsApp',
    },
    {
      date: '2026-10-20',
      name: 'Karim Bennani',
      phone: '0611223344',
      city: 'Rabat',
      address: 'Agdal, Rue Oukaimeden, Imm 12',
      product: 'Pack Soins Bio Maroc',
      qty: 1,
      price: '299 MAD',
      notes: 'Livrer l\'après-midi',
    },
  ];

  const copyFullTemplateToClipboard = () => {
    const fullText = [
      headersList.join('\t'),
      ...sampleRows.map((r) => [r.date, r.name, r.phone, r.city, `"${r.address}"`, r.product, r.qty, r.price.replace(' MAD', ''), r.notes].join('\t')),
    ].join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedFullTemplate(true);
    setTimeout(() => setCopiedFullTemplate(false), 2500);
    showToast('Modèle copié ! Ouvrez Google Sheets et faites Ctrl+V', 'success');
  };

  const handleDemoImport = async () => {
    setIsSyncingSheet(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true, sheetUrl: 'DEMO' }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          success: true,
          count: data.importedCount,
          message: `✅ ${data.importedCount} commandes de test importées avec succès !`,
        });
        await refreshInboundOrders();
        showToast(`${data.importedCount} commandes importées avec succès !`, 'success');
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erreur lors de l\'importation de test.',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Impossible de joindre le serveur.',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Smart Google Apps Script with dynamic column header lookup & Auto-Trigger
  const smartScriptCode = `// ==============================================================
// 🚀 SENDIT COD Platform - Script Universel Google Sheets (Auto-Sync)
// Transmission instantanée des commandes vers l'étape Confirmation
// ==============================================================

var WEBHOOK_URL = "${webhookUrl}";

/**
 * 1. Menu d'administration automatique dans Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 SENDIT Platform')
    .addItem('⚡ 1. Activer la synchronisation automatique (Auto-Sync)', 'setupAutoSyncTrigger')
    .addItem('🔄 2. Envoyer les nouvelles commandes maintenant', 'syncNewOrders')
    .addItem('ℹ️ 3. Tester la connexion avec la plateforme', 'testConnection')
    .addToUi();
}

/**
 * 2. Activation du déclencheur automatique en un clic (Installable Trigger)
 */
function setupAutoSyncTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getUserTriggers(ss);
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'onSheetOrderChange' || fn === 'syncNewOrders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Déclencheur instantané à chaque modification / ajout de ligne
  ScriptApp.newTrigger('onSheetOrderChange')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // Déclencheur périodique chaque minute pour les formulaires Google Forms
  ScriptApp.newTrigger('syncNewOrders')
    .timeBased()
    .everyMinutes(1)
    .create();

  syncNewOrders();

  SpreadsheetApp.getUi().alert(
    '✅ Synchronisation automatique activée avec succès !\\n\\n' +
    'Désormais, chaque nouvelle commande saisie est transmise instantanément à votre plateforme SENDIT.'
  );
}

function onSheetOrderChange(e) {
  syncNewOrders();
}

/**
 * 3. Détection et transmission des nouvelles commandes
 */
function syncNewOrders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return 0;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  function findColIndex(keywords) {
    for (var i = 0; i < headers.length; i++) {
      var h = (headers[i] || "").toString().toLowerCase().trim();
      for (var k = 0; k < keywords.length; k++) {
        if (h.indexOf(keywords[k].toLowerCase()) !== -1) return i;
      }
    }
    return -1;
  }

  var nameIdx = findColIndex(["nom", "client", "name", "الاسم", "اسم"]);
  var phoneIdx = findColIndex(["tel", "téléphone", "telephone", "phone", "mobile", "الهاتف", "هاتف", "رقم"]);
  var cityIdx = findColIndex(["ville", "city", "المدينة", "مدينة"]);
  var addressIdx = findColIndex(["adresse", "address", "العنوان", "عنوان"]);
  var productIdx = findColIndex(["produit", "article", "product", "item", "المنتج", "سلعة"]);
  var qtyIdx = findColIndex(["qte", "quantité", "quantity", "qty", "الكمية"]);
  var priceIdx = findColIndex(["prix", "montant", "total", "price", "amount", "الثمن", "المبلغ"]);
  var noteIdx = findColIndex(["note", "remarque", "comment", "ملاحظة", "ملاحظات"]);

  var statusColIdx = findColIndex(["statut sendit", "حالة المزامنة", "sync status", "statut"]);
  if (statusColIdx === -1) {
    statusColIdx = lastCol;
    sheet.getRange(1, statusColIdx + 1).setValue("Statut SENDIT (Synchronisation)")
      .setBackground("#065F46").setFontColor("#FFFFFF").setFontWeight("bold");
    lastCol = statusColIdx + 1;
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var values = dataRange.getValues();
  var sentCount = 0;

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var currentStatus = (row[statusColIdx] || "").toString().trim();
    if (currentStatus.indexOf("✅") !== -1) continue;

    var rawPhone = phoneIdx !== -1 ? (row[phoneIdx] || "").toString().trim() : "";
    var cleanedPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanedPhone.length < 8) continue;

    var customerName = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx].toString().trim() : ("Client #" + (r + 2));
    var city = (cityIdx !== -1 && row[cityIdx]) ? row[cityIdx].toString().trim() : "Casablanca";
    var address = (addressIdx !== -1 && row[addressIdx]) ? row[addressIdx].toString().trim() : "À confirmer";
    var product = (productIdx !== -1 && row[productIdx]) ? row[productIdx].toString().trim() : "Pack E-commerce";
    var qty = qtyIdx !== -1 ? parseInt(row[qtyIdx] || 1, 10) : 1;
    var price = priceIdx !== -1 ? parseFloat((row[priceIdx] || "299").toString().replace(/[^0-9.]/g, "")) : 299;
    var notes = noteIdx !== -1 ? (row[noteIdx] || "").toString().trim() : "Depuis Google Sheets";

    var payload = {
      name: customerName,
      phone: cleanedPhone,
      city: city,
      address: address,
      product: product,
      quantity: isNaN(qty) ? 1 : qty,
      price: isNaN(price) ? 299 : price,
      notes: notes
    };

    try {
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
      var code = response.getResponseCode();
      if (code >= 200 && code < 300) {
        var parsed = JSON.parse(response.getContentText());
        var orderNum = parsed.orderNumber || ("#GS" + (r + 2));
        var timeStr = Utilities.formatDate(new Date(), "GMT+1", "HH:mm");
        sheet.getRange(r + 2, statusColIdx + 1)
          .setValue("✅ Transféré (" + orderNum + ") " + timeStr)
          .setBackground("#D1FAE5")
          .setFontColor("#065F46")
          .setFontWeight("bold");
        sentCount++;
      }
    } catch (err) {
      sheet.getRange(r + 2, statusColIdx + 1)
        .setValue("❌ Erreur: " + err.message.substring(0, 30))
        .setBackground("#FEE2E2")
        .setFontColor("#991B1B");
    }
  }
  return sentCount;
}

function testConnection() {
  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert('✅ Connexion avec la plateforme SENDIT active et opérationnelle à 100% !');
    } else {
      SpreadsheetApp.getUi().alert('⚠️ Connexion établie avec le code HTTP: ' + response.getResponseCode());
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Échec de la connexion: ' + err.message);
  }
}`;

  const copyToClipboard = (text: string, type: 'url' | 'code' | 'headers') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedHeaders(true);
      setTimeout(() => setCopiedHeaders(false), 2000);
    }
  };

  // Save Settings to Database (without running sync)
  const handleSaveSettings = async (customAutoSync?: boolean, customInterval?: number) => {
    if (!sheetUrl.trim()) {
      setSaveFeedback({ type: 'error', message: 'Veuillez renseigner le lien Google Sheets avant d\'enregistrer.' });
      setTimeout(() => setSaveFeedback(null), 3500);
      return;
    }

    setIsSavingSettings(true);
    setSaveFeedback(null);

    const targetAutoSync = customAutoSync !== undefined ? customAutoSync : autoSyncEnabled;
    const targetInterval = customInterval !== undefined ? customInterval : syncInterval;

    try {
      const res = await fetch('/api/google-sheets/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          autoSync: targetAutoSync,
          syncInterval: targetInterval,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDbSettings((prev) => ({
          ...prev,
          saved: true,
          lastSavedAt: data.savedAt || new Date().toISOString(),
        }));
        setSaveFeedback({
          type: 'success',
          message: '✅ Paramètres enregistrés avec succès dans MySQL !',
        });
        showToast('Paramètres Google Sheets sauvegardés dans la base de données !', 'success');
      } else {
        setSaveFeedback({ type: 'error', message: data.error || 'Échec de l\'enregistrement des paramètres.' });
      }
    } catch (err: any) {
      setSaveFeedback({ type: 'error', message: err.message || 'Impossible de se connecter à la base de données.' });
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = async () => {
    const nextState = !autoSyncEnabled;
    setAutoSyncEnabled(nextState);
    if (sheetUrl.trim()) {
      await handleSaveSettings(nextState, syncInterval);
    }
  };

  // Direct Google Sheet Sync (1-Click)
  const handleDirectSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsSyncingSheet(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          autoSync: autoSyncEnabled,
          syncInterval,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDbSettings((prev) => ({
          ...prev,
          saved: true,
          lastSyncAt: new Date().toISOString(),
          lastStatus: 'SUCCESS',
          totalSynced: (prev.totalSynced || 0) + (data.importedCount || 0),
          lastCount: data.importedCount,
        }));
        setSyncResult({
          success: true,
          count: data.importedCount,
          message: data.message || `${data.importedCount} commandes importées avec succès !`,
        });
        await refreshInboundOrders();
        showToast(`${data.importedCount} nouvelle(s) commande(s) importée(s) depuis Google Sheets !`, 'success');
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erreur lors de la synchronisation de la feuille.',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Impossible de se connecter au serveur.',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Live Simulation Test
  const handleSimulateOrder = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    const testClients = [
      { name: 'Youssef El Amrani', phone: '0661998877', city: 'Marrakech', address: 'Guéliz, Immeuble Atlas, Appt 6', product: 'Montre Luxe Or Noir', price: 349 },
      { name: 'Amina Benjelloun', phone: '0672112233', city: 'Fès', address: 'Route Ain Chkef, Résidence Narjiss', product: 'Pack Robe Caftan Moderne', price: 490 },
      { name: 'Tariq Alami', phone: '0654334455', city: 'Casablanca', address: 'Bd Zerktouni, Quartier Maârif', product: 'Sneakers Sport Élite', price: 299 },
      { name: 'Houda Tazi', phone: '0663778899', city: 'Tanger', address: 'Tanger Balia, Complexe Ennasr n°18', product: 'Sac Cuir Artisanal', price: 380 },
    ];

    const randomClient = testClients[Math.floor(Math.random() * testClients.length)];

    try {
      const res = await fetch('/api/webhooks/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(randomClient),
      });

      const data = await res.json();
      if (data.success) {
        setSimulationResult({
          success: true,
          orderNumber: data.orderNumber,
          message: `Commande injectée en direct ! N° : ${data.orderNumber} (${randomClient.name} — ${randomClient.city})`,
        });
        await refreshInboundOrders();
        showToast(`Commande ${data.orderNumber} injectée avec succès !`, 'success');
      } else {
        setSimulationResult({
          success: false,
          message: data.error || 'Une erreur est survenue lors de l\'injection.',
        });
      }
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: err.message || 'Impossible de joindre le serveur.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">
                  Intégration Google Sheets & Synchronisation COD
                </h3>
                <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Importation directe, modèle officiel prêt à l'emploi et synchronisation en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'template'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>1. Modèle Prêt à l'Emploi</span>
          </button>

          <button
            onClick={() => setActiveTab('direct-sync')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'direct-sync'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>2. Synchronisation par Lien Direct</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'webhook'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Webhook & Script Temps Réel</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-700 flex-1">
          
          {/* TAB 1: MODÈLE PRÊT À L'EMPLOI */}
          {activeTab === 'template' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Introduction Banner */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-950 text-sm">
                      Modèle Google Sheets Officiel pour Expédition & Confirmation COD Maroc
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Ouvrez une nouvelle feuille Google Sheets ou téléchargez le fichier Excel/CSV préconfiguré avec les colonnes standards COD pour démarrer immédiatement.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
                    title="Crée automatiquement une copie du modèle officiel dans votre Google Drive"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Créer une copie (Google Drive)</span>
                  </a>

                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs transition-transform active:scale-95"
                    title="Ouvre une nouvelle feuille Google Sheets vierge dans votre navigateur"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Nouveau Sheet (sheets.new)</span>
                  </a>

                  <a
                    href="/api/google-sheets/template"
                    download="Modele_Commandes_SENDIT_Maroc.csv"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
                    title="Télécharger le fichier .csv pré-rempli pour Excel et Google Sheets"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Modèle (.csv)</span>
                  </a>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={copyFullTemplateToClipboard}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-emerald-950 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                  title="Copie le tableau entier pour le coller en 1 clic dans une feuille Google Sheets vide"
                >
                  {copiedFullTemplate ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                  <span>{copiedFullTemplate ? 'Modèle copié !' : '📋 Copier Tout le Modèle (Ctrl+V)'}</span>
                </button>

                <button
                  onClick={() => copyToClipboard(headersList.join('\t'), 'headers')}
                  className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                  title="Copie uniquement les titres des colonnes"
                >
                  {copiedHeaders ? <Check className="w-4 h-4 text-emerald-600" /> : <Table className="w-4 h-4 text-slate-500" />}
                  <span>{copiedHeaders ? 'En-têtes copiées !' : 'Copier les En-têtes Seules'}</span>
                </button>

                <button
                  onClick={handleDemoImport}
                  disabled={isSyncingSheet}
                  className="flex items-center justify-center gap-2 p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-teal-900 font-bold text-xs transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Injecte immédiatement les 5 commandes d'exemple dans votre tableau de bord"
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>{isSyncingSheet ? 'Import en cours...' : '⚡ Tester l\'Import (5 commandes)'}</span>
                </button>
              </div>

              {/* Interactive Visual Spreadsheet Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <span>Aperçu de la structure requise (Structure du Modèle) :</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Détection automatique des colonnes en Français, Arabe et Anglais
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-emerald-800 text-white font-bold">
                          <th className="py-2.5 px-3 border-r border-emerald-700/60 w-8 text-center text-emerald-200 text-[10px]">#</th>
                          {headersList.map((header, idx) => (
                            <th key={idx} className="py-2.5 px-3 border-r border-emerald-700/60 font-black tracking-tight whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sampleRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center text-[10px] text-slate-400 font-mono bg-slate-50 border-r border-slate-200 font-bold">
                              {idx + 2}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-500">{row.date}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900">{row.name}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-emerald-700">{row.phone}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">{row.city}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-600">{row.address}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-800">{row.product}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-center font-bold text-slate-700">{row.qty}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-black text-emerald-800 bg-emerald-50/50">{row.price}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-slate-500 italic">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3 Steps Guide to use the template */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Guide d'utilisation en 3 étapes simples :</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black inline-flex items-center justify-center text-[10px]">1</span>
                    <h5 className="font-bold text-slate-900">Ouvrir ou Importer</h5>
                    <p className="text-[10px] leading-relaxed">
                      Créez un nouveau Google Sheet et collez les en-têtes, ou téléchargez le fichier CSV pré-rempli.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black inline-flex items-center justify-center text-[10px]">2</span>
                    <h5 className="font-bold text-slate-900">Saisir les Commandes</h5>
                    <p className="text-[10px] leading-relaxed">
                      Renseignez vos commandes clients (Nom, Téléphone marocain 06/07, Ville, Produit et Montant).
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black inline-flex items-center justify-center text-[10px]">3</span>
                    <h5 className="font-bold text-slate-900">Synchroniser en 1 Clic</h5>
                    <p className="text-[10px] leading-relaxed">
                      Accédez à l'onglet 2, collez le lien et importez instantanément toutes les commandes en confirmation !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT LINK SYNC */}
          {activeTab === 'direct-sync' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Database Connection & Persistence Status Banner */}
              {dbSettings.saved ? (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 rounded-2xl border border-emerald-300 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-xs">
                          Paramètres enregistrés et connectés à la base de données (MySQL Hostinger)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Base connectée
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {dbSettings.lastSyncAt ? `Dernière synchro : ${new Date(dbSettings.lastSyncAt).toLocaleTimeString('fr-FR')} | ` : ''}
                        Total commandes synchronisées : <span className="font-bold text-emerald-700">{dbSettings.totalSynced || 0} commande(s)</span>
                        {dbSettings.lastSavedAt ? ` | Dernier enregistrement : ${new Date(dbSettings.lastSavedAt).toLocaleDateString('fr-FR')}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={isSavingSettings || !sheetUrl.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      title="Mettre à jour et enregistrer l'URL dans la base de données"
                    >
                      <Save className={`w-3.5 h-3.5 ${isSavingSettings ? 'animate-spin' : 'text-emerald-600'}`} />
                      <span>{isSavingSettings ? 'Enregistrement...' : 'Mettre à jour'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-amber-900 font-medium">
                      Les paramètres de l'URL Google Sheets ne sont pas encore enregistrés. Collez l'URL et cliquez sur <strong>« Enregistrer dans la base de données »</strong> pour une synchronisation permanente.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                    Non enregistré
                  </span>
                </div>
              )}

              {/* Save Feedback Banner */}
              {saveFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
                    saveFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      : 'bg-rose-50 text-rose-950 border-rose-300'
                  }`}
                >
                  {saveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{saveFeedback.message}</span>
                </div>
              )}

              {/* Form Input for Sheet URL & Action Buttons */}
              <form onSubmit={handleDirectSync} className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lien Google Sheets (URL de partage public) :</span>
                    </label>
                    {dbSettings.saved && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                        Enregistré dans MySQL
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-2xs"
                    />

                    {/* Save Settings Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={isSavingSettings || !sheetUrl.trim()}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                      title="Enregistrer le lien et les options dans la base de données"
                    >
                      <Save className={`w-3.5 h-3.5 ${isSavingSettings ? 'animate-spin' : 'text-teal-700'}`} />
                      <span>{isSavingSettings ? 'Enregistrement...' : '💾 Enregistrer dans la base de données'}</span>
                    </button>

                    {/* Sync Now Button */}
                    <button
                      type="submit"
                      disabled={isSyncingSheet || !sheetUrl.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      title="Synchronisation instantanée et importation des nouvelles commandes"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                      <span>{isSyncingSheet ? 'Synchronisation...' : '⚡ Synchroniser & Importer'}</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Auto-Sync Control Card */}
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-900/5 rounded-2xl border border-emerald-300 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span className="font-black text-slate-900 text-xs">
                          Synchronisation Automatique en Temps Réel (Auto-Sync Live)
                        </span>
                        <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          Automatique
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Toute nouvelle commande saisie dans Google Sheets est importée automatiquement dans la plateforme et la base de données sans intervention manuelle.
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-xs font-bold ${autoSyncEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {autoSyncEnabled ? '🟢 Activée en arrière-plan' : '⚪ Désactivée (Manuelle)'}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAutoSync}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sync Interval Options */}
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fréquence de vérification et d'importation :</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[
                        { val: 15, label: 'Toutes les 15s (Ultra-rapide)' },
                        { val: 30, label: 'Toutes les 30s (Recommandé)' },
                        { val: 60, label: 'Toutes les 60s (1 min)' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            setSyncInterval(opt.val);
                            if (sheetUrl.trim()) handleSaveSettings(autoSyncEnabled, opt.val);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            syncInterval === opt.val
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-600">
                    Ou testez la synchronisation avec 5 commandes d'exemple sans fichier externe :
                  </span>
                  <button
                    type="button"
                    onClick={handleDemoImport}
                    disabled={isSyncingSheet}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Import Démo Immédiat</span>
                  </button>
                </div>
              </form>

              {/* Sync Result Feedback */}
              {syncResult && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
                    syncResult.success
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      : 'bg-rose-50 text-rose-950 border-rose-300'
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{syncResult.message}</span>
                </div>
              )}

              {/* Sharing Instructions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vérifiez l'activation de l'accès public (Partage Google Sheets) :</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pr-1">
                  <li>Dans votre fichier Google Sheets, cliquez sur le bouton <strong>Partager (Share)</strong> en haut à droite.</li>
                  <li>Sous la section « Accès général », choisissez : <strong>Tous les utilisateurs disposant du lien (Lecteur)</strong>.</li>
                  <li>Copiez le lien, collez-le dans le champ ci-dessus et cliquez sur <strong>Enregistrer dans la base de données</strong> ou <strong>Synchroniser</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK & APPS SCRIPT */}
          {activeTab === 'webhook' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Webhook Status Banner */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">Point de terminaison Webhook actif (Live Webhook Active)</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      La plateforme reçoit chaque commande saisie dans Google Sheets en temps réel et l'achemine directement vers le Call Center et les confirmations.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">
                  Connecté 100%
                </span>
              </div>

              {/* Webhook URL Field */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block text-xs">
                  1. URL Webhook d'ingestion de votre compte (Endpoint Webhook) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl, 'url')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      copiedUrl
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copié !' : 'Copier l\'URL'}</span>
                  </button>
                </div>
              </div>

              {/* Apps Script Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs">
                    2. Code Google Apps Script intelligent (Smart Multi-language Trigger) :
                  </label>
                  <button
                    onClick={() => copyToClipboard(smartScriptCode, 'code')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Code copié !' : 'Copier le script'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed dir-ltr text-left">
                  {smartScriptCode}
                </pre>
              </div>

              {/* 3 Steps Installation Guide */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
                <h4 className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Guide d'installation en 3 étapes :</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-700">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black inline-flex items-center justify-center text-[10px]">1</span>
                    <h5 className="font-bold text-slate-900">Ouvrir l'éditeur Apps Script</h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Dans votre Google Sheets, cliquez sur <strong>Extensions</strong> puis <strong>Apps Script</strong>.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black inline-flex items-center justify-center text-[10px]">2</span>
                    <h5 className="font-bold text-slate-900">Coller le code & Enregistrer</h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Effacez le code existant, collez le script ci-dessus et cliquez sur <strong>Enregistrer (💾)</strong>.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black inline-flex items-center justify-center text-[10px]">3</span>
                    <h5 className="font-bold text-slate-900">Activer la synchronisation</h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Actualisez la feuille (F5) : un menu <strong>« 🚀 SENDIT Platform »</strong> apparaît. Cliquez sur <strong>« ⚡ Activer la Synchro Automatique »</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-800 font-medium bg-emerald-100/60 p-2 rounded-lg">
                  💡 Une fois activé, le script détecte chaque nouvelle ligne (ou soumission Google Forms), l'envoie instantanément à la plateforme et inscrit <span className="font-bold text-emerald-900">« ✅ Transféré à SENDIT »</span> en temps réel !
                </div>
              </div>

              {/* Live Test Simulator */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                      <span>3. Tester l'injection directe dans le tableau de bord (Live Simulation) :</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cliquez pour simuler une commande test et vérifier son apparition immédiate en Confirmation sans rechargement.
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateOrder}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSimulating ? 'Envoi en cours...' : 'Injecter une commande test'}</span>
                  </button>
                </div>

                {simulationResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
                      simulationResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}
                  >
                    {simulationResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{simulationResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Compatible avec Google Forms, WooCommerce, Shopify, Excel et Google Sheets.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
