import { getMysqlPool } from './db';
import { cleanMoroccanPhone } from './orders-store';
import { realtimeHub } from './realtime-events';

export type AgentActionType =
  | 'OUT_FOR_DELIVERY_NOTICE'
  | 'MORNING_COD_REMINDER'
  | 'ORDER_CONFIRMATION'
  | 'DELIVERY_RESCUE'
  | 'POST_DELIVERY_REVIEW'
  | 'TOOL_CONFIRM_ORDER'
  | 'TOOL_UPDATE_DETAILS'
  | 'TOOL_SAVE_GPS'
  | 'TOOL_CANCEL_ORDER'
  | 'AI_CHAT_REPLY'
  | 'UPSELL_OFFER'
  | 'OWNER_CONFIRM_ALERT'
  | 'OWNER_HANDOVER_ALERT';

export type AgentOperationStatus =
  | 'EXECUTED'
  | 'SKIPPED_COOLDOWN'
  | 'SKIPPED_QUIET_HOURS'
  | 'BLOCKED_DND'
  | 'SKIPPED_DAILY_CAP'
  | 'FAILED'
  | 'PENDING_APPROVAL'
  | 'NO_WHATSAPP';

export interface AgentSettings {
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "21:30"
  quietHoursEnd: string;   // "08:30"
  cooldownOutForDeliveryHours: number; // 24
  cooldownMorningReminderHours: number; // 24
  cooldownConfirmationHours: number; // 4
  cooldownRescueHours: number; // 18
  cooldownReviewHours: number; // 720 (30 days)
  maxDailyMessagesPerCustomer: number; // 2
  operationMode: 'AUTOPILOT' | 'SUPERVISED';
  dndPhones: string[];
  ownerNotifyPhone: string;
  notifyOwnerOnConfirmedOrder: boolean;
  notifyOwnerOnIntervention: boolean;
}

export interface AgentOperationLogEntry {
  id?: string;
  orderId?: string | null;
  orderNumber?: string | null;
  customerPhone: string;
  customerName?: string | null;
  actionType: AgentActionType | string;
  status: AgentOperationStatus;
  reasonDetails?: string | null;
  channel?: string;
  payload?: string | null;
  createdAt?: string;
}

// In-memory cache for settings with 10s TTL
let cachedSettings: AgentSettings | null = null;
let lastSettingsFetch = 0;
const SETTINGS_CACHE_TTL_MS = 10000;

export async function getAgentSettings(): Promise<AgentSettings> {
  const now = Date.now();
  if (cachedSettings && now - lastSettingsFetch < SETTINGS_CACHE_TTL_MS) {
    return cachedSettings;
  }

  const defaults: AgentSettings = {
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
  };

  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT setting_key, setting_value FROM store_settings
      WHERE setting_key LIKE 'AGENT_%'
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const val = (r.setting_value || '').trim();
        switch (r.setting_key) {
          case 'AGENT_QUIET_HOURS_ENABLED':
            defaults.quietHoursEnabled = val === 'true' || val === '1';
            break;
          case 'AGENT_QUIET_HOURS_START':
            defaults.quietHoursStart = val || '21:30';
            break;
          case 'AGENT_QUIET_HOURS_END':
            defaults.quietHoursEnd = val || '08:30';
            break;
          case 'AGENT_COOLDOWN_OUT_FOR_DELIVERY_HOURS':
            defaults.cooldownOutForDeliveryHours = Number(val) || 24;
            break;
          case 'AGENT_COOLDOWN_MORNING_REMINDER_HOURS':
            defaults.cooldownMorningReminderHours = Number(val) || 24;
            break;
          case 'AGENT_COOLDOWN_CONFIRMATION_HOURS':
            defaults.cooldownConfirmationHours = Number(val) || 4;
            break;
          case 'AGENT_COOLDOWN_RESCUE_HOURS':
            defaults.cooldownRescueHours = Number(val) || 18;
            break;
          case 'AGENT_COOLDOWN_REVIEW_HOURS':
            defaults.cooldownReviewHours = Number(val) || 720;
            break;
          case 'AGENT_MAX_DAILY_MESSAGES_PER_CUSTOMER':
            defaults.maxDailyMessagesPerCustomer = Number(val) || 2;
            break;
          case 'AGENT_OPERATION_MODE':
            defaults.operationMode = val === 'SUPERVISED' ? 'SUPERVISED' : 'AUTOPILOT';
            break;
          case 'AGENT_OWNER_NOTIFY_PHONE':
            defaults.ownerNotifyPhone = val || '';
            break;
          case 'AGENT_NOTIFY_OWNER_ON_CONFIRM':
            defaults.notifyOwnerOnConfirmedOrder = val !== 'false' && val !== '0';
            break;
          case 'AGENT_NOTIFY_OWNER_ON_INTERVENTION':
            defaults.notifyOwnerOnIntervention = val !== 'false' && val !== '0';
            break;
          case 'AGENT_DND_PHONES':
            try {
              defaults.dndPhones = JSON.parse(val);
            } catch {
              defaults.dndPhones = [];
            }
            break;
        }
      }
    }
    cachedSettings = defaults;
    lastSettingsFetch = now;
  } catch (err: any) {
    console.warn('[AgentRulesEngine] Could not fetch settings from DB, using defaults:', err.message);
  }

  return defaults;
}

export async function saveAgentSettings(settings: Partial<AgentSettings>): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const map: Record<string, string> = {};

    if (settings.quietHoursEnabled !== undefined) {
      map['AGENT_QUIET_HOURS_ENABLED'] = settings.quietHoursEnabled ? 'true' : 'false';
    }
    if (settings.quietHoursStart) map['AGENT_QUIET_HOURS_START'] = settings.quietHoursStart;
    if (settings.quietHoursEnd) map['AGENT_QUIET_HOURS_END'] = settings.quietHoursEnd;
    if (settings.cooldownOutForDeliveryHours !== undefined) {
      map['AGENT_COOLDOWN_OUT_FOR_DELIVERY_HOURS'] = String(settings.cooldownOutForDeliveryHours);
    }
    if (settings.cooldownMorningReminderHours !== undefined) {
      map['AGENT_COOLDOWN_MORNING_REMINDER_HOURS'] = String(settings.cooldownMorningReminderHours);
    }
    if (settings.cooldownConfirmationHours !== undefined) {
      map['AGENT_COOLDOWN_CONFIRMATION_HOURS'] = String(settings.cooldownConfirmationHours);
    }
    if (settings.cooldownRescueHours !== undefined) {
      map['AGENT_COOLDOWN_RESCUE_HOURS'] = String(settings.cooldownRescueHours);
    }
    if (settings.cooldownReviewHours !== undefined) {
      map['AGENT_COOLDOWN_REVIEW_HOURS'] = String(settings.cooldownReviewHours);
    }
    if (settings.maxDailyMessagesPerCustomer !== undefined) {
      map['AGENT_MAX_DAILY_MESSAGES_PER_CUSTOMER'] = String(settings.maxDailyMessagesPerCustomer);
    }
    if (settings.operationMode) map['AGENT_OPERATION_MODE'] = settings.operationMode;
    if (settings.ownerNotifyPhone !== undefined) map['AGENT_OWNER_NOTIFY_PHONE'] = settings.ownerNotifyPhone.trim();
    if (settings.notifyOwnerOnConfirmedOrder !== undefined) {
      map['AGENT_NOTIFY_OWNER_ON_CONFIRM'] = settings.notifyOwnerOnConfirmedOrder ? 'true' : 'false';
    }
    if (settings.notifyOwnerOnIntervention !== undefined) {
      map['AGENT_NOTIFY_OWNER_ON_INTERVENTION'] = settings.notifyOwnerOnIntervention ? 'true' : 'false';
    }
    if (settings.dndPhones) map['AGENT_DND_PHONES'] = JSON.stringify(settings.dndPhones);

    for (const [k, v] of Object.entries(map)) {
      await pool.execute(
        `INSERT INTO store_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [k, v]
      );
    }

    cachedSettings = null; // Invalidate cache
    return true;
  } catch (err: any) {
    console.error('[AgentRulesEngine] Error saving agent settings:', err);
    return false;
  }
}

/**
 * Determine if current Moroccan time is within Quiet Hours window (e.g. 21:30 -> 08:30)
 */
export function isCurrentlyQuietHours(startStr: string = '21:30', endStr: string = '08:30'): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Casablanca',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMins = h * 60 + m;

    const [sH, sM] = startStr.split(':').map((x) => parseInt(x, 10));
    const [eH, eM] = endStr.split(':').map((x) => parseInt(x, 10));
    const startMins = sH * 60 + (sM || 0);
    const endMins = eH * 60 + (eM || 0);

    if (startMins > endMins) {
      return currentMins >= startMins || currentMins < endMins;
    }
    return currentMins >= startMins && currentMins < endMins;
  } catch {
    return false;
  }
}

/**
 * Log an agent operation or skipped action directly into MySQL and emit realtime SSE
 */
export async function logAgentOperation(entry: AgentOperationLogEntry): Promise<string> {
  const id = entry.id || `agop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const cleanPhone = cleanMoroccanPhone(entry.customerPhone) || entry.customerPhone;

  try {
    const pool = getMysqlPool();
    await pool.execute(
      `INSERT INTO agent_operations_log 
       (id, order_id, order_number, customer_phone, customer_name, action_type, status, reason_details, channel, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        entry.orderId || null,
        entry.orderNumber || null,
        cleanPhone,
        entry.customerName || null,
        entry.actionType,
        entry.status,
        entry.reasonDetails || null,
        entry.channel || 'WHATSAPP',
        entry.payload || null,
      ]
    );

    // Broadcast SSE to refresh dashboard live
    realtimeHub
      .broadcast({
        eventType: 'AGENT_OPERATION_LOGGED',
        entityType: 'AGENT_LOG',
        entityId: id,
        title: `الوكيل الذكي: ${entry.actionType} (${entry.status})`,
        payload: {
          id,
          actionType: entry.actionType,
          status: entry.status,
          customerPhone: cleanPhone,
          customerName: entry.customerName,
          orderNumber: entry.orderNumber,
          reasonDetails: entry.reasonDetails,
        },
        source: 'AGENT_RULES_ENGINE',
      })
      .catch(() => {});
  } catch (err: any) {
    console.error('[AgentRulesEngine] Error logging agent operation to MySQL:', err.message);
  }

  return id;
}

/**
 * Core Rule Evaluation:
 * Check if the agent is allowed to execute the action or if it should be skipped/blocked.
 */
export async function canExecuteAgentAction(params: {
  customerPhone: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  actionType: AgentActionType;
}): Promise<{ allowed: boolean; status: AgentOperationStatus; reason?: string }> {
  const settings = await getAgentSettings();
  const cleanPhone = cleanMoroccanPhone(params.customerPhone) || params.customerPhone;

  // 1. DND (Do Not Disturb / Blacklist) check
  if (settings.dndPhones && settings.dndPhones.length > 0) {
    const isDnd = settings.dndPhones.some((p) => {
      const c = cleanMoroccanPhone(p);
      return c === cleanPhone || p === cleanPhone;
    });
    if (isDnd) {
      return {
        allowed: false,
        status: 'BLOCKED_DND',
        reason: 'الرقم مسجل في قائمة عدم الإزعاج (DND / Blacklist)',
      };
    }
  }

  // 2. Customer Trust Score Blacklist Check
  try {
    const pool = getMysqlPool();
    const [custRows]: any = await pool.execute(
      `SELECT trust_score FROM customers WHERE phone_number = ? LIMIT 1`,
      [cleanPhone]
    );
    if (Array.isArray(custRows) && custRows.length > 0 && custRows[0].trust_score === 'BLACKLIST') {
      return {
        allowed: false,
        status: 'BLOCKED_DND',
        reason: 'العميل محظور في نظام الثقة (Trust Score: BLACKLIST)',
      };
    }
  } catch {}

  // Proactive automated outreach actions
  const isAutomatedOutbound = [
    'OUT_FOR_DELIVERY_NOTICE',
    'MORNING_COD_REMINDER',
    'ORDER_CONFIRMATION',
    'DELIVERY_RESCUE',
    'POST_DELIVERY_REVIEW',
    'UPSELL_OFFER',
  ].includes(params.actionType);

  // 3. Quiet Hours Check (Only for automated proactive messages, not customer replies)
  if (isAutomatedOutbound && settings.quietHoursEnabled) {
    if (isCurrentlyQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
      return {
        allowed: false,
        status: 'SKIPPED_QUIET_HOURS',
        reason: `خارج ساعات العمل المسموح بها للمراسلة (ساعات الهدوء ${settings.quietHoursStart} إلى ${settings.quietHoursEnd})`,
      };
    }
  }

  // 4. Daily Outbound Message Cap per Customer Check
  if (isAutomatedOutbound && settings.maxDailyMessagesPerCustomer > 0) {
    try {
      const pool = getMysqlPool();
      const [todayCountRows]: any = await pool.execute(
        `SELECT COUNT(*) AS total_today FROM agent_operations_log 
         WHERE customer_phone = ? 
           AND status = 'EXECUTED'
           AND action_type IN ('OUT_FOR_DELIVERY_NOTICE', 'MORNING_COD_REMINDER', 'ORDER_CONFIRMATION', 'DELIVERY_RESCUE', 'POST_DELIVERY_REVIEW')
           AND created_at >= CURDATE()`,
        [cleanPhone]
      );
      const totalToday = Number(todayCountRows?.[0]?.total_today || 0);
      if (totalToday >= settings.maxDailyMessagesPerCustomer) {
        return {
          allowed: false,
          status: 'SKIPPED_DAILY_CAP',
          reason: `تم بلوغ الحد الأقصى للمراسلات التلقائية اليومية لهذا الزبون (${settings.maxDailyMessagesPerCustomer} رسائل اليوم) لتفادي الإزعاج`,
        };
      }
    } catch (err: any) {
      console.warn('[AgentRulesEngine] Daily cap query warning:', err.message);
    }
  }

  // 5. Cooldown & Anti-Spam Deduplication Check
  try {
    const pool = getMysqlPool();

    // 5A: OUT_FOR_DELIVERY_NOTICE Cooldown (e.g. 24h cooldown)
    if (params.actionType === 'OUT_FOR_DELIVERY_NOTICE') {
      const cooldownHours = settings.cooldownOutForDeliveryHours || 24;
      const [recentRows]: any = await pool.execute(
        `SELECT id, created_at FROM agent_operations_log
         WHERE action_type = 'OUT_FOR_DELIVERY_NOTICE'
           AND status = 'EXECUTED'
           AND (order_id = ? OR order_number = ? OR customer_phone = ?)
           AND created_at >= NOW() - INTERVAL ? HOUR
         ORDER BY created_at DESC
         LIMIT 1`,
        [params.orderId || 'none', params.orderNumber || 'none', cleanPhone, cooldownHours]
      );

      if (Array.isArray(recentRows) && recentRows.length > 0) {
        const lastSent = recentRows[0].created_at;
        const timeStr = lastSent ? new Date(lastSent).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' }) : '';
        return {
          allowed: false,
          status: 'SKIPPED_COOLDOWN',
          reason: `تم إشعار العميل بخروج الطلبية للتسليم مسبقاً اليوم${timeStr ? ` الساعة ${timeStr}` : ''}، تم تخطي التكرار لتفادي إزعاج الزبون (فترة التهدئة ${cooldownHours} ساعة)`,
        };
      }
    }

    // 5B: MORNING_COD_REMINDER Cooldown
    if (params.actionType === 'MORNING_COD_REMINDER') {
      const cooldownHours = settings.cooldownMorningReminderHours || 24;
      const [recentRows]: any = await pool.execute(
        `SELECT id, created_at FROM agent_operations_log
         WHERE action_type = 'MORNING_COD_REMINDER'
           AND status = 'EXECUTED'
           AND (order_id = ? OR order_number = ? OR customer_phone = ?)
           AND created_at >= NOW() - INTERVAL ? HOUR
         ORDER BY created_at DESC
         LIMIT 1`,
        [params.orderId || 'none', params.orderNumber || 'none', cleanPhone, cooldownHours]
      );

      if (Array.isArray(recentRows) && recentRows.length > 0) {
        return {
          allowed: false,
          status: 'SKIPPED_COOLDOWN',
          reason: `تم إرسال تذكير الدفع عند الاستلام مسبقاً اليوم، تم التخطي لتفادي الإزعاج (فترة التهدئة ${cooldownHours} ساعة)`,
        };
      }
    }

    // 5C: ORDER_CONFIRMATION Cooldown
    if (params.actionType === 'ORDER_CONFIRMATION') {
      const cooldownHours = settings.cooldownConfirmationHours || 4;
      const [recentRows]: any = await pool.execute(
        `SELECT id, created_at FROM agent_operations_log
         WHERE action_type = 'ORDER_CONFIRMATION'
           AND status = 'EXECUTED'
           AND (order_id = ? OR order_number = ?)
           AND created_at >= NOW() - INTERVAL ? HOUR
         ORDER BY created_at DESC
         LIMIT 1`,
        [params.orderId || 'none', params.orderNumber || 'none', cooldownHours]
      );

      if (Array.isArray(recentRows) && recentRows.length > 0) {
        return {
          allowed: false,
          status: 'SKIPPED_COOLDOWN',
          reason: `تم إرسال طلب التأكيد للطلبية مؤخراً (فترة التهدئة ${cooldownHours} ساعات)`,
        };
      }
    }

    // 5D: DELIVERY_RESCUE Cooldown
    if (params.actionType === 'DELIVERY_RESCUE') {
      const cooldownHours = settings.cooldownRescueHours || 18;
      const [recentRows]: any = await pool.execute(
        `SELECT id, created_at FROM agent_operations_log
         WHERE action_type = 'DELIVERY_RESCUE'
           AND status = 'EXECUTED'
           AND (order_id = ? OR order_number = ? OR customer_phone = ?)
           AND created_at >= NOW() - INTERVAL ? HOUR
         ORDER BY created_at DESC
         LIMIT 1`,
        [params.orderId || 'none', params.orderNumber || 'none', cleanPhone, cooldownHours]
      );

      if (Array.isArray(recentRows) && recentRows.length > 0) {
        return {
          allowed: false,
          status: 'SKIPPED_COOLDOWN',
          reason: `تم إرسال رسالة إنقاذ التوصيل مسبقاً لهذا العميل (فترة التهدئة ${cooldownHours} ساعة)`,
        };
      }
    }

    // 5E: POST_DELIVERY_REVIEW (Send once per order forever)
    if (params.actionType === 'POST_DELIVERY_REVIEW') {
      const [recentRows]: any = await pool.execute(
        `SELECT id FROM agent_operations_log
         WHERE action_type = 'POST_DELIVERY_REVIEW'
           AND status = 'EXECUTED'
           AND (order_id = ? OR order_number = ?)
         LIMIT 1`,
        [params.orderId || 'none', params.orderNumber || 'none']
      );

      if (Array.isArray(recentRows) && recentRows.length > 0) {
        return {
          allowed: false,
          status: 'SKIPPED_COOLDOWN',
          reason: `تم إرسال دعوة التقييم مسبقاً لهذا الطلب المسلم`,
        };
      }
    }
  } catch (err: any) {
    console.warn('[AgentRulesEngine] Cooldown verification query warning:', err.message);
  }

  // 6. Supervised Mode Check (if enabled, action stays pending for merchant approval)
  if (settings.operationMode === 'SUPERVISED' && isAutomatedOutbound) {
    return {
      allowed: false,
      status: 'PENDING_APPROVAL',
      reason: 'النظام في وضع الإشراف والموافقة: تتطلب هذه العملية موافقة المشرف قبل الإرسال',
    };
  }

  return { allowed: true, status: 'EXECUTED' };
}

/**
 * Execute an agent action safely with full guardrails and comprehensive audit logging.
 */
export async function executeSafeAgentAction<T>(
  params: {
    customerPhone: string;
    customerName?: string;
    orderId?: string;
    orderNumber?: string;
    actionType: AgentActionType;
    channel?: string;
    payloadPreview?: string;
  },
  actionFn: () => Promise<T>
): Promise<{ success: boolean; skipped?: boolean; status: AgentOperationStatus; reason?: string; result?: T }> {
  // Step 1: Evaluate rules
  const check = await canExecuteAgentAction({
    customerPhone: params.customerPhone,
    customerName: params.customerName,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    actionType: params.actionType,
  });

  // Step 2: If blocked or skipped, record in audit log and return early
  if (!check.allowed) {
    await logAgentOperation({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      actionType: params.actionType,
      status: check.status,
      reasonDetails: check.reason,
      channel: params.channel || 'WHATSAPP',
      payload: params.payloadPreview,
    });

    console.log(
      `[AgentRulesEngine] 🛡️ ${params.actionType} SKIPPED for ${params.customerPhone}: ${check.reason}`
    );

    return {
      success: false,
      skipped: true,
      status: check.status,
      reason: check.reason,
    };
  }

  // Step 3: Allowed -> Execute the action
  try {
    const result: any = await actionFn();

    // Check if recipient was detected not on WhatsApp
    if (result && (result.notOnWhatsApp || result.error === 'NO_WHATSAPP')) {
      const reasonNoWa = 'الرقم غير مسجل في تطبيق واتساب - يُرجى التواصل هاتفياً عبر مكالمة GSM مباشرة';
      await logAgentOperation({
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        customerPhone: params.customerPhone,
        customerName: params.customerName,
        actionType: params.actionType,
        status: 'NO_WHATSAPP',
        reasonDetails: reasonNoWa,
        channel: params.channel || 'WHATSAPP',
        payload: params.payloadPreview,
      });

      // Update DB customer and order
      try {
        const pool = getMysqlPool();
        const cleanPhone = cleanMoroccanPhone(params.customerPhone) || params.customerPhone;
        await pool.execute(
          `UPDATE order_leads SET whatsapp_status = 'NOT_AVAILABLE' WHERE id = ? OR phone_number LIKE ?`,
          [params.orderId || 'none', `%${cleanPhone.slice(-9)}%`]
        );
        await pool.execute(
          `UPDATE customers SET whatsapp_status = 'NOT_AVAILABLE' WHERE phone_number = ?`,
          [cleanPhone]
        );
      } catch (dbErr: any) {
        console.warn('[AgentRulesEngine] Could not update whatsapp_status in DB:', dbErr.message);
      }

      console.warn(`[AgentRulesEngine] ⚠️ ${params.actionType} recipient ${params.customerPhone} is NOT on WhatsApp`);

      return {
        success: false,
        skipped: false,
        status: 'NO_WHATSAPP',
        reason: reasonNoWa,
        result,
      };
    }

    // Log successful execution
    await logAgentOperation({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      actionType: params.actionType,
      status: 'EXECUTED',
      reasonDetails: 'تم استيفاء جميع قواعد الأمان وعدم الإزعاج وتنفيذ العملية بنجاح',
      channel: params.channel || 'WHATSAPP',
      payload: params.payloadPreview,
    });

    console.log(
      `[AgentRulesEngine] ✅ ${params.actionType} EXECUTED successfully for ${params.customerPhone}`
    );

    return {
      success: true,
      skipped: false,
      status: 'EXECUTED',
      result,
    };
  } catch (err: any) {
    const msg = err.message || String(err);
    const isNoWa =
      msg.includes('NO_WHATSAPP') ||
      msg.includes('not on whatsapp') ||
      msg.includes('not-authorized') ||
      msg.includes('item-not-found');
    const finalStatus: AgentOperationStatus = isNoWa ? 'NO_WHATSAPP' : 'FAILED';
    const reasonDetails = isNoWa
      ? 'الرقم غير مسجل في تطبيق واتساب - يُرجى التواصل هاتفياً عبر مكالمة GSM مباشرة'
      : `فشل التنفيذ التقني: ${msg}`;

    if (isNoWa) {
      try {
        const pool = getMysqlPool();
        const cleanPhone = cleanMoroccanPhone(params.customerPhone) || params.customerPhone;
        await pool.execute(
          `UPDATE order_leads SET whatsapp_status = 'NOT_AVAILABLE' WHERE id = ? OR phone_number LIKE ?`,
          [params.orderId || 'none', `%${cleanPhone.slice(-9)}%`]
        );
        await pool.execute(
          `UPDATE customers SET whatsapp_status = 'NOT_AVAILABLE' WHERE phone_number = ?`,
          [cleanPhone]
        );
      } catch {}
    }

    // Log failure
    await logAgentOperation({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      actionType: params.actionType,
      status: finalStatus,
      reasonDetails,
      channel: params.channel || 'WHATSAPP',
      payload: params.payloadPreview,
    });

    console.error(`[AgentRulesEngine] ❌ ${params.actionType} ${finalStatus}:`, err);

    return {
      success: false,
      skipped: false,
      status: finalStatus,
      reason: reasonDetails,
    };
  }
}

/**
 * Send real-time WhatsApp alert to the store owner (e.g. for confirmed orders or human interventions)
 */
export async function notifyStoreOwner(params: {
  eventType: 'ORDER_CONFIRMED' | 'NEEDS_ATTENTION' | 'TEST_ALERT';
  order: {
    id?: string;
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    city?: string;
    address?: string;
    totalAmount?: number | string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  };
  reason?: string;
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const settings = await getAgentSettings();
    const ownerPhone = settings.ownerNotifyPhone?.trim();

    if (!ownerPhone) {
      console.log('[StoreOwnerNotifier] ℹ️ No owner WhatsApp phone configured, skipping notification.');
      return { success: false, skipped: true, error: 'NO_OWNER_PHONE_CONFIGURED' };
    }

    if (params.eventType === 'ORDER_CONFIRMED' && !settings.notifyOwnerOnConfirmedOrder) {
      return { success: false, skipped: true, error: 'CONFIRMED_ALERTS_DISABLED' };
    }

    if (params.eventType === 'NEEDS_ATTENTION' && !settings.notifyOwnerOnIntervention) {
      return { success: false, skipped: true, error: 'INTERVENTION_ALERTS_DISABLED' };
    }

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp');

    let messageBody = '';
    let actionType: AgentActionType = 'OWNER_CONFIRM_ALERT';

    if (params.eventType === 'ORDER_CONFIRMED') {
      actionType = 'OWNER_CONFIRM_ALERT';
      const itemsList = (params.order.items || [])
        .map((it) => `  ▫️ ${it.name} (${it.quantity}x) - ${it.price} DH`)
        .join('\n');

      messageBody = `🎉 *تنبيه Sendit: تم تأكيد طلبية جديدة بنجاح!*
━━━━━━━━━━━━━━━━━━━━
📦 *الطلبية:* #${params.order.orderNumber || 'MA-NEW'}
👤 *العميل:* ${params.order.customerName || 'عميل المتجر'}
📱 *الهاتف:* ${params.order.customerPhone || 'غير محدد'}
🏙️ *المدينة:* ${params.order.city || 'المغرب'}
📍 *العنوان:* ${params.order.address || 'المحدد بالطلب'}

🛒 *المنتجات:*
${itemsList || '  ▫️ منتج من المتجر'}

💰 *المبلغ المستحق (COD):* *${params.order.totalAmount || 0} درهم*
🤖 *المؤكد:* الوكيل الذكي (AI Agent Confirmation)
━━━━━━━━━━━━━━━━━━━━
✅ تم حجز المخزون والطلبية جاهزة للتجهيز والشحن عبر Sendit!`.trim();
    } else if (params.eventType === 'NEEDS_ATTENTION') {
      actionType = 'OWNER_HANDOVER_ALERT';
      messageBody = `🚨 *تنبيه عاجل Sendit: طلبية تتطلب تدخلاً بشرياً!*
━━━━━━━━━━━━━━━━━━━━
📦 *الطلبية:* #${params.order.orderNumber || 'MA-ALERT'}
👤 *العميل:* ${params.order.customerName || 'عميل المتجر'}
📱 *الهاتف:* ${params.order.customerPhone || 'غير محدد'}
🏙️ *المدينة:* ${params.order.city || 'المغرب'}
⚠️ *سبب التدخل:* ${params.reason || 'العميل طلب التحدث مع ممثل خدمة العملاء'}

🔗 *رابط المتابعة في لوحة التحكم:*
https://lawngreen-jaguar-315438.hostingersite.com/dashboard/orders
━━━━━━━━━━━━━━━━━━━━
يرجى التواصل مع العميل لحل الإشكال وإتمام الطلبية.`.trim();
    } else {
      // Test Alert
      actionType = 'OWNER_CONFIRM_ALERT';
      messageBody = `🔔 *رسالة اختبارية من الوكيل الذكي Sendit*
━━━━━━━━━━━━━━━━━━━━
مرحباً بك! تم ربط رقم صاحب المتجر (${ownerPhone}) بنجاح.
ستصلك هنا إشعارات فورية عن:
✅ ملخص الطلبيات المؤكدة آلياً
🚨 تنبيهات الطلبيات التي تحتاج تدخلاً بشرياً
━━━━━━━━━━━━━━━━━━━━
النظام يعمل بكفاءة وأمان! ✨`.trim();
    }

    const sendRes = await sendWhatsAppMessage(ownerPhone, messageBody);

    await logAgentOperation({
      orderId: params.order.id,
      orderNumber: params.order.orderNumber,
      customerPhone: ownerPhone,
      customerName: 'صاحب المتجر (Admin)',
      actionType,
      status: sendRes.success ? 'EXECUTED' : 'FAILED',
      reasonDetails: sendRes.success
        ? `تم إشعار صاحب المتجر بنجاح (${params.eventType})`
        : `تعذر إشعار صاحب المتجر: ${sendRes.error}`,
      channel: 'WHATSAPP',
      payload: messageBody,
    });

    return { success: Boolean(sendRes.success), error: sendRes.error };
  } catch (err: any) {
    console.error('[StoreOwnerNotifier] Error notifying store owner:', err.message);
    return { success: false, error: err.message };
  }
}

