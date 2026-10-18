import { getMysqlPool } from './db';
import { getProducts } from './products-store';
import { getInboundOrders } from './orders-store';

/**
 * SQL DDL Statements to create comprehensive MySQL schema for SENDIT COD platform on Hostinger
 */
export const CREATE_TABLES_SQL = [
  // 1. Users table (Admins, Confirmation Agents, Packers, Delivery Tracking staff)
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CONFIRMATION_AGENT', 'PACKER', 'TRACKING_AGENT') DEFAULT 'CONFIRMATION_AGENT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. Products table (COD catalog with specs and AI Knowledge Base)
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    category VARCHAR(100) DEFAULT 'General',
    image_url TEXT,
    attributes JSON,
    description_ar TEXT,
    knowledge_base TEXT,
    selling_points JSON,
    objection_faqs JSON,
    upsell_bundles JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Order Leads table (Full Moroccan COD Order Lifecycle)
  `CREATE TABLE IF NOT EXISTS order_leads (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    alt_phone_number VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    gps_location_url TEXT,
    preferred_delivery_time VARCHAR(100),
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('NEW', 'AI_CHATTING', 'CONFIRMED', 'PACKING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_PAID', 'DELIVERY_FAILED', 'CANCELED', 'DUPLICATE') DEFAULT 'NEW',
    risk_score INT DEFAULT 0,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'BLACK_LISTED') DEFAULT 'LOW',
    ai_confirmation_status VARCHAR(50) DEFAULT 'PENDING',
    upsell_offered BOOLEAN DEFAULT FALSE,
    upsell_accepted BOOLEAN DEFAULT FALSE,
    upsell_details JSON,
    rescue_status ENUM('NONE', 'NEEDS_ATTENTION', 'OUTREACH_SENT', 'RESCHEDULED', 'ADDRESS_UPDATED', 'ESCALATED', 'RETURN_CONFIRMED') DEFAULT 'NONE',
    rescue_notes TEXT,
    review_rating INT,
    review_comment TEXT,
    review_tags JSON,
    ai_conversation_enabled BOOLEAN DEFAULT TRUE,
    ai_handover_required BOOLEAN DEFAULT FALSE,
    ai_handover_reason VARCHAR(255),
    assigned_to_agent_id VARCHAR(36),
    store_source VARCHAR(100) DEFAULT 'Direct Funnel',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone_number),
    INDEX idx_status (status),
    INDEX idx_city (city),
    INDEX idx_rescue (rescue_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. Order Items table
  `CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    selected_attributes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. Shipment Details table (Sendit.ma Logistics & Tracking Integration)
  `CREATE TABLE IF NOT EXISTS shipment_details (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) UNIQUE NOT NULL,
    carrier VARCHAR(100) DEFAULT 'Sendit.ma',
    sendit_tracking_number VARCHAR(100) UNIQUE,
    sendit_pickup_id VARCHAR(100),
    status ENUM('READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_PAID', 'DELIVERY_FAILED', 'RETURNED') DEFAULT 'READY_FOR_PICKUP',
    waybill_url TEXT,
    shipping_fee DECIMAL(10, 2) DEFAULT 35.00,
    cod_amount_collected DECIMAL(10, 2) DEFAULT 0.00,
    is_cod_reconciled BOOLEAN DEFAULT FALSE,
    cod_payout_reference VARCHAR(100),
    failed_reason VARCHAR(255),
    failure_category VARCHAR(100),
    delivery_attempts_count INT DEFAULT 0,
    rescue_attempt_count INT DEFAULT 0,
    last_rescue_outreach_at TIMESTAMP NULL,
    last_status_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatch_notice_sent BOOLEAN DEFAULT FALSE,
    dispatch_notice_sent_at TIMESTAMP NULL,
    morning_reminder_sent BOOLEAN DEFAULT FALSE,
    morning_reminder_sent_at TIMESTAMP NULL,
    review_prompt_sent BOOLEAN DEFAULT FALSE,
    review_prompt_sent_at TIMESTAMP NULL,
    delivery_proof_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tracking (sendit_tracking_number),
    INDEX idx_ship_status (status),
    CONSTRAINT fk_shipment_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. WhatsApp Messages table (Omnichannel Chat History)
  `CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(36),
    phone VARCHAR(50) NOT NULL,
    sender ENUM('CUSTOMER', 'AI_BOT', 'AGENT') NOT NULL,
    body TEXT NOT NULL,
    audio_transcribed_text TEXT,
    audio_url TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    interactive_type VARCHAR(50) DEFAULT 'TEXT',
    button_payload VARCHAR(100),
    quick_reply_options JSON,
    media_url TEXT,
    external_message_id VARCHAR(255),
    delivery_status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_order (order_id),
    INDEX idx_msg_phone (phone)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. Call Logs table (Call Center & Manual Confirmations)
  `CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    result ENUM('NO_ANSWER_1', 'NO_ANSWER_2', 'OUT_OF_COVERAGE', 'CALLBACK_REQUESTED', 'BUSY', 'CONFIRMED_MANUALLY', 'CANCELED_BY_CLIENT') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_call_order (order_id),
    CONSTRAINT fk_call_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 8. Order Timelines table (Audit Log)
  `CREATE TABLE IF NOT EXISTS order_timelines (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    details TEXT,
    actor VARCHAR(100) DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timeline_order (order_id),
    CONSTRAINT fk_timeline_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. Store Settings table (Key-Value Platform Configuration)
  `CREATE TABLE IF NOT EXISTS store_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. Google Sheets Sync Logs table
  `CREATE TABLE IF NOT EXISTS google_sheets_sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    spreadsheet_id VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    rows_synced INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

/**
 * Initializes and executes schema creation and seeding on Hostinger MySQL database
 */
export async function initializeDatabase() {
  const pool = getMysqlPool();
  const results: { table: string; status: 'created' | 'already_exists' | 'error'; error?: string }[] = [];

  const tableNames = [
    'users',
    'products',
    'order_leads',
    'order_items',
    'shipment_details',
    'whatsapp_messages',
    'call_logs',
    'order_timelines',
    'store_settings',
    'google_sheets_sync_logs',
  ];

  // 1. Create all tables sequentially
  for (let i = 0; i < CREATE_TABLES_SQL.length; i++) {
    const sql = CREATE_TABLES_SQL[i];
    const name = tableNames[i] || `table_${i}`;
    try {
      await pool.query(sql);
      results.push({ table: name, status: 'created' });
    } catch (err: any) {
      results.push({ table: name, status: 'error', error: err.message });
    }
  }

  // 2. Seed default admin user
  try {
    const [existingUsers]: any = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE email = ?', ['admin@sendit.ma']);
    if (existingUsers[0]?.cnt === 0) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'usr-admin-01',
          'Admin Principal Sendit',
          'admin@sendit.ma',
          '$2a$12$K8j7m9v9zX1Qp4u2w8e7Y.SenditCODHashSecure2026',
          'ADMIN',
          true,
        ]
      );
    }
  } catch (e: any) {
    console.warn('[DB Init] User seed note:', e.message);
  }

  // 3. Seed Product Catalog
  try {
    const products = getProducts();
    for (const p of products) {
      const [existing]: any = await pool.query('SELECT COUNT(*) as cnt FROM products WHERE sku = ?', [p.sku]);
      if (existing[0]?.cnt === 0) {
        await pool.query(
          `INSERT INTO products 
           (id, name, name_ar, sku, base_price, cost_price, stock_quantity, category, description_ar, knowledge_base, selling_points, objection_faqs, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.name,
            p.nameAr,
            p.sku,
            p.sellingPrice,
            p.costPrice,
            p.totalStock,
            p.category,
            p.descriptionAr,
            p.descriptionAr,
            JSON.stringify(p.keywords || []),
            JSON.stringify([]),
            p.status !== 'OUT_OF_STOCK',
          ]
        );
      }
    }
  } catch (e: any) {
    console.warn('[DB Init] Products seed note:', e.message);
  }

  // 4. Seed initial orders if empty
  try {
    const [ordersCount]: any = await pool.query('SELECT COUNT(*) as cnt FROM order_leads');
    if (ordersCount[0]?.cnt === 0) {
      const defaultOrders = getInboundOrders();
      for (const ord of defaultOrders) {
        await pool.query(
          `INSERT INTO order_leads 
           (id, order_number, customer_name, phone_number, city, address, gps_location_url, total_amount, status, risk_score, ai_confirmation_status, store_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ord.id,
            ord.orderNumber,
            ord.customer.name,
            ord.customer.phone,
            ord.customer.city,
            ord.customer.address,
            ord.gpsLocationUrl || null,
            ord.payment.amount,
            ord.stage === 'CONFIRMED' ? 'CONFIRMED' : 'NEW',
            ord.aiVerification?.riskScore ?? 0,
            ord.aiVerification?.status || 'PENDING',
            ord.source || 'Direct Funnel',
          ]
        );

        // Insert items
        for (const item of ord.items) {
          await pool.query(
            `INSERT INTO order_items (id, order_id, product_id, product_name, sku, quantity, price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              'item-' + Math.random().toString(36).slice(2, 9),
              ord.id,
              'prod-ref',
              item.name,
              item.sku,
              item.quantity,
              item.price,
            ]
          );
        }

        // Insert shipment detail
        if (ord.tracking?.trackingNumber) {
          await pool.query(
            `INSERT INTO shipment_details (id, order_id, carrier, sendit_tracking_number, status, shipping_fee, cod_amount_collected)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              'ship-' + ord.id,
              ord.id,
              ord.tracking.carrier || 'Sendit.ma',
              ord.tracking.trackingNumber,
              'IN_TRANSIT',
              35.00,
              ord.payment.amount,
            ]
          );
        }
      }
    }
  } catch (e: any) {
    console.warn('[DB Init] Orders seed note:', e.message);
  }

  // 5. Seed default store settings
  try {
    const defaultSettings = [
      { key: 'PLATFORM_NAME', value: 'SENDIT Morocco COD Management' },
      { key: 'DEFAULT_CARRIER', value: 'Sendit.ma' },
      { key: 'DEFAULT_SHIPPING_FEE', value: '35' },
      { key: 'COD_ONLY_MODE', value: 'true' },
      { key: 'AI_CONFIRMATION_AUTO_ENABLED', value: 'true' },
      { key: 'DATABASE_VERSION', value: '1.0.0-hostinger-mysql' },
    ];

    for (const s of defaultSettings) {
      await pool.query(
        `INSERT INTO store_settings (setting_key, setting_value) 
         VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        [s.key, s.value, s.value]
      );
    }
  } catch (e: any) {
    console.warn('[DB Init] Settings seed note:', e.message);
  }

  return {
    success: results.every((r) => r.status !== 'error'),
    tables: results,
  };
}

/**
 * Returns current status, table list, and row counts from Hostinger MySQL
 */
export async function getDatabaseStatus() {
  const pool = getMysqlPool();
  try {
    const [tables]: any = await pool.query(
      `SELECT table_name AS tableName, table_rows AS rowCount, data_length AS dataSize
       FROM information_schema.tables 
       WHERE table_schema = DATABASE()`
    );

    const [dbInfo]: any = await pool.query('SELECT DATABASE() as dbName, VERSION() as version');

    return {
      connected: true,
      database: dbInfo[0]?.dbName || 'u663560985_vC9mY',
      version: dbInfo[0]?.version,
      tablesCount: tables.length,
      tables: tables.map((t: any) => ({
        name: t.tableName,
        rows: t.rowCount || 0,
        sizeKb: Math.round((t.dataSize || 0) / 1024),
      })),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
      database: process.env.DB_NAME || 'u663560985_vC9mY',
    };
  }
}
