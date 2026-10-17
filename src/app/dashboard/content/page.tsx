'use client';

import React, { useState } from 'react';
import {
  Folder,
  MessageSquare,
  Mic,
  Image,
  Copy,
  Check,
  Plus,
  Play,
  Share2,
  Sparkles,
  ExternalLink,
  Tag
} from 'lucide-react';

interface ContentTemplate {
  id: string;
  title: string;
  category: 'CONFIRMATION' | 'SAUVETAGE' | 'UPSELL' | 'AVIS';
  language: 'Darija' | 'Français';
  content: string;
}

const TEMPLATES: ContentTemplate[] = [
  {
    id: 't-1',
    title: 'Confirmation Immédiate Standard (Darija)',
    category: 'CONFIRMATION',
    language: 'Darija',
    content: 'Salam {nom_client} ! Merci pour votre commande {ref_commande} dyal {nom_produit} b {prix_mad} MAD. Wach momkin t2aked lina l3onwan dyalek aw tsift lina localisation GPS f had l\'chat bach lmandoub ywasal lik l\'colis f a9rab wa9t ? Chokran bzf !',
  },
  {
    id: 't-2',
    title: 'Proposition Upsell Pack Duo (Darija)',
    category: 'UPSELL',
    language: 'Darija',
    content: 'Mre7ba {nom_client} ! 3andna 3ard khass lyoum : Ila zedti la 2ème pièce katakhodha b khassm 30% (+{prix_upsell} MAD au lieu de {prix_normal} MAD). Wach bghiti nzidouhalik m3a l\'colis 9bel maykherrej lmandoub ?',
  },
  {
    id: 't-3',
    title: 'Sauvetage - Client Injoignable (Darija)',
    category: 'SAUVETAGE',
    language: 'Darija',
    content: 'Salam {nom_client}, lmandoub dyal Sendit 3ayet lik lyouma bach ywasal lik {nom_produit} mais ma9derch ywassal lik. Wach bghiti n3awdou nseftoulik l\'colis ghedda f chi wa9t li ynasbek ?',
  },
  {
    id: 't-4',
    title: 'Collecte d’Avis Post-Livraison (Français)',
    category: 'AVIS',
    language: 'Français',
    content: 'Bonjour {nom_client} ! Votre commande {ref_commande} a bien été livrée par notre transporteur Sendit.ma. Sur une échelle de 1 à 5 étoiles, comment évaluez-vous votre expérience et la qualité du produit ? Répondez simplement avec un chiffre !',
  },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<'SCRIPTS' | 'MEDIA' | 'VOICE'>('SCRIPTS');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full mb-2">
            <Folder className="w-3.5 h-3.5 text-teal-600" />
            Bibliothèque Multimédia & Scripts COD Maroc
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Contenu & Modèles de Vente
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scripts de vente en Darija marocaine, vocaux WhatsApp de réassurance et médias visuels de conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau Modèle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('SCRIPTS')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'SCRIPTS'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Scripts WhatsApp & Darija ({TEMPLATES.length})
        </button>
        <button
          onClick={() => setActiveTab('VOICE')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'VOICE'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Mic className="w-4 h-4" />
          Notes Vocales (Audio Notes)
        </button>
        <button
          onClick={() => setActiveTab('MEDIA')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'MEDIA'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Image className="w-4 h-4" />
          Galerie Médias & Preuves Sociales
        </button>
      </div>

      {/* Tab 1: Scripts */}
      {activeTab === 'SCRIPTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  {tmpl.category} • {tmpl.language}
                </span>
                <button
                  onClick={() => handleCopy(tmpl.content, tmpl.id)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  {copiedId === tmpl.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === tmpl.id ? 'Copié !' : 'Copier'}
                </button>
              </div>

              <h3 className="font-bold text-sm text-slate-900">{tmpl.title}</h3>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed font-sans">
                {tmpl.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Voice Notes */}
      {activeTab === 'VOICE' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Notes Vocales en Darija pour WhatsApp</h3>
          <p className="text-xs text-slate-500">
            Messages audio pré-enregistrés par des conseillers professionnels pour rassurer le client marocain et augmenter le taux de confirmation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Audio 1: Réassurance Qualité & Essayage</h4>
                  <span className="text-[11px] text-slate-400">Durée: 0:24 • Darija marocaine</span>
                </div>
              </div>
              <button className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg">
                Utiliser
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Audio 2: Explication Paiement à la Livraison</h4>
                  <span className="text-[11px] text-slate-400">Durée: 0:18 • Darija marocaine</span>
                </div>
              </div>
              <button className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg">
                Utiliser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Media */}
      {activeTab === 'MEDIA' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Médias & Preuves Sociales</h3>
          <p className="text-xs text-slate-500">
            Photos réelles et vidéos d'ouverture de colis envoyées automatiquement par l'agent IA pour lever les doutes.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="border border-slate-200 rounded-xl overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80"
                alt="Montre"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
              />
              <div className="p-2.5 bg-white text-xs">
                <strong className="block truncate text-slate-900 font-bold">Unboxing Watch S2</strong>
                <span className="text-[10px] text-slate-400">Photo réelle déballage</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=300&auto=format&fit=crop&q=80"
                alt="Parfum"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
              />
              <div className="p-2.5 bg-white text-xs">
                <strong className="block truncate text-slate-900 font-bold">Flacon Royal Amber</strong>
                <span className="text-[10px] text-slate-400">Photo finition & emballage</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
