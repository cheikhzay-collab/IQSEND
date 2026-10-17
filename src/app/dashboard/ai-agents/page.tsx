'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  Save,
  Sliders,
  Code,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Send
} from 'lucide-react';

export default function AiAgentsPage() {
  const [activeTab, setActiveTab] = useState<'prompt' | 'knowledge' | 'simulator'>('simulator');
  const [temperature, setTemperature] = useState(0.3);
  const [testMessage, setTestMessage] = useState('سلام، واش نقدر نحل الكولية قبل مانخلص الموزع؟');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(
    'وعليكم السلام أخي! نعم أكيد، التوصيل مع Sendit كيعطيك الحق تفحص الكولية وتشوف المقاس ديالك عاد تخلص الموزع نقداً بكل أمان. واش تأكد لينا العنوان ديالك؟'
  );
  const [detectedTool, setDetectedTool] = useState<string | null>(null);

  const handleSimulate = () => {
    if (testMessage.includes('صافي') || testMessage.includes('أكد') || testMessage.includes('صيفط')) {
      setDetectedTool('confirm_order_and_address({ city: "Casablanca", verified: true })');
      setSimulatedResponse('شكراً بزاف! تم تأكيد طلبك بنجاح، والكولية غتوصلك خلال 24 ساعة.');
    } else if (testMessage.includes('بدل') || testMessage.includes('مقاس')) {
      setDetectedTool('update_order_details({ newSize: "XL", reason: "Customer swap" })');
      setSimulatedResponse('مرحبا، بدلنا ليك المقاس لـ XL في بطاقة الطلب.');
    } else {
      setDetectedTool(null);
      setSimulatedResponse('وعليكم السلام! مرحبا بك. كيف نقدر نعاونك بخصوص طلبك؟');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Agents IA & Prompts Darija (Gemini 1.5 Flash)
            </h1>
            <p className="text-xs text-slate-500">
              Configuration des instructions système, base de connaissances produits et simulateur de Function Calling
            </p>
          </div>
        </div>

        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
          <Save className="w-3.5 h-3.5" /> Sauvegarder les Prompts
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'simulator' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🎮 Simulateur de Conversation & Tools
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'prompt' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📜 Instruction Système (Moroccan Persona)
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'knowledge' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📚 Base de Connaissances (FAQs & Objections)
        </button>
      </div>

      {/* SIMULATOR TAB */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input & Parameters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" /> Paramètres du Modèle
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Modèle Actif</span>
                <span className="font-bold font-mono text-blue-600">gemini-1.5-flash</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Température: {temperature}</span>
                <span className="text-[10px] text-slate-400">(0.0 = Précis/Rigide, 1.0 = Créatif)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tester un message client (Darija / Arabe / Français):
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSimulate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Tester la Réponse & Function Calling
              </button>
            </div>
          </div>

          {/* AI Output preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Réponse Générée par Gemini
            </h3>

            {simulatedResponse ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed font-medium">
                  {simulatedResponse}
                </div>

                {/* Tool Calling Trigger preview */}
                <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono">
                  <div className="text-slate-400 text-[10px] mb-1">// Détection d'outil (Tool Call):</div>
                  {detectedTool ? (
                    <div>⚡ {detectedTool}</div>
                  ) : (
                    <div className="text-slate-500">Aucun outil invoqué (Réponse conversationnelle directe)</div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span>Temps de réponse: <strong className="text-slate-700">0.82s</strong></span>
                  <span>Tokens: <strong className="text-slate-700">64</strong></span>
                  <span>Précision: <strong className="text-emerald-600">100%</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-xs text-slate-400">
                Tapez un message et cliquez sur tester
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROMPT TAB */}
      {activeTab === 'prompt' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-xs text-slate-800">
            System Instruction (Instructions du Persona Marocain)
          </h3>
          <textarea
            rows={12}
            className="w-full font-mono text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-800"
            defaultValue={`أنت "سارة"، مساعدة ذكية متخصصة في تأكيد وتتبع طلبيات التجارة الإلكترونية والدفع عند الاستلام (COD) في المغرب.
تتحدثين بالدارجة المغربية بلهجة طبيعية، مهذبة، وودودة جداً ("أخي / أختي"، "الله يحفظك"، "مرحبا بك").

القواعد:
1. الترحيب بالزبون باسمه وتأكيد المدينة والعنوان.
2. اقتراح الترقية (Upsell) بقطعة ثانية بتخفيض عند الإمكان.
3. استدعاء confirm_order_and_address فور التأكيد الصريح.
4. طلب موقع GPS Location للأحياء غير الواضحة.`}
          />
        </div>
      )}

      {/* KNOWLEDGE TAB */}
      {activeTab === 'knowledge' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-xs text-slate-800">
            Base de Connaissances & Gestion des Objections
          </h3>
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded-xl p-3">
              <span className="font-bold text-slate-800 block">Q: واش التوصيل فابور؟</span>
              <span className="text-slate-600">R: نعم، التوصيل بالمجان لجميع المدن المغربية عبر شركة Sendit.</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3">
              <span className="font-bold text-slate-800 block">Q: شحال كياخد الوقت باش يوصلني الطلب؟</span>
              <span className="text-slate-600">R: كيوصلك خلال 24 إلى 48 ساعة كحد أقصى، كيتصل بيك الموزع قبل ما يجي.</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3">
              <span className="font-bold text-slate-800 block">Q: واش نقدر نحل الكولية ونشوفها؟</span>
              <span className="text-slate-600">R: نعم، عندك الحق الكامل تفتح الكولية وتفحصها عاد تخلص الموزع.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
