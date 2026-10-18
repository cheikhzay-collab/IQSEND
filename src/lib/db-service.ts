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
    default:
      return 'NEW';
  }
}

export function mapDbStatusToStage(status: string): LifecycleStage {
  switch (status) {
    case 'NEW':
    case 'AI_CHATTING':
      return 'PENDING_CONFIRMATION';
    case 'CONFIRMED':
    case 'PACKING':
      return 'PROCESSING';
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return 'IN_TRANSIT';
    case 'DELIVERED_PAID':
      return 'COMPLETED';
    case 'CANCELED':
    case 'DUPLICATE':
    case 'DELIVERY_FAILED':
      return 'CANCELED';
    default:
      return 'PENDING_CONFIRMATION';
  }
}

/**
 * 1. Fetch all orders from MySQL database (order_leads + order_items + shipment_details)
 */
export async function getOrdersFromDb(): Promise<LifecycleOrder[]> {
  try {
    const pool = getMysqlPool();

    // Fetch leads
    const [leads]: any = await pool.execute(`
      SELECT 
        l.*,
        s.carrier,
        s.sendit_tracking_number,
        s.status as shipment_status,
        s.waybill_url,
        s.delivery_proof_url
      FROM order_leads l
      LEFT JOIN shipment_details s ON l.id = s.order_id
      ORDER BY l.created_at DESC
    `);

    if (!Array.isArray(leads) || leads.length === 0) {
      return [];
    }

    // Fetch items for all leads
    const [items]: any = await pool.execute(`
      SELECT * FROM order_items
    `);

    const itemsByOrderId: Record<string, any[]> = {};
    if (Array.isArray(items)) {
      items.forEach((it) => {
        if (!itemsByOrderId[it.order_id]) {
          itemsByOrderId[it.order_id] = [];
        }
        itemsByOrderId[it.order_id].push(it);
      });
    }

    return leads.map((lead: any): LifecycleOrder => {
      const orderItems = itemsByOrderId[lead.id] || [];
      const stage = mapDbStatusToStage(lead.status);

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
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80',
          quantity: it.quantity,
          price: Number(it.price),
        })),
        payment: {
          method: 'COD',
          amount: Number(lead.total_amount),
          currency: 'MAD',
          status: lead.status === 'DELIVERED_PAID' ? 'COLLECTED' : 'PENDING',
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
              liveStatus: lead.shipment_status === 'DELIVERED_PAID' ? 'DELIVERED' : 'DISPATCHED',
              lastUpdated: 'À l’instant',
              deliveryAttempts: 1,
            }
          : undefined,
        completed:
          lead.status === 'DELIVERED_PAID'
            ? {
                deliveredAt: new Date(lead.updated_at).toLocaleDateString('fr-FR'),
                podType: 'CUSTOMER_SIGNATURE',
                settlementStatus: 'PAID_SETTLEMENT',
                reviewRequested: false,
              }
            : undefined,
      };
    });
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

    // Upsert into order_leads
    await pool.execute(
      `
      INSERT INTO order_leads (
        id, order_number, customer_name, phone_number, city, address, 
        total_amount, status, ai_confirmation_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        phone_number = VALUES(phone_number),
        city = VALUES(city),
        address = VALUES(address),
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

    return true;
  } catch (error) {
    console.error('[DB Service] Error saving order to DB:', error);
    return false;
  }
}

/**
 * 3. Update order stage in DB
 */
export async function updateOrderStageInDb(orderId: string, stage: LifecycleStage): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const dbStatus = mapStageToDbStatus(stage);

    await pool.execute(
      `
      UPDATE order_leads 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR order_number = ?
    `,
      [dbStatus, orderId, orderId]
    );

    // If marked delivered, update shipment_details
    if (dbStatus === 'DELIVERED_PAID') {
      await pool.execute(
        `
        UPDATE shipment_details
        SET status = 'DELIVERED_PAID', last_status_update_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `,
        [orderId]
      );
    }

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

      let mainImage = r.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
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
