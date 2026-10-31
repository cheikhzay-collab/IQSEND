import { getMysqlPool } from './db';
import { getProducts } from './products-store';
import { invalidateOrdersCache } from './db-service';
import { clearInboundOrders } from './orders-store';
import { clearInboxConversations } from './inbox-store';

/**
 * Complete and Comprehensive SQL DDL Statements for Hostinger Cloud MySQL
 * Covering all 20 modules of the SENDIT COD Platform.
 */
export const CREATE_TABLES_SQL = [
  // 1. Users table (Admins, Confirmation Agents, Warehouse Packers, Delivery Tracking staff, Call Center Agents)
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CONFIRMATION_AGENT', 'PACKER', 'TRACKING_AGENT', 'CALL_AGENT') DEFAULT 'CONFIRMATION_AGENT',
    phone VARCHAR(50),
    avatar_url TEXT,
    job_title VARCHAR(150) DEFAULT 'Agent SENDIT COD',
    avatar_preset VARCHAR(50) DEFAULT 'avatar-1',
    permissions JSON,
    is_online BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. Customers table (Dedicated customer profiles with trust scoring and delivery stats)
  `CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    alt_phone_number VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    whatsapp_caller_name VARCHAR(255),
    total_orders INT DEFAULT 1,
    delivered_orders INT DEFAULT 0,
    refused_orders INT DEFAULT 0,
    canceled_orders INT DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    trust_score ENUM('VIP', 'FIABLE', 'NOUVEAU', 'RISQUE', 'BLACKLIST') DEFAULT 'NOUVEAU',
    notes TEXT,
    last_contact_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cust_phone (phone_number),
    INDEX idx_cust_city (city),
    INDEX idx_cust_trust (trust_score)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Products table (Catalog with specs, Darija descriptions, and AI Knowledge Base)
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    stock_casablanca INT DEFAULT 0,
    stock_fes INT DEFAULT 0,
    stock_marrakech INT DEFAULT 0,
    total_stock INT DEFAULT 0,
    confirmation_cancel_count INT DEFAULT 0,
    courier_return_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    in_transit_count INT DEFAULT 0,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_prod_sku (sku),
    INDEX idx_prod_cat (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. Product Variants table (Sizes, Colors, Barcodes)
  `CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    attributes JSON,
    price_extra DECIMAL(10, 2) DEFAULT 0.00,
    stock_quantity INT DEFAULT 0,
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_var_sku (sku),
    INDEX idx_var_prod (product_id),
    CONSTRAINT fk_var_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. Stock Movements table (Inventory Audit Trail: IN, OUT, RETURN, DAMAGE, ADJUSTMENT)
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    type ENUM('IN', 'OUT', 'RETURN', 'DAMAGE', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(255),
    order_id VARCHAR(36),
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_prod (product_id),
    INDEX idx_stock_type (type),
    CONSTRAINT fk_stock_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. Order Leads table (Full Moroccan COD Lifecycle)
  `CREATE TABLE IF NOT EXISTS order_leads (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(36),
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    alt_phone_number VARCHAR(50),
    whatsapp_caller_name VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    district_id VARCHAR(100),
    district_name VARCHAR(100),
    address TEXT NOT NULL,
    gps_location_url TEXT,
    preferred_delivery_time VARCHAR(100),
    sku VARCHAR(100),
    product_name VARCHAR(255),
    quantity INT DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    sendit_delivery_fee DECIMAL(10, 2) DEFAULT 35.00,
    status ENUM('NEW', 'AI_CHATTING', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_PAID', 'DELIVERY_FAILED', 'RETURNED', 'CANCELED', 'DUPLICATE') DEFAULT 'NEW',
    cancellation_stage ENUM('CONFIRMATION', 'DELIVERY', 'WAREHOUSE'),
    cancellation_reason VARCHAR(255),
    canceled_at TIMESTAMP NULL,
    canceled_by VARCHAR(100),
    return_reason VARCHAR(255),
    returned_at TIMESTAMP NULL,
    returned_by VARCHAR(100),
    stock_reintegrated BOOLEAN DEFAULT FALSE,
    return_fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    confirmed_by VARCHAR(100),
    confirmed_at TIMESTAMP NULL,
    awb_code VARCHAR(100),
    tracking_number VARCHAR(100),
    sheet_row_id VARCHAR(100),
    external_order_id VARCHAR(100),
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
    INDEX idx_rescue (rescue_status),
    INDEX idx_created_at (created_at),
    INDEX idx_cancellation_stage (cancellation_stage),
    INDEX idx_sheet_row (sheet_row_id),
    INDEX idx_awb (awb_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. Order Items table
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

  // 8. Shipment Details table (Sendit.ma Logistics & Tracking)
  `CREATE TABLE IF NOT EXISTS shipment_details (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) UNIQUE NOT NULL,
    carrier VARCHAR(100) DEFAULT 'Sendit.ma',
    sendit_tracking_number VARCHAR(100) UNIQUE,
    awb_code VARCHAR(100),
    district_id VARCHAR(100),
    district_name VARCHAR(100),
    hub_city VARCHAR(100) DEFAULT 'Casablanca',
    sendit_pickup_id VARCHAR(100),
    status ENUM('READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_PAID', 'DELIVERY_FAILED', 'RETURNED', 'CANCELED') DEFAULT 'READY_FOR_PICKUP',
    waybill_url TEXT,
    carrier_notes TEXT,
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
    returned_warehouse_at TIMESTAMP NULL,
    recipient_alt_phone VARCHAR(50),
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
    INDEX idx_ship_awb (awb_code),
    CONSTRAINT fk_shipment_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. Packing Tasks table (Warehouse Packing Station & Barcode verification)
  `CREATE TABLE IF NOT EXISTS packing_tasks (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    packer_id VARCHAR(36),
    box_type VARCHAR(50) DEFAULT 'Standard Carton',
    barcode_scanned VARCHAR(100),
    items_verified BOOLEAN DEFAULT TRUE,
    notes TEXT,
    status ENUM('PENDING', 'PACKING', 'PACKED', 'DISPATCHED') DEFAULT 'PENDING',
    packed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pack_order (order_id),
    INDEX idx_pack_status (status),
    CONSTRAINT fk_pack_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. Call Logs table (Call Center Queue & Confirmation Calls)
  `CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    agent_name VARCHAR(255),
    caller_phone VARCHAR(50),
    recording_url TEXT,
    result ENUM('NO_ANSWER_1', 'NO_ANSWER_2', 'OUT_OF_COVERAGE', 'CALLBACK_REQUESTED', 'BUSY', 'CONFIRMED_MANUALLY', 'CANCELED_BY_CLIENT') NOT NULL,
    call_duration_sec INT DEFAULT 0,
    notes TEXT,
    callback_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_call_order (order_id),
    INDEX idx_call_result (result),
    CONSTRAINT fk_call_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 11. WhatsApp Instances table (Gateway connection status & QR state)
  `CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id VARCHAR(100) PRIMARY KEY,
    instance_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    status ENUM('CONNECTING', 'CONNECTED', 'DISCONNECTED', 'QR_READY') DEFAULT 'DISCONNECTED',
    qr_code TEXT,
    battery_level INT DEFAULT 100,
    last_connected_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 12. WhatsApp Messages table (Omnichannel Chat History & Voice Audio)
  `CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(100) PRIMARY KEY,
    order_id VARCHAR(36),
    phone VARCHAR(50) NOT NULL,
    sender ENUM('CUSTOMER', 'AI_BOT', 'AGENT') NOT NULL,
    sender_name VARCHAR(255),
    message_direction ENUM('INBOUND', 'OUTBOUND') DEFAULT 'INBOUND',
    body TEXT NOT NULL,
    audio_transcribed_text TEXT,
    transcription TEXT,
    audio_url TEXT,
    ai_intent VARCHAR(100),
    ai_confidence INT,
    message_type VARCHAR(50) DEFAULT 'text',
    interactive_type VARCHAR(50) DEFAULT 'TEXT',
    button_payload VARCHAR(100),
    quick_reply_options JSON,
    media_url TEXT,
    external_message_id VARCHAR(255),
    delivery_status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_order (order_id),
    INDEX idx_msg_phone (phone),
    INDEX idx_msg_direction (message_direction),
    INDEX idx_msg_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 13. Order Timelines table (Comprehensive Audit Trail)
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

  // 14. Realtime Events Stream table (Live synchronization log)
  `CREATE TABLE IF NOT EXISTS realtime_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    payload JSON,
    source VARCHAR(100) DEFAULT 'SYSTEM',
    is_broadcast BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evt_type (event_type),
    INDEX idx_evt_entity (entity_type, entity_id),
    INDEX idx_evt_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 15. Notifications table (Platform alerts, SLA breaches, failures)
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('ORDER', 'DELIVERY_FAILED', 'SLA_BREACH', 'OUT_OF_STOCK', 'WHATSAPP_HANDOVER', 'SYSTEM') DEFAULT 'ORDER',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_unread (is_read),
    INDEX idx_notif_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 16. Delivery Rescues table (Failed delivery outreach & recovery cases)
  `CREATE TABLE IF NOT EXISTS delivery_rescues (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    tracking_number VARCHAR(100),
    failure_reason VARCHAR(255) NOT NULL,
    attempt_number INT DEFAULT 1,
    assigned_agent_id VARCHAR(36),
    assigned_agent_name VARCHAR(100),
    carrier_status VARCHAR(100),
    outreach_channel ENUM('WHATSAPP', 'CALL', 'SMS') DEFAULT 'WHATSAPP',
    outreach_status ENUM('PENDING', 'SENT', 'RESPONDED', 'RESOLVED', 'ABANDONED') DEFAULT 'PENDING',
    new_delivery_date DATE,
    new_address TEXT,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rescue_order (order_id),
    CONSTRAINT fk_rescue_order FOREIGN KEY (order_id) REFERENCES order_leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 17. Finance Transactions table (COD settlements, remittances & fees)
  `CREATE TABLE IF NOT EXISTS finance_transactions (
    id VARCHAR(36) PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    transaction_type ENUM('COD_REMITTANCE', 'SHIPPING_FEE_DEDUCTION', 'RETURN_PENALTY', 'BANK_PAYOUT') DEFAULT 'COD_REMITTANCE',
    amount DECIMAL(10, 2) NOT NULL,
    carrier VARCHAR(100) DEFAULT 'Sendit.ma',
    order_count INT DEFAULT 0,
    period_start DATE,
    period_end DATE,
    status ENUM('PENDING', 'PROCESSED', 'RECONCILED', 'DISPUTED') DEFAULT 'PENDING',
    bank_account VARCHAR(255),
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fin_ref (reference),
    INDEX idx_fin_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 18. Store Settings table (Key-Value Platform Configuration)
  `CREATE TABLE IF NOT EXISTS store_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 19. AI Agent Configurations table (Prompts, Persona, Rules)
  `CREATE TABLE IF NOT EXISTS ai_agent_configs (
    id VARCHAR(36) PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL DEFAULT 'Sarah (AI COD Specialist)',
    role_title VARCHAR(100) DEFAULT 'Spécialiste Confirmation & Vente Additionnelle',
    system_prompt TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'Darija Professional & Courteous',
    language VARCHAR(50) DEFAULT 'ar-MA',
    auto_confirm_threshold INT DEFAULT 70,
    gemini_model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 20. Google Sheets Sync Logs table
  `CREATE TABLE IF NOT EXISTS google_sheets_sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    spreadsheet_id VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    rows_synced INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 21. Compatibility table: alerts
  `CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(36),
    tracking VARCHAR(100),
    alert_type VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    message TEXT,
    is_read INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 22. Compatibility table: events
  `CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(36),
    tracking VARCHAR(100),
    event_type VARCHAR(100),
    old_status VARCHAR(100),
    new_status VARCHAR(100),
    raw_payload TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(100),
    reason VARCHAR(255),
    note TEXT,
    timestamp VARCHAR(50)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 23. Google Sheets Configurations table
  `CREATE TABLE IF NOT EXISTS google_sheets_configs (
    id VARCHAR(36) PRIMARY KEY,
    sheet_name VARCHAR(255) NOT NULL,
    spreadsheet_id VARCHAR(255) NOT NULL,
    sheet_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    column_mapping JSON,
    auto_sync_interval_mins INT DEFAULT 5,
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 24. WhatsApp Live Sessions table
  `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id VARCHAR(100) PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    caller_name VARCHAR(255),
    last_message_text TEXT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count INT DEFAULT 0,
    assigned_to_agent_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session_phone (phone_number),
    INDEX idx_session_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

/**
 * Safe, idempotent migration statements covering all latest platform features:
 * - Separation of Cancel vs Return (stages, reasons, timestamps, fee, actor)
 * - WhatsApp Caller Name & Audio Transcriptions & Messages Direction
 * - Multi-Hub Inventory (Casablanca, Fès, Marrakech, Cancel/Return counts)
 * - Sendit Logistics (AWB, Districts, Delivery Fees, Notes)
 * - User Profiles (Job Title, Permissions, Online Presence, Preset Avatars)
 * - Google Sheets Configurations & Realtime sync table
 */
export const MIGRATION_STATEMENTS_SQL: { id: string; sql: string }[] = [
  // 1. Users table migrations
  {
    id: 'users_add_job_title',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(150) DEFAULT 'Agent SENDIT COD';`,
  },
  {
    id: 'users_add_avatar_preset',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_preset VARCHAR(50) DEFAULT 'avatar-1';`,
  },
  {
    id: 'users_add_permissions',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSON NULL;`,
  },
  {
    id: 'users_add_is_online',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;`,
  },
  {
    id: 'users_add_last_active_at',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NULL;`,
  },

  // 2. Customers table migrations
  {
    id: 'customers_add_whatsapp_caller_name',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_caller_name VARCHAR(255) NULL;`,
  },
  {
    id: 'customers_add_canceled_orders',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS canceled_orders INT DEFAULT 0;`,
  },
  {
    id: 'customers_add_last_contact_at',
    sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP NULL;`,
  },

  // 3. Products table migrations
  {
    id: 'products_add_stock_casablanca',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_casablanca INT DEFAULT 0;`,
  },
  {
    id: 'products_add_stock_fes',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_fes INT DEFAULT 0;`,
  },
  {
    id: 'products_add_stock_marrakech',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_marrakech INT DEFAULT 0;`,
  },
  {
    id: 'products_add_total_stock',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_stock INT DEFAULT 0;`,
  },
  {
    id: 'products_add_confirmation_cancel_count',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS confirmation_cancel_count INT DEFAULT 0;`,
  },
  {
    id: 'products_add_courier_return_count',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS courier_return_count INT DEFAULT 0;`,
  },
  {
    id: 'products_add_delivered_count',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0;`,
  },
  {
    id: 'products_add_in_transit_count',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS in_transit_count INT DEFAULT 0;`,
  },

  // 4. Order Leads table migrations (Cancel vs Return separation, Sendit, WhatsApp Caller, etc.)
  {
    id: 'order_leads_add_cancellation_stage',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS cancellation_stage ENUM('CONFIRMATION', 'DELIVERY', 'WAREHOUSE') NULL;`,
  },
  {
    id: 'order_leads_add_cancellation_reason',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL;`,
  },
  {
    id: 'order_leads_add_canceled_at',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP NULL;`,
  },
  {
    id: 'order_leads_add_canceled_by',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS canceled_by VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_return_reason',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS return_reason VARCHAR(255) NULL;`,
  },
  {
    id: 'order_leads_add_returned_at',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP NULL;`,
  },
  {
    id: 'order_leads_add_returned_by',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS returned_by VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_stock_reintegrated',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS stock_reintegrated BOOLEAN DEFAULT FALSE;`,
  },
  {
    id: 'order_leads_add_return_fee_amount',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS return_fee_amount DECIMAL(10, 2) DEFAULT 0.00;`,
  },
  {
    id: 'order_leads_add_confirmed_by',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_confirmed_at',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL;`,
  },
  {
    id: 'order_leads_add_whatsapp_caller_name',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS whatsapp_caller_name VARCHAR(255) NULL;`,
  },
  {
    id: 'order_leads_add_district_id',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS district_id VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_district_name',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS district_name VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_sku',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS sku VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_product_name',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NULL;`,
  },
  {
    id: 'order_leads_add_quantity',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;`,
  },
  {
    id: 'order_leads_add_sendit_delivery_fee',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS sendit_delivery_fee DECIMAL(10, 2) DEFAULT 35.00;`,
  },
  {
    id: 'order_leads_add_awb_code',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS awb_code VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_tracking_number',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_sheet_row_id',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS sheet_row_id VARCHAR(100) NULL;`,
  },
  {
    id: 'order_leads_add_external_order_id',
    sql: `ALTER TABLE order_leads ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(100) NULL;`,
  },

  // 5. Shipment Details migrations
  {
    id: 'shipment_details_add_awb_code',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS awb_code VARCHAR(100) NULL;`,
  },
  {
    id: 'shipment_details_add_district_id',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS district_id VARCHAR(100) NULL;`,
  },
  {
    id: 'shipment_details_add_district_name',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS district_name VARCHAR(100) NULL;`,
  },
  {
    id: 'shipment_details_add_hub_city',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS hub_city VARCHAR(100) DEFAULT 'Casablanca';`,
  },
  {
    id: 'shipment_details_add_carrier_notes',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS carrier_notes TEXT NULL;`,
  },
  {
    id: 'shipment_details_add_returned_warehouse_at',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS returned_warehouse_at TIMESTAMP NULL;`,
  },
  {
    id: 'shipment_details_add_recipient_alt_phone',
    sql: `ALTER TABLE shipment_details ADD COLUMN IF NOT EXISTS recipient_alt_phone VARCHAR(50) NULL;`,
  },

  // 6. WhatsApp Messages migrations
  {
    id: 'whatsapp_messages_add_sender_name',
    sql: `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) NULL;`,
  },
  {
    id: 'whatsapp_messages_add_message_direction',
    sql: `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS message_direction ENUM('INBOUND', 'OUTBOUND') DEFAULT 'INBOUND';`,
  },
  {
    id: 'whatsapp_messages_add_transcription',
    sql: `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS transcription TEXT NULL;`,
  },
  {
    id: 'whatsapp_messages_add_ai_intent',
    sql: `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS ai_intent VARCHAR(100) NULL;`,
  },
  {
    id: 'whatsapp_messages_add_ai_confidence',
    sql: `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS ai_confidence INT NULL;`,
  },

  // 7. Call Logs migrations
  {
    id: 'call_logs_add_agent_name',
    sql: `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255) NULL;`,
  },
  {
    id: 'call_logs_add_recording_url',
    sql: `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT NULL;`,
  },
  {
    id: 'call_logs_add_caller_phone',
    sql: `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS caller_phone VARCHAR(50) NULL;`,
  },

  // 8. Delivery Rescues migrations
  {
    id: 'delivery_rescues_add_assigned_agent_id',
    sql: `ALTER TABLE delivery_rescues ADD COLUMN IF NOT EXISTS assigned_agent_id VARCHAR(36) NULL;`,
  },
  {
    id: 'delivery_rescues_add_assigned_agent_name',
    sql: `ALTER TABLE delivery_rescues ADD COLUMN IF NOT EXISTS assigned_agent_name VARCHAR(100) NULL;`,
  },
  {
    id: 'delivery_rescues_add_carrier_status',
    sql: `ALTER TABLE delivery_rescues ADD COLUMN IF NOT EXISTS carrier_status VARCHAR(100) NULL;`,
  },

  // 9. Table creations if missing
  {
    id: 'create_google_sheets_configs_table',
    sql: `CREATE TABLE IF NOT EXISTS google_sheets_configs (
      id VARCHAR(36) PRIMARY KEY,
      sheet_name VARCHAR(255) NOT NULL,
      spreadsheet_id VARCHAR(255) NOT NULL,
      sheet_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      column_mapping JSON,
      auto_sync_interval_mins INT DEFAULT 5,
      last_synced_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
  {
    id: 'create_whatsapp_sessions_table',
    sql: `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id VARCHAR(100) PRIMARY KEY,
      phone_number VARCHAR(50) NOT NULL,
      caller_name VARCHAR(255),
      last_message_text TEXT,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unread_count INT DEFAULT 0,
      assigned_to_agent_id VARCHAR(36),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_session_phone (phone_number),
      INDEX idx_session_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  },
];

/**
 * Executes all database schema migrations non-destructively.
 * Safe to run against live production databases with 0 downtime and 0 data loss.
 */
export async function migrateDatabaseSchema() {
  const pool = getMysqlPool();
  const results: { id: string; status: 'applied' | 'already_present' | 'error'; error?: string }[] = [];

  for (const m of MIGRATION_STATEMENTS_SQL) {
    try {
      await pool.query(m.sql);
      results.push({ id: m.id, status: 'applied' });
    } catch (err: any) {
      if (err.message && (err.message.includes('Duplicate column') || err.message.includes('already exists'))) {
        results.push({ id: m.id, status: 'already_present' });
      } else {
        console.warn(`[DB Migration] Warning on ${m.id}:`, err.message);
        results.push({ id: m.id, status: 'error', error: err.message });
      }
    }
  }

  // Backfill smart defaults on newly created columns for consistency
  try {
    // 1. Backfill cancellation stage on existing canceled/returned orders
    await pool.query(`
      UPDATE order_leads 
      SET cancellation_stage = CASE 
        WHEN status = 'RETURNED' THEN 'DELIVERY'
        WHEN status = 'CANCELED' AND (store_source = 'SENDIT_SYNC' OR id LIKE 'snd-%') THEN 'DELIVERY'
        WHEN status = 'CANCELED' THEN 'CONFIRMATION'
        ELSE cancellation_stage
      END
      WHERE cancellation_stage IS NULL AND status IN ('CANCELED', 'RETURNED');
    `);

    // 2. Backfill user profiles with realistic job titles and permissions
    await pool.query(`
      UPDATE users 
      SET 
        job_title = CASE 
          WHEN role = 'ADMIN' AND (job_title IS NULL OR job_title = '') THEN 'Directeur des Opérations & Admin'
          WHEN role = 'CONFIRMATION_AGENT' AND (job_title IS NULL OR job_title = '') THEN 'Superviseur Confirmation COD'
          WHEN role = 'PACKER' AND (job_title IS NULL OR job_title = '') THEN 'Responsable Logistique & Colisage'
          WHEN role = 'TRACKING_AGENT' AND (job_title IS NULL OR job_title = '') THEN 'Spécialiste Sauvetage & Réclamation'
          ELSE job_title
        END,
        avatar_preset = CASE 
          WHEN role = 'ADMIN' AND (avatar_preset IS NULL OR avatar_preset = '') THEN 'avatar-1'
          WHEN role = 'CONFIRMATION_AGENT' AND (avatar_preset IS NULL OR avatar_preset = '') THEN 'avatar-2'
          WHEN role = 'PACKER' AND (avatar_preset IS NULL OR avatar_preset = '') THEN 'avatar-3'
          WHEN role = 'TRACKING_AGENT' AND (avatar_preset IS NULL OR avatar_preset = '') THEN 'avatar-4'
          ELSE avatar_preset
        END,
        permissions = CASE 
          WHEN role = 'ADMIN' AND permissions IS NULL THEN JSON_ARRAY('*')
          WHEN role = 'CONFIRMATION_AGENT' AND permissions IS NULL THEN JSON_ARRAY('CONFIRMATION', 'CALLS', 'WHATSAPP')
          WHEN role = 'PACKER' AND permissions IS NULL THEN JSON_ARRAY('PACKING', 'LOGISTICS', 'INVENTORY')
          WHEN role = 'TRACKING_AGENT' AND permissions IS NULL THEN JSON_ARRAY('RESCUE', 'TRACKING', 'CALLS')
          ELSE permissions
        END;
    `);

    // 3. Backfill products total stock & multi-hub allocation if total_stock = 0
    await pool.query(`
      UPDATE products 
      SET 
        total_stock = stock_quantity,
        stock_casablanca = FLOOR(stock_quantity * 0.6),
        stock_fes = FLOOR(stock_quantity * 0.2),
        stock_marrakech = FLOOR(stock_quantity * 0.2)
      WHERE total_stock = 0 AND stock_quantity > 0;
    `);
  } catch (err: any) {
    console.warn('[DB Migration] Backfill defaults warning:', err.message);
  }

  const successCount = results.filter((r) => r.status === 'applied' || r.status === 'already_present').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return {
    success: errorCount === 0,
    totalStatements: MIGRATION_STATEMENTS_SQL.length,
    successCount,
    errorCount,
    results,
  };
}

/**
 * Initializes and executes schema creation and seeding on Hostinger MySQL database
 */
export async function initializeDatabase(forceReset: boolean = false) {
  const pool = getMysqlPool();
  const results: { table: string; status: 'created' | 'already_exists' | 'error'; error?: string }[] = [];

  const tableNames = [
    'users',
    'customers',
    'products',
    'product_variants',
    'stock_movements',
    'order_leads',
    'order_items',
    'shipment_details',
    'packing_tasks',
    'call_logs',
    'whatsapp_instances',
    'whatsapp_messages',
    'order_timelines',
    'realtime_events',
    'notifications',
    'delivery_rescues',
    'finance_transactions',
    'store_settings',
    'ai_agent_configs',
    'google_sheets_sync_logs',
    'alerts',
    'events',
    'google_sheets_configs',
    'whatsapp_sessions',
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

  // 2. Run all schema migrations to ensure columns exist on pre-existing tables
  await migrateDatabaseSchema();

  // 3. Seed default users
  try {
    const users = [
      {
        id: 'usr-admin-01',
        name: 'Admin Principal Sendit',
        email: 'admin@sendit.ma',
        role: 'ADMIN',
        phone: '0661000000',
        job_title: 'Directeur des Opérations & Admin',
        avatar_preset: 'avatar-1',
        permissions: JSON.stringify(['*']),
      },
      {
        id: 'usr-agent-01',
        name: 'Sarah - Agent Confirmation',
        email: 'sarah@sendit.ma',
        role: 'CONFIRMATION_AGENT',
        phone: '0661000001',
        job_title: 'Superviseur Confirmation COD',
        avatar_preset: 'avatar-2',
        permissions: JSON.stringify(['CONFIRMATION', 'CALLS', 'WHATSAPP']),
      },
      {
        id: 'usr-packer-01',
        name: 'Mohamed - Responsable Emballage',
        email: 'mohamed@sendit.ma',
        role: 'PACKER',
        phone: '0661000002',
        job_title: 'Responsable Logistique & Colisage',
        avatar_preset: 'avatar-3',
        permissions: JSON.stringify(['PACKING', 'LOGISTICS', 'INVENTORY']),
      },
      {
        id: 'usr-track-01',
        name: 'Yassine - Suivi & Sauvetage',
        email: 'yassine@sendit.ma',
        role: 'TRACKING_AGENT',
        phone: '0661000003',
        job_title: 'Spécialiste Sauvetage & Réclamation',
        avatar_preset: 'avatar-4',
        permissions: JSON.stringify(['RESCUE', 'TRACKING', 'CALLS']),
      },
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, job_title, avatar_preset, permissions, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name), 
           role = VALUES(role), 
           phone = VALUES(phone),
           job_title = IFNULL(users.job_title, VALUES(job_title)),
           avatar_preset = IFNULL(users.avatar_preset, VALUES(avatar_preset)),
           permissions = IFNULL(users.permissions, VALUES(permissions))`,
        [
          u.id,
          u.name,
          u.email,
          '$2a$12$K8j7m9v9zX1Qp4u2w8e7Y.SenditCODHashSecure2026',
          u.role,
          u.phone,
          u.job_title,
          u.avatar_preset,
          u.permissions,
          true,
        ]
      );
    }
  } catch (e: any) {
    console.warn('[DB Init] User seed note:', e.message);
  }

  // 4. Seed Product Catalog & Variants
  try {
    const products = getProducts();
    for (const p of products) {
      await pool.query(
        `INSERT INTO products 
         (id, name, name_ar, sku, base_price, cost_price, stock_quantity, stock_casablanca, stock_fes, stock_marrakech, total_stock, category, description_ar, knowledge_base, selling_points, objection_faqs, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name),
           name_ar = VALUES(name_ar),
           base_price = VALUES(base_price),
           cost_price = VALUES(cost_price),
           stock_quantity = VALUES(stock_quantity),
           total_stock = VALUES(total_stock)`,
        [
          p.id,
          p.name,
          p.nameAr,
          p.sku,
          p.sellingPrice,
          p.costPrice,
          p.totalStock,
          Math.floor(p.totalStock * 0.6),
          Math.floor(p.totalStock * 0.2),
          Math.floor(p.totalStock * 0.2),
          p.totalStock,
          p.category,
          p.descriptionAr,
          p.descriptionAr,
          JSON.stringify(p.keywords || []),
          JSON.stringify([]),
          p.status !== 'OUT_OF_STOCK',
        ]
      );

      // Seed product variant
      await pool.query(
        `INSERT INTO product_variants 
         (id, product_id, title, sku, attributes, price_extra, stock_quantity, barcode, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), stock_quantity = VALUES(stock_quantity)`,
        [
          `var-${p.sku}-std`,
          p.id,
          `${p.name} - Format Standard`,
          `${p.sku}-STD`,
          JSON.stringify({ taille: 'Standard', couleur: 'Original' }),
          0.00,
          p.totalStock,
          `611${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          true,
        ]
      );
    }
  } catch (e: any) {
    console.warn('[DB Init] Products seed note:', e.message);
  }

  // 4. Operational tables (orders, customers, shipments, messages, finances)
  // are left completely clean for authentic live data from Sendit, Google Sheets & Store Webhooks.

  // 9. Seed Store Settings & AI Agent Config
  try {
    const defaultSettings = [
      { key: 'PLATFORM_NAME', value: 'SENDIT Morocco COD Management' },
      { key: 'DEFAULT_CARRIER', value: 'Sendit.ma Express' },
      { key: 'DEFAULT_SHIPPING_FEE', value: '35' },
      { key: 'COD_ONLY_MODE', value: 'true' },
      { key: 'AI_CONFIRMATION_AUTO_ENABLED', value: 'true' },
      { key: 'SENDIT_PUBLIC_KEY', value: '3d4232babb11df9a39165b4fcaf88057' },
      { key: 'SENDIT_PRIVATE_KEY', value: 'RzRVrol6hv3OHMmcaYDPzBl2KianmSZQ' },
      { key: 'SENDIT_WEBHOOK_SECRET', value: 'RzRVrol6hv3OHMmcaYDPzBl2KianmSZQ' },
      { key: 'DATABASE_VERSION', value: '2.0.0-hostinger-mysql-complete' },
    ];

    for (const s of defaultSettings) {
      await pool.query(
        `INSERT INTO store_settings (setting_key, setting_value) 
         VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [s.key, s.value]
      );
    }

    await pool.query(
      `INSERT INTO ai_agent_configs 
       (id, agent_name, role_title, system_prompt, tone, language, auto_confirm_threshold, gemini_model, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE system_prompt = VALUES(system_prompt)`,
      [
        'agent-sarah-01',
        'Sarah (AI COD Specialist)',
        'Spécialiste Confirmation & Vente Additionnelle',
        'Nti Sarah, assistante d confirmation dial boutique Sendit COD Maroc. Khedma dialk t2akdi talabat b Darija m2adba w t-optimisi l-livraison.',
        'Darija Courtoise & Professionnelle',
        'ar-MA',
        75,
        'gemini-1.5-flash',
        true,
      ]
    );
  } catch (e: any) {
    console.warn('[DB Init] Settings/Agent seed note:', e.message);
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
       WHERE table_schema = DATABASE()
       ORDER BY table_name ASC`
    );

    const [dbInfo]: any = await pool.query('SELECT DATABASE() as dbName, VERSION() as version');

    return {
      connected: true,
      database: dbInfo[0]?.dbName || 'u663560985_sendit',
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
      database: process.env.DB_NAME || 'u663560985_sendit',
    };
  }
}

export type WipeTarget = 'OPERATIONAL' | 'FULL' | 'CATALOG';

export const OPERATIONAL_TABLES = [
  'delivery_rescues',
  'order_timelines',
  'call_logs',
  'packing_tasks',
  'shipment_details',
  'order_items',
  'order_leads',
  'whatsapp_messages',
  'whatsapp_sessions',
  'finance_transactions',
  'customers',
  'notifications',
  'realtime_events',
  'alerts',
  'events',
  'google_sheets_sync_logs',
];

export const CATALOG_TABLES = [
  'stock_movements',
  'product_variants',
  'products',
];

export const ALL_DATA_TABLES = [
  ...OPERATIONAL_TABLES,
  ...CATALOG_TABLES,
  'google_sheets_configs',
  'whatsapp_instances',
  'store_settings',
  'ai_agent_configs',
  'users',
];

/**
 * Returns exact row counts for critical tables to preview before wiping
 */
export async function getWipeSummary() {
  const pool = getMysqlPool();
  const counts: Record<string, number> = {};

  const tablesToCheck = [
    'order_leads',
    'order_items',
    'shipment_details',
    'customers',
    'whatsapp_messages',
    'call_logs',
    'packing_tasks',
    'finance_transactions',
    'notifications',
    'products',
    'users',
  ];

  for (const tbl of tablesToCheck) {
    try {
      const [res]: any = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
      counts[tbl] = Number(res[0]?.cnt || 0);
    } catch {
      counts[tbl] = 0;
    }
  }

  const operationalCount = Object.entries(counts)
    .filter(([k]) => k !== 'products' && k !== 'users')
    .reduce((sum, [, v]) => sum + v, 0);

  const totalRecords = Object.values(counts).reduce((sum, v) => sum + v, 0);

  return {
    success: true,
    counts,
    operationalCount,
    totalRecords,
  };
}

/**
 * Wipes tables based on selected target (OPERATIONAL, FULL, or CATALOG)
 * Safe and handles foreign keys with SET FOREIGN_KEY_CHECKS = 0
 */
export async function wipeDatabase(target: WipeTarget = 'OPERATIONAL') {
  const pool = getMysqlPool();
  const deletedCounts: Record<string, number> = {};
  let tablesToClear: string[] = [];

  if (target === 'OPERATIONAL') {
    tablesToClear = OPERATIONAL_TABLES;
  } else if (target === 'CATALOG') {
    tablesToClear = CATALOG_TABLES;
  } else if (target === 'FULL') {
    tablesToClear = ALL_DATA_TABLES;
  }

  // Disable Foreign Key checks
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    for (const table of tablesToClear) {
      try {
        const [cntRes]: any = await pool.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        const cnt = Number(cntRes[0]?.cnt || 0);
        deletedCounts[table] = cnt;

        // DELETE FROM is 100% reliable with FK checks disabled across all MySQL/MariaDB engines
        await pool.query(`DELETE FROM \`${table}\``);

        // Reset AUTO_INCREMENT if supported
        try {
          await pool.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        } catch {
          // ignore if table has no auto-increment
        }
      } catch (err: any) {
        console.warn(`[wipeDatabase] Note for table ${table}:`, err.message);
        deletedCounts[table] = 0;
      }
    }

    // If FULL wipe was performed, re-seed essential baseline (Admin user, settings, AI agent)
    if (target === 'FULL') {
      try {
        await initializeDatabase(false);
      } catch (e: any) {
        console.warn('[wipeDatabase] Re-seeding after full wipe error:', e.message);
      }
    }
  } finally {
    // Always re-enable Foreign Key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // Clear in-memory stores and caches
  try {
    invalidateOrdersCache();
  } catch {}

  try {
    clearInboundOrders();
  } catch {}

  try {
    clearInboxConversations();
  } catch {}

  const totalDeleted = Object.values(deletedCounts).reduce((sum, c) => sum + c, 0);

  return {
    success: true,
    target,
    totalDeleted,
    deletedCounts,
  };
}
