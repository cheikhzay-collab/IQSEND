'use client';

import React, { useState, useEffect } from 'react';
import {
  Moon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Save,
  CheckCircle2,
  Ban,
  Plus,
  Trash2,
  Zap,
  HelpCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';

interface AgentSettingsData {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  cooldownOutForDeliveryHours: number;
  cooldownMorningReminderHours: number;
  cooldownConfirmationHours: number;
  cooldownRescueHours: number;
  cooldownReviewHours: number;
  maxDailyMessagesPerCustomer: number;
  operationMode: 'AUTOPILOT' | 'SUPERVISED';
  dndPhones: string[];
  ownerNotifyPhone: string;
  notifyOwnerOnConfirmedOrder: boolean;
  notifyOwnerOnIntervention: boolean;
}

export default function AgentAdvancedRulesTab() {
  const [settings, setSettings] = useState<AgentSettingsData>({
    quietHoursEnabled: true,
    quietHoursStart: '21:30',
    quietHoursEnd: '08:30',
    cooldownOutForDeliveryHours: 24,
    cooldownMorningReminderHours: 24,
    cooldownConfirmationHours: 4,
    cooldownRescueHours: 18,
    cooldownReviewHours: 720,
    maxDailyMessagesPerCustomer: 2,
    operationMode: 'AUTOPILOT',
    dndPhones: [],
    ownerNotifyPhone: '',
    notifyOwnerOnConfirmedOrder: true,
    notifyOwnerOnIntervention: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [newDndPhone, setNewDndPhone] = useState<string>('');
  const [isTestingOwnerAlert, setIsTestingOwnerAlert] = useState<boolean>(false);
  const [testOwnerResult, setTestOwnerResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestOwnerAlert = async () => {
    if (!settings.ownerNotifyPhone.trim()) {
      alert('يرجى إدخال رقم هاتف صاحب المتجر أولاً');
      return;
    }
    setIsTestingOwnerAlert(true);
    setTestOwnerResult(null);
    try {
      const res = await fetch('/api/ai-agents/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testOwnerAlert: true,
          ownerNotifyPhone: settings.ownerNotifyPhone.trim(),
        }),
      });
      const data = await res.json();
      setTestOwnerResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? 'تم إرسال الرسالة بنجاح' : 'تعذر الإرسال'),
      });
      setTimeout(() => setTestOwnerResult(null), 6000);
    } catch (err: any) {
      setTestOwnerResult({
        success: false,
        message: `خطأ تقني: ${err.message}`,
      });
    } finally {
      setIsTestingOwnerAlert(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-agents/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching agent advanced settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/ai-agents/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving agent advanced settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addDndPhone = () => {
    const cleaned = newDndPhone.trim();
    if (!cleaned) return;
    if (!settings.dndPhones.includes(cleaned)) {
      setSettings({
        ...settings,
        dndPhones: [...settings.dndPhones, cleaned],
      });
      setNewDndPhone('');
    }
  };

  const removeDndPhone = (phoneToRemove: string) => {
    setSettings({
      ...settings,
      dndPhones: settings.dndPhones.filter((p) => p !== phoneToRemove),
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
        جاري تحميل قواعد وإعدادات الوكيل المتقدمة...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right">
      {/* ── CARD 1: QUIET HOURS (ساعات الهدوء وحماية راحة العملاء) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              <Moon className="w-3.5 h-3.5 text-purple-600" />
              ساعات الهدوء ومنع المراسلة الليلية (Quiet Hours Protection)
            </div>
            <h3 className="font-black text-sm text-slate-900 mt-1">
              حظر التنبيهات التلقائية ليلاً
            </h3>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              يمنع الوكيل من إرسال أي إشعار أو تذكير تلقائي (شحن، تسليم، تذكير مالي) خلال فترة الليل لعدم إزعاج الزبائن وحماية حساب الواتساب من التبليغات.
            </p>
          </div>

          <button
            onClick={() =>
              setSettings({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled })
            }
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
              settings.quietHoursEnabled ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {settings.quietHoursEnabled && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-1">
              <label className="block text-[11px] font-bold text-purple-900">
                بداية ساعات الهدوء (مساءً) :
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value })}
                className="w-full text-xs font-bold font-mono bg-white border border-purple-200 rounded-xl p-2.5 text-slate-800 focus:outline-purple-600"
              />
              <span className="text-[10px] text-purple-600 block mt-1">افتراضياً: 21:30 ليلاً بتوقيت المغرب</span>
            </div>

            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-1">
              <label className="block text-[11px] font-bold text-purple-900">
                نهاية ساعات الهدوء (صباحاً) :
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value })}
                className="w-full text-xs font-bold font-mono bg-white border border-purple-200 rounded-xl p-2.5 text-slate-800 focus:outline-purple-600"
              />
              <span className="text-[10px] text-purple-600 block mt-1">افتراضياً: 08:30 صباحاً بتوقيت المغرب</span>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 2: COOLDOWN MATRIX (مصفوفة فترات التهدئة ومنع التكرار) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            مصفوفة فترات التهدئة الذكية (Smart Anti-Spam Cooldown Matrix)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            قواعد منع تكرار الرسائل في نفس اليوم والنافذة الزمنية
          </h3>
          <p className="text-xs text-slate-500">
            تحدد هذه القيم المدة الزمنية الدنيا (بالساعات) التي يجب أن تنقضي قبل أن يُسمح للوكيل بإعادة إرسال نفس نوع الرسالة للعميل نفسه.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Rule 1: Out for Delivery */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                إشعار "الطلبية قيد التسليم مع الموزع"
              </span>
              <span className="text-xs font-bold font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownOutForDeliveryHours} ساعة
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              إذا تكرر تحديث حالة Sendit عدة مرات في نفس اليوم، لن يتكرر إرسال الإشعار للزبون خلال هذه المدة لتفادي الإزعاج.
            </p>
            <input
              type="range"
              min="12"
              max="48"
              step="6"
              value={settings.cooldownOutForDeliveryHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownOutForDeliveryHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>12 ساعة</span>
              <span className="font-bold text-amber-700">24 ساعة (الموصى به)</span>
              <span>48 ساعة</span>
            </div>
          </div>

          {/* Rule 2: Morning Reminder */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                تذكير الدفع عند الاستلام الصباحي (COD)
              </span>
              <span className="text-xs font-bold font-mono bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownMorningReminderHours} ساعة
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              تذكير الزبون بتحضير المبلغ نقداً في الصباح، بحد أقصى مرة واحدة في اليوم.
            </p>
            <input
              type="range"
              min="12"
              max="48"
              step="6"
              value={settings.cooldownMorningReminderHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownMorningReminderHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>12 ساعة</span>
              <span className="font-bold text-amber-700">24 ساعة (الموصى به)</span>
              <span>48 ساعة</span>
            </div>
          </div>

          {/* Rule 3: Confirmation Outreach */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                طلب تأكيد الطلب والعنوان التفاعلي
              </span>
              <span className="text-xs font-bold font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownConfirmationHours} ساعات
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              الفارق الزمني بين إرسال رسالة التأكيد الأولى ومحاولة التذكير التالية في حال لم يرد العميل.
            </p>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={settings.cooldownConfirmationHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownConfirmationHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 ساعة</span>
              <span className="font-bold text-emerald-700">4 ساعات (الموصى به)</span>
              <span>12 ساعة</span>
            </div>
          </div>

          {/* Rule 4: Delivery Rescue */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                رسائل إنقاذ الشحنة عند فشل التسليم
              </span>
              <span className="text-xs font-bold font-mono bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                {settings.cooldownRescueHours} ساعة
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              الفارق الزمني الأدنى لإرسال رسالة إنقاذ بديلة في حال تعذر الوصول للعميل.
            </p>
            <input
              type="range"
              min="6"
              max="36"
              step="6"
              value={settings.cooldownRescueHours}
              onChange={(e) =>
                setSettings({ ...settings, cooldownRescueHours: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>6 ساعات</span>
              <span className="font-bold text-rose-700">18 ساعة (الموصى به)</span>
              <span>36 ساعة</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: DAILY CAP & OPERATION MODE ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            سقف المراسلات اليومي ونمط التشغيل
          </div>
          <h3 className="font-black text-sm text-slate-900">
            الحد الأقصى للرسائل ودرجة الاستقلالية
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Cap */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              الحد الأقصى للرسائل التلقائية اليومية لكل زبون:
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              مهما حدثت حالات الشحنة في يوم واحد، لن يتجاوز الوكيل هذا السقف لتفادي حظر رقم الواتساب.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setSettings({ ...settings, maxDailyMessagesPerCustomer: cap })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    settings.maxDailyMessagesPerCustomer === cap
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cap} {cap === 1 ? 'رسالة' : 'رسائل'}
                </button>
              ))}
            </div>
          </div>

          {/* Operation Mode */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              نمط عمل الوكيل (Autopilot vs Supervised):
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              اختر بين الإرسال المستقل الفوري أو طلب موافقة مسبقة من المشرف.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, operationMode: 'AUTOPILOT' })}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  settings.operationMode === 'AUTOPILOT'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5 mx-auto mb-1" />
                طيار آلي مستقل
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, operationMode: 'SUPERVISED' })}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  settings.operationMode === 'SUPERVISED'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 mx-auto mb-1" />
                إشراف وموافقة مسبقة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: STORE OWNER WHATSAPP NOTIFICATIONS (إشعارات صاحب المتجر) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-1.5">
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            إشعارات صاحب المتجر الفورية (Store Owner Alerts)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            رقم واتساب المشرف لتلقي ملخصات التأكيد والطلبات التي تحتاج تدخلاً
          </h3>
          <p className="text-xs text-slate-500">
            يرسل الوكيل الذكي تلقائياً إلى هذا الرقم إشعارات فورية بكل طلبية مؤكدة بنجاح، وتنبيهات عاجلة إذا واجهت شحنة صعوبة في التسليم أو طلب العميل التحدث مع مسؤول بشري.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Owner Phone Input */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="font-bold text-xs text-slate-900 block">
              رقم واتساب صاحب المتجر (WhatsApp)
            </span>
            <input
              type="text"
              placeholder="مثال: 0661234567 أو 212661234567..."
              value={settings.ownerNotifyPhone}
              onChange={(e) => setSettings({ ...settings, ownerNotifyPhone: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-blue-600 font-mono font-bold text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              يمكنك كتابة الرقم بصيغة محلية (06...) أو دولية (212...).
            </p>

            <button
              type="button"
              onClick={handleTestOwnerAlert}
              disabled={isTestingOwnerAlert || !settings.ownerNotifyPhone.trim()}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              {isTestingOwnerAlert ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  جاري إرسال الإشعار التجريبي...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  إرسال رسالة تجريبية الآن
                </>
              )}
            </button>

            {testOwnerResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  testOwnerResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testOwnerResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{testOwnerResult.message}</span>
              </div>
            )}
          </div>

          {/* Alert Toggles */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-slate-900 block">
              تحديد أنواع الإشعارات المرسلة للمالك:
            </span>

            <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300 transition-all">
              <input
                type="checkbox"
                checked={settings.notifyOwnerOnConfirmedOrder}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOwnerOnConfirmedOrder: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">ملخص الطلبيات المؤكدة بنجاح</span>
                <span className="text-[11px] text-slate-500">
                  إرسال كشف يتضمن اسم العميل، المدينة، المنتجات والمبلغ المستحق.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-slate-300 transition-all">
              <input
                type="checkbox"
                checked={settings.notifyOwnerOnIntervention}
                onChange={(e) =>
                  setSettings({ ...settings, notifyOwnerOnIntervention: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded text-rose-600 accent-rose-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">تنبيهات التدخل البشري والإنقاذ</span>
                <span className="text-[11px] text-slate-500">
                  إشعار فوري عند طلب العميل التحدث مع ممثل أو تعثر تسليم Sendit.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── CARD 5: BLACKLIST & DND PHONES (قائمة عدم الإزعاج) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full mb-1.5">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            قائمة عدم الإزعاج والحظر (DND & Blacklist)
          </div>
          <h3 className="font-black text-sm text-slate-900">
            أرقام الهواتف المحظورة من المراسلة التلقائية
          </h3>
          <p className="text-xs text-slate-500">
            أي رقم مدرج هنا لن يتلقى أي رسالة آلية أو تنبيه شحن من الوكيل نهائياً احتراماً لطلب العميل.
          </p>
        </div>

        {/* Add phone input */}
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="أدخل رقم الهاتف (مثال: 0661234567)..."
            value={newDndPhone}
            onChange={(e) => setNewDndPhone(e.target.value)}
            className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-blue-600 font-mono"
          />
          <button
            onClick={addDndPhone}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة للحظر
          </button>
        </div>

        {/* List of blocked numbers */}
        <div className="flex flex-wrap gap-2 pt-2">
          {settings.dndPhones.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">لا توجد أرقام محظورة حالياً.</div>
          ) : (
            settings.dndPhones.map((phone) => (
              <span
                key={phone}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200"
              >
                <Phone className="w-3 h-3 text-rose-500" />
                {phone}
                <button
                  onClick={() => removeDndPhone(phone)}
                  className="hover:text-rose-950 font-black text-sm"
                  title="حذف من القائمة"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── SAVE ACTION BAR ─────────────────────────────────────── */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between text-white shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>القواعد المحدثة تُطبق فوراً على جميع إشارات Webhooks والرسائل الصادرة.</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              جاري الحفظ...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              تم الحفظ في قاعدة البيانات بنجاح!
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              حفظ القواعد المتقدمة
            </>
          )}
        </button>
      </div>
    </div>
  );
}

