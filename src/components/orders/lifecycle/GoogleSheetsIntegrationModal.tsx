'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useOrderLifecycle } from '@/context/OrderLifecycleContext';

interface GoogleSheetsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSheetsIntegrationModal({ isOpen, onClose }: GoogleSheetsIntegrationModalProps) {
  const { refreshInboundOrders } = useOrderLifecycle();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    orderNumber?: string;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/google-sheets`
    : 'https://lawngreen-jaguar-315438.hostingersite.com/api/webhooks/google-sheets';

  const scriptCode = `// ==============================================================
// كود المزامنة التلقائية مع منصة SENDIT COD Platform
// يرسل كل طلب يسقط في جوجل شيت مباشرة إلى مرحلة التأكيد (Pending)
// ==============================================================

function onEdit(e) {
  // أو يمكنك تفعيله كـ Trigger عند إرسال النموذج (On Form Submit)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e ? e.range.getRow() : sheet.getLastRow();
  if (row <= 1) return; // تخطي رأس الجدول

  var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // قم بتعديل أرقام الأعمدة حسب ترتيب جدولك (يبدأ من 0):
  // العمود A = data[0], العمود B = data[1], العمود C = data[2] ...
  var payload = {
    name: data[1] || data[0],        // اسم الزبون
    phone: data[2] || "",            // رقم الهاتف
    city: data[3] || "Casablanca",   // المدينة
    address: data[4] || "",          // العنوان
    product: data[5] || "Pack COD",  // اسم المنتج
    quantity: data[6] || 1,          // الكمية
    price: data[7] || 299,           // السعر بالدرهم
    notes: data[8] || "طلب جوجل شيت" // ملاحظات
  };

  // إرسال الطلب فوراً إلى منصة التأكيد
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch("${webhookUrl}", options);
    Logger.log("تم إرسال الطلب بنجاح: " + response.getContentText());
  } catch (err) {
    Logger.log("خطأ في الإرسال: " + err.toString());
  }
}`;

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSimulateOrder = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    const testClients = [
      { name: 'يوسف العمراني', phone: '0661998877', city: 'Marrakech', address: 'حي جليز، عمارة الأطلس شقة 6', product: 'Montre Luxe Or Noir', price: 349 },
      { name: 'أمينة بنجلون', phone: '0672112233', city: 'Fès', address: 'طريق عين الشقف، إقامة النرجس', product: 'Pack Robe Caftan Moderne', price: 490 },
      { name: 'طارق العلمي', phone: '0654334455', city: 'Casablanca', address: 'شارع الزرق طوني، المعاريف', product: 'Sneakers Sport Élite', price: 299 },
      { name: 'هدى التازي', phone: '0663778899', city: 'Tanger', address: 'طنجة البالية، مجمع النصر رقم 18', product: 'Sac Cuir Artisanal', price: 380 },
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
          message: `تم إسقاط الطلب بنجاح! رقم الطلب: ${data.orderNumber} (${randomClient.name} - ${randomClient.city})`,
        });
        await refreshInboundOrders();
      } else {
        setSimulationResult({
          success: false,
          message: data.error || 'حدث خطأ أثناء إرسال الطلب',
        });
      }
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: err.message || 'تعذر الاتصال بالخادم',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">
                ربط Google Sheets بصفحة التأكيد
              </h3>
              <p className="text-xs text-emerald-100">
                إسقاط لحظي وتلقائي لأي طلب يُسجل في جوجل شيت في مرحلة (Pending Confirmation)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs text-slate-700">
          
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold text-emerald-950 text-xs">منفذ الاستقبال نشط وجاهز (Live Webhook Active)</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  المنصة تستمع وتحدث الطلبات فورياً بدون الحاجة لإعادة تحميل الصفحة.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              متصل 100%
            </span>
          </div>

          {/* Webhook Endpoint URL */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 block">
              1. رابط الويب هوك الخاص بك (Webhook Ingestion Endpoint):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>طريقة التفعيل في 3 خطوات بسيطة داخل Google Sheet:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pr-1">
              <li>افتح ملف الـ <strong>Google Sheet</strong> الخاص بطلبات متجرك.</li>
              <li>من القائمة العلوية اضغط على <strong>إضافات (Extensions)</strong> ➔ <strong>Apps Script</strong>.</li>
              <li>امسح ما بداخل المحرر، والصق الكود الجاهز أسفله، ثم اضغط <strong>حفظ (Save)</strong>.</li>
              <li>من القائمة الجانبية في Apps Script اختر <strong>المشغلات (Triggers)</strong> واجعل الدالة تعمل عند <strong>إرسال النموذج (On form submit)</strong> أو <strong>عند التعديل (On edit)</strong>.</li>
            </ol>
          </div>

          {/* Google Apps Script Code block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900">
                2. كود Google Apps Script الجاهز للنسخ:
              </label>
              <button
                onClick={() => copyToClipboard(scriptCode, false)}
                className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'تم نسخ الكود!' : 'نسخ الكود كاملاً'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed dir-ltr text-left">
              {scriptCode}
            </pre>
          </div>

          {/* Test Simulator Section */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                  <span>3. تجربة واختبار الربط فورياً (Live Simulation):</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  اضغط لتجربة إرسال طلب وهمي فوري وشاهده وهو يسقط مباشرة أمامك في جدول التأكيد.
                </p>
              </div>
              <button
                onClick={handleSimulateOrder}
                disabled={isSimulating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'جاري الإرسال...' : 'إسقاط طلب تجريبي الآن'}</span>
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

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            يدعم الحقول باللغة العربية والفرنسية والإنجليزية تلقائياً.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
