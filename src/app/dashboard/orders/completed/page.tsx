'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  FileText,
  Star,
  RotateCcw,
  ShieldCheck,
  Banknote,
  Calendar,
  Check,
  AlertCircle,
  ExternalLink,
  Phone,
  MessageSquare,
  Sparkles,
  Download,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import { InvoiceModal } from '@/components/orders/lifecycle/OrderModals';

export default function CompletedOrdersPage() {
  const {
    orders,
    requestReview,
    processReturn,
    completedCount,
  } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [returnOrder, setReturnOrder] = useState<LifecycleOrder | null>(null);
  const [returnReason, setReturnReason] = useState('Changement de taille souhaité');
  const [invoiceOrder, setInvoiceOrder] = useState<LifecycleOrder | null>(null);

  // Filter completed orders
  const completedOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'COMPLETED')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase()) ||
          (o.shipping?.trackingNumber &&
            o.shipping.trackingNumber.toLowerCase().includes(search.toLowerCase()));

        const matchesCity = selectedCity === 'ALL' || o.customer.city === selectedCity;

        return matchesSearch && matchesCity;
      });
  }, [orders, search, selectedCity]);

  // Financial summary
  const totalSettledMAD = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.payment.amount, 0);
  }, [completedOrders]);

  const handleConfirmReturn = () => {
    if (returnOrder) {
      processReturn(returnOrder.id, returnReason);
      setReturnOrder(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Lifecycle Navigation Tabs */}
      <OrderLifecycleTabs />

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">


        {/* Header with Title and Financial Clearance Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Completed & Financial Clearance
                </h1>
                <span className="text-sm font-bold text-slate-400 font-arabic">
                  (المكتملة)
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {completedCount} طلبات منتهية ومحصّلة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إثباتات التسليم الموثقة (POD)، التسويات البنكية لأموال الكود المحصلة، الفواتير، وجمع تقييمات العملاء
              </p>
            </div>
          </div>

          {/* Quick Stats Pill & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>إجمالي الكود المحصل: {totalSettledMAD} درهم</span>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث (الزبون، الفاتورة، البوليصة)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {completedOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">لا توجد طلبات مكتملة حالياً</p>
              <p className="text-xs text-slate-400 mt-1">
                بمجرد قيام الموزع بتسليم الطرد وتحصيل مبلغ الـ COD، ستتحول الطلبات إلى هذه القائمة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">رقم الطلب والزبون</th>
                    <th className="py-3.5 px-4">المنتج والمبلغ المحصل</th>
                    <th className="py-3.5 px-4">توقيت التسليم الفعلي</th>
                    <th className="py-3.5 px-4">إثبات التسليم (Proof of Delivery)</th>
                    <th className="py-3.5 px-4">التسوية البنكية (Sendit Settlement)</th>
                    <th className="py-3.5 px-4 text-right">أدوات الفاتورة والتقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Order & Customer */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            {order.orderNumber}
                          </span>
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {order.customer.city} • {order.customer.phone}
                          </span>
                        </div>
                      </td>

                      {/* 2. Article & Total Paid */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={order.items[0]?.thumbnail}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1 max-w-[170px]">
                              {order.items[0]?.name}
                            </p>
                            <p className="text-[11px] font-black text-emerald-700">
                              {order.payment.amount} {order.payment.currency} (تم التحصيل نقداً)
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Delivery Timestamp */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{order.completed?.deliveredAt || '16 Oct 2026 à 14:32'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            شركة الشحن: {order.shipping?.courier}
                          </span>
                        </div>
                      </td>

                      {/* 4. Proof of Delivery Confirmation (POD) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {order.completed?.podType === 'OTP_VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              رمز OTP رسالة SMS
                            </span>
                          ) : order.completed?.podType === 'PHOTO_CONFIRMATION' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              صورة وصل الاستلام
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              توقيع الزبون الفعلي
                            </span>
                          )}

                          {order.completed?.reviewScore && (
                            <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                              {'★'.repeat(order.completed.reviewScore)}
                              <span className="text-slate-500 font-normal">تقييم ممتاز 5/5</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Financial Clearance Status (Paid Settlement) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>تسوية بنكية محولة (Paid Settlement)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            مرجع التحويل: {order.payment.settlementRef || 'VIR-SENDIT-89410'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions (View Invoice, Request Review, Process Return) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Invoice */}
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                            title="عرض وطباعة الفاتورة الرسمية"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>الفاتورة</span>
                          </button>

                          {/* Request Review via WhatsApp */}
                          <button
                            onClick={() => requestReview(order.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              order.completed?.reviewRequested
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 cursor-default'
                                : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                            title="إرسال طلب تقييم ورأي الزبون عبر الواتساب"
                          >
                            <Star className="w-3 h-3 text-amber-500" />
                            <span>
                              {order.completed?.reviewRequested ? 'تم إرسال الاستبيان ✓' : 'طلب التقييم بالواتساب'}
                            </span>
                          </button>

                          {/* Process Return */}
                          <button
                            onClick={() => setReturnOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                            title="إنشاء طلب استبدال أو إرجاع"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>استبدال / إرجاع</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Return Workflow Modal */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900">
                طلب إرجاع أو استبدال — {returnOrder.orderNumber}
              </h3>
            </div>
            <p className="text-slate-600">
              حدد سبب الإرجاع لإنشاء بوليصة إرجاع Sendit.ma مع إرسال مندوب لاستلام القطعة من الزبون:
            </p>

            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="Changement de taille souhaité">الزبون يريد استبدال المقاس</option>
              <option value="Article non conforme à la description">المنتج غير مطابق للصورة</option>
              <option value="Défaut de fabrication / Endommagé">عيب مصنعي أو كسر أثناء النقل</option>
              <option value="Rétractation client dans les 7 jours">إرجاع وضمان استرداد (7 أيام)</option>
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnOrder(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                توليد بوليصة الإرجاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
