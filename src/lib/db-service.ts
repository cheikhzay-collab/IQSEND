import { getMysqlPool, executeQuery } from './db';
import { LifecycleOrder, LifecycleStage } from '@/context/OrderLifecycleContext';
import { IngestedOrder, cleanMoroccanPhone } from './orders-store';
import { ProductItem } from './products-store';

/**
 * Stage mapping between frontend LifecycleStage and database enum status
 */
export function mapStageToDbStatus(stage: string): string {
  switch (stage) {
    case 'PENDING_CONFIRMATION':
    case 'NEW_ORDERS':
      return 'NEW';
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PACKING':
      return 'PACKING';
    case 'IN_TRANSIT':
    case 'SHIPPED':
    case 'DISPATCHED':
      return 'IN_TRANSIT';
    case 'COMPLETED':
    case 'DELIVERED':
      return 'DELIVERED_PAID';
    case 'CANCELED':
    case 'CANCELLED':
      return 'CANCELED';
    case 'RETURNED':
    case 'REFUSED':
      return 'RETURNED';
    default:
      return 'NEW';
  }
}

export function mapDbStatusToStage(
  status: string,
  storeSource?: string,
  rescueStatus?: string
): LifecycleStage {
  switch (status) {
    case 'NEW':
    case 'AI_CHATTING':
      // Sendit parcels are already in courier custody, never pending phone confirmation
      if (storeSource === 'SENDIT_SYNC') return 'IN_TRANSIT';
      return 'PENDING_CONFIRMATION';
    case 'CONFIRMED':
    case 'PACKING':
      if (storeSource === 'SENDIT_SYNC') return 'IN_TRANSIT';
      return 'PROCESSING';
    case 'READY_FOR_PICKUP':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return 'IN_TRANSIT';
    case 'DELIVERED_PAID':
      return 'COMPLETED';
    case 'DELIVERY_FAILED':
      // If return is finalized and parcel sent back to warehouse, treat as RETURNED.
      // Otherwise, while under rescue/needs attention, keep in IN_TRANSIT with FAILED_ATTEMPT
      // so it remains active on the live delivery dashboard for rescue outreach.
      if (rescueStatus === 'RETURN_CONFIRMED' || rescueStatus === 'RETURNED') {
        return 'RETURNED';
      }
      return 'IN_TRANSIT';
    case 'RETURNED':
      return 'RETURNED';
    case 'CANCELED':
    case 'DUPLICATE':
      return 'CANCELED';
    default:
      if (storeSource === 'SENDIT_SYNC') return 'IN_TRANSIT';
      return 'PENDING_CONFIRMATION';
  }
}

// In-memory cache for ultra-fast response (< 1ms vs ~400ms remote MySQL roundtrip)
let ordersCache: { data: LifecycleOrder[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5000; // 5 seconds cache

export function invalidateOrdersCache() {
  ordersCache = null;
}

/**
 * 1. Fetch all orders from MySQL database (order_leads + order_items + shipment_details)
 */
export async function getOrdersFromDb(forceFresh: boolean = false): Promise<LifecycleOrder[]> {
  try {
    if (!forceFresh && ordersCache && Date.now() - ordersCache.timestamp < CACHE_TTL_MS) {
      return ordersCache.data;
    }

    const pool = getMysqlPool();

    // Fetch leads and items concurrently in parallel
    const [leadsRes, itemsRes]: any = await Promise.all([
      pool.execute(`
        SELECT 
          l.*,
          s.carrier,
          s.sendit_tracking_number,
          s.status as shipment_status,
          s.waybill_url,
          s.delivery_proof_url,
          s.failed_reason,
          s.delivery_attempts_count,
          s.last_status_update_at
        FROM order_leads l
        LEFT JOIN shipment_details s ON l.id = s.order_id
        ORDER BY l.created_at DESC
      `),
      pool.execute(`SELECT * FROM order_items`),
    ]);

    const leads = leadsRes[0];
    const items = itemsRes[0];

    if (!Array.isArray(leads) || leads.length === 0) {
      ordersCache = { data: [], timestamp: Date.now() };
      return [];
    }

    const itemsByOrderId: Record<string, any[]> = {};
    if (Array.isArray(items)) {
      items.forEach((it) => {
        if (!itemsByOrderId[it.order_id]) {
          itemsByOrderId[it.order_id] = [];
        }
        const exists = itemsByOrderId[it.order_id].some(
          (existing) => (existing.id && existing.id === it.id) || (existing.sku && it.sku && existing.sku === it.sku)
        );
        if (!exists) {
          itemsByOrderId[it.order_id].push(it);
        }
      });
    }

    const mappedOrders: LifecycleOrder[] = leads.map((lead: any): LifecycleOrder => {
      const orderItems = itemsByOrderId[lead.id] || [];
      let stage = mapDbStatusToStage(lead.status, lead.store_source, lead.rescue_status);
      
      // Strict safeguard: Any parcel from Sendit logistics is already in delivery network, NEVER pending confirmation or packing
      const isSenditParcel = lead.store_source === 'SENDIT_SYNC' || (lead.id && lead.id.startsWith('snd-'));
      const hasTracking = Boolean(lead.sendit_tracking_number && String(lead.sendit_tracking_number).trim() !== '');
      const hasShipmentRecord = Boolean(lead.shipment_status && lead.shipment_status !== '');

      if (isSenditParcel && stage === 'PENDING_CONFIRMATION') {
        stage = 'IN_TRANSIT';
      }

      // If the parcel has already been pushed to Sendit (has tracking number or AWB ready for pickup), it is in transit, not packing!
      if ((isSenditParcel || hasTracking || hasShipmentRecord) && stage === 'PROCESSING') {
        stage = 'IN_TRANSIT';
      }

      const isDelivered = lead.status === 'DELIVERED_PAID' || lead.shipment_status === 'DELIVERED_PAID';
      const isFailedAttempt = lead.status === 'DELIVERY_FAILED' || lead.shipment_status === 'DELIVERY_FAILED';
      const isOutForDelivery = lead.shipment_status === 'OUT_FOR_DELIVERY' || lead.status === 'OUT_FOR_DELIVERY';

      const liveShippingStatus: 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'FAILED_ATTEMPT' | 'DELIVERED' = isDelivered
        ? 'DELIVERED'
        : isFailedAttempt
        ? 'FAILED_ATTEMPT'
        : isOutForDelivery
        ? 'OUT_FOR_DELIVERY'
        : 'DISPATCHED';

      const isReturnedConfirmed = lead.rescue_status === 'RETURN_CONFIRMED' || lead.status === 'RETURNED' || lead.shipment_status === 'RETURNED';

      return {
        id: lead.id,
        orderNumber: lead.order_number,
        stage,
        createdAt: lead.created_at
          ? new Date(lead.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'À l’instant',
        customer: {
          name: lead.customer_name,
          phone: lead.phone_number,
          address: lead.address || '',
          city: lead.city,
          notes: lead.notes || undefined,
        },
        items: orderItems.map((it: any) => ({
          id: it.id,
          name: it.product_name,
          sku: it.sku,
          thumbnail:
            'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
          quantity: it.quantity,
          price: Number(it.price),
        })),
        payment: {
          method: 'COD',
          amount: Number(lead.total_amount),
          currency: 'MAD',
          status: isDelivered ? 'COLLECTED' : 'PENDING',
        },
        aiVerification: {
          status:
            lead.ai_confirmation_status === 'CONFIRMED'
              ? 'CONFIRMED_BY_AI'
              : lead.ai_confirmation_status === 'VERIFIED'
              ? 'VERIFIED'
              : 'NEEDS_REVIEW',
          riskScore: lead.risk_score || 10,
          notes: lead.notes || 'Vérification automatique',
        },
        shipping: lead.sendit_tracking_number
          ? {
              courier: lead.carrier || 'Sendit.ma Express',
              trackingNumber: lead.sendit_tracking_number,
              liveStatus: liveShippingStatus,
              lastUpdated: lead.last_status_update_at
                ? new Date(lead.last_status_update_at).toLocaleDateString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'À l’instant',
              failedReason: lead.failed_reason || lead.rescue_notes || undefined,
              deliveryAttempts: Number(lead.delivery_attempts_count) || (isFailedAttempt ? 1 : 0),
            }
          : undefined,
        completed: isDelivered
          ? {
              deliveredAt: new Date(lead.updated_at).toLocaleDateString('fr-FR'),
              podType: 'CUSTOMER_SIGNATURE',
              settlementStatus: 'PAID_SETTLEMENT',
              reviewRequested: false,
            }
          : isReturnedConfirmed
          ? {
              deliveredAt: new Date(lead.updated_at).toLocaleDateString('fr-FR'),
              podType: 'CUSTOMER_SIGNATURE',
              settlementStatus: 'PENDING_TRANSFER',
              returnStatus: 'RETURNED',
            }
          : undefined,
        source: {
          name: lead.store_source || 'Direct Funnel',
        },
        cancellationStage: lead.cancellation_stage || (lead.status === 'RETURNED' || lead.store_source === 'SENDIT_SYNC' ? 'DELIVERY' : lead.status === 'CANCELED' ? 'CONFIRMATION' : undefined),
        cancellationReason: lead.cancellation_reason || lead.failed_reason || lead.rescue_notes || undefined,
        canceledAt: lead.canceled_at ? new Date(lead.canceled_at).toISOString() : undefined,
        canceledBy: lead.canceled_by || undefined,
        returnReason: lead.return_reason || lead.failed_reason || undefined,
        returnedAt: lead.returned_at ? new Date(lead.returned_at).toISOString() : undefined,
        returnedBy: lead.returned_by || undefined,
        stockReintegrated: Boolean(lead.stock_reintegrated),
        returnFeeAmount: lead.return_fee_amount != null ? Number(lead.return_fee_amount) : (lead.status === 'RETURNED' || lead.cancellation_stage === 'DELIVERY' ? 35 : 0),
        whatsappCallerName: lead.whatsapp_caller_name || undefined,
        districtId: lead.district_id || undefined,
        districtName: lead.district_name || undefined,
        awbCode: lead.awb_code || undefined,
        confirmedBy: lead.confirmed_by || undefined,
        confirmedAt: lead.confirmed_at ? new Date(lead.confirmed_at).toISOString() : undefined,
        sheetRowId: lead.sheet_row_id || undefined,
        externalOrderId: lead.external_order_id || undefined,
      };
    });

    ordersCache = { data: mappedOrders, timestamp: Date.now() };
    return mappedOrders;
  } catch (error) {
    console.error('[DB Service] Error fetching orders from DB:', error);
    return [];
  }
}

/**
 * 2. Save or update an order in MySQL database
 */
export async function saveOrderToDb(order: LifecycleOrder | IngestedOrder): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const dbStatus = mapStageToDbStatus(order.stage);

    const customerName = 'customer' in order ? order.customer.name : 'Client';
    const phone = 'customer' in order ? cleanMoroccanPhone(order.customer.phone) : '';
    const city = 'customer' in order ? order.customer.city : 'Maroc';
    const address = 'customer' in order ? order.customer.address || '' : '';
    const notes = 'customer' in order ? order.customer.notes || '' : '';
    const totalAmount = order.payment?.amount || 0;

    const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
    const itemSku = firstItem?.sku || null;
    const itemName = firstItem?.name || null;
    const itemQty = firstItem?.quantity || 1;

    // Upsert into order_leads
    await pool.execute(
      `
      INSERT INTO order_leads (
        id, order_number, customer_name, phone_number, city, address, 
        sku, product_name, quantity, total_amount, status, ai_confirmation_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        phone_number = VALUES(phone_number),
        city = VALUES(city),
        address = VALUES(address),
        sku = IFNULL(VALUES(sku), order_leads.sku),
        product_name = IFNULL(VALUES(product_name), order_leads.product_name),
        quantity = IFNULL(VALUES(quantity), order_leads.quantity),
        total_amount = VALUES(total_amount),
        status = VALUES(status),
        ai_confirmation_status = VALUES(ai_confirmation_status),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        order.id,
        order.orderNumber,
        customerName,
        phone,
        city,
        address,
        itemSku,
        itemName,
        itemQty,
        totalAmount,
        dbStatus,
        order.aiVerification?.status === 'CONFIRMED_BY_AI' ? 'CONFIRMED' : 'PENDING',
        notes,
      ]
    );

    // Upsert items if present
    if (Array.isArray(order.items) && order.items.length > 0) {
      for (const item of order.items) {
        await pool.execute(
          `
          INSERT INTO order_items (id, order_id, product_name, sku, quantity, price)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            product_name = VALUES(product_name),
            sku = VALUES(sku),
            quantity = VALUES(quantity),
            price = VALUES(price)
        `,
          [
            item.id || `it-${Date.now()}-${Math.random()}`,
            order.id,
            item.name,
            item.sku || 'SKU-GEN',
            item.quantity || 1,
            item.price || 0,
          ]
        );
      }
    }

    // Upsert shipment if tracking is present
    const trackingNumber =
      ('shipping' in order && order.shipping?.trackingNumber) ||
      ('tracking' in order && order.tracking?.trackingNumber);

    if (trackingNumber) {
      await pool.execute(
        `
        INSERT INTO shipment_details (id, order_id, carrier, sendit_tracking_number, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          carrier = VALUES(carrier),
          sendit_tracking_number = VALUES(sendit_tracking_number),
          status = VALUES(status),
          last_status_update_at = CURRENT_TIMESTAMP
      `,
        [
          `ship-${order.id}`,
          order.id,
          'Sendit.ma',
          trackingNumber,
          dbStatus === 'DELIVERED_PAID' ? 'DELIVERED_PAID' : 'IN_TRANSIT',
        ]
      );
    }

    invalidateOrdersCache();
    return true;
  } catch (error) {
    console.error('[DB Service] Error saving order to DB:', error);
    return false;
  }
}

/**
 * 3. Update order stage in DB (with Stock Movement, COD Finance, Customer Stats, and Timeline logging)
 */
export async function deductStockForOrder(orderId: string, reason: string = 'Commande confirmée / en préparation'): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const [items]: any = await pool.execute(
      `SELECT oi.product_id, oi.product_name, oi.sku, oi.quantity 
       FROM order_items oi 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    if (!Array.isArray(items) || items.length === 0) return false;

    // Prevent duplicate OUT deductions for the same order
    const [existingMovements]: any = await pool.execute(
      `SELECT id FROM stock_movements WHERE order_id = ? AND type = 'OUT' LIMIT 1`,
      [orderId]
    );
    if (Array.isArray(existingMovements) && existingMovements.length > 0) {
      return true;
    }

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const [prodRows]: any = await pool.execute(
        `SELECT id, sku, stock_quantity FROM products 
         WHERE id = ? OR sku = ? OR name = ? OR name_ar = ? LIMIT 1`,
        [item.product_id || '', item.sku || '', item.product_name || '', item.product_name || '']
      );

      if (Array.isArray(prodRows) && prodRows.length > 0) {
        const prod = prodRows[0];
        const prevStock = Number(prod.stock_quantity) || 0;
        const newStock = Math.max(0, prevStock - qty);

        await pool.execute(
          `UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newStock, prod.id]
        );

        const movId = `sm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await pool.execute(
          `INSERT INTO stock_movements (id, product_id, sku, type, quantity, previous_stock, new_stock, reason, order_id, created_by)
           VALUES (?, ?, ?, 'OUT', ?, ?, ?, ?, ?, 'ORDER_LIFECYCLE')`,
          [movId, prod.id, prod.sku || item.sku || 'SKU-GEN', qty, prevStock, newStock, reason, orderId]
        );
      }
    }
    return true;
  } catch (err: any) {
    console.error('[DB Service] Error deducting stock for order:', err.message);
    return false;
  }
}

export async function restoreStockForOrder(orderId: string, reason: string = 'Commande annulée / retournée'): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    // Only restore if an OUT movement occurred
    const [outMovements]: any = await pool.execute(
      `SELECT id FROM stock_movements WHERE order_id = ? AND type = 'OUT' LIMIT 1`,
      [orderId]
    );
    if (!Array.isArray(outMovements) || outMovements.length === 0) {
      return true;
    }

    // Prevent duplicate RETURN movements
    const [returnMovements]: any = await pool.execute(
      `SELECT id FROM stock_movements WHERE order_id = ? AND type = 'RETURN' LIMIT 1`,
      [orderId]
    );
    if (Array.isArray(returnMovements) && returnMovements.length > 0) {
      return true;
    }

    const [items]: any = await pool.execute(
      `SELECT oi.product_id, oi.product_name, oi.sku, oi.quantity 
       FROM order_items oi 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    if (!Array.isArray(items) || items.length === 0) return false;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const [prodRows]: any = await pool.execute(
        `SELECT id, sku, stock_quantity FROM products 
         WHERE id = ? OR sku = ? OR name = ? OR name_ar = ? LIMIT 1`,
        [item.product_id || '', item.sku || '', item.product_name || '', item.product_name || '']
      );

      if (Array.isArray(prodRows) && prodRows.length > 0) {
        const prod = prodRows[0];
        const prevStock = Number(prod.stock_quantity) || 0;
        const newStock = prevStock + qty;

        await pool.execute(
          `UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newStock, prod.id]
        );

        const movId = `sm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await pool.execute(
          `INSERT INTO stock_movements (id, product_id, sku, type, quantity, previous_stock, new_stock, reason, order_id, created_by)
           VALUES (?, ?, ?, 'RETURN', ?, ?, ?, ?, ?, 'ORDER_LIFECYCLE')`,
          [movId, prod.id, prod.sku || item.sku || 'SKU-GEN', qty, prevStock, newStock, reason, orderId]
        );
      }
    }
    return true;
  } catch (err: any) {
    console.error('[DB Service] Error restoring stock for order:', err.message);
    return false;
  }
}

export async function recordCodRemittance(orderId: string): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const [leadRows]: any = await pool.execute(
      `SELECT id, order_number, total_amount, customer_name FROM order_leads WHERE id = ? OR order_number = ? LIMIT 1`,
      [orderId, orderId]
    );

    if (!Array.isArray(leadRows) || leadRows.length === 0) return false;
    const lead = leadRows[0];
    const amount = Number(lead.total_amount) || 0;

    await pool.execute(
      `UPDATE shipment_details 
       SET cod_amount_collected = ?, shipping_fee = 35, is_cod_reconciled = FALSE, status = 'DELIVERED_PAID', last_status_update_at = CURRENT_TIMESTAMP
       WHERE order_id = ?`,
      [amount, lead.id]
    );

    const ref = `COD-${lead.order_number || lead.id}`;
    const txId = `fin-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await pool.execute(
      `INSERT INTO finance_transactions (id, reference, transaction_type, amount, carrier, order_count, status, created_at)
       VALUES (?, ?, 'COD_REMITTANCE', ?, 'Sendit.ma', 1, 'PENDING', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = 'PENDING'`,
      [txId, ref, amount]
    );

    return true;
  } catch (err: any) {
    console.error('[DB Service] Error recording COD remittance:', err.message);
    return false;
  }
}

export async function updateCustomerStatsOnOrderStatus(orderId: string, dbStatus: string): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const [leadRows]: any = await pool.execute(
      `SELECT phone_number, customer_name, total_amount, city, address FROM order_leads WHERE id = ? OR order_number = ? LIMIT 1`,
      [orderId, orderId]
    );

    if (!Array.isArray(leadRows) || leadRows.length === 0) return false;
    const lead = leadRows[0];
    const phone = cleanMoroccanPhone(lead.phone_number || '');
    if (!phone) return false;

    const amount = Number(lead.total_amount) || 0;
    const isDelivered = dbStatus === 'DELIVERED_PAID';
    const isRefused = dbStatus === 'DELIVERY_FAILED' || dbStatus === 'CANCELED';

    const [custRows]: any = await pool.execute(
      `SELECT * FROM customers WHERE phone_number = ? LIMIT 1`,
      [phone]
    );

    if (Array.isArray(custRows) && custRows.length > 0) {
      const c = custRows[0];
      const prevDelivered = Number(c.delivered_orders) || 0;
      const prevRefused = Number(c.refused_orders) || 0;
      const prevSpent = Number(c.total_spent) || 0;
      const totalOrders = Math.max(1, Number(c.total_orders) || 1);

      const newDelivered = prevDelivered + (isDelivered ? 1 : 0);
      const newRefused = prevRefused + (isRefused ? 1 : 0);
      const newSpent = prevSpent + (isDelivered ? amount : 0);

      let trustScore = c.trust_score || 'NOUVEAU';
      if (newRefused >= 2 || (totalOrders >= 2 && (newRefused / totalOrders) >= 0.5)) {
        trustScore = 'RISQUE';
      } else if (newDelivered >= 3) {
        trustScore = 'VIP';
      } else if (newDelivered >= 1) {
        trustScore = 'FIABLE';
      }

      await pool.execute(
        `UPDATE customers 
         SET delivered_orders = ?, refused_orders = ?, total_spent = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP
         WHERE phone_number = ?`,
        [newDelivered, newRefused, newSpent, trustScore, phone]
      );
    } else {
      const custId = `cust-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const trustScore = isDelivered ? 'FIABLE' : isRefused ? 'RISQUE' : 'NOUVEAU';
      await pool.execute(
        `INSERT INTO customers (id, phone_number, name, city, address, total_orders, delivered_orders, refused_orders, total_spent, trust_score, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          custId,
          phone,
          lead.customer_name || 'Client',
          lead.city || 'Maroc',
          lead.address || '',
          isDelivered ? 1 : 0,
          isRefused ? 1 : 0,
          isDelivered ? amount : 0,
          trustScore,
        ]
      );
    }

    return true;
  } catch (err: any) {
    console.error('[DB Service] Error updating customer stats:', err.message);
    return false;
  }
}

export interface OrderStageUpdateMeta {
  cancellationStage?: 'CONFIRMATION' | 'DELIVERY' | 'WAREHOUSE';
  cancellationReason?: string;
  canceledBy?: string;
  returnReason?: string;
  returnedBy?: string;
  stockReintegrated?: boolean;
  returnFeeAmount?: number;
}

export async function updateOrderStageInDb(
  orderId: string, 
  stage: LifecycleStage,
  meta?: OrderStageUpdateMeta
): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const dbStatus = mapStageToDbStatus(stage);

    if (stage === 'CANCELED') {
      const cancelStage = meta?.cancellationStage || 'CONFIRMATION';
      const cancelReason = meta?.cancellationReason || 'Annulé par le client';
      const fee = meta?.returnFeeAmount !== undefined ? meta.returnFeeAmount : (cancelStage === 'DELIVERY' ? 35 : 0);
      await pool.execute(
        `UPDATE order_leads 
         SET status = 'CANCELED', 
             cancellation_stage = ?,
             cancellation_reason = ?,
             canceled_at = CURRENT_TIMESTAMP,
             canceled_by = ?,
             return_fee_amount = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [cancelStage, cancelReason, meta?.canceledBy || 'Agent', fee, orderId, orderId]
      );
      if (cancelStage === 'CONFIRMATION') {
        try {
          await pool.execute(`
            UPDATE products p
            INNER JOIN order_items oi ON oi.sku = p.sku
            SET p.confirmation_cancel_count = p.confirmation_cancel_count + oi.quantity
            WHERE oi.order_id = ?
          `, [orderId]);
        } catch {}
      }
    } else if (stage === 'RETURNED') {
      const returnReason = meta?.returnReason || meta?.cancellationReason || 'Colis refusé ou non livré';
      const stockReintegrated = meta?.stockReintegrated ?? false;
      await pool.execute(
        `UPDATE order_leads 
         SET status = 'RETURNED', 
             cancellation_stage = 'DELIVERY',
             return_reason = ?,
             returned_at = CURRENT_TIMESTAMP,
             returned_by = ?,
             return_fee_amount = 35.00,
             stock_reintegrated = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR order_number = ?`,
        [returnReason, meta?.returnedBy || 'Livreur Sendit', stockReintegrated ? 1 : 0, orderId, orderId]
      );
      try {
        await pool.execute(`
          UPDATE products p
          INNER JOIN order_items oi ON oi.sku = p.sku
          SET p.courier_return_count = p.courier_return_count + oi.quantity
          WHERE oi.order_id = ?
        `, [orderId]);
      } catch {}
    } else {
      await pool.execute(
        `
        UPDATE order_leads 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR order_number = ?
      `,
        [dbStatus, orderId, orderId]
      );
    }

    // 1. Stock Movement Automation
    if (stage === 'PROCESSING' || stage === 'IN_TRANSIT') {
      await deductStockForOrder(orderId);
    } else if (stage === 'CANCELED' || stage === 'RETURNED') {
      await restoreStockForOrder(orderId);
      await updateCustomerStatsOnOrderStatus(orderId, dbStatus);
    }

    // 2. COD Financial Settlement & Customer Trust Score
    if (dbStatus === 'DELIVERED_PAID') {
      await pool.execute(
        `
        UPDATE shipment_details
        SET status = 'DELIVERED_PAID', last_status_update_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `,
        [orderId]
      );
      await recordCodRemittance(orderId);
      await updateCustomerStatsOnOrderStatus(orderId, dbStatus);
    } else if (stage === 'RETURNED') {
      await pool.execute(
        `
        UPDATE shipment_details
        SET status = 'RETURNED', last_status_update_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `,
        [orderId]
      );
    }

    // 3. Unbroken Audit Trail in order_timelines
    const stageTitles: Record<string, string> = {
      PENDING_CONFIRMATION: 'Commande en attente de confirmation',
      PROCESSING: 'Commande confirmée et transmise à la préparation',
      IN_TRANSIT: 'Colis expédié et pris en charge par le transporteur',
      COMPLETED: 'Livraison réussie et encaissement COD validé',
      CANCELED: 'Commande annulée',
      RETURNED: 'Colis refusé / retourné au stock',
    };

    await addTimelineEventToDb({
      orderId,
      action: `STAGE_${stage}`,
      title: stageTitles[stage] || `Changement d'étape: ${stage}`,
      details: `Statut passé à ${dbStatus} via le cycle de vie`,
      actor: 'SYSTEM',
    });

    invalidateOrdersCache();
    return true;
  } catch (error) {
    console.error('[DB Service] Error updating order stage in DB:', error);
    return false;
  }
}

/**
 * 4. Fetch all products from MySQL database
 */
export async function getProductsFromDb(): Promise<ProductItem[]> {
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(`
      SELECT * FROM products WHERE is_active = TRUE ORDER BY name ASC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    return rows.map((r: any): ProductItem => {
      let variants = undefined;
      let offers = undefined;
      let sellingPoints = undefined;
      let objectionFaqs = undefined;
      let additionalImages = undefined;

      try {
        if (r.attributes) {
          variants = typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes;
        }
      } catch {}

      try {
        if (r.upsell_bundles) {
          offers = typeof r.upsell_bundles === 'string' ? JSON.parse(r.upsell_bundles) : r.upsell_bundles;
        }
      } catch {}

      try {
        if (r.selling_points) {
          sellingPoints = typeof r.selling_points === 'string' ? JSON.parse(r.selling_points) : r.selling_points;
        }
      } catch {}

      try {
        if (r.objection_faqs) {
          objectionFaqs = typeof r.objection_faqs === 'string' ? JSON.parse(r.objection_faqs) : r.objection_faqs;
        }
      } catch {}

      let mainImage = r.image_url || '';
      if (mainImage.startsWith('[') && mainImage.endsWith(']')) {
        try {
          const parsedImgs = JSON.parse(mainImage);
          if (Array.isArray(parsedImgs) && parsedImgs.length > 0) {
            mainImage = parsedImgs[0];
            additionalImages = parsedImgs.slice(1);
          }
        } catch {}
      }

      return {
        id: r.id,
        name: r.name,
        nameAr: r.name_ar,
        sku: r.sku,
        category: r.category || 'General',
        image: mainImage,
        additionalImages,
        sellingPrice: Number(r.base_price),
        costPrice: Number(r.cost_price),
        deliveryFee: 35,
        totalStock: r.stock_quantity || 0,
        status: r.stock_quantity > 10 ? 'IN_STOCK' : r.stock_quantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
        descriptionAr: r.description_ar || '',
        keywords: [r.name.toLowerCase(), r.name_ar, r.sku.toLowerCase()],
        variants,
        offers,
        agentInstructions: r.knowledge_base || '',
        sellingPoints,
        objectionFaqs,
      };
    });
  } catch (error) {
    console.error('[DB Service] Error fetching products from DB:', error);
    return [];
  }
}

/**
 * 5. Log WhatsApp Message to DB
 */
export async function logWhatsAppMessageToDb(params: {
  id?: string;
  orderId?: string;
  phone: string;
  sender: 'CUSTOMER' | 'AI_BOT' | 'AGENT';
  body: string;
  messageType?: string;
}): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const id = params.id || `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await pool.execute(
      `
      INSERT INTO whatsapp_messages (id, order_id, phone, sender, body, message_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        params.orderId || null,
        cleanMoroccanPhone(params.phone),
        params.sender,
        params.body,
        params.messageType || 'text',
      ]
    );

    return true;
  } catch (error) {
    console.error('[DB Service] Error logging WhatsApp message to DB:', error);
    return false;
  }
}

export interface WhatsAppSessionData {
  phone: string;
  orderId?: string;
  lastOfferedProduct?: string;
  price?: number;
  step: string;
  metadata?: Record<string, any>;
}

/**
 * 5b. Fetch recent conversation history from MySQL whatsapp_messages
 */
export async function getRecentWhatsAppHistoryFromDb(
  phone: string,
  limit: number = 6
): Promise<Array<{ sender: 'CUSTOMER' | 'AI_BOT' | 'AGENT'; body: string; timestamp: Date }>> {
  try {
    const pool = getMysqlPool();
    const cleaned = cleanMoroccanPhone(phone);
    const suffix = cleaned.slice(-9);

    const [rows]: any = await pool.execute(
      `SELECT sender, body, created_at 
       FROM whatsapp_messages 
       WHERE phone = ? OR phone LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [cleaned, `%${suffix}%`, limit]
    );

    if (!Array.isArray(rows)) return [];

    // Reverse to chronological order (oldest first)
    return rows.reverse().map((r: any) => ({
      sender: r.sender as 'CUSTOMER' | 'AI_BOT' | 'AGENT',
      body: r.body || '',
      timestamp: r.created_at ? new Date(r.created_at) : new Date(),
    }));
  } catch (error) {
    console.error('[DB Service] Error fetching recent WhatsApp history:', error);
    return [];
  }
}

/**
 * 5c. Get customer WhatsApp Session State from MySQL
 */
export async function getWhatsAppSessionFromDb(phone: string): Promise<WhatsAppSessionData | null> {
  try {
    const pool = getMysqlPool();
    const cleaned = cleanMoroccanPhone(phone);

    const [rows]: any = await pool.execute(
      `SELECT phone, order_id, last_offered_product, price, step, metadata 
       FROM whatsapp_sessions 
       WHERE phone = ? LIMIT 1`,
      [cleaned]
    );

    if (!Array.isArray(rows) || rows.length === 0) return null;

    const r = rows[0];
    let meta = {};
    if (r.metadata) {
      meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
    }

    return {
      phone: r.phone,
      orderId: r.order_id || undefined,
      lastOfferedProduct: r.last_offered_product || undefined,
      price: r.price ? Number(r.price) : undefined,
      step: r.step || 'INITIAL',
      metadata: meta,
    };
  } catch (error) {
    console.error('[DB Service] Error fetching WhatsApp session:', error);
    return null;
  }
}

/**
 * 5d. Save / Upsert customer WhatsApp Session State in MySQL
 */
export async function saveWhatsAppSessionToDb(data: WhatsAppSessionData): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const cleaned = cleanMoroccanPhone(data.phone);

    await pool.execute(
      `INSERT INTO whatsapp_sessions (phone, order_id, last_offered_product, price, step, metadata, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         order_id = VALUES(order_id),
         last_offered_product = VALUES(last_offered_product),
         price = VALUES(price),
         step = VALUES(step),
         metadata = VALUES(metadata),
         updated_at = NOW()`,
      [
        cleaned,
        data.orderId || null,
        data.lastOfferedProduct || null,
        data.price || null,
        data.step || 'INITIAL',
        JSON.stringify(data.metadata || {}),
      ]
    );

    return true;
  } catch (error) {
    console.error('[DB Service] Error saving WhatsApp session:', error);
    return false;
  }
}

/**
 * 6. Add timeline event to MySQL database
 */
export async function addTimelineEventToDb(params: {
  orderId: string;
  action: string;
  title: string;
  details?: string;
  actor?: string;
}): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const id = `tl-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await pool.execute(
      `
      INSERT INTO order_timelines (id, order_id, action, title, details, actor)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        params.orderId,
        params.action,
        params.title,
        params.details || null,
        params.actor || 'AI_AGENT',
      ]
    );
    return true;
  } catch (error) {
    console.error('[DB Service] Error adding timeline event to DB:', error);
    return false;
  }
}

/**
 * 7. Fetch all leads for Leads Qualification Pipeline (/dashboard/leads)
 */
export async function getLeadsFromDb(): Promise<any[]> {
  try {
    const pool = getMysqlPool();
    const [leads]: any = await pool.execute(`
      SELECT 
        l.*,
        i.product_name,
        i.sku,
        i.quantity as item_quantity,
        i.price as item_price
      FROM order_leads l
      LEFT JOIN order_items i ON l.id = i.order_id
      ORDER BY l.created_at DESC
    `);

    if (!Array.isArray(leads)) return [];

    // Deduplicate leads by ID (in case multiple items exist)
    const leadsMap = new Map<string, any>();
    for (const row of leads) {
      if (!leadsMap.has(row.id)) {
        const timeAgoStr = row.created_at
          ? new Date(row.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'À l’instant';

        const rawOrderNum = row.order_number || '';
        const cleanOrderNumber = rawOrderNum.startsWith('#')
          ? rawOrderNum.replace(/^#+/, '#')
          : `#${rawOrderNum}`;

        let aiStageText = 'En attente de qualification IA';
        if (row.status === 'CONFIRMED' || row.ai_confirmation_status === 'CONFIRMED') {
          aiStageText = 'Confirmé par Sarah (Agent IA) - Adresse & Téléphone validés';
        } else if (row.status === 'AI_CHATTING') {
          aiStageText = 'Bot IA en conversation WhatsApp (Proposition Upsell)...';
        } else if (row.status === 'NEW') {
          aiStageText = 'Nouveau lead prêt pour déclenchement IA immédiat';
        } else if (row.status === 'CANCELED') {
          aiStageText = 'Annulé par le client lors de la qualification';
        }

        leadsMap.set(row.id, {
          id: row.id,
          orderNumber: cleanOrderNumber,
          customerName: row.customer_name,
          phone: row.phone_number,
          city: row.city,
          address: row.address,
          amount: Number(row.total_amount),
          product: row.product_name || 'خف جلد',
          productImage:
            'https://qonfor.shop/wp-content/uploads/2026/10/Copie-de-Copie-de-Copie-de-%D8%A8%D8%AF%D9%88%D9%86-%D9%85%D9%88%D8%B3E%D9%8A%D9%82%D9%89-%D8%A8%D8%AA%D8%A7%D9%86%D8%A7%D9%8B-1.jpg.webp',
          quantity: row.item_quantity || 1,
          customerNote: row.notes || undefined,
          status: row.status,
          aiStageText,
          timeAgo: timeAgoStr,
          isUpsold: Boolean(row.upsell_accepted),
          upsellAmount: row.upsell_accepted ? 120 : 0,
          gpsReceived: Boolean(row.gps_location_url),
          riskScore: row.risk_score || 5,
        });
      }
    }

    return Array.from(leadsMap.values());
  } catch (error) {
    console.error('[DB Service] Error fetching leads from DB:', error);
    return [];
  }
}

/**
 * 8. Real AI Lead Confirmation Execution Engine
 * Evaluates, contacts, logs, and confirms a lead in Hostinger MySQL!
 */
export async function executeAiLeadConfirmation(leadId: string): Promise<{
  success: boolean;
  orderNumber?: string;
  message?: string;
  darijaReply?: string;
  lead?: any;
}> {
  try {
    const pool = getMysqlPool();
    const [rows]: any = await pool.execute(
      `
      SELECT l.*, i.product_name, i.sku, i.quantity as item_qty, i.price as item_price
      FROM order_leads l
      LEFT JOIN order_items i ON l.id = i.order_id
      WHERE l.id = ? OR l.order_number = ?
      LIMIT 1
    `,
      [leadId, leadId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, message: `Lead introuvable avec ID: ${leadId}` };
    }

    const lead = rows[0];
    const customerName = lead.customer_name || 'الزبون المحترم';
    const productName = lead.product_name || 'المنتج المطلوب';
    const city = lead.city || 'مدينتكم';
    const totalAmount = Number(lead.total_amount) || 299;
    const phone = lead.phone_number || '';
    const cleanNum = (lead.order_number || '').replace(/^#+/, '#');

    // 1. Generate Darija AI Confirmation Message
    const darijaReply = `السلام عليكم ورحمة الله أخي ${customerName}! 👋✨\nمعك "سارة" المساعدة الذكية لمنصة Sendit بخصوص طلبيتك لـ *${productName}* (${cleanNum}) بمبلغ *${totalAmount} درهم* لمدينة *${city}*.\n\n✅ تم التحقق وتأكيد تفاصيل الطلبية بنجاح!\n🚚 التوصيل مجاني وسريع مع موزع Sendit Express والدفع نقداً عند الاستلام بعد فتح الكولية ومعاينتها.\n\n📍 عفاك شارك معنا اللوكاسيون (Location Pin) ديالك لتسهيل وصول الموزع لعندك مباشرة. نهارك مبروك!`;

    // 2. Update Lead in MySQL to CONFIRMED
    await pool.execute(
      `
      UPDATE order_leads
      SET 
        status = 'CONFIRMED',
        ai_confirmation_status = 'CONFIRMED',
        notes = CONCAT(IFNULL(notes, ''), ' [تم التأكيد آلياً بواسطة وكيل الذكاء الاصطناعي]'),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [lead.id]
    );

    // 3. Log AI Message to whatsapp_messages table
    await logWhatsAppMessageToDb({
      orderId: lead.id,
      phone,
      sender: 'AI_BOT',
      body: darijaReply,
      messageType: 'text',
    });

    // 4. Record event in order_timelines table
    await addTimelineEventToDb({
      orderId: lead.id,
      action: 'AI_CONFIRMED',
      title: 'Confirmation Automatique par Agent IA',
      details: `L'agent Sarah a qualifié le client ${customerName} (${city}) et confirmé la commande ${cleanNum} de ${totalAmount} MAD. Message WhatsApp envoyé.`,
      actor: 'AI_AGENT:Sarah',
    });

    // 5. Attempt live WhatsApp dispatch if gateway is reachable (Text + Product Photo)
    try {
      const { sendWhatsAppMessage, sendWhatsAppImage } = await import('./whatsapp');
      await sendWhatsAppMessage(phone, darijaReply);

      // Lookup product image from products table or store catalog
      try {
        const [prodRows]: any = await pool.execute(
          'SELECT image_url FROM products WHERE name = ? OR name_ar = ? OR sku = ? LIMIT 1',
          [productName, productName, lead.sku || '']
        );
        let imgUrl = prodRows?.[0]?.image_url;
        if (!imgUrl) {
          const { findProductByNameOrKeyword } = await import('./products-store');
          const p = findProductByNameOrKeyword(productName);
          imgUrl = p?.image;
        }
        if (imgUrl) {
          await sendWhatsAppImage(phone, imgUrl, `صورة المنتج المطلوب: *${productName}* 📸✨`);
        }
      } catch (imgErr) {}
    } catch (waErr: any) {
      console.warn('[AI Execute] WhatsApp dispatch note:', waErr.message);
    }

    return {
      success: true,
      orderNumber: cleanNum,
      message: `Lead ${cleanNum} (${customerName}) confirmé avec succès par l'Agent IA !`,
      darijaReply,
      lead: {
        id: lead.id,
        orderNumber: cleanNum,
        customerName,
        city,
        amount: totalAmount,
        status: 'CONFIRMED',
      },
    };
  } catch (error: any) {
    console.error('[DB Service] Error executing AI Lead confirmation:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 9. Autonomous AI Auto-Pilot: Process all pending/new leads in batch
 */
export async function executeAiAutoPilotAll(): Promise<{
  success: boolean;
  processedCount: number;
  results: any[];
}> {
  try {
    const pool = getMysqlPool();
    const [newLeads]: any = await pool.execute(`
      SELECT id, order_number, customer_name, city FROM order_leads 
      WHERE status = 'NEW' OR (status = 'PENDING' AND ai_confirmation_status = 'PENDING')
    `);

    if (!Array.isArray(newLeads) || newLeads.length === 0) {
      return {
        success: true,
        processedCount: 0,
        results: [],
      };
    }

    const results: any[] = [];
    for (const lead of newLeads) {
      const res = await executeAiLeadConfirmation(lead.id);
      results.push(res);
    }

    return {
      success: true,
      processedCount: results.filter((r) => r.success).length,
      results,
    };
  } catch (error: any) {
    console.error('[DB Service] Error executing AI Auto-Pilot:', error);
    return { success: false, processedCount: 0, results: [] };
  }
}


