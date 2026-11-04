'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Ban,
  XCircle,
  Eye,
  Clock,
  Phone,
  Package,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';

interface LogEntry {
  id: string;
  order_id: string | null;
  order_number: string | null;
  customer_phone: string;
  customer_name: string | null;
  action_type: string;
  status: 'EXECUTED' | 'SKIPPED_COOLDOWN' | 'SKIPPED_QUIET_HOURS' | 'BLOCKED_DND' | 'SKIPPED_DAILY_CAP' | 'FAILED' | 'PENDING_APPROVAL' | 'NO_WHATSAPP';
  reason_details: string | null;
  channel: string;
  payload: string | null;
  created_at: string;
}

interface StatsData {
  totalToday: number;
  executedToday: number;
  cooldownPreventedToday: number;
  quietHoursSkippedToday: number;
  dndBlockedToday: number;
}

export default function AgentAuditLogTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalToday: 0,
    executedToday: 0,
    cooldownPreventedToday: 0,
    quietHoursSkippedToday: 0,
    dndBlockedToday: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inspectModalLog, setInspectModalLog] = useState<LogEntry | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('limit', '80');

      const res = await fetch(`/api/ai-agents/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
        setLastRefreshedAt(
          new Date().toLocaleTimeString('ar-MA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch (err) {
      console.error('Error loading agent audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'OUT_FOR_DELIVERY_NOTICE':
        return { label: 'إشعار الخروج للتسليم 🚚', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'MORNING_COD_REMINDER':
        return { label: 'تذكير الدفع عند الاستلام 💵', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ORDER_CONFIRMATION':
        return { label: 'تأكيد الطلبية 📋', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'DELIVERY_RESCUE':
        return { label: 'إنقاذ التسليم الفاشل 🛟', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'POST_DELIVERY_REVIEW':
        return { label: 'دعوة التقييم ⭐', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'TOOL_CONFIRM_ORDER':
        return { label: 'تأكيد آلي (أداة الذكاء)', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'TOOL_SAVE_GPS':
        return { label: 'حفظ موقع GPS 📍', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'TOOL_UPDATE_DETAILS':
        return { label: 'تعديل التفاصيل ✍️', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'TOOL_CANCEL_ORDER':
        return { label: 'إلغاء الطلب 🚫', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'OWNER_CONFIRM_ALERT':
        return { label: 'إشعار المالك: تأكيد طلبية 🔔', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'OWNER_HANDOVER_ALERT':
        return { label: 'إشعار المالك: تدخل بشري مطلوب 🚨', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      default:
        return { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getStatusBadge = (status: LogEntry['status']) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            تم الإرسال بنجاح
          </span>
        );
      case 'NO_WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Phone className="w-3 h-3 text-amber-700" />
            غير متوفر على واتساب (اتصل هاتفياً)
          </span>
        );
      case 'SKIPPED_COOLDOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            تخطي: تفادي الإزعاج (تهدئة)
          </span>
        );
      case 'SKIPPED_QUIET_HOURS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Moon className="w-3 h-3 text-purple-600" />
            تخطي: ساعات الهدوء
          </span>
        );
      case 'SKIPPED_DAILY_CAP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            تخطي: بلوغ السقف اليومي
          </span>
        );
      case 'BLOCKED_DND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3 text-rose-600" />
            حظر: قائمة عدم الإزعاج
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            فشل تقني
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            بانتظار موافقة المشرف
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">إجمالي العمليات اليوم</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalToday}</div>
          <div className="text-[10px] text-slate-400 mt-1">تفاعلات وتنبيهات مجدولة</div>
        </div>

        {/* Executed Successfully */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700">تم الإرسال والتنفيذ</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.executedToday}</div>
          <div className="text-[10px] text-emerald-600/70 mt-1">رسائل مستوفية للشروط</div>
        </div>

        {/* Spam Prevented (Cooldown) */}
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700">حماية من التكرار الإزعاجي</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.cooldownPreventedToday}</div>
          <div className="text-[10px] text-amber-600/70 mt-1">تم إيقاف تكرارها في نفس اليوم</div>
        </div>

        {/* Quiet Hours Skipped */}
        <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700">تخطي ساعات الصمت</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">{stats.quietHoursSkippedToday}</div>
          <div className="text-[10px] text-purple-600/70 mt-1">مؤجلة لحماية راحة العميل ليلاً</div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH BAR ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'EXECUTED', label: '✅ تم الإرسال' },
              { id: 'NO_WHATSAPP', label: '⚠️ بدون واتساب (GSM)' },
              { id: 'SKIPPED_COOLDOWN', label: '🛡️ منع الإزعاج' },
              { id: 'SKIPPED_QUIET_HOURS', label: '🌙 ساعات الصمت' },
              { id: 'BLOCKED_DND', label: '🚫 محظور' },
              { id: 'FAILED', label: '❌ فشل' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الهاتف أو الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {lastRefreshedAt && (
          <div className="text-[10px] text-slate-400 text-left">
            آخر تحديث لحظي: {lastRefreshedAt}
          </div>
        )}
      </div>

      {/* ── 3. LOGS TABLE ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">التوقيت</th>
                <th className="py-3 px-4">الزبون</th>
                <th className="py-3 px-4">الطلبية</th>
                <th className="py-3 px-4">نوع العملية</th>
                <th className="py-3 px-4">الحالة والقرار</th>
                <th className="py-3 px-4">السبب بالتفصيل</th>
                <th className="py-3 px-4 text-center">المعاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    جاري تحميل سجل عمليات الوكيل الذكي...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    لا توجد عمليات مسجلة تطابق معايير الفلترة المحددة
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionMeta = getActionLabel(log.action_type);
                  const formattedTime = new Date(log.created_at).toLocaleTimeString('ar-MA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const formattedDate = new Date(log.created_at).toLocaleDateString('ar-MA', {
                    day: 'numeric',
                    month: 'short',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => setInspectModalLog(log)}
                    >
                      {/* Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formattedTime}</div>
                        <div className="text-[10px] text-slate-400">{formattedDate}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {log.customer_name || 'عميل'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {log.customer_phone}
                        </div>
                      </td>

                      {/* Order */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.order_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 text-slate-800">
                            <Package className="w-3 h-3 text-slate-500" />
                            #{log.order_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${actionMeta.bg}`}
                        >
                          {actionMeta.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>

                      {/* Reason Details */}
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600" title={log.reason_details || ''}>
                        {log.reason_details || '—'}
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectModalLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل والرسالة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. INSPECTION MODAL ─────────────────────────────────── */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                onClick={() => setInspectModalLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900">تفاصيل عملية الوكيل الذكي</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">الزبون:</span>
                  <strong className="text-slate-800 font-bold">{inspectModalLog.customer_name || 'عميل'}</strong>
                  <div className="text-slate-600 font-mono mt-0.5">{inspectModalLog.customer_phone}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الطلبية المرتبطة:</span>
                  <strong className="text-slate-800 font-bold">
                    {inspectModalLog.order_number ? `#${inspectModalLog.order_number}` : 'غير محدد'}
                  </strong>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    {new Date(inspectModalLog.created_at).toLocaleString('ar-MA')}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">القرار والحالة:</span>
                <div>{getStatusBadge(inspectModalLog.status)}</div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">السبب والشرح الرقابي:</span>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-700 leading-relaxed font-sans">
                  {inspectModalLog.reason_details || 'تم استيفاء جميع الشروط.'}
                </div>
              </div>

              {inspectModalLog.payload && (
                <div>
                  <span className="text-slate-400 block text-[10px] mb-1">نص الرسالة / البيانات (Payload):</span>
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {inspectModalLog.payload}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectModalLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

