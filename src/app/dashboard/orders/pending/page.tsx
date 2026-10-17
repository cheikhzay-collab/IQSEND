'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  Check,
  Edit2,
  Trash2,
  Phone,
  MessageSquare,
  AlertCircle,
  MapPin,
  Bot,
  CreditCard,
  Banknote,
  Sparkles,
  ChevronRight,
  PhoneCall,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useOrderLifecycle, LifecycleOrder } from '@/context/OrderLifecycleContext';
import { OrderLifecycleTabs } from '@/components/orders/lifecycle/OrderLifecycleTabs';
import {
  EditOrderModal,
  CancelOrderModal,
} from '@/components/orders/lifecycle/OrderModals';

export default function PendingOrdersPage() {
  const { orders, confirmOrder, cancelOrder, editOrder, pendingCount } = useOrderLifecycle();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Modals
  const [editingOrder, setEditingOrder] = useState<LifecycleOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<LifecycleOrder | null>(null);
  const [callingOrder, setCallingOrder] = useState<LifecycleOrder | null>(null);
  const [callOutcome, setCallOutcome] = useState('CONFIRMED');

  // Filter orders for Pending Confirmation
  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => o.stage === 'PENDING_CONFIRMATION')
      .filter((o) => {
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          o.customer.phone.includes(search) ||
          o.customer.city.toLowerCase().includes(search.toLowerCase());

        const matchesCity = selectedCity === 'ALL' || o.customer.city === selectedCity;
        const matchesPayment = paymentFilter === 'ALL' || o.payment.method === paymentFilter;

        return matchesSearch && matchesCity && matchesPayment;
      });
  }, [orders, search, selectedCity, paymentFilter]);

  const cities = useMemo(() => {
    const allPending = orders.filter((o) => o.stage === 'PENDING_CONFIRMATION');
    return Array.from(new Set(allPending.map((o) => o.customer.city)));
  }, [orders]);

  // Handle Quick Call Result
  const handleLogCall = () => {
    if (!callingOrder) return;
    if (callOutcome === 'CONFIRMED') {
      confirmOrder(callingOrder.id);
    } else if (callOutcome === 'CANCELED') {
      cancelOrder(callingOrder.id, 'الملغي عبر مكالمة التأكيد');
    } else {
      editOrder(callingOrder.id, {
        customer: {
          ...callingOrder.customer,
          notes: `نتيجة المكالمة: ${callOutcome} (${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`,
        },
      });
    }
    setCallingOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Lifecycle Navigation Tabs */}
      <OrderLifecycleTabs />

      {/* Main Content View */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        

        {/* Header with Title, Counter and Tools */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    Pending Confirmation
                  </h1>
                  <span className="text-sm font-bold text-slate-400 font-arabic">
                    (بانتظار التأكيد)
                  </span>
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                    {pendingCount} بانتظار المراجعة
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  التحقق من صحة الرقم والعنوان، مكالمات كول سنتر السريعة، وأتمتة تأكيد الواتساب قبل إرسال الطلب للمستودع
                </p>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث (الاسم، الهاتف، المدينة)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* City Dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">جميع المدن</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">جميع طرق الدفع</option>
              <option value="COD">الدفع عند الاستلام (COD)</option>
              <option value="PREPAID">الدفع الإلكتروني (Prepaid)</option>
            </select>
          </div>
        </div>

        {/* Data Table View */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {pendingOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-700">لا توجد طلبات بانتظار التأكيد حالياً</p>
              <p className="text-xs text-slate-400 mt-1">تم تأكيد وتمرير جميع الطلبات بنجاح إلى مرحلة التجهيز في المستودع.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">رقم الطلب (Order ID)</th>
                    <th className="py-3.5 px-4">بيانات الزبون (Customer Info)</th>
                    <th className="py-3.5 px-4">المنتجات والمبلغ (Items / Total)</th>
                    <th className="py-3.5 px-4">نوع الدفع (Payment)</th>
                    <th className="py-3.5 px-4">فحص الذكاء الاصطناعي (AI Risk)</th>
                    <th className="py-3.5 px-4 text-right">أدوات التأكيد والتحويل (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Order ID */}
                      <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {order.createdAt}
                          </span>
                        </div>
                      </td>

                      {/* 2. Customer Info (Name, Phone, Address) */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{order.customer.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold">
                              {order.customer.city}
                            </span>
                          </div>

                          {/* Phone + Action buttons: Call / WhatsApp */}
                          <div className="flex items-center gap-2 text-[11px] font-medium">
                            <span className="text-slate-800 font-semibold">{order.customer.phone}</span>
                            
                            {/* Direct WhatsApp Darija Confirmation Link */}
                            <a
                              href={`https://wa.me/212${order.customer.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                                `السلام عليكم أخي/أختي ${order.customer.name}، شكراً لطلبك من متجرنا. بغينا نأكدو معاك طلبك لـ ${order.items[0]?.name} بمبلغ ${order.payment.amount} درهم والتوصيل إلى ${order.customer.city}. واش العنوان والطلب صحيح؟`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              واتساب دارجة
                            </a>

                            {/* Call Logger Trigger */}
                            <button
                              onClick={() => setCallingOrder(order)}
                              className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-colors"
                              title="تسجيل نتيجة المكالمة"
                            >
                              <PhoneCall className="w-2.5 h-2.5" />
                              تسجيل مكالمة
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                            {order.customer.address}
                          </p>
                          {order.customer.notes && (
                            <p className="text-[10px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 max-w-xs">
                              ملاحظة: {order.customer.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. Items / Total */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={order.items[0]?.thumbnail}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1 max-w-[180px]">
                              {order.items[0]?.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              الكمية: <strong className="text-slate-800">{order.items[0]?.quantity}</strong> • الإجمالي:{' '}
                              <span className="font-black text-slate-900">
                                {order.payment.amount} {order.payment.currency}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 4. Payment Type (COD / Prepaid) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {order.payment.method === 'COD' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                            <span>COD ({order.payment.amount} درهم)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>دفع مسبق (Paid)</span>
                          </div>
                        )}
                      </td>

                      {/* 5. AI / Risk Verification */}
                      <td className="py-4 px-4">
                        {order.aiVerification ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {order.aiVerification.status === 'CONFIRMED_BY_AI' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  مؤكد بالذكاء الاصطناعي
                                </span>
                              ) : order.aiVerification.status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Check className="w-2.5 h-2.5 text-blue-600" />
                                  مدفوع إلكترونياً
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                  يتطلب مكالمة هاتفية
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-slate-400">
                                خطورة {order.aiVerification.riskScore}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
                              {order.aiVerification.notes}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">يدوي</span>
                        )}
                      </td>

                      {/* 6. Actions (Confirm Order -> Moves to Processing, Edit, Cancel) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Confirm Order (Primary Workflow Trigger) */}
                          <button
                            onClick={() => confirmOrder(order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
                            title="تأكيد الطلب وتمريره إلى المستودع للتجهيز"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>تأكيد ➔ للتجهيز</span>
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تعديل العنوان أو الهاتف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Order */}
                          <button
                            onClick={() => setCancellingOrder(order)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="إلغاء الطلب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Quick Call Outcome Modal */}
      {callingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <PhoneCall className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">
                تسجيل مكالمة للطلب {callingOrder.orderNumber}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
              <p>الزبون: <strong>{callingOrder.customer.name}</strong></p>
              <p>الهاتف: <strong className="font-mono">{callingOrder.customer.phone}</strong></p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نتيجة المكالمة:</label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CONFIRMED">تم الرد وتأكيد الطلب (ينتقل للتجهيز فوراً)</option>
                <option value="لا يجيب (محاولة 1)">لا يجيب (محاولة 1)</option>
                <option value="لا يجيب (محاولة 2)">لا يجيب (محاولة 2)</option>
                <option value="طلب الاتصال لاحقاً بعد العصر">طلب الاتصال لاحقاً بعد العصر</option>
                <option value="CANCELED">الزبون ألغى الطلب أثناء المكالمة</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCallingOrder(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleLogCall}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                حفظ النتيجة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditOrderModal
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={editOrder}
      />

      {/* Cancel Modal */}
      <CancelOrderModal
        order={cancellingOrder}
        isOpen={!!cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={cancelOrder}
      />
    </div>
  );
}
