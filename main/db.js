const { ipcMain, app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { logAudit } = require('./auditLogger');

let db;

// ═══════════════════════════════════════════════════════════════════════
// Business Column Presets — seeded into custom_columns on business create
// ═══════════════════════════════════════════════════════════════════════
const BUSINESS_COLUMN_PRESETS = {
  retail: [
    { name: 'Company / Supplier', type: 'text', required: false },
    { name: 'Pack Quantity', type: 'number', required: false },
    { name: 'Pack Price', type: 'currency', required: false },
    { name: 'MRP per Unit', type: 'currency', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Discount per Pack', type: 'formula', required: false, formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', required: false, formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', required: false, formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', required: false, formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Unit', type: 'text', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  wholesale: [
    { name: 'Company / Supplier', type: 'text', required: false },
    { name: 'Pack Quantity', type: 'number', required: false },
    { name: 'Pack Price', type: 'currency', required: false },
    { name: 'MRP per Unit', type: 'currency', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Discount per Pack', type: 'formula', required: false, formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', required: false, formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', required: false, formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', required: false, formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Unit', type: 'text', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  pharmacy: [
    { name: 'Company / Supplier', type: 'text', required: false },
    { name: 'Pack Quantity', type: 'number', required: false },
    { name: 'Pack Price', type: 'currency', required: false },
    { name: 'MRP per Unit', type: 'currency', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Discount per Pack', type: 'formula', required: false, formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', required: false, formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', required: false, formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', required: false, formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Unit', type: 'text', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  restaurant: [
    { name: 'Category', type: 'dropdown', required: false },
    { name: 'Portion Size', type: 'text', required: false },
    { name: 'Recipe Cost', type: 'currency', required: false },
    { name: 'Selling Price', type: 'currency', required: true },
    { name: 'Available Today', type: 'checkbox', required: false },
    { name: 'Prep Time (mins)', type: 'number', required: false },
    { name: 'Margin %', type: 'formula', required: false, formula: '({Selling Price} - {Recipe Cost}) / {Selling Price} * 100' },
  ],
  warehouse: [
    { name: 'Location Code', type: 'text', required: false },
    { name: 'Weight (kg)', type: 'number', required: false },
    { name: 'Volume (cbm)', type: 'number', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  electronics: [
    { name: 'Company / Supplier', type: 'text', required: false },
    { name: 'Pack Quantity', type: 'number', required: false },
    { name: 'Pack Price', type: 'currency', required: false },
    { name: 'MRP per Unit', type: 'currency', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Discount per Pack', type: 'formula', required: false, formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', required: false, formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', required: false, formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', required: false, formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Unit', type: 'text', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  clothes: [
    { name: 'Company / Supplier', type: 'text', required: false },
    { name: 'Pack Quantity', type: 'number', required: false },
    { name: 'Pack Price', type: 'currency', required: false },
    { name: 'MRP per Unit', type: 'currency', required: false },
    { name: 'Purchase Price', type: 'currency', required: false },
    { name: 'Company Discount %', type: 'number', required: false },
    { name: 'Discount per Pack', type: 'formula', required: false, formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', required: false, formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', required: false, formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', required: false, formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date', required: false },
    { name: 'Unit', type: 'text', required: false },
    { name: 'Reorder Level', type: 'number', required: false },
  ],
  tailor: [
    { name: 'Fabric Type', type: 'text', required: false },
    { name: 'Measurement Set', type: 'text', required: false },
    { name: 'Stitching Cost', type: 'currency', required: false },
    { name: 'Material Cost', type: 'currency', required: false },
    { name: 'Sale Price', type: 'currency', required: true },
    { name: 'Due Date', type: 'date', required: false },
    { name: 'Profit', type: 'formula', required: false, formula: '{Sale Price} - {Stitching Cost} - {Material Cost}' },
  ],
  custom: [],
};

/**
 * Seed default columns for a business based on its type.
 * Called inside business creation transaction.
 */
function seedDefaultColumns(businessId, businessType) {
  const presets = BUSINESS_COLUMN_PRESETS[businessType] || [];
  if (presets.length === 0) return;

  const insertCol = db.prepare(`
    INSERT INTO custom_columns (business_id, name, type, formula, position, is_visible, is_required, is_system)
    VALUES (?, ?, ?, ?, ?, 1, ?, 1)
  `);

  for (let i = 0; i < presets.length; i++) {
    const col = presets[i];
    insertCol.run(
      businessId,
      col.name,
      col.type,
      col.formula || null,
      i,
      col.required ? 1 : 0
    );
  }
}

/**
 * Run schema migrations for existing databases.
 * Safe to call multiple times — uses PRAGMA table_info checks.
 */
function runMigrations() {
  // Migration: add overall_discount columns to demands table
  const demandCols = db.prepare("PRAGMA table_info('demands')").all().map(c => c.name);
  if (!demandCols.includes('overall_discount_type')) {
    db.exec(`
      ALTER TABLE demands ADD COLUMN overall_discount_type TEXT DEFAULT 'percent';
      ALTER TABLE demands ADD COLUMN overall_discount_value REAL DEFAULT 0;
      ALTER TABLE demands ADD COLUMN apply_tax INTEGER DEFAULT 0;
    `);
  }

  // Migration: add serial_number to demands table
  if (!demandCols.includes('serial_number')) {
    db.exec("ALTER TABLE demands ADD COLUMN serial_number TEXT;");
  }

  // Migration: add buyer_name to demands for counter sale / custom name
  if (!demandCols.includes('buyer_name')) {
    db.exec("ALTER TABLE demands ADD COLUMN buyer_name TEXT;");
  }

  // Migration: make payments.buyer_id nullable (for counter sale payments)
  const payBuyerCol = db.prepare("PRAGMA table_info('payments')").all().find(c => c.name === 'buyer_id');
  if (payBuyerCol && payBuyerCol.notnull === 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        buyer_id         INTEGER REFERENCES buyers(id) ON DELETE CASCADE,
        demand_id        INTEGER,
        amount           REAL NOT NULL,
        method           TEXT DEFAULT 'cash',
        reference_no     TEXT,
        notes            TEXT,
        paid_at          TEXT DEFAULT (datetime('now')),
        recorded_by      INTEGER
      );
      INSERT INTO payments_new SELECT * FROM payments;
      DROP TABLE payments;
      ALTER TABLE payments_new RENAME TO payments;
      CREATE INDEX IF NOT EXISTS idx_payments_buyer ON payments(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_demand ON payments(demand_id);
    `);

    // Recreate triggers with null-safety
    db.exec(`
      DROP TRIGGER IF EXISTS trg_payment_insert;
      CREATE TRIGGER trg_payment_insert
      AFTER INSERT ON payments
      WHEN NEW.buyer_id IS NOT NULL
      BEGIN
        INSERT INTO buyer_balances (buyer_id, total_paid, outstanding, last_payment_at, updated_at)
        VALUES (NEW.buyer_id, NEW.amount, -NEW.amount, NEW.paid_at, datetime('now'))
        ON CONFLICT(buyer_id) DO UPDATE SET
          total_paid      = total_paid + NEW.amount,
          outstanding     = outstanding - NEW.amount,
          last_payment_at = NEW.paid_at,
          updated_at      = datetime('now');
      END;

      DROP TRIGGER IF EXISTS trg_payment_delete;
      CREATE TRIGGER trg_payment_delete
      AFTER DELETE ON payments
      WHEN OLD.buyer_id IS NOT NULL
      BEGIN
        UPDATE buyer_balances SET
          total_paid  = total_paid - OLD.amount,
          outstanding = outstanding + OLD.amount,
          updated_at  = datetime('now')
        WHERE buyer_id = OLD.buyer_id;
      END;
    `);
  }

  // Migration: add serial_prefix to businesses table
  const bizCols = db.prepare("PRAGMA table_info('businesses')").all().map(c => c.name);
  if (!bizCols.includes('serial_prefix')) {
    db.exec("ALTER TABLE businesses ADD COLUMN serial_prefix TEXT DEFAULT 'INV';");
  }

  // Migration: add pack_quantity to demand_items for unit-based demand system
  const diCols = db.prepare("PRAGMA table_info('demand_items')").all().map(c => c.name);
  if (!diCols.includes('pack_quantity')) {
    db.exec("ALTER TABLE demand_items ADD COLUMN pack_quantity REAL DEFAULT 1;");
  }

  // Migration: seed demand_sequences for existing businesses
  const allBizIds = db.prepare('SELECT id FROM businesses').all();
  for (const b of allBizIds) {
    db.prepare('INSERT OR IGNORE INTO demand_sequences (business_id) VALUES (?)').run(b.id);
  }

  // Migration: seed columns for existing businesses that have no custom_columns
  const bizRows = db.prepare('SELECT id, type FROM businesses').all();
  for (const biz of bizRows) {
    const colCount = db.prepare('SELECT COUNT(*) as cnt FROM custom_columns WHERE business_id = ?').get(biz.id);
    if (colCount.cnt === 0) {
      seedDefaultColumns(biz.id, biz.type);
    }
  }

  // Migration: add pack columns to existing businesses that don't have them
  const PACK_TYPES = ['retail', 'wholesale', 'pharmacy', 'electronics', 'clothes'];
  for (const biz of bizRows) {
    if (!PACK_TYPES.includes(biz.type)) continue;
    const existingCols = db.prepare('SELECT name FROM custom_columns WHERE business_id = ?').all(biz.id).map(c => c.name);
    if (!existingCols.includes('Pack Quantity')) {
      const maxPos = db.prepare('SELECT MAX(position) as mp FROM custom_columns WHERE business_id = ?').get(biz.id);
      let pos = (maxPos?.mp || 0) + 1;
      db.prepare('INSERT INTO custom_columns (business_id, name, type, position, is_visible, is_required, is_system) VALUES (?, ?, ?, ?, 1, 0, 1)').run(biz.id, 'Pack Quantity', 'number', pos++);
      db.prepare('INSERT INTO custom_columns (business_id, name, type, position, is_visible, is_required, is_system) VALUES (?, ?, ?, ?, 1, 0, 1)').run(biz.id, 'Pack Price', 'currency', pos++);
      db.prepare("INSERT INTO custom_columns (business_id, name, type, formula, position, is_visible, is_required, is_system) VALUES (?, ?, ?, ?, ?, 1, 0, 1)").run(biz.id, 'Unit Price', 'formula', '{Pack Price} / {Pack Quantity}', pos);
    }
  }

  // Migration: seed default sidebar settings for existing businesses
  const DEFAULT_SIDEBAR_ITEMS = [
    'dashboard', 'products', 'stock', 'buyers', 'demands',
    'audit', 'reports', 'users', 'data', 'labels', 'businesses', 'scanner', 'settings'
  ];
  for (const b of allBizIds) {
    const existingKeys = db.prepare('SELECT item_key FROM sidebar_settings WHERE business_id = ?').all(b.id).map(r => r.item_key);
    for (let i = 0; i < DEFAULT_SIDEBAR_ITEMS.length; i++) {
      if (!existingKeys.includes(DEFAULT_SIDEBAR_ITEMS[i])) {
        db.prepare('INSERT OR IGNORE INTO sidebar_settings (business_id, item_key, is_visible, position) VALUES (?, ?, 1, ?)').run(b.id, DEFAULT_SIDEBAR_ITEMS[i], i);
      }
    }
  }

  // Migration: seed Expiry Date column for all business types that don't have it
  for (const biz of bizRows) {
    const existingCols = db.prepare('SELECT name FROM custom_columns WHERE business_id = ?').all(biz.id).map(c => c.name);
    if (!existingCols.includes('Expiry Date')) {
      const maxPos = db.prepare('SELECT MAX(position) as mp FROM custom_columns WHERE business_id = ?').get(biz.id);
      const pos = (maxPos?.mp || 0) + 1;
      db.prepare('INSERT INTO custom_columns (business_id, name, type, position, is_visible, is_required, is_system) VALUES (?, ?, ?, ?, 1, 0, 1)').run(biz.id, 'Expiry Date', 'date', pos);
    }
  }

  // Migration: upgrade to unified pack-based pricing columns
  const PACK_BASED_TYPES = ['retail', 'wholesale', 'pharmacy', 'electronics', 'clothes'];
  const PACK_COLS_SPEC = [
    { name: 'Company / Supplier', type: 'text' },
    { name: 'Pack Quantity', type: 'number' },
    { name: 'Pack Price', type: 'currency' },
    { name: 'MRP per Unit', type: 'currency' },
    { name: 'Purchase Price', type: 'currency' },
    { name: 'Company Discount %', type: 'number' },
    { name: 'Discount per Pack', type: 'formula', formula: '{Pack Price} * {Company Discount %} / 100' },
    { name: 'Price after Discount', type: 'formula', formula: '{Pack Price} - ({Pack Price} * {Company Discount %} / 100)' },
    { name: 'Profit per Unit', type: 'formula', formula: '{MRP per Unit} - ({Price after Discount} / {Pack Quantity})' },
    { name: 'Profit per Pack', type: 'formula', formula: '({MRP per Unit} * {Pack Quantity}) - {Price after Discount}' },
    { name: 'Expiry Date', type: 'date' },
    { name: 'Unit', type: 'text' },
    { name: 'Reorder Level', type: 'number' },
  ];
  // Rename map for old column names → new column names
  const RENAME_MAP = {
    'Company Name': 'Company / Supplier',
    'MRP': 'MRP per Unit',
    'Profit': 'Profit per Pack',
    'Company Discount': 'Company Discount %',
    'Unit Price': 'MRP per Unit',
  };
  for (const biz of bizRows) {
    if (!PACK_BASED_TYPES.includes(biz.type)) continue;
    const existingCols = db.prepare('SELECT id, name FROM custom_columns WHERE business_id = ?').all(biz.id);
    const existingNames = existingCols.map(c => c.name);
    // Rename old columns first
    for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
      if (existingNames.includes(oldName) && !existingNames.includes(newName)) {
        const specCol = PACK_COLS_SPEC.find(s => s.name === newName);
        if (specCol) {
          db.prepare('UPDATE custom_columns SET name = ?, type = ?, formula = ? WHERE business_id = ? AND name = ?')
            .run(newName, specCol.type, specCol.formula || null, biz.id, oldName);
        }
      }
    }
    // Re-fetch after renames
    const updatedCols = db.prepare('SELECT name FROM custom_columns WHERE business_id = ?').all(biz.id).map(c => c.name);
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM custom_columns WHERE business_id = ?').get(biz.id);
    let pos = (maxPos?.mp || 0) + 1;
    // Add any missing columns
    for (const spec of PACK_COLS_SPEC) {
      if (!updatedCols.includes(spec.name)) {
        db.prepare('INSERT INTO custom_columns (business_id, name, type, formula, position, is_visible, is_required, is_system) VALUES (?, ?, ?, ?, ?, 1, 0, 1)')
          .run(biz.id, spec.name, spec.type, spec.formula || null, pos++);
      }
    }
    // Update formulas on existing formula columns to match new spec
    for (const spec of PACK_COLS_SPEC) {
      if (spec.formula) {
        db.prepare('UPDATE custom_columns SET formula = ? WHERE business_id = ? AND name = ? AND type = ?')
          .run(spec.formula, biz.id, spec.name, 'formula');
      }
    }
  }

  // Migration: make demands.buyer_id nullable (allow Counter Sale without buyer)
  const buyerIdCol = db.prepare("PRAGMA table_info('demands')").all().find(c => c.name === 'buyer_id');
  if (buyerIdCol && buyerIdCol.notnull === 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS demands_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        buyer_id        INTEGER REFERENCES buyers(id) ON DELETE RESTRICT,
        demand_code     TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'draft',
        subtotal        REAL NOT NULL DEFAULT 0,
        total_discount  REAL NOT NULL DEFAULT 0,
        total_tax       REAL NOT NULL DEFAULT 0,
        grand_total     REAL NOT NULL DEFAULT 0,
        amount_paid     REAL NOT NULL DEFAULT 0,
        balance_due     REAL NOT NULL DEFAULT 0,
        notes           TEXT,
        confirmed_at    TEXT,
        cancelled_at    TEXT,
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now')),
        overall_discount_type TEXT DEFAULT 'percent',
        overall_discount_value REAL DEFAULT 0,
        apply_tax       INTEGER DEFAULT 0,
        serial_number   TEXT
      );
      INSERT INTO demands_new SELECT * FROM demands;
      DROP TABLE demands;
      ALTER TABLE demands_new RENAME TO demands;
      CREATE INDEX IF NOT EXISTS idx_demands_business ON demands(business_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_demands_buyer ON demands(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_demands_code ON demands(demand_code);
      CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
    `);
  }
}

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'instamall.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      logo_path   TEXT,
      currency    TEXT NOT NULL DEFAULT 'PKR',
      currency_symbol TEXT NOT NULL DEFAULT '₨',
      tax_rate    REAL NOT NULL DEFAULT 0,
      tax_name    TEXT DEFAULT 'Tax',
      address     TEXT,
      phone       TEXT,
      email       TEXT,
      footer_text TEXT,
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      number_format TEXT DEFAULT 'en-PK',
      is_active   INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS column_presets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_type TEXT NOT NULL,
      column_name   TEXT NOT NULL,
      column_type   TEXT NOT NULL,
      position      INTEGER NOT NULL,
      is_required   INTEGER DEFAULT 0,
      default_value TEXT
    );

    -- Module 2: Inventory Management tables
    CREATE TABLE IF NOT EXISTS products (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      sku             TEXT,
      barcode         TEXT,
      category        TEXT,
      image_path      TEXT,
      is_deleted      INTEGER DEFAULT 0,
      deleted_at      TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, sku)
    );

    CREATE TABLE IF NOT EXISTS custom_columns (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL,
      formula         TEXT,
      dropdown_options TEXT,
      position        INTEGER NOT NULL DEFAULT 0,
      is_visible      INTEGER DEFAULT 1,
      is_required     INTEGER DEFAULT 0,
      is_system       INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_values (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      column_id   INTEGER NOT NULL REFERENCES custom_columns(id) ON DELETE CASCADE,
      value       TEXT,
      updated_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, column_id)
    );

    CREATE TABLE IF NOT EXISTS column_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL,
      column_id   INTEGER NOT NULL,
      old_value   TEXT,
      new_value   TEXT,
      changed_by  INTEGER,
      changed_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT DEFAULT '#64748B',
      UNIQUE(business_id, name)
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      filter_json TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_products_business   ON products(business_id, is_deleted);
    CREATE INDEX IF NOT EXISTS idx_product_values_prod  ON product_values(product_id);
    CREATE INDEX IF NOT EXISTS idx_column_history_prod  ON column_history(product_id, column_id);
    CREATE INDEX IF NOT EXISTS idx_custom_cols_business ON custom_columns(business_id, position);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 3: Stock Control Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS stock_movements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type            TEXT NOT NULL,
      quantity        REAL NOT NULL,
      quantity_before REAL NOT NULL,
      quantity_after  REAL NOT NULL,
      reason          TEXT NOT NULL,
      source          TEXT DEFAULT 'manual',
      ref_id          INTEGER,
      ref_label       TEXT,
      notes           TEXT,
      moved_by        INTEGER,
      moved_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_levels (
      product_id    INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      quantity      REAL NOT NULL DEFAULT 0,
      last_moved_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reorder_levels (
      product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      reorder_at      REAL NOT NULL DEFAULT 0,
      reorder_qty     REAL,
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    -- Trigger: keep stock_levels in sync after every movement insert
    CREATE TRIGGER IF NOT EXISTS trg_update_stock_level
    AFTER INSERT ON stock_movements
    BEGIN
      INSERT INTO stock_levels (product_id, quantity, last_moved_at)
      VALUES (NEW.product_id, NEW.quantity_after, NEW.moved_at)
      ON CONFLICT(product_id) DO UPDATE SET
        quantity = NEW.quantity_after,
        last_moved_at = NEW.moved_at;
    END;

    -- Stock movement indexes
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product  ON stock_movements(product_id, moved_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id, moved_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_type     ON stock_movements(type, moved_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_source   ON stock_movements(source, ref_id);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 4: Buyer Management Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS buyers (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      buyer_code       TEXT NOT NULL,
      full_name        TEXT NOT NULL,
      business_name    TEXT,
      phone            TEXT,
      email            TEXT,
      address          TEXT,
      city             TEXT,
      photo_path       TEXT,
      notes            TEXT,
      is_active        INTEGER DEFAULT 1,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now')),
      last_activity_at TEXT,
      UNIQUE(business_id, buyer_code)
    );

    CREATE TABLE IF NOT EXISTS buyer_balances (
      buyer_id         INTEGER PRIMARY KEY REFERENCES buyers(id) ON DELETE CASCADE,
      total_billed     REAL DEFAULT 0,
      total_paid       REAL DEFAULT 0,
      outstanding      REAL DEFAULT 0,
      demands_count    INTEGER DEFAULT 0,
      last_demand_at   TEXT,
      last_payment_at  TEXT,
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      buyer_id         INTEGER REFERENCES buyers(id) ON DELETE CASCADE,
      demand_id        INTEGER,
      amount           REAL NOT NULL,
      method           TEXT DEFAULT 'cash',
      reference_no     TEXT,
      notes            TEXT,
      paid_at          TEXT DEFAULT (datetime('now')),
      recorded_by      INTEGER
    );

    -- Trigger: update buyer_balances on payment insert
    CREATE TRIGGER IF NOT EXISTS trg_payment_insert
    AFTER INSERT ON payments
    WHEN NEW.buyer_id IS NOT NULL
    BEGIN
      INSERT INTO buyer_balances (buyer_id, total_paid, outstanding, last_payment_at, updated_at)
      VALUES (NEW.buyer_id, NEW.amount, -NEW.amount, NEW.paid_at, datetime('now'))
      ON CONFLICT(buyer_id) DO UPDATE SET
        total_paid      = total_paid + NEW.amount,
        outstanding     = outstanding - NEW.amount,
        last_payment_at = NEW.paid_at,
        updated_at      = datetime('now');
    END;

    -- Trigger: reverse buyer_balances on payment delete
    CREATE TRIGGER IF NOT EXISTS trg_payment_delete
    AFTER DELETE ON payments
    WHEN OLD.buyer_id IS NOT NULL
    BEGIN
      UPDATE buyer_balances SET
        total_paid  = total_paid - OLD.amount,
        outstanding = outstanding + OLD.amount,
        updated_at  = datetime('now')
      WHERE buyer_id = OLD.buyer_id;
    END;

    -- Buyer indexes
    CREATE INDEX IF NOT EXISTS idx_buyers_business   ON buyers(business_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_buyers_phone      ON buyers(phone);
    CREATE INDEX IF NOT EXISTS idx_buyers_name       ON buyers(full_name);
    CREATE INDEX IF NOT EXISTS idx_payments_buyer    ON payments(buyer_id, paid_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id, paid_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_demand   ON payments(demand_id);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 5: Demand Management Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS demands (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      buyer_id        INTEGER REFERENCES buyers(id) ON DELETE RESTRICT,
      buyer_name      TEXT,
      demand_code     TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'draft',
      subtotal        REAL NOT NULL DEFAULT 0,
      total_discount  REAL NOT NULL DEFAULT 0,
      total_tax       REAL NOT NULL DEFAULT 0,
      grand_total     REAL NOT NULL DEFAULT 0,
      amount_paid     REAL NOT NULL DEFAULT 0,
      balance_due     REAL NOT NULL DEFAULT 0,
      notes           TEXT,
      confirmed_at    TEXT,
      cancelled_at    TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, demand_code)
    );

    CREATE TABLE IF NOT EXISTS demand_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      demand_id       INTEGER NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name    TEXT NOT NULL,
      product_sku     TEXT,
      unit_price      REAL NOT NULL,
      quantity        REAL NOT NULL DEFAULT 1,
      discount_type   TEXT DEFAULT 'none',
      discount_value  REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_type        TEXT DEFAULT 'none',
      tax_value       REAL DEFAULT 0,
      tax_amount      REAL DEFAULT 0,
      line_total      REAL NOT NULL,
      pack_quantity   REAL DEFAULT 1,
      position        INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- Trigger: when demand confirmed, add to buyer balance
    CREATE TRIGGER IF NOT EXISTS trg_demand_confirmed
    AFTER UPDATE OF status ON demands
    WHEN NEW.status = 'confirmed' AND OLD.status = 'draft'
    BEGIN
      UPDATE buyer_balances SET
        total_billed   = total_billed + NEW.grand_total,
        outstanding    = outstanding  + NEW.grand_total,
        demands_count  = demands_count + 1,
        last_demand_at = NEW.confirmed_at,
        updated_at     = datetime('now')
      WHERE buyer_id = NEW.buyer_id;

      UPDATE buyers SET
        last_activity_at = NEW.confirmed_at,
        updated_at       = datetime('now')
      WHERE id = NEW.buyer_id;
    END;

    -- Trigger: when demand cancelled (from non-draft), reverse billing
    CREATE TRIGGER IF NOT EXISTS trg_demand_cancelled
    AFTER UPDATE OF status ON demands
    WHEN NEW.status = 'cancelled' AND OLD.status != 'draft'
    BEGIN
      UPDATE buyer_balances SET
        total_billed  = total_billed - OLD.grand_total,
        outstanding   = outstanding  - OLD.grand_total + OLD.amount_paid,
        demands_count = demands_count - 1,
        updated_at    = datetime('now')
      WHERE buyer_id = NEW.buyer_id;
    END;

    -- Demand indexes
    CREATE INDEX IF NOT EXISTS idx_demands_business  ON demands(business_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_demands_buyer     ON demands(buyer_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_demand_items_dem  ON demand_items(demand_id, position);
    CREATE INDEX IF NOT EXISTS idx_demand_items_prod ON demand_items(product_id);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 6: Audit Log Table
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS audit_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      user_id       INTEGER,
      user_label    TEXT DEFAULT 'Admin',
      action        TEXT NOT NULL,
      entity_type   TEXT NOT NULL,
      entity_id     INTEGER,
      entity_label  TEXT,
      summary       TEXT NOT NULL,
      detail_json   TEXT,
      logged_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_business   ON audit_log(business_id, logged_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log(action, logged_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_log(entity_type, entity_id, logged_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id, logged_at DESC);
    CREATE INDEX IF NOT EXISTS idx_col_history_prod ON column_history(product_id, changed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_col_history_col  ON column_history(column_id, changed_at DESC);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 8: User & Access Control Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      username        TEXT NOT NULL,
      display_name    TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'salesperson',
      pin_hash        TEXT,
      password_hash   TEXT,
      auth_method     TEXT DEFAULT 'pin',
      pin_length      INTEGER DEFAULT 4,
      avatar_color    TEXT DEFAULT '#2E86AB',
      is_active       INTEGER DEFAULT 1,
      is_default      INTEGER DEFAULT 0,
      last_login_at   TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(business_id, username)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      require_pin_on_startup    INTEGER DEFAULT 0,
      auto_lock_after_minutes   INTEGER DEFAULT 0,
      last_active_user_id       INTEGER REFERENCES users(id),
      UNIQUE(business_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(business_id, username);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 9: Data & Backup Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS backup_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      filename        TEXT NOT NULL,
      file_path       TEXT NOT NULL,
      file_size_bytes INTEGER,
      trigger_type    TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'success',
      error_message   TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_backup_log_business ON backup_log(business_id, created_at DESC);

    -- ═══════════════════════════════════════════════════════════════════
    -- MODULE 10: QR & Barcode Scanner Tables
    -- ═══════════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS scanner_settings (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id           INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      scanner_type          TEXT DEFAULT 'hid',
      scan_delay_ms         INTEGER DEFAULT 80,
      prefix                TEXT DEFAULT '',
      suffix                TEXT DEFAULT '',
      beep_enabled          INTEGER DEFAULT 1,
      beep_volume           REAL DEFAULT 0.7,
      auto_scan_on_startup  INTEGER DEFAULT 0,
      webcam_device_id      TEXT,
      UNIQUE(business_id)
    );

    CREATE TABLE IF NOT EXISTS scan_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      session_id    TEXT NOT NULL,
      scanned_code  TEXT NOT NULL,
      product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name  TEXT,
      action_taken  TEXT,
      context       TEXT,
      scanned_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS label_templates (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      width_mm        REAL NOT NULL DEFAULT 50,
      height_mm       REAL NOT NULL DEFAULT 25,
      show_product_name   INTEGER DEFAULT 1,
      show_sku            INTEGER DEFAULT 1,
      show_price          INTEGER DEFAULT 1,
      show_category       INTEGER DEFAULT 0,
      show_business_name  INTEGER DEFAULT 0,
      code_type       TEXT DEFAULT 'barcode',
      code_position   TEXT DEFAULT 'right',
      font_size_name  INTEGER DEFAULT 10,
      font_size_detail INTEGER DEFAULT 8,
      is_default      INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_scan_history_session  ON scan_history(session_id, scanned_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scan_history_business ON scan_history(business_id, scanned_at DESC);
    CREATE INDEX IF NOT EXISTS idx_label_templates_biz   ON label_templates(business_id);

    -- ═══════════════════════════════════════════════════════════════════
    -- ENHANCEMENT: Demand Serial Number Sequences
    -- ═══════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS demand_sequences (
      business_id   INTEGER PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
      prefix        TEXT DEFAULT 'INV',
      next_number   INTEGER DEFAULT 1,
      padding       INTEGER DEFAULT 5,
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════════════════
    -- ENHANCEMENT: Sidebar Customization Settings
    -- ═══════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS sidebar_settings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      item_key      TEXT NOT NULL,
      is_visible    INTEGER DEFAULT 1,
      position      INTEGER DEFAULT 0,
      UNIQUE(business_id, item_key)
    );

    CREATE INDEX IF NOT EXISTS idx_sidebar_settings_biz ON sidebar_settings(business_id);

    -- ═══════════════════════════════════════════════════════════════════
    -- ENHANCEMENT: User Module Access Control
    -- ═══════════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS user_module_access (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_key    TEXT NOT NULL,
      has_access    INTEGER DEFAULT 1,
      UNIQUE(user_id, module_key)
    );

    CREATE INDEX IF NOT EXISTS idx_user_module_access ON user_module_access(user_id);
  `);

  // ── M9: Migrate app_settings for backup columns ──
  const appSettingsCols = db.prepare("PRAGMA table_info(app_settings)").all().map(c => c.name);
  if (!appSettingsCols.includes('auto_backup_enabled')) {
    db.exec('ALTER TABLE app_settings ADD COLUMN auto_backup_enabled INTEGER DEFAULT 0');
  }
  if (!appSettingsCols.includes('auto_backup_frequency')) {
    db.exec("ALTER TABLE app_settings ADD COLUMN auto_backup_frequency TEXT DEFAULT 'daily'");
  }
  if (!appSettingsCols.includes('auto_backup_time')) {
    db.exec("ALTER TABLE app_settings ADD COLUMN auto_backup_time TEXT DEFAULT '23:00'");
  }
  if (!appSettingsCols.includes('auto_backup_folder')) {
    db.exec('ALTER TABLE app_settings ADD COLUMN auto_backup_folder TEXT');
  }
  if (!appSettingsCols.includes('max_backup_copies')) {
    db.exec('ALTER TABLE app_settings ADD COLUMN max_backup_copies INTEGER DEFAULT 10');
  }
  if (!appSettingsCols.includes('last_backup_at')) {
    db.exec('ALTER TABLE app_settings ADD COLUMN last_backup_at TEXT');
  }

  // Seed default admin user if no users exist for any business
  _seedDefaultAdminIfNeeded();

  // Seed column presets if the table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM column_presets').get();
  if (count.count === 0) {
    seedColumnPresets();
  }

  // Ensure stock_levels and reorder_levels rows exist for all products
  db.exec(`
    INSERT OR IGNORE INTO stock_levels (product_id, quantity)
    SELECT id, 0 FROM products WHERE is_deleted = 0;
    INSERT OR IGNORE INTO reorder_levels (product_id, reorder_at)
    SELECT id, 0 FROM products WHERE is_deleted = 0;
  `);

  // Run schema migrations for existing databases
  runMigrations();
}

function seedColumnPresets() {
  const insert = db.prepare(`
    INSERT INTO column_presets (business_type, column_name, column_type, position, is_required, default_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const presets = {
    retail: [
      ['Product Name', 'text', 1, 1, null],
      ['SKU', 'text', 2, 0, null],
      ['Category', 'dropdown', 3, 0, null],
      ['Purchase Price', 'currency', 4, 0, null],
      ['Sale Price', 'currency', 5, 1, null],
      ['Stock Quantity', 'number', 6, 1, null],
      ['Reorder Level', 'number', 7, 0, null],
      ['Stock Value', 'formula', 8, 0, '{Stock Quantity} * {Purchase Price}'],
    ],
    wholesale: [
      ['Product Name', 'text', 1, 1, null],
      ['SKU', 'text', 2, 0, null],
      ['Unit', 'dropdown', 3, 0, 'Kg,Litre,Box,Piece,Dozen'],
      ['Purchase Price', 'currency', 4, 0, null],
      ['Bulk Sale Price', 'currency', 5, 1, null],
      ['Stock Quantity', 'number', 6, 1, null],
      ['Min Order Qty', 'number', 7, 0, null],
      ['Reorder Level', 'number', 8, 0, null],
    ],
    pharmacy: [
      ['Medicine Name', 'text', 1, 1, null],
      ['Generic Name', 'text', 2, 0, null],
      ['Batch Number', 'text', 3, 0, null],
      ['Expiry Date', 'date', 4, 0, null],
      ['Purchase Price', 'currency', 5, 0, null],
      ['MRP', 'currency', 6, 1, null],
      ['Stock Quantity', 'number', 7, 1, null],
      ['Rack Location', 'text', 8, 0, null],
      ['Profit', 'formula', 9, 0, '{MRP} - {Purchase Price}'],
    ],
    restaurant: [
      ['Item Name', 'text', 1, 1, null],
      ['Category', 'dropdown', 2, 0, 'Starter,Main,Dessert,Beverage'],
      ['Portion Size', 'text', 3, 0, null],
      ['Recipe Cost', 'currency', 4, 0, null],
      ['Selling Price', 'currency', 5, 1, null],
      ['Available Today', 'checkbox', 6, 0, null],
      ['Prep Time (mins)', 'number', 7, 0, null],
      ['Margin %', 'formula', 8, 0, '({Selling Price} - {Recipe Cost}) / {Selling Price} * 100'],
    ],
    warehouse: [
      ['Item Name', 'text', 1, 1, null],
      ['SKU', 'text', 2, 0, null],
      ['Location Code', 'text', 3, 0, null],
      ['Weight (kg)', 'number', 4, 0, null],
      ['Volume (cbm)', 'number', 5, 0, null],
      ['Stock In', 'number', 6, 0, null],
      ['Stock Out', 'number', 7, 0, null],
      ['Reorder Level', 'number', 8, 0, null],
    ],
    electronics: [
      ['Item Name', 'text', 1, 1, null],
      ['Model Number', 'text', 2, 0, null],
      ['Brand', 'text', 3, 0, null],
      ['Purchase Price', 'currency', 4, 0, null],
      ['Sale Price', 'currency', 5, 1, null],
      ['Warranty (months)', 'number', 6, 0, null],
      ['Stock Quantity', 'number', 7, 1, null],
      ['Profit', 'formula', 8, 0, '{Sale Price} - {Purchase Price}'],
    ],
    custom: [
      ['Product Name', 'text', 1, 1, null],
      ['Stock Quantity', 'number', 2, 0, null],
    ],
  };

  const insertMany = db.transaction(() => {
    for (const [type, columns] of Object.entries(presets)) {
      for (const [name, colType, position, required, defaultVal] of columns) {
        insert.run(type, name, colType, position, required, defaultVal);
      }
    }
  });

  insertMany();
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 8: PIN Hashing & Default Admin Seed
// ═══════════════════════════════════════════════════════════════════

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin + 'instamall_salt_2025').digest('hex');
}

function verifyPin(pin, hash) {
  return hashPin(pin) === hash;
}

function _seedDefaultAdminIfNeeded() {
  // For each business that has zero users, seed a default admin
  const businesses = db.prepare('SELECT id FROM businesses').all();
  for (const biz of businesses) {
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE business_id = ?').get(biz.id).c;
    if (userCount === 0) {
      db.prepare(`
        INSERT INTO users (business_id, username, display_name, role, pin_hash, pin_length, avatar_color, is_active, is_default)
        VALUES (?, 'admin', 'Admin', 'admin', ?, 4, '#1E3A5F', 1, 1)
      `).run(biz.id, hashPin('1234'));

      // Also seed app_settings
      db.prepare(`INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)`).run(biz.id);
    }
  }
}

function _sanitizeUser(user) {
  if (!user) return null;
  const { pin_hash, password_hash, ...safe } = user;
  return safe;
}

function registerIpcHandlers() {
  // Get all businesses
  ipcMain.handle('businesses:getAll', () => {
    try {
      const rows = db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get active business
  ipcMain.handle('businesses:getActive', () => {
    try {
      const row = db.prepare('SELECT * FROM businesses WHERE is_active = 1 LIMIT 1').get();
      return { success: true, data: row || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create business
  ipcMain.handle('businesses:create', (event, data) => {
    try {
      console.log('Creating business with data:', JSON.stringify(data));
      const createTransaction = db.transaction((data) => {
        // Deactivate all others first
        db.prepare('UPDATE businesses SET is_active = 0').run();

        const stmt = db.prepare(`
          INSERT INTO businesses (name, type, logo_path, currency, currency_symbol, tax_rate, tax_name, address, phone, email, footer_text, date_format, number_format, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);

        const result = stmt.run(
          data.name,
          data.type,
          data.logo_path || null,
          data.currency || 'PKR',
          data.currency_symbol || '₨',
          data.tax_rate != null ? data.tax_rate : 0,
          data.tax_name || 'Tax',
          data.address || null,
          data.phone || null,
          data.email || null,
          data.footer_text || null,
          data.date_format || 'DD/MM/YYYY',
          data.number_format || 'en-PK'
        );

        const newId = result.lastInsertRowid;

        // Seed default columns for this business type
        seedDefaultColumns(newId, data.type);

        // Create admin user with the provided PIN (or default '1234')
        const adminPin = data.admin_pin && data.admin_pin.length >= 4 ? data.admin_pin : '1234';
        db.prepare(`
          INSERT INTO users (business_id, username, display_name, role, pin_hash, pin_length, avatar_color, is_active, is_default)
          VALUES (?, 'admin', 'Admin', 'admin', ?, ?, '#1E3A5F', 1, 1)
        `).run(newId, hashPin(adminPin), adminPin.length);

        // Seed app_settings
        db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(newId);

        return db.prepare('SELECT * FROM businesses WHERE id = ?').get(newId);
      });

      const newBusiness = createTransaction(data);
      console.log('Business created:', newBusiness);
      logAudit(db, {
        businessId: newBusiness.id,
        action: 'create_business',
        entityType: 'business',
        entityId: newBusiness.id,
        entityLabel: newBusiness.name,
        summary: `Created business '${newBusiness.name}'`,
        detailJson: { name: newBusiness.name, type: newBusiness.type }
      });
      return { success: true, data: newBusiness };
    } catch (error) {
      console.error('Error creating business:', error);
      return { success: false, error: error.message };
    }
  });

  // Update business
  ipcMain.handle('businesses:update', (event, id, data) => {
    try {
      const fields = [];
      const values = [];

      const allowedFields = [
        'name', 'logo_path', 'currency', 'currency_symbol',
        'tax_rate', 'tax_name', 'address', 'phone', 'email',
        'footer_text', 'date_format', 'number_format'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      }

      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      db.prepare(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
      logAudit(db, {
        businessId: id,
        action: 'update_settings',
        entityType: 'business',
        entityId: id,
        entityLabel: updated.name,
        summary: `Updated business settings for '${updated.name}'`,
        detailJson: { updatedFields: Object.keys(data) }
      });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete business
  ipcMain.handle('businesses:delete', (event, id) => {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM businesses').get();
      if (count.count <= 1) {
        return { success: false, error: 'You must have at least one business profile.' };
      }

      const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
      if (!business) {
        return { success: false, error: 'Business not found.' };
      }

      db.prepare('DELETE FROM businesses WHERE id = ?').run(id);

      // If deleted was active, set another as active
      if (business.is_active) {
        const another = db.prepare('SELECT id FROM businesses LIMIT 1').get();
        if (another) {
          db.prepare('UPDATE businesses SET is_active = 1 WHERE id = ?').run(another.id);
        }
      }

      logAudit(db, {
        businessId: null,
        action: 'delete_business',
        entityType: 'business',
        entityId: id,
        entityLabel: business.name,
        summary: `Deleted business '${business.name}'`,
        detailJson: { name: business.name }
      });
      return { success: true, data: { deleted: id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Set active business
  ipcMain.handle('businesses:setActive', (event, id) => {
    try {
      const setActiveTransaction = db.transaction((id) => {
        db.prepare('UPDATE businesses SET is_active = 0').run();
        db.prepare('UPDATE businesses SET is_active = 1 WHERE id = ?').run(id);
        return db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
      });

      const activeBusiness = setActiveTransaction(id);
      logAudit(db, {
        businessId: id,
        action: 'switch_business',
        entityType: 'business',
        entityId: id,
        entityLabel: activeBusiness.name,
        summary: `Switched to '${activeBusiness.name}'`,
        detailJson: { name: activeBusiness.name }
      });
      return { success: true, data: activeBusiness };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Upload logo
  ipcMain.handle('businesses:uploadLogo', (event, srcPath) => {
    try {
      const userDataPath = app.getPath('userData');
      const logosDir = path.join(userDataPath, 'logos');

      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true });
      }

      const ext = path.extname(srcPath);
      const filename = `logo_${Date.now()}${ext}`;
      const destPath = path.join(logosDir, filename);

      fs.copyFileSync(srcPath, destPath);

      return { success: true, data: destPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get presets by type
  ipcMain.handle('presets:getByType', (event, type) => {
    try {
      const rows = db.prepare('SELECT * FROM column_presets WHERE business_type = ? ORDER BY position ASC').all(type);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 2: Inventory Management IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Seed custom columns from presets for a business ──────────────────
  ipcMain.handle('columns:seedFromPresets', (event, { businessId, businessType }) => {
    try {
      const presets = db.prepare(
        'SELECT * FROM column_presets WHERE business_type = ? ORDER BY position ASC'
      ).all(businessType);

      const existing = db.prepare(
        'SELECT COUNT(*) as count FROM custom_columns WHERE business_id = ?'
      ).get(businessId);

      if (existing.count > 0) {
        return { success: true, data: [] };
      }

      const insertCol = db.prepare(`
        INSERT INTO custom_columns (business_id, name, type, formula, dropdown_options, position, is_visible, is_required, is_system)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)
      `);

      const seedTransaction = db.transaction(() => {
        const inserted = [];
        for (const p of presets) {
          const result = insertCol.run(
            businessId,
            p.column_name,
            p.column_type,
            p.default_value && p.column_type === 'formula' ? p.default_value : null,
            p.default_value && p.column_type === 'dropdown' ? JSON.stringify(p.default_value.split(',')) : null,
            p.position,
            p.is_required
          );
          inserted.push({ id: result.lastInsertRowid, name: p.column_name, type: p.column_type });
        }
        return inserted;
      });

      const result = seedTransaction();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Products ────────────────────────────────────────────────────────
  ipcMain.handle('products:getAll', (event, businessId) => {
    try {
      const products = db.prepare(
        'SELECT * FROM products WHERE business_id = ? AND is_deleted = 0 ORDER BY created_at DESC'
      ).all(businessId);

      const getValues = db.prepare(
        'SELECT column_id, value FROM product_values WHERE product_id = ?'
      );

      const result = products.map((p) => {
        const vals = getValues.all(p.id);
        const values = {};
        for (const v of vals) {
          values[v.column_id] = v.value;
        }
        return { ...p, values };
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:getById', (event, productId) => {
    try {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) return { success: false, error: 'Product not found' };

      const vals = db.prepare('SELECT column_id, value FROM product_values WHERE product_id = ?').all(productId);
      const values = {};
      for (const v of vals) {
        values[v.column_id] = v.value;
      }

      return { success: true, data: { ...product, values } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:create', (event, { businessId, name, sku, barcode, category, imagePath, values }) => {
    try {
      const createTransaction = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO products (business_id, name, sku, barcode, category, image_path)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(businessId, name, sku || null, barcode || null, category || null, imagePath || null);

        const productId = result.lastInsertRowid;

        if (values && typeof values === 'object') {
          const insertVal = db.prepare(`
            INSERT OR REPLACE INTO product_values (product_id, column_id, value) VALUES (?, ?, ?)
          `);
          for (const [columnId, value] of Object.entries(values)) {
            if (value !== undefined && value !== null) {
              insertVal.run(productId, parseInt(columnId), String(value));
            }
          }
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        const pvs = db.prepare('SELECT column_id, value FROM product_values WHERE product_id = ?').all(productId);
        const valuesMap = {};
        for (const v of pvs) valuesMap[v.column_id] = v.value;

        // M3: Initialize stock & reorder rows for new product
        db.prepare('INSERT OR IGNORE INTO stock_levels (product_id, quantity) VALUES (?, 0)').run(productId);
        db.prepare('INSERT OR IGNORE INTO reorder_levels (product_id, reorder_at) VALUES (?, 0)').run(productId);

        return { ...product, values: valuesMap };
      });

      const newProduct = createTransaction();
      logAudit(db, {
        businessId: businessId,
        action: 'create_product',
        entityType: 'product',
        entityId: newProduct.id,
        entityLabel: `${newProduct.name}${newProduct.sku ? ' (' + newProduct.sku + ')' : ''}`,
        summary: `Added product '${newProduct.name}'${newProduct.sku ? ' (' + newProduct.sku + ')' : ''}`,
        detailJson: { name: newProduct.name, sku: newProduct.sku, category: newProduct.category }
      });
      return { success: true, data: newProduct };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:update', (event, { productId, columnId, value }) => {
    try {
      const updateTransaction = db.transaction(() => {
        // Get old value for history
        const existing = db.prepare(
          'SELECT value FROM product_values WHERE product_id = ? AND column_id = ?'
        ).get(productId, columnId);

        const oldValue = existing ? existing.value : null;

        // Upsert value
        db.prepare(`
          INSERT INTO product_values (product_id, column_id, value, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(product_id, column_id) DO UPDATE SET value = ?, updated_at = datetime('now')
        `).run(productId, columnId, String(value), String(value));

        // Record history
        db.prepare(`
          INSERT INTO column_history (product_id, column_id, old_value, new_value)
          VALUES (?, ?, ?, ?)
        `).run(productId, columnId, oldValue, String(value));

        // Update product timestamp
        db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(productId);

        return { oldValue, newValue: String(value) };
      });

      const result = updateTransaction();
      // Audit: log field-level product update
      const product = db.prepare('SELECT name, sku, business_id FROM products WHERE id = ?').get(productId);
      const column = db.prepare('SELECT name FROM custom_columns WHERE id = ?').get(columnId);
      if (product && column) {
        logAudit(db, {
          businessId: product.business_id,
          action: 'update_product',
          entityType: 'product',
          entityId: productId,
          entityLabel: `${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`,
          summary: `Updated ${column.name} of '${product.name}': ${result.oldValue ?? '—'} → ${result.newValue}`,
          detailJson: { field: column.name, old: result.oldValue, new: result.newValue }
        });
      }
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:updateCore', (event, { productId, name, sku, barcode, category, imagePath }) => {
    try {
      const fields = [];
      const vals = [];
      if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
      if (sku !== undefined) {
        // Keep SKU behavior consistent with create: blank input is stored as NULL.
        const normalizedSku = typeof sku === 'string' ? sku.trim() : sku;
        fields.push('sku = ?');
        vals.push(normalizedSku || null);
      }
      if (barcode !== undefined) { fields.push('barcode = ?'); vals.push(barcode); }
      if (category !== undefined) { fields.push('category = ?'); vals.push(category); }
      if (imagePath !== undefined) { fields.push('image_path = ?'); vals.push(imagePath); }
      fields.push("updated_at = datetime('now')");
      vals.push(productId);

      db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      logAudit(db, {
        businessId: product.business_id,
        action: 'update_product',
        entityType: 'product',
        entityId: productId,
        entityLabel: `${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`,
        summary: `Updated core fields of '${product.name}'`,
        detailJson: { updatedFields: [name !== undefined && 'name', sku !== undefined && 'sku', barcode !== undefined && 'barcode', category !== undefined && 'category', imagePath !== undefined && 'imagePath'].filter(Boolean) }
      });
      return { success: true, data: product };
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE constraint failed: products.business_id, products.sku')) {
        return { success: false, error: 'SKU already exists for this business. Please use a different SKU.' };
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:softDelete', (event, productId) => {
    try {
      const product = db.prepare('SELECT name, sku, business_id FROM products WHERE id = ?').get(productId);
      db.prepare("UPDATE products SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?").run(productId);
      if (product) {
        logAudit(db, {
          businessId: product.business_id,
          action: 'delete_product',
          entityType: 'product',
          entityId: productId,
          entityLabel: product.name,
          summary: `Moved '${product.name}' to Recycle Bin`,
          detailJson: { name: product.name, sku: product.sku }
        });
      }
      return { success: true, data: { id: productId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:softDeleteBulk', (event, productIds) => {
    try {
      const stmt = db.prepare("UPDATE products SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?");
      const bulkDelete = db.transaction(() => {
        for (const id of productIds) stmt.run(id);
      });
      bulkDelete();
      return { success: true, data: { deleted: productIds.length } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:restore', (event, productId) => {
    try {
      db.prepare('UPDATE products SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(productId);
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      logAudit(db, {
        businessId: product.business_id,
        action: 'update_product',
        entityType: 'product',
        entityId: productId,
        entityLabel: product.name,
        summary: `Restored '${product.name}' from Recycle Bin`,
        detailJson: { name: product.name, sku: product.sku }
      });
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:hardDelete', (event, productId) => {
    try {
      const product = db.prepare('SELECT name, sku, business_id FROM products WHERE id = ?').get(productId);
      db.prepare('DELETE FROM product_values WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM column_history WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM products WHERE id = ?').run(productId);
      if (product) {
        logAudit(db, {
          businessId: product.business_id,
          action: 'delete_product',
          entityType: 'product',
          entityId: productId,
          entityLabel: product.name,
          summary: `Permanently deleted '${product.name}'`,
          detailJson: { name: product.name, sku: product.sku }
        });
      }
      return { success: true, data: { id: productId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:duplicate', (event, productId) => {
    try {
      const dupTransaction = db.transaction(() => {
        const original = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!original) throw new Error('Product not found');

        const newName = `${original.name} (Copy)`;
        const newSku = original.sku ? `${original.sku}-COPY-${Date.now()}` : null;

        const result = db.prepare(`
          INSERT INTO products (business_id, name, sku, barcode, category, image_path)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(original.business_id, newName, newSku, original.barcode, original.category, original.image_path);

        const newId = result.lastInsertRowid;

        // Copy all values
        const origValues = db.prepare('SELECT column_id, value FROM product_values WHERE product_id = ?').all(productId);
        const insertVal = db.prepare('INSERT INTO product_values (product_id, column_id, value) VALUES (?, ?, ?)');
        for (const v of origValues) {
          insertVal.run(newId, v.column_id, v.value);
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(newId);
        const pvs = db.prepare('SELECT column_id, value FROM product_values WHERE product_id = ?').all(newId);
        const valuesMap = {};
        for (const v of pvs) valuesMap[v.column_id] = v.value;
        return { ...product, values: valuesMap };
      });

      const newProduct = dupTransaction();
      logAudit(db, {
        businessId: newProduct.business_id,
        action: 'create_product',
        entityType: 'product',
        entityId: newProduct.id,
        entityLabel: newProduct.name,
        summary: `Duplicated product → '${newProduct.name}'`,
        detailJson: { originalId: productId, name: newProduct.name }
      });
      return { success: true, data: newProduct };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:getRecycleBin', (event, businessId) => {
    try {
      const rows = db.prepare(
        'SELECT * FROM products WHERE business_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC'
      ).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:getCellHistory', (event, { productId, columnId }) => {
    try {
      const rows = db.prepare(
        'SELECT * FROM column_history WHERE product_id = ? AND column_id = ? ORDER BY changed_at DESC LIMIT 50'
      ).all(productId, columnId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:uploadImage', (event, srcPath) => {
    try {
      const userDataPath = app.getPath('userData');
      const imagesDir = path.join(userDataPath, 'product-images');
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

      const ext = path.extname(srcPath);
      const filename = `product_${Date.now()}${ext}`;
      const destPath = path.join(imagesDir, filename);
      fs.copyFileSync(srcPath, destPath);

      return { success: true, data: destPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:importCSV', (event, { businessId, rows, columnMap }) => {
    try {
      const importTransaction = db.transaction(() => {
        let imported = 0;
        const errors = [];

        const insertProduct = db.prepare(`
          INSERT INTO products (business_id, name, sku, barcode, category) VALUES (?, ?, ?, ?, ?)
        `);
        const insertVal = db.prepare(`
          INSERT OR REPLACE INTO product_values (product_id, column_id, value) VALUES (?, ?, ?)
        `);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const name = row[columnMap['name']] || row[columnMap['Product Name']] || `Product ${i + 1}`;
            const sku = columnMap['sku'] ? row[columnMap['sku']] : null;
            const barcode = columnMap['barcode'] ? row[columnMap['barcode']] : null;
            const category = columnMap['category'] ? row[columnMap['category']] : null;

            const result = insertProduct.run(businessId, name, sku, barcode, category);
            const productId = result.lastInsertRowid;

            // Insert mapped column values
            for (const [csvCol, colId] of Object.entries(columnMap)) {
              if (['name', 'sku', 'barcode', 'category', 'Product Name'].includes(csvCol)) continue;
              if (colId && row[csvCol] !== undefined && row[csvCol] !== '') {
                insertVal.run(productId, parseInt(colId), String(row[csvCol]));
              }
            }

            imported++;
          } catch (err) {
            errors.push({ row: i + 1, error: err.message });
          }
        }

        return { imported, errors };
      });

      const result = importTransaction();
      logAudit(db, {
        businessId,
        action: 'stock_import',
        entityType: 'product',
        entityId: null,
        entityLabel: null,
        summary: `Imported ${result.imported} products from CSV${result.errors.length > 0 ? ' (' + result.errors.length + ' errors)' : ''}`,
        detailJson: { imported: result.imported, errors: result.errors.length }
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:exportCSV', (event, { businessId }) => {
    try {
      const columns = db.prepare(
        'SELECT * FROM custom_columns WHERE business_id = ? AND is_visible = 1 ORDER BY position'
      ).all(businessId);

      const products = db.prepare(
        'SELECT * FROM products WHERE business_id = ? AND is_deleted = 0 ORDER BY created_at DESC'
      ).all(businessId);

      const getValues = db.prepare('SELECT column_id, value FROM product_values WHERE product_id = ?');

      // Build CSV header
      const headers = ['Name', 'SKU', 'Barcode', 'Category', ...columns.map(c => c.name)];
      const csvRows = [headers.join(',')];

      for (const p of products) {
        const vals = getValues.all(p.id);
        const valMap = {};
        for (const v of vals) valMap[v.column_id] = v.value;

        const row = [
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.sku || '').replace(/"/g, '""')}"`,
          `"${(p.barcode || '').replace(/"/g, '""')}"`,
          `"${(p.category || '').replace(/"/g, '""')}"`,
          ...columns.map(c => `"${(valMap[c.id] || '').replace(/"/g, '""')}"`)
        ];
        csvRows.push(row.join(','));
      }

      return { success: true, data: csvRows.join('\n') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Custom Columns ──────────────────────────────────────────────────
  ipcMain.handle('columns:getAll', (event, businessId) => {
    try {
      const rows = db.prepare(
        'SELECT * FROM custom_columns WHERE business_id = ? ORDER BY position ASC'
      ).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('columns:create', (event, { businessId, name, type, formula, dropdownOptions, position, isRequired }) => {
    try {
      const createColTransaction = db.transaction(() => {
        const maxPos = db.prepare(
          'SELECT MAX(position) as maxPos FROM custom_columns WHERE business_id = ?'
        ).get(businessId);
        const pos = position != null ? position : (maxPos.maxPos || 0) + 1;

        const result = db.prepare(`
          INSERT INTO custom_columns (business_id, name, type, formula, dropdown_options, position, is_required, is_system)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          businessId, name, type,
          formula || null,
          dropdownOptions ? JSON.stringify(dropdownOptions) : null,
          pos,
          isRequired ? 1 : 0
        );

        const columnId = result.lastInsertRowid;

        // Add empty values for all existing products
        const products = db.prepare('SELECT id FROM products WHERE business_id = ? AND is_deleted = 0').all(businessId);
        const insertVal = db.prepare('INSERT OR IGNORE INTO product_values (product_id, column_id, value) VALUES (?, ?, ?)');
        for (const p of products) {
          insertVal.run(p.id, columnId, '');
        }

        return db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(columnId);
      });

      const col = createColTransaction();
      logAudit(db, {
        businessId,
        action: 'create_column',
        entityType: 'column',
        entityId: col.id,
        entityLabel: col.name,
        summary: `Added column '${col.name}' (${col.type})`,
        detailJson: { name: col.name, type: col.type }
      });
      return { success: true, data: col };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('columns:update', (event, { columnId, name, type, formula, dropdownOptions, isVisible }) => {
    try {
      const oldCol = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(columnId);
      const fields = [];
      const vals = [];
      if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
      if (type !== undefined) { fields.push('type = ?'); vals.push(type); }
      if (formula !== undefined) { fields.push('formula = ?'); vals.push(formula); }
      if (dropdownOptions !== undefined) { fields.push('dropdown_options = ?'); vals.push(JSON.stringify(dropdownOptions)); }
      if (isVisible !== undefined) { fields.push('is_visible = ?'); vals.push(isVisible ? 1 : 0); }
      vals.push(columnId);

      db.prepare(`UPDATE custom_columns SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
      const col = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(columnId);
      logAudit(db, {
        businessId: col.business_id,
        action: 'update_column',
        entityType: 'column',
        entityId: columnId,
        entityLabel: col.name,
        summary: oldCol && name && oldCol.name !== name ? `Renamed column '${oldCol.name}' \u2192 '${name}'` : `Updated column '${col.name}'`,
        detailJson: { old: { name: oldCol?.name }, new: { name: col.name } }
      });
      return { success: true, data: col };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('columns:delete', (event, columnId) => {
    try {
      const col = db.prepare('SELECT * FROM custom_columns WHERE id = ?').get(columnId);
      db.prepare('DELETE FROM product_values WHERE column_id = ?').run(columnId);
      db.prepare('DELETE FROM column_history WHERE column_id = ?').run(columnId);
      db.prepare('DELETE FROM custom_columns WHERE id = ?').run(columnId);
      if (col) {
        logAudit(db, {
          businessId: col.business_id,
          action: 'delete_column',
          entityType: 'column',
          entityId: columnId,
          entityLabel: col.name,
          summary: `Deleted column '${col.name}' and all its data`,
          detailJson: { name: col.name, type: col.type }
        });
      }
      return { success: true, data: { id: columnId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('columns:reorder', (event, { businessId, orderedIds }) => {
    try {
      const stmt = db.prepare('UPDATE custom_columns SET position = ? WHERE id = ? AND business_id = ?');
      const reorderTransaction = db.transaction(() => {
        orderedIds.forEach((id, index) => {
          stmt.run(index + 1, id, businessId);
        });
      });
      reorderTransaction();
      return { success: true, data: { reordered: orderedIds.length } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('columns:toggleVisibility', (event, { columnId, isVisible }) => {
    try {
      db.prepare('UPDATE custom_columns SET is_visible = ? WHERE id = ?').run(isVisible ? 1 : 0, columnId);
      return { success: true, data: { columnId, isVisible } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Categories ──────────────────────────────────────────────────────
  ipcMain.handle('categories:getAll', (event, businessId) => {
    try {
      const rows = db.prepare('SELECT * FROM categories WHERE business_id = ? ORDER BY name').all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:create', (event, { businessId, name, color }) => {
    try {
      const result = db.prepare(
        'INSERT INTO categories (business_id, name, color) VALUES (?, ?, ?)'
      ).run(businessId, name, color || '#64748B');
      const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      return { success: true, data: cat };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:delete', (event, categoryId) => {
    try {
      db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
      return { success: true, data: { id: categoryId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Saved Filters ──────────────────────────────────────────────────
  ipcMain.handle('filters:getAll', (event, businessId) => {
    try {
      const rows = db.prepare('SELECT * FROM saved_filters WHERE business_id = ? ORDER BY created_at DESC').all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('filters:save', (event, { businessId, name, filterJson }) => {
    try {
      const result = db.prepare(
        'INSERT INTO saved_filters (business_id, name, filter_json) VALUES (?, ?, ?)'
      ).run(businessId, name, filterJson);
      const filter = db.prepare('SELECT * FROM saved_filters WHERE id = ?').get(result.lastInsertRowid);
      return { success: true, data: filter };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('filters:delete', (event, filterId) => {
    try {
      db.prepare('DELETE FROM saved_filters WHERE id = ?').run(filterId);
      return { success: true, data: { id: filterId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 3: Stock Control IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Helper: ensure stock_levels/reorder_levels rows exist for a product ──
  function ensureStockRows(productId) {
    db.prepare('INSERT OR IGNORE INTO stock_levels (product_id, quantity) VALUES (?, 0)').run(productId);
    db.prepare('INSERT OR IGNORE INTO reorder_levels (product_id, reorder_at) VALUES (?, 0)').run(productId);
  }

  // ── Helper: get current stock ──
  function getCurrentStock(productId) {
    ensureStockRows(productId);
    const row = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(productId);
    return row ? row.quantity : 0;
  }

  // ── Helper: get pack quantity for a product (how many units per pack) ──
  function getPackQuantity(businessId, productId) {
    try {
      const packQtyCol = db.prepare(
        "SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Pack Quantity'"
      ).get(businessId);
      if (!packQtyCol) return 1;
      const val = db.prepare(
        'SELECT value FROM product_values WHERE product_id = ? AND column_id = ?'
      ).get(productId, packQtyCol.id);
      const qty = val ? parseFloat(val.value) : 0;
      return qty > 0 ? qty : 1;
    } catch {
      return 1;
    }
  }

  // ── Helper: normalize stock/reorder values (up to 3 decimals) ──
  function round3(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.round((n + Number.EPSILON) * 1000) / 1000;
  }

  function toNonNegative3(value, { allowZero = true, allowNull = false } = {}) {
    if (allowNull && (value === null || value === undefined || value === '')) return null;
    const n = round3(value);
    if (n === null) return null;
    if (allowZero ? n < 0 : n <= 0) return null;
    return n;
  }

  // ── Stock Adjustments ──────────────────────────────────────────────

  ipcMain.handle('stock:adjustIn', (event, { businessId, productId, quantity, reason, notes }) => {
    try {
      const qty = toNonNegative3(quantity, { allowZero: false });
      if (qty === null) {
        return { success: false, error: 'Invalid quantity. Use a positive number with up to 3 decimals.' };
      }
      const current = getCurrentStock(productId);
      const after = round3(current + qty);
      const result = db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, notes)
        VALUES (?, ?, 'in', ?, ?, ?, ?, 'manual', ?)
      `).run(businessId, productId, qty, current, after, reason, notes || null);
      const product = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(productId);
      logAudit(db, {
        businessId,
        action: 'stock_in',
        entityType: 'stock',
        entityId: productId,
        entityLabel: product?.name || `Product #${productId}`,
        summary: `Added ${qty} units to '${product?.name || productId}'. Reason: ${reason}`,
        detailJson: { product: product?.name, qty, before: current, after, reason }
      });
      return { success: true, data: { movementId: result.lastInsertRowid, newQuantity: after } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:adjustOut', (event, { businessId, productId, quantity, reason, notes }) => {
    try {
      const qty = toNonNegative3(quantity, { allowZero: false });
      if (qty === null) {
        return { success: false, error: 'Invalid quantity. Use a positive number with up to 3 decimals.' };
      }
      const current = getCurrentStock(productId);
      if (qty > current + 1e-9) {
        return { success: false, error: 'insufficient_stock', available: current };
      }
      const after = round3(current - qty);
      const result = db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, notes)
        VALUES (?, ?, 'out', ?, ?, ?, ?, 'manual', ?)
      `).run(businessId, productId, qty, current, after, reason, notes || null);
      const product = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(productId);
      logAudit(db, {
        businessId,
        action: 'stock_out',
        entityType: 'stock',
        entityId: productId,
        entityLabel: product?.name || `Product #${productId}`,
        summary: `Removed ${qty} units from '${product?.name || productId}'. Reason: ${reason}`,
        detailJson: { product: product?.name, qty, before: current, after, reason }
      });
      return { success: true, data: { movementId: result.lastInsertRowid, newQuantity: after } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:adjust', (event, { businessId, productId, newQuantity, reason, notes }) => {
    try {
      const normalizedNewQuantity = toNonNegative3(newQuantity, { allowZero: true });
      if (normalizedNewQuantity === null) {
        return { success: false, error: 'Invalid quantity. Use a non-negative number with up to 3 decimals.' };
      }
      const current = getCurrentStock(productId);
      const diff = round3(normalizedNewQuantity - current);
      const qty = round3(Math.abs(diff));
      const type = 'adjustment';
      const result = db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'adjustment', ?)
      `).run(businessId, productId, type, qty, current, normalizedNewQuantity, reason, notes || null);
      const product = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(productId);
      logAudit(db, {
        businessId,
        action: 'stock_adjust',
        entityType: 'stock',
        entityId: productId,
        entityLabel: product?.name || `Product #${productId}`,
        summary: `Corrected '${product?.name || productId}' stock: ${current} \u2192 ${normalizedNewQuantity} units`,
        detailJson: { product: product?.name, before: current, after: normalizedNewQuantity, reason }
      });
      return { success: true, data: { movementId: result.lastInsertRowid, newQuantity: normalizedNewQuantity, diff } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:batchAdjustIn', (event, { businessId, items }) => {
    try {
      const batchTx = db.transaction(() => {
        const results = [];
        const insertMove = db.prepare(`
          INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, notes)
          VALUES (?, ?, 'in', ?, ?, ?, ?, 'manual', ?)
        `);
        for (const item of items) {
          const qty = toNonNegative3(item.quantity, { allowZero: false });
          if (qty === null) {
            throw new Error('Invalid batch quantity. Use positive numbers with up to 3 decimals.');
          }
          const current = getCurrentStock(item.productId);
          const after = round3(current + qty);
          const res = insertMove.run(businessId, item.productId, qty, current, after, item.reason || 'Batch Stock-In', item.notes || null);
          results.push({ productId: item.productId, movementId: res.lastInsertRowid, newQuantity: after });
        }
        return results;
      });
      const data = batchTx();
      logAudit(db, {
        businessId,
        action: 'stock_in',
        entityType: 'stock',
        entityId: null,
        entityLabel: null,
        summary: `Batch stock-in for ${items.length} products. Reason: ${items[0]?.reason || 'Batch Stock-In'}`,
        detailJson: { count: items.length, reason: items[0]?.reason || 'Batch Stock-In' }
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:demandOut', (event, { businessId, productId, quantity, demandId, demandLabel }) => {
    try {
      const qty = toNonNegative3(quantity, { allowZero: false });
      if (qty === null) {
        return { success: false, error: 'Invalid quantity. Use a positive number with up to 3 decimals.' };
      }
      const current = getCurrentStock(productId);
      if (qty > current + 1e-9) {
        return { success: false, error: 'insufficient_stock', available: current };
      }
      const after = round3(current - qty);
      db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, ref_id, ref_label)
        VALUES (?, ?, 'demand_out', ?, ?, ?, ?, 'demand', ?, ?)
      `).run(businessId, productId, qty, current, after, `Demand ${demandLabel || ''}`.trim(), demandId, demandLabel || null);
      return { success: true, data: { newQuantity: after } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:demandCancelIn', (event, { businessId, productId, quantity, demandId, demandLabel }) => {
    try {
      const qty = toNonNegative3(quantity, { allowZero: false });
      if (qty === null) {
        return { success: false, error: 'Invalid quantity. Use a positive number with up to 3 decimals.' };
      }
      const current = getCurrentStock(productId);
      const after = round3(current + qty);
      db.prepare(`
        INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, ref_id, ref_label)
        VALUES (?, ?, 'demand_cancel_in', ?, ?, ?, ?, 'demand', ?, ?)
      `).run(businessId, productId, qty, current, after, `Demand cancelled ${demandLabel || ''}`.trim(), demandId, demandLabel || null);
      return { success: true, data: { newQuantity: after } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Stock Queries ──────────────────────────────────────────────────

  ipcMain.handle('stock:getLevel', (event, productId) => {
    try {
      ensureStockRows(productId);
      const row = db.prepare('SELECT quantity, last_moved_at FROM stock_levels WHERE product_id = ?').get(productId);
      return { success: true, data: row || { quantity: 0, last_moved_at: null } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getLevels', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT p.id as productId, p.name as productName, p.sku, p.category,
               COALESCE(sl.quantity, 0) as quantity,
               COALESCE(rl.reorder_at, 0) as reorderAt,
               rl.reorder_qty as reorderQty,
               sl.last_moved_at as lastMovedAt,
               CASE
                 WHEN COALESCE(sl.quantity, 0) = 0 THEN 'out'
                 WHEN COALESCE(sl.quantity, 0) <= COALESCE(rl.reorder_at, 0) AND COALESCE(rl.reorder_at, 0) > 0 THEN 'low'
                 ELSE 'ok'
               END as status
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
        ORDER BY p.name ASC
      `).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getMovements', (event, { businessId, productId, type, source, dateFrom, dateTo, search, limit, offset }) => {
    try {
      let where = 'sm.business_id = ?';
      const params = [businessId];
      if (productId) { where += ' AND sm.product_id = ?'; params.push(productId); }
      if (type) { where += ' AND sm.type = ?'; params.push(type); }
      if (source) { where += ' AND sm.source = ?'; params.push(source); }
      if (dateFrom) { where += " AND sm.moved_at >= ?"; params.push(dateFrom); }
      if (dateTo) { where += " AND sm.moved_at <= ?"; params.push(dateTo + ' 23:59:59'); }
      if (search) {
        where += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const countRow = db.prepare(`SELECT COUNT(*) as total FROM stock_movements sm JOIN products p ON p.id = sm.product_id WHERE ${where}`).get(...params);

      const lim = limit || 50;
      const off = offset || 0;
      params.push(lim, off);

      const rows = db.prepare(`
        SELECT sm.*, p.name as product_name, p.sku as product_sku
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        WHERE ${where}
        ORDER BY sm.moved_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      return { success: true, data: { movements: rows, total: countRow.total } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getMovementsByProduct', (event, { productId, limit, offset }) => {
    try {
      const lim = limit || 50;
      const off = offset || 0;
      const rows = db.prepare(`
        SELECT sm.*, p.name as product_name, p.sku as product_sku
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        WHERE sm.product_id = ?
        ORDER BY sm.moved_at DESC
        LIMIT ? OFFSET ?
      `).all(productId, lim, off);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getLowStockProducts', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT p.id as productId, p.name as productName, p.sku, p.category,
               COALESCE(sl.quantity, 0) as quantity,
               COALESCE(rl.reorder_at, 0) as reorderAt,
               rl.reorder_qty as reorderQty
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND COALESCE(rl.reorder_at, 0) > 0
          AND COALESCE(sl.quantity, 0) <= COALESCE(rl.reorder_at, 0)
          AND COALESCE(sl.quantity, 0) > 0
        ORDER BY (COALESCE(sl.quantity, 0) - COALESCE(rl.reorder_at, 0)) ASC
      `).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getOutOfStockProducts', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT p.id as productId, p.name as productName, p.sku, p.category,
               0 as quantity,
               COALESCE(rl.reorder_at, 0) as reorderAt,
               rl.reorder_qty as reorderQty
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND COALESCE(sl.quantity, 0) = 0
        ORDER BY p.name ASC
      `).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getLowStockCount', (event, businessId) => {
    try {
      const low = db.prepare(`
        SELECT COUNT(*) as cnt FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND COALESCE(rl.reorder_at, 0) > 0
          AND COALESCE(sl.quantity, 0) <= COALESCE(rl.reorder_at, 0)
          AND COALESCE(sl.quantity, 0) > 0
      `).get(businessId);
      const out = db.prepare(`
        SELECT COUNT(*) as cnt FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND COALESCE(sl.quantity, 0) = 0
      `).get(businessId);
      return { success: true, data: { lowCount: low.cnt, outCount: out.cnt } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Reorder Levels ─────────────────────────────────────────────────

  // ── Expiry Tracking ─────────────────────────────────────────────────
  ipcMain.handle('stock:getExpiryProducts', (event, { businessId, daysAhead }) => {
    try {
      // Find the Expiry Date column for this business
      const expiryCol = db.prepare(
        "SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Expiry Date' AND type = 'date'"
      ).get(businessId);

      if (!expiryCol) {
        return { success: true, data: [] };
      }

      const days = daysAhead || 30;
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

      // Get products with expiry date set (expired or expiring soon)
      const rows = db.prepare(`
        SELECT p.id as productId, p.name as productName, p.sku, p.category,
               pv.value as expiryDate,
               COALESCE(sl.quantity, 0) as quantity,
               CASE
                 WHEN pv.value < ? THEN 'expired'
                 WHEN pv.value <= ? THEN 'expiring_soon'
                 ELSE 'ok'
               END as expiryStatus
        FROM products p
        INNER JOIN product_values pv ON pv.product_id = p.id AND pv.column_id = ?
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND pv.value IS NOT NULL AND pv.value != ''
          AND pv.value <= ?
        ORDER BY pv.value ASC
      `).all(today, futureDate, expiryCol.id, businessId, futureDate);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:setReorderLevel', (event, { productId, reorderAt, reorderQty }) => {
    try {
      const normalizedReorderAt = toNonNegative3(reorderAt, { allowZero: true });
      const normalizedReorderQty = toNonNegative3(reorderQty, { allowZero: true, allowNull: true });
      if (normalizedReorderAt === null || (reorderQty !== null && reorderQty !== undefined && reorderQty !== '' && normalizedReorderQty === null)) {
        return { success: false, error: 'Invalid reorder values. Use non-negative numbers with up to 3 decimals.' };
      }
      db.prepare(`
        INSERT INTO reorder_levels (product_id, reorder_at, reorder_qty, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(product_id) DO UPDATE SET
          reorder_at = ?, reorder_qty = ?, updated_at = datetime('now')
      `).run(productId, normalizedReorderAt, normalizedReorderQty, normalizedReorderAt, normalizedReorderQty);
      return { success: true, data: { productId, reorderAt: normalizedReorderAt, reorderQty: normalizedReorderQty } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:setBulkReorderLevels', (event, items) => {
    try {
      const bulkTx = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO reorder_levels (product_id, reorder_at, reorder_qty, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(product_id) DO UPDATE SET
            reorder_at = ?, reorder_qty = ?, updated_at = datetime('now')
        `);
        for (const item of items) {
          const normalizedReorderAt = toNonNegative3(item.reorderAt, { allowZero: true });
          const normalizedReorderQty = toNonNegative3(item.reorderQty, { allowZero: true, allowNull: true });
          if (normalizedReorderAt === null || (item.reorderQty !== null && item.reorderQty !== undefined && item.reorderQty !== '' && normalizedReorderQty === null)) {
            throw new Error('Invalid reorder values. Use non-negative numbers with up to 3 decimals.');
          }
          stmt.run(item.productId, normalizedReorderAt, normalizedReorderQty, normalizedReorderAt, normalizedReorderQty);
        }
      });
      bulkTx();
      return { success: true, data: { saved: items.length } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getReorderLevel', (event, productId) => {
    try {
      ensureStockRows(productId);
      const row = db.prepare('SELECT reorder_at as reorderAt, reorder_qty as reorderQty FROM reorder_levels WHERE product_id = ?').get(productId);
      return { success: true, data: row || { reorderAt: 0, reorderQty: null } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Stock Import / Export ──────────────────────────────────────────

  ipcMain.handle('stock:importCSV', (event, { businessId, rows, mode }) => {
    try {
      const importTx = db.transaction(() => {
        let imported = 0;
        const errors = [];
        const insertMove = db.prepare(`
          INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source)
          VALUES (?, ?, ?, ?, ?, ?, 'Bulk import', 'import')
        `);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Find product by SKU or name
            let product = null;
            if (row.SKU || row.sku) {
              product = db.prepare('SELECT id FROM products WHERE business_id = ? AND sku = ? AND is_deleted = 0').get(businessId, row.SKU || row.sku);
            }
            if (!product && (row['Product Name'] || row.name)) {
              product = db.prepare('SELECT id FROM products WHERE business_id = ? AND name = ? AND is_deleted = 0').get(businessId, row['Product Name'] || row.name);
            }
            if (!product) {
              errors.push({ row: i + 1, error: `Product not found: ${row.SKU || row.sku || row['Product Name'] || row.name || 'unknown'}` });
              continue;
            }

            const qty = toNonNegative3(row.Quantity || row.quantity || 0, { allowZero: true });
            if (qty === null) {
              errors.push({ row: i + 1, error: `Invalid quantity: ${row.Quantity || row.quantity}` });
              continue;
            }

            const rowMode = (row.Mode || row.mode || mode || 'add').toLowerCase();
            const current = getCurrentStock(product.id);

            if (rowMode === 'set') {
              const diff = round3(Math.abs(qty - current));
              const type = 'adjustment';
              insertMove.run(businessId, product.id, type, diff, current, qty);
            } else {
              // add mode
              const after = round3(current + qty);
              insertMove.run(businessId, product.id, 'in', qty, current, after);
            }
            imported++;
          } catch (err) {
            errors.push({ row: i + 1, error: err.message });
          }
        }
        return { imported, errors };
      });
      const data = importTx();
      logAudit(db, {
        businessId,
        action: 'stock_import',
        entityType: 'stock',
        entityId: null,
        entityLabel: null,
        summary: `Stock import: ${data.imported} products updated${data.errors.length > 0 ? ' (' + data.errors.length + ' errors)' : ''}`,
        detailJson: { imported: data.imported, errors: data.errors.length }
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:exportCSV', (event, { businessId, includeHistory }) => {
    try {
      if (includeHistory) {
        const movements = db.prepare(`
          SELECT p.name as "Product Name", p.sku as "SKU", sm.type as "Type",
                 sm.quantity as "Quantity", sm.quantity_before as "Before", sm.quantity_after as "After",
                 sm.reason as "Reason", sm.source as "Source", sm.ref_label as "Reference",
                 sm.notes as "Notes", sm.moved_at as "Date"
          FROM stock_movements sm
          JOIN products p ON p.id = sm.product_id
          WHERE sm.business_id = ?
          ORDER BY sm.moved_at DESC
        `).all(businessId);

        const headers = ['Product Name','SKU','Type','Quantity','Before','After','Reason','Source','Reference','Notes','Date'];
        const csvRows = [headers.join(',')];
        for (const m of movements) {
          const row = headers.map(h => `"${String(m[h] || '').replace(/"/g, '""')}"`);
          csvRows.push(row.join(','));
        }
        return { success: true, data: csvRows.join('\n') };
      } else {
        const rows = db.prepare(`
          SELECT p.name as "Product Name", p.sku as "SKU", p.category as "Category",
                 COALESCE(sl.quantity, 0) as "Current Stock",
                 COALESCE(rl.reorder_at, 0) as "Reorder At",
                 rl.reorder_qty as "Reorder Qty",
                 CASE
                   WHEN COALESCE(sl.quantity, 0) = 0 THEN 'OUT'
                   WHEN COALESCE(sl.quantity, 0) <= COALESCE(rl.reorder_at, 0) AND COALESCE(rl.reorder_at, 0) > 0 THEN 'LOW'
                   ELSE 'OK'
                 END as "Status",
                 sl.last_moved_at as "Last Updated"
          FROM products p
          LEFT JOIN stock_levels sl ON sl.product_id = p.id
          LEFT JOIN reorder_levels rl ON rl.product_id = p.id
          WHERE p.business_id = ? AND p.is_deleted = 0
          ORDER BY p.name ASC
        `).all(businessId);

        const headers = ['Product Name','SKU','Category','Current Stock','Reorder At','Reorder Qty','Status','Last Updated'];
        const csvRows = [headers.join(',')];
        for (const r of rows) {
          const row = headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`);
          csvRows.push(row.join(','));
        }
        return { success: true, data: csvRows.join('\n') };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 4: Buyer Management IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Helper: compute payment status ──
  function computePaymentStatus(outstanding, totalPaid, demandsCount) {
    if (demandsCount === 0) return 'none';
    if (outstanding <= 0) return 'paid';
    if (outstanding > 0 && totalPaid > 0) return 'partial';
    return 'outstanding';
  }

  // ── Helper: generate next buyer code ──
  function generateBuyerCode(businessId) {
    const row = db.prepare(
      "SELECT MAX(CAST(SUBSTR(buyer_code, 3) AS INTEGER)) as maxNum FROM buyers WHERE business_id = ?"
    ).get(businessId);
    const nextNum = (row.maxNum || 0) + 1;
    return 'B-' + String(nextNum).padStart(5, '0');
  }

  // ── Buyer CRUD ─────────────────────────────────────────────────────

  ipcMain.handle('buyers:getAll', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT b.*,
               COALESCE(bb.total_billed, 0)  as total_billed,
               COALESCE(bb.total_paid, 0)    as total_paid,
               COALESCE(bb.outstanding, 0)   as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at,
               bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE b.business_id = ? AND b.is_active = 1
        ORDER BY CASE WHEN b.last_activity_at IS NOT NULL THEN b.last_activity_at ELSE b.created_at END DESC
      `).all(businessId);

      const buyers = rows.map(r => ({
        ...r,
        payment_status: computePaymentStatus(r.outstanding, r.total_paid, r.demands_count),
      }));

      return { success: true, data: buyers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:getById', (event, buyerId) => {
    try {
      const r = db.prepare(`
        SELECT b.*,
               COALESCE(bb.total_billed, 0)  as total_billed,
               COALESCE(bb.total_paid, 0)    as total_paid,
               COALESCE(bb.outstanding, 0)   as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at,
               bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE b.id = ?
      `).get(buyerId);

      if (!r) return { success: false, error: 'Buyer not found' };

      return {
        success: true,
        data: {
          ...r,
          payment_status: computePaymentStatus(r.outstanding, r.total_paid, r.demands_count),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:search', (event, { businessId, query }) => {
    try {
      const q = `%${query}%`;
      const rows = db.prepare(`
        SELECT b.*,
               COALESCE(bb.total_billed, 0)  as total_billed,
               COALESCE(bb.total_paid, 0)    as total_paid,
               COALESCE(bb.outstanding, 0)   as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at, bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE b.business_id = ? AND b.is_active = 1
          AND (b.full_name LIKE ? OR b.phone LIKE ? OR b.buyer_code LIKE ? OR b.business_name LIKE ?)
        ORDER BY b.full_name ASC
        LIMIT 20
      `).all(businessId, q, q, q, q);

      const buyers = rows.map(r => ({
        ...r,
        payment_status: computePaymentStatus(r.outstanding, r.total_paid, r.demands_count),
      }));

      return { success: true, data: buyers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:create', (event, { businessId, fullName, businessName, phone, email, address, city, photoPath, notes }) => {
    try {
      const createTx = db.transaction(() => {
        const buyerCode = generateBuyerCode(businessId);
        const result = db.prepare(`
          INSERT INTO buyers (business_id, buyer_code, full_name, business_name, phone, email, address, city, photo_path, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(businessId, buyerCode, fullName, businessName || null, phone || null, email || null, address || null, city || null, photoPath || null, notes || null);

        const buyerId = result.lastInsertRowid;
        db.prepare('INSERT INTO buyer_balances (buyer_id) VALUES (?)').run(buyerId);

        const buyer = db.prepare(`
          SELECT b.*, 0 as total_billed, 0 as total_paid, 0 as outstanding, 0 as demands_count,
                 NULL as last_demand_at, NULL as last_payment_at
          FROM buyers b WHERE b.id = ?
        `).get(buyerId);

        return { ...buyer, payment_status: 'none' };
      });

      const newBuyer = createTx();
      logAudit(db, {
        businessId,
        action: 'create_buyer',
        entityType: 'buyer',
        entityId: newBuyer.id,
        entityLabel: `${newBuyer.full_name} (${newBuyer.buyer_code})`,
        summary: `Added buyer '${newBuyer.full_name}' (${newBuyer.buyer_code})`,
        detailJson: { name: newBuyer.full_name, code: newBuyer.buyer_code, phone: newBuyer.phone }
      });
      return { success: true, data: newBuyer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:update', (event, { buyerId, fullName, businessName, phone, email, address, city, photoPath, notes }) => {
    try {
      const fields = [];
      const vals = [];

      if (fullName !== undefined) { fields.push('full_name = ?'); vals.push(fullName); }
      if (businessName !== undefined) { fields.push('business_name = ?'); vals.push(businessName || null); }
      if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone || null); }
      if (email !== undefined) { fields.push('email = ?'); vals.push(email || null); }
      if (address !== undefined) { fields.push('address = ?'); vals.push(address || null); }
      if (city !== undefined) { fields.push('city = ?'); vals.push(city || null); }
      if (photoPath !== undefined) { fields.push('photo_path = ?'); vals.push(photoPath || null); }
      if (notes !== undefined) { fields.push('notes = ?'); vals.push(notes || null); }

      fields.push("updated_at = datetime('now')");
      vals.push(buyerId);

      db.prepare(`UPDATE buyers SET ${fields.join(', ')} WHERE id = ?`).run(...vals);

      // Return updated buyer with balances
      const r = db.prepare(`
        SELECT b.*,
               COALESCE(bb.total_billed, 0)  as total_billed,
               COALESCE(bb.total_paid, 0)    as total_paid,
               COALESCE(bb.outstanding, 0)   as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at, bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE b.id = ?
      `).get(buyerId);

      logAudit(db, {
        businessId: r.business_id,
        action: 'update_buyer',
        entityType: 'buyer',
        entityId: buyerId,
        entityLabel: r.full_name,
        summary: `Updated contact info for '${r.full_name}'`,
        detailJson: { updatedFields: [fullName !== undefined && 'fullName', phone !== undefined && 'phone', email !== undefined && 'email', address !== undefined && 'address'].filter(Boolean) }
      });

      return {
        success: true,
        data: { ...r, payment_status: computePaymentStatus(r.outstanding, r.total_paid, r.demands_count) },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:archive', (event, buyerId) => {
    try {
      const bal = db.prepare('SELECT outstanding FROM buyer_balances WHERE buyer_id = ?').get(buyerId);
      if (bal && bal.outstanding > 0) {
        return { success: false, error: 'has_balance', outstanding: bal.outstanding };
      }
      const buyer = db.prepare('SELECT full_name, buyer_code, business_id FROM buyers WHERE id = ?').get(buyerId);
      db.prepare("UPDATE buyers SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(buyerId);
      if (buyer) {
        logAudit(db, {
          businessId: buyer.business_id,
          action: 'archive_buyer',
          entityType: 'buyer',
          entityId: buyerId,
          entityLabel: buyer.full_name,
          summary: `Archived buyer '${buyer.full_name}'`,
          detailJson: { name: buyer.full_name, code: buyer.buyer_code }
        });
      }
      return { success: true, data: { id: buyerId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:restore', (event, buyerId) => {
    try {
      db.prepare("UPDATE buyers SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(buyerId);
      const buyer = db.prepare('SELECT full_name, buyer_code, business_id FROM buyers WHERE id = ?').get(buyerId);
      if (buyer) {
        logAudit(db, {
          businessId: buyer.business_id,
          action: 'update_buyer',
          entityType: 'buyer',
          entityId: buyerId,
          entityLabel: buyer.full_name,
          summary: `Restored archived buyer '${buyer.full_name}'`,
          detailJson: { name: buyer.full_name, code: buyer.buyer_code }
        });
      }
      return { success: true, data: { id: buyerId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:delete', (event, buyerId) => {
    try {
      const bal = db.prepare('SELECT demands_count FROM buyer_balances WHERE buyer_id = ?').get(buyerId);
      if (bal && bal.demands_count > 0) {
        return { success: false, error: 'has_history' };
      }
      const payCount = db.prepare('SELECT COUNT(*) as cnt FROM payments WHERE buyer_id = ?').get(buyerId);
      if (payCount && payCount.cnt > 0) {
        return { success: false, error: 'has_history' };
      }
      const buyer = db.prepare('SELECT full_name, buyer_code, business_id FROM buyers WHERE id = ?').get(buyerId);
      db.prepare('DELETE FROM buyer_balances WHERE buyer_id = ?').run(buyerId);
      db.prepare('DELETE FROM buyers WHERE id = ?').run(buyerId);
      if (buyer) {
        logAudit(db, {
          businessId: buyer.business_id,
          action: 'delete_buyer',
          entityType: 'buyer',
          entityId: buyerId,
          entityLabel: buyer.full_name,
          summary: `Permanently deleted buyer '${buyer.full_name}'`,
          detailJson: { name: buyer.full_name, code: buyer.buyer_code }
        });
      }
      return { success: true, data: { id: buyerId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:uploadPhoto', (event, srcPath) => {
    try {
      const userDataPath = app.getPath('userData');
      const photosDir = path.join(userDataPath, 'buyer-photos');
      if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
      const ext = path.extname(srcPath);
      const fileName = `buyer_${Date.now()}${ext}`;
      const destPath = path.join(photosDir, fileName);
      fs.copyFileSync(srcPath, destPath);
      return { success: true, data: destPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:getArchived', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT b.*,
               COALESCE(bb.total_billed, 0)  as total_billed,
               COALESCE(bb.total_paid, 0)    as total_paid,
               COALESCE(bb.outstanding, 0)   as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at, bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE b.business_id = ? AND b.is_active = 0
        ORDER BY b.updated_at DESC
      `).all(businessId);

      const buyers = rows.map(r => ({
        ...r,
        payment_status: computePaymentStatus(r.outstanding, r.total_paid, r.demands_count),
      }));

      return { success: true, data: buyers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('buyers:recalcBalance', (event, buyerId) => {
    try {
      // Sum all payments
      const payRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as totalPaid, MAX(paid_at) as lastPaid FROM payments WHERE buyer_id = ?').get(buyerId);
      // For now demands_count=0 and total_billed=0 until M5 is built
      const demandBilled = 0;
      const demandCount = 0;
      const lastDemand = null;

      db.prepare(`
        INSERT INTO buyer_balances (buyer_id, total_billed, total_paid, outstanding, demands_count, last_demand_at, last_payment_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(buyer_id) DO UPDATE SET
          total_billed = ?, total_paid = ?, outstanding = ?, demands_count = ?,
          last_demand_at = ?, last_payment_at = ?, updated_at = datetime('now')
      `).run(
        buyerId, demandBilled, payRow.totalPaid, demandBilled - payRow.totalPaid, demandCount, lastDemand, payRow.lastPaid,
        demandBilled, payRow.totalPaid, demandBilled - payRow.totalPaid, demandCount, lastDemand, payRow.lastPaid
      );

      return { success: true, data: { totalBilled: demandBilled, totalPaid: payRow.totalPaid, outstanding: demandBilled - payRow.totalPaid } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Payments ───────────────────────────────────────────────────────

  ipcMain.handle('payments:create', (event, { businessId, buyerId, demandId, amount, method, referenceNo, notes, paidAt }) => {
    try {
      const effectivePaidAt = paidAt || new Date().toISOString();
      const effectiveMethod = method || 'cash';

      const payTx = db.transaction(() => {
        // Update buyer last_activity_at
        db.prepare("UPDATE buyers SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(buyerId);

        const updatedDemands = [];

        if (demandId) {
          // ── Explicit demand payment ─────────────────────────────
          const result = db.prepare(`
            INSERT INTO payments (business_id, buyer_id, demand_id, amount, method, reference_no, notes, paid_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(businessId, buyerId, demandId, amount, effectiveMethod, referenceNo || null, notes || null, effectivePaidAt);

          const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
          if (demand && demand.status !== 'draft' && demand.status !== 'cancelled') {
            const newAmountPaid = round2((demand.amount_paid || 0) + amount);
            const newBalanceDue = round2(demand.grand_total - newAmountPaid);
            let newStatus = 'outstanding';
            if (newBalanceDue <= 0) newStatus = 'paid';
            else if (newAmountPaid > 0) newStatus = 'partial';

            db.prepare(`
              UPDATE demands SET amount_paid = ?, balance_due = ?, status = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(newAmountPaid, Math.max(newBalanceDue, 0), newStatus, demandId);
            updatedDemands.push(db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId));
          }

          const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
          const balance = db.prepare('SELECT * FROM buyer_balances WHERE buyer_id = ?').get(buyerId);
          return { payment, updatedBalance: balance, updatedDemands };

        } else {
          // ── General buyer payment — auto-allocate to oldest outstanding demands ──
          const outstandingDemands = db.prepare(`
            SELECT * FROM demands
            WHERE buyer_id = ? AND business_id = ? AND status IN ('outstanding', 'partial')
            ORDER BY confirmed_at ASC
          `).all(buyerId, businessId);

          let remaining = round2(amount);

          for (const demand of outstandingDemands) {
            if (remaining <= 0) break;
            const allocation = round2(Math.min(remaining, demand.balance_due));
            if (allocation <= 0) continue;

            // Insert a payment row linked to this demand
            db.prepare(`
              INSERT INTO payments (business_id, buyer_id, demand_id, amount, method, reference_no, notes, paid_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(businessId, buyerId, demand.id, allocation, effectiveMethod, referenceNo || null, notes || null, effectivePaidAt);

            // Update demand financials
            const newAmountPaid = round2((demand.amount_paid || 0) + allocation);
            const newBalanceDue = round2(demand.grand_total - newAmountPaid);
            let newStatus = 'outstanding';
            if (newBalanceDue <= 0) newStatus = 'paid';
            else if (newAmountPaid > 0) newStatus = 'partial';

            db.prepare(`
              UPDATE demands SET amount_paid = ?, balance_due = ?, status = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(newAmountPaid, Math.max(newBalanceDue, 0), newStatus, demand.id);
            updatedDemands.push(db.prepare('SELECT * FROM demands WHERE id = ?').get(demand.id));

            remaining = round2(remaining - allocation);
          }

          // If any amount is left over (overpayment / no demands), store as unlinked payment
          if (remaining > 0) {
            db.prepare(`
              INSERT INTO payments (business_id, buyer_id, demand_id, amount, method, reference_no, notes, paid_at)
              VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
            `).run(businessId, buyerId, remaining, effectiveMethod, referenceNo || null, notes || null, effectivePaidAt);
          }

          // Return the last inserted payment and balance
          const lastPayment = db.prepare('SELECT * FROM payments WHERE buyer_id = ? ORDER BY id DESC LIMIT 1').get(buyerId);
          const balance = db.prepare('SELECT * FROM buyer_balances WHERE buyer_id = ?').get(buyerId);
          return { payment: lastPayment, updatedBalance: balance, updatedDemands };
        }
      });

      const data = payTx();
      const buyer = db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(buyerId);
      const demandInfo = data.updatedDemands?.length
        ? ` (allocated to ${data.updatedDemands.length} demand${data.updatedDemands.length > 1 ? 's' : ''})`
        : '';
      logAudit(db, {
        businessId,
        action: 'record_payment',
        entityType: 'payment',
        entityId: data.payment.id,
        entityLabel: buyer?.full_name || `Buyer #${buyerId}`,
        summary: `Recorded \u20A8${amount.toLocaleString()} payment from '${buyer?.full_name || buyerId}' (${effectiveMethod})${demandInfo}`,
        detailJson: { amount, method: effectiveMethod, buyerId, demandId, allocatedDemands: data.updatedDemands?.map(d => d.demand_code) }
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:getByBuyer', (event, { buyerId, limit, offset }) => {
    try {
      const lim = limit || 50;
      const off = offset || 0;
      const rows = db.prepare(`
        SELECT p.*
        FROM payments p
        WHERE p.buyer_id = ?
        ORDER BY p.paid_at DESC
        LIMIT ? OFFSET ?
      `).all(buyerId, lim, off);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:delete', (event, paymentId) => {
    try {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      if (!payment) return { success: false, error: 'Payment not found' };

      const buyer = db.prepare('SELECT full_name, business_id FROM buyers WHERE id = ?').get(payment.buyer_id);

      const delTx = db.transaction(() => {
        // If payment was linked to a demand, reverse the demand financials
        if (payment.demand_id) {
          const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(payment.demand_id);
          if (demand && demand.status !== 'draft' && demand.status !== 'cancelled') {
            const newAmountPaid = round2(Math.max((demand.amount_paid || 0) - payment.amount, 0));
            const newBalanceDue = round2(demand.grand_total - newAmountPaid);
            let newStatus = 'outstanding';
            if (newBalanceDue <= 0) newStatus = 'paid';
            else if (newAmountPaid > 0) newStatus = 'partial';

            db.prepare(`
              UPDATE demands SET amount_paid = ?, balance_due = ?, status = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(newAmountPaid, Math.max(newBalanceDue, 0), newStatus, payment.demand_id);
          }
        }

        db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);
        // Trigger auto-reverses buyer_balances
      });

      delTx();

      logAudit(db, {
        businessId: buyer?.business_id || payment.business_id,
        action: 'delete_payment',
        entityType: 'payment',
        entityId: paymentId,
        entityLabel: buyer?.full_name || `Buyer #${payment.buyer_id}`,
        summary: `Deleted \u20A8${payment.amount.toLocaleString()} payment from '${buyer?.full_name || payment.buyer_id}'`,
        detailJson: { amount: payment.amount, method: payment.method, buyerId: payment.buyer_id, demandId: payment.demand_id }
      });

      return { success: true, data: { id: paymentId, buyerId: payment.buyer_id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:getByBusiness', (event, { businessId, dateFrom, dateTo, limit, offset }) => {
    try {
      let where = 'p.business_id = ?';
      const params = [businessId];
      if (dateFrom) { where += ' AND p.paid_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND p.paid_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const lim = limit || 50;
      const off = offset || 0;
      params.push(lim, off);

      const rows = db.prepare(`
        SELECT p.*, COALESCE(b.full_name, 'Counter Sale') as buyer_name, b.buyer_code
        FROM payments p
        LEFT JOIN buyers b ON b.id = p.buyer_id
        WHERE ${where}
        ORDER BY p.paid_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Buyer Statement (for M7 Reports) ──────────────────────────────

  ipcMain.handle('buyers:getStatement', (event, { buyerId, dateFrom, dateTo }) => {
    try {
      // Get payments in range
      let payWhere = 'buyer_id = ?';
      const payParams = [buyerId];
      if (dateFrom) { payWhere += ' AND paid_at >= ?'; payParams.push(dateFrom); }
      if (dateTo) { payWhere += " AND paid_at <= ?"; payParams.push(dateTo + ' 23:59:59'); }

      const payments = db.prepare(`
        SELECT id, paid_at as date, 'payment' as type, id as ref_id,
               COALESCE(reference_no, 'Payment #' || id) as ref_label,
               0 as debit, amount as credit
        FROM payments
        WHERE ${payWhere}
      `).all(...payParams);

      // Note: demands will be added in M5. For now, statement is payments-only.
      const entries = [...payments].sort((a, b) => a.date.localeCompare(b.date));

      // Compute running balance (opening = total_billed - total_paid up to dateFrom)
      let runningBalance = 0;
      if (dateFrom) {
        const prior = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as priorPaid FROM payments WHERE buyer_id = ? AND paid_at < ?
        `).get(buyerId, dateFrom);
        runningBalance = -(prior.priorPaid || 0); // negative = credit prior
      }

      const statement = entries.map(e => {
        runningBalance = runningBalance + e.debit - e.credit;
        return { ...e, running_balance: runningBalance };
      });

      return { success: true, data: statement };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 5: Demand Management IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  const round2 = (v) => Math.round(v * 100) / 100;

  function computeLineItem(item) {
    const qty = Number(item.quantity ?? item.qty) || 0;
    const price = Number(item.unit_price ?? item.price) || 0;
    const lineSub = round3(qty * price);

    let discountAmount = 0;
    if (item.discount_type === 'percent') {
      discountAmount = round3((lineSub * (Number(item.discount_value) || 0)) / 100);
    } else if (item.discount_type === 'flat') {
      discountAmount = round3(Number(item.discount_value) || 0);
    }

    const afterDiscount = round3(lineSub - discountAmount);

    let taxAmount = 0;
    const taxType = item.tax_type || 'percent';
    const taxVal = Number(item.tax_value ?? item.tax_rate) || 0;
    if (taxType === 'percent') {
      taxAmount = round3((afterDiscount * taxVal) / 100);
    } else if (taxType === 'flat') {
      taxAmount = round3(taxVal);
    }

    const lineTotal = round3(afterDiscount + taxAmount);
    return { discountAmount, taxAmount, lineTotal };
  }

  function computeDemandTotals(items) {
    let subtotal = 0, totalDiscount = 0, totalTax = 0, grandTotal = 0;
    for (const item of items) {
      const qty = Number(item.quantity ?? item.qty) || 0;
      const price = Number(item.unit_price ?? item.price) || 0;
      const { discountAmount, taxAmount, lineTotal } = computeLineItem(item);
      subtotal += round3(qty * price);
      totalDiscount += discountAmount;
      totalTax += taxAmount;
      grandTotal += lineTotal;
    }
    return {
      subtotal: round3(subtotal),
      total_discount: round3(totalDiscount),
      total_tax: round3(totalTax),
      grand_total: round2(grandTotal),
    };
  }

  function generateDemandCode(businessId) {
    const row = db.prepare(
      "SELECT MAX(CAST(SUBSTR(demand_code, 3) AS INTEGER)) as maxNum FROM demands WHERE business_id = ?"
    ).get(businessId);
    const nextNum = (row.maxNum || 0) + 1;
    return 'D-' + String(nextNum).padStart(5, '0');
  }

  function generateSerialNumber(businessId) {
    let seq = db.prepare('SELECT * FROM demand_sequences WHERE business_id = ?').get(businessId);
    if (!seq) {
      db.prepare('INSERT INTO demand_sequences (business_id) VALUES (?)').run(businessId);
      seq = { prefix: 'INV', next_number: 1, padding: 5 };
    }
    const prefix = seq.prefix || 'INV';
    const num = seq.next_number || 1;
    const pad = seq.padding || 5;
    const serial = `${prefix}-${String(num).padStart(pad, '0')}`;
    db.prepare("UPDATE demand_sequences SET next_number = ?, updated_at = datetime('now') WHERE business_id = ?").run(num + 1, businessId);
    return serial;
  }

  // ── Demand CRUD ────────────────────────────────────────────────────

  ipcMain.handle('demands:getAll', (event, { businessId, status, buyerId, limit, offset, search }) => {
    try {
      let where = 'd.business_id = ?';
      const params = [businessId];
      if (status && status !== 'all') { where += ' AND d.status = ?'; params.push(status); }
      if (buyerId) { where += ' AND d.buyer_id = ?'; params.push(buyerId); }
      if (search) {
        where += " AND (d.demand_code LIKE ? OR d.serial_number LIKE ? OR COALESCE(b.full_name, d.buyer_name, '') LIKE ? OR COALESCE(b.phone, '') LIKE ?)";
        const q = `%${search}%`;
        params.push(q, q, q, q);
      }
      const lim = limit || 50;
      const off = offset || 0;
      params.push(lim, off);

      const rows = db.prepare(`
        SELECT d.*, COALESCE(b.full_name, d.buyer_name, 'Counter Sale') as buyer_name, b.buyer_code, b.phone as buyer_phone
        FROM demands d
        LEFT JOIN buyers b ON b.id = d.buyer_id
        WHERE ${where}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      // Count totals by status for tabs
      const countParams = [businessId];
      let countWhere = 'd.business_id = ?';
      if (buyerId) { countWhere += ' AND d.buyer_id = ?'; countParams.push(buyerId); }
      if (search) {
        countWhere += " AND (d.demand_code LIKE ? OR d.serial_number LIKE ? OR COALESCE(b.full_name, d.buyer_name, '') LIKE ? OR COALESCE(b.phone, '') LIKE ?)";
        const q2 = `%${search}%`;
        countParams.push(q2, q2, q2, q2);
      }
      const counts = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN d.status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN d.status = 'outstanding' THEN 1 ELSE 0 END) as outstanding,
          SUM(CASE WHEN d.status = 'partial' THEN 1 ELSE 0 END) as partial,
          SUM(CASE WHEN d.status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN d.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM demands d
        LEFT JOIN buyers b ON b.id = d.buyer_id
        WHERE ${countWhere}
      `).get(...countParams);

      return { success: true, data: { demands: rows, total: counts.total, statusCounts: counts } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:getById', (event, demandId) => {
    try {
      const d = db.prepare(`
        SELECT d.*, COALESCE(b.full_name, d.buyer_name, 'Counter Sale') as buyer_name, b.buyer_code, b.phone as buyer_phone,
               b.business_name as buyer_business_name, b.email as buyer_email,
               b.address as buyer_address, b.city as buyer_city, b.photo_path as buyer_photo_path
        FROM demands d
        LEFT JOIN buyers b ON b.id = d.buyer_id
        WHERE d.id = ?
      `).get(demandId);
      if (!d) return { success: false, error: 'Demand not found' };

      const items = db.prepare(
        'SELECT * FROM demand_items WHERE demand_id = ? ORDER BY position ASC'
      ).all(demandId);

      // Get buyer balance info
      const bal = db.prepare('SELECT * FROM buyer_balances WHERE buyer_id = ?').get(d.buyer_id);

      return {
        success: true,
        data: {
          ...d,
          buyer: {
            id: d.buyer_id, full_name: d.buyer_name, buyer_code: d.buyer_code,
            phone: d.buyer_phone, business_name: d.buyer_business_name,
            email: d.buyer_email, address: d.buyer_address, city: d.buyer_city,
            photo_path: d.buyer_photo_path,
            outstanding: bal ? bal.outstanding : 0,
            total_paid: bal ? bal.total_paid : 0,
            total_billed: bal ? bal.total_billed : 0,
          },
          items,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:getByBuyer', (event, { buyerId, status, limit, offset }) => {
    try {
      let where = 'd.buyer_id = ?';
      const params = [buyerId];
      if (status && status !== 'all') { where += ' AND d.status = ?'; params.push(status); }
      const lim = limit || 50;
      const off = offset || 0;
      params.push(lim, off);

      const rows = db.prepare(`
        SELECT d.*
        FROM demands d
        WHERE ${where}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:create', (event, { businessId, buyerId, buyerName, items, notes }) => {
    try {
      const createTx = db.transaction(() => {
        const demandCode = generateDemandCode(businessId);
        const serialNumber = generateSerialNumber(businessId);
        const computedItems = items.map((item, i) => {
          const { discountAmount, taxAmount, lineTotal } = computeLineItem(item);
          return { ...item, discount_amount: discountAmount, tax_amount: taxAmount, line_total: lineTotal, position: i };
        });
        const totals = computeDemandTotals(items);

        const res = db.prepare(`
          INSERT INTO demands (business_id, buyer_id, buyer_name, demand_code, serial_number, status, subtotal, total_discount, total_tax, grand_total, balance_due, notes)
          VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
        `).run(businessId, buyerId || null, buyerName || null, demandCode, serialNumber, totals.subtotal, totals.total_discount, totals.total_tax, totals.grand_total, totals.grand_total, notes || null);

        const demandId = res.lastInsertRowid;
        const insertItem = db.prepare(`
          INSERT INTO demand_items (demand_id, product_id, product_name, product_sku, unit_price, quantity, discount_type, discount_value, discount_amount, tax_type, tax_value, tax_amount, line_total, pack_quantity, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const ci of computedItems) {
          insertItem.run(
            demandId, ci.product_id, ci.product_name, ci.product_sku || null,
            ci.unit_price, ci.quantity,
            ci.discount_type || 'none', ci.discount_value || 0, ci.discount_amount,
            ci.tax_type || 'none', ci.tax_value || 0, ci.tax_amount,
            ci.line_total, ci.pack_quantity || 1, ci.position
          );
        }

        const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
        const savedItems = db.prepare('SELECT * FROM demand_items WHERE demand_id = ? ORDER BY position').all(demandId);
        return { ...demand, items: savedItems };
      });

      const newDemand = createTx();
      const buyer = buyerId ? db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(buyerId) : null;
      const buyerLabel = buyer?.full_name || buyerName || 'Counter Sale';
      logAudit(db, {
        businessId,
        action: 'create_demand',
        entityType: 'demand',
        entityId: newDemand.id,
        entityLabel: newDemand.demand_code,
        summary: `Created draft demand ${newDemand.demand_code} for '${buyerLabel}'`,
        detailJson: { demandCode: newDemand.demand_code, buyerName: buyerLabel, items: items.length, total: newDemand.grand_total }
      });
      return { success: true, data: newDemand };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:updateItems', (event, { demandId, items }) => {
    try {
      const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      if (!demand) return { success: false, error: 'Demand not found' };
      if (demand.status !== 'draft') return { success: false, error: 'Can only edit draft demands' };

      const updateTx = db.transaction(() => {
        db.prepare('DELETE FROM demand_items WHERE demand_id = ?').run(demandId);

        const computedItems = items.map((item, i) => {
          const { discountAmount, taxAmount, lineTotal } = computeLineItem(item);
          return { ...item, discount_amount: discountAmount, tax_amount: taxAmount, line_total: lineTotal, position: i };
        });
        const totals = computeDemandTotals(items);

        const insertItem = db.prepare(`
          INSERT INTO demand_items (demand_id, product_id, product_name, product_sku, unit_price, quantity, discount_type, discount_value, discount_amount, tax_type, tax_value, tax_amount, line_total, pack_quantity, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const ci of computedItems) {
          insertItem.run(
            demandId, ci.product_id, ci.product_name, ci.product_sku || null,
            ci.unit_price, ci.quantity,
            ci.discount_type || 'none', ci.discount_value || 0, ci.discount_amount,
            ci.tax_type || 'none', ci.tax_value || 0, ci.tax_amount,
            ci.line_total, ci.pack_quantity || 1, ci.position
          );
        }

        db.prepare(`
          UPDATE demands SET subtotal = ?, total_discount = ?, total_tax = ?, grand_total = ?,
            balance_due = ? - amount_paid, updated_at = datetime('now')
          WHERE id = ?
        `).run(totals.subtotal, totals.total_discount, totals.total_tax, totals.grand_total, totals.grand_total, demandId);

        const updated = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
        const savedItems = db.prepare('SELECT * FROM demand_items WHERE demand_id = ? ORDER BY position').all(demandId);
        return { ...updated, items: savedItems };
      });

      const result = updateTx();
      const buyerForAudit = db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(demand.buyer_id);
      logAudit(db, {
        businessId: demand.business_id,
        action: 'update_demand',
        entityType: 'demand',
        entityId: demandId,
        entityLabel: demand.demand_code,
        summary: `Updated items on draft ${demand.demand_code} (${items.length} items, \u20A8${result.grand_total?.toLocaleString()})`,
        detailJson: { demandCode: demand.demand_code, items: items.length, total: result.grand_total }
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:updateNotes', (event, { demandId, notes }) => {
    try {
      db.prepare("UPDATE demands SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, demandId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:confirm', (event, { demandId, paymentStatus, paidAmount }) => {
    try {
      const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      if (!demand) return { success: false, error: 'Demand not found' };
      if (demand.status !== 'draft') return { success: false, error: 'Only draft demands can be confirmed' };

      const items = db.prepare('SELECT * FROM demand_items WHERE demand_id = ?').all(demandId);
      if (items.length === 0) return { success: false, error: 'No items in this demand' };

      // Stock check — stock is in packs, demand quantity is in units
      const stockErrors = [];
      for (const item of items) {
        const availablePacks = getCurrentStock(item.product_id);
        const packQty = item.pack_quantity || getPackQuantity(demand.business_id, item.product_id);
        const availableUnits = round3(availablePacks * packQty);
        if (item.quantity > availableUnits) {
          stockErrors.push({
            productId: item.product_id,
            productName: item.product_name,
            required: item.quantity,
            available: availableUnits,
            availablePacks,
            packQty,
          });
        }
      }
      if (stockErrors.length > 0) {
        return { success: false, error: 'insufficient_stock', stockErrors };
      }

      const confirmTx = db.transaction(() => {
        const now = new Date().toISOString();
        // Status update → triggers trg_demand_confirmed (adds to buyer balance)
        db.prepare(`
          UPDATE demands SET status = 'confirmed', confirmed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(now, now, demandId);

        // Determine final status and payment based on paymentStatus option
        const effectiveStatus = paymentStatus || 'outstanding';
        let amountPaid = 0;
        let balanceDue = demand.grand_total;

        if (effectiveStatus === 'paid') {
          amountPaid = demand.grand_total;
          balanceDue = 0;
        } else if (effectiveStatus === 'partial') {
          amountPaid = round2(Math.min(Math.max(parseFloat(paidAmount) || 0, 0), demand.grand_total));
          balanceDue = round2(demand.grand_total - amountPaid);
        } else {
          // outstanding
          amountPaid = 0;
          balanceDue = demand.grand_total;
        }

        db.prepare(`
          UPDATE demands SET status = ?, amount_paid = ?, balance_due = ?, updated_at = ?
          WHERE id = ?
        `).run(effectiveStatus, amountPaid, Math.max(balanceDue, 0), now, demandId);

        // If paid or partial, record a payment entry
        if (amountPaid > 0 && demand.buyer_id) {
          db.prepare(`
            INSERT INTO payments (business_id, buyer_id, demand_id, amount, method, notes, paid_at)
            VALUES (?, ?, ?, ?, 'cash', 'Payment on confirmation', ?)
          `).run(demand.business_id, demand.buyer_id, demandId, amountPaid, now);
        }

        // Deduct stock for each item — convert demand units to packs using pack_quantity from demand_items
        for (const item of items) {
          const current = getCurrentStock(item.product_id);
          const packQty = item.pack_quantity || getPackQuantity(demand.business_id, item.product_id);
          // Convert: total_units = current_packs × pack_qty, remaining = total_units - demanded, new_packs = remaining / pack_qty
          const totalUnits = round3(current * packQty);
          const remainingUnits = round3(totalUnits - item.quantity);
          const newStockPacks = round3(remainingUnits / packQty);
          const packsDeducted = round3(current - newStockPacks);
          db.prepare(`
            INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, ref_id, ref_label)
            VALUES (?, ?, 'demand_out', ?, ?, ?, ?, 'demand', ?, ?)
          `).run(demand.business_id, item.product_id, packsDeducted, current, newStockPacks, `Demand ${demand.demand_code}`, demandId, demand.demand_code);
        }

        return db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      });

      const updated = confirmTx();
      const buyerForConfirm = demand.buyer_id ? db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(demand.buyer_id) : null;
      const confirmBuyerLabel = buyerForConfirm?.full_name || demand.buyer_name || 'Counter Sale';
      logAudit(db, {
        businessId: demand.business_id,
        action: 'confirm_demand',
        entityType: 'demand',
        entityId: demandId,
        entityLabel: demand.demand_code,
        summary: `Confirmed ${demand.demand_code} for '${confirmBuyerLabel}' \u2014 \u20A8${demand.grand_total?.toLocaleString()}`,
        detailJson: { demandCode: demand.demand_code, total: demand.grand_total, items: items.length }
      });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:cancel', (event, { demandId, reason }) => {
    try {
      const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      if (!demand) return { success: false, error: 'Demand not found' };
      if (!['outstanding', 'partial', 'confirmed'].includes(demand.status)) {
        return { success: false, error: 'Can only cancel confirmed/outstanding/partial demands' };
      }

      const cancelTx = db.transaction(() => {
        const items = db.prepare('SELECT * FROM demand_items WHERE demand_id = ?').all(demandId);

        // Restore stock for each item — reverse pack→unit conversion using stored pack_quantity
        for (const item of items) {
          const current = getCurrentStock(item.product_id);
          const packQty = item.pack_quantity || getPackQuantity(demand.business_id, item.product_id);
          const currentUnits = round3(current * packQty);
          const restoredUnits = round3(currentUnits + item.quantity);
          const newStockPacks = round3(restoredUnits / packQty);
          const packsAdded = round3(newStockPacks - current);
          db.prepare(`
            INSERT INTO stock_movements (business_id, product_id, type, quantity, quantity_before, quantity_after, reason, source, ref_id, ref_label)
            VALUES (?, ?, 'demand_cancel_in', ?, ?, ?, ?, 'demand', ?, ?)
          `).run(demand.business_id, item.product_id, packsAdded, current, newStockPacks, `Demand cancelled ${demand.demand_code}`, demandId, demand.demand_code);
        }

        // Status update → triggers trg_demand_cancelled
        db.prepare(`
          UPDATE demands SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now'), notes = CASE WHEN ? IS NOT NULL THEN COALESCE(notes || char(10), '') || 'Cancelled: ' || ? ELSE notes END
          WHERE id = ?
        `).run(reason || null, reason || null, demandId);

        return db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      });

      const updated = cancelTx();
      const buyerForCancel = db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(demand.buyer_id);
      logAudit(db, {
        businessId: demand.business_id,
        action: 'cancel_demand',
        entityType: 'demand',
        entityId: demandId,
        entityLabel: demand.demand_code,
        summary: `Cancelled ${demand.demand_code}. Stock restored.`,
        detailJson: { demandCode: demand.demand_code, reason, buyerName: buyerForCancel?.full_name }
      });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:delete', (event, demandId) => {
    try {
      const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      if (!demand) return { success: false, error: 'Demand not found' };
      if (demand.status !== 'draft') return { success: false, error: 'Can only delete draft demands' };

      db.prepare('DELETE FROM demand_items WHERE demand_id = ?').run(demandId);
      db.prepare('DELETE FROM demands WHERE id = ?').run(demandId);
      logAudit(db, {
        businessId: demand.business_id,
        action: 'delete_demand',
        entityType: 'demand',
        entityId: demandId,
        entityLabel: demand.demand_code,
        summary: `Deleted draft ${demand.demand_code}`,
        detailJson: { demandCode: demand.demand_code }
      });
      return { success: true, data: { id: demandId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:reopen', (event, demandId) => {
    try {
      const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      if (!demand) return { success: false, error: 'Demand not found' };
      if (demand.status !== 'cancelled') return { success: false, error: 'Can only reopen cancelled demands' };

      db.prepare(`
        UPDATE demands SET status = 'draft', cancelled_at = NULL, confirmed_at = NULL,
          amount_paid = 0, balance_due = grand_total, updated_at = datetime('now')
        WHERE id = ?
      `).run(demandId);

      const updated = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
      logAudit(db, {
        businessId: demand.business_id,
        action: 'update_demand',
        entityType: 'demand',
        entityId: demandId,
        entityLabel: demand.demand_code,
        summary: `Reopened ${demand.demand_code} as draft`,
        detailJson: { demandCode: demand.demand_code }
      });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Demand Payments ────────────────────────────────────────────────

  ipcMain.handle('demands:recordPayment', (event, { demandId, buyerId, businessId, amount, method, referenceNo, notes, paidAt }) => {
    try {
      const payTx = db.transaction(() => {
        const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
        if (!demand) throw new Error('Demand not found');

        const effectiveBuyerId = buyerId || demand.buyer_id || null;

        // Insert payment linked to demand
        const payResult = db.prepare(`
          INSERT INTO payments (business_id, buyer_id, demand_id, amount, method, reference_no, notes, paid_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(businessId, effectiveBuyerId, demandId, amount, method || 'cash', referenceNo || null, notes || null, paidAt || new Date().toISOString());

        // Update demand financials
        const newAmountPaid = round2(demand.amount_paid + amount);
        const newBalanceDue = round2(demand.grand_total - newAmountPaid);
        let newStatus = 'outstanding';
        if (newBalanceDue <= 0) newStatus = 'paid';
        else if (newAmountPaid > 0) newStatus = 'partial';

        db.prepare(`
          UPDATE demands SET amount_paid = ?, balance_due = ?, status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newAmountPaid, Math.max(newBalanceDue, 0), newStatus, demandId);

        // Update buyer last_activity (only if buyer exists)
        if (effectiveBuyerId) {
          db.prepare("UPDATE buyers SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(effectiveBuyerId);
        }

        const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payResult.lastInsertRowid);
        const updatedDemand = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
        return { payment, updatedDemand };
      });

      const data = payTx();
      const effectiveBuyerId = buyerId || data.updatedDemand.buyer_id || null;
      const buyerForDemandPay = effectiveBuyerId ? db.prepare('SELECT full_name FROM buyers WHERE id = ?').get(effectiveBuyerId) : null;
      const buyerLabel = buyerForDemandPay?.full_name || data.updatedDemand.buyer_name || 'Counter Sale';
      logAudit(db, {
        businessId,
        action: 'record_payment',
        entityType: 'payment',
        entityId: data.payment.id,
        entityLabel: data.updatedDemand.demand_code,
        summary: `Recorded \u20A8${amount.toLocaleString()} on ${data.updatedDemand.demand_code} from '${buyerLabel}'`,
        detailJson: { demandId, demandCode: data.updatedDemand.demand_code, amount, method: method || 'cash' }
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:getPayments', (event, demandId) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM payments WHERE demand_id = ? ORDER BY paid_at DESC
      `).all(demandId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:getSummary', (event, { businessId, dateFrom, dateTo }) => {
    try {
      let where = "d.business_id = ? AND d.status != 'draft' AND d.status != 'cancelled'";
      const params = [businessId];
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const summary = db.prepare(`
        SELECT
          COUNT(*) as total_demands,
          COALESCE(SUM(d.grand_total), 0) as total_value,
          COALESCE(SUM(d.amount_paid), 0) as total_collected,
          COALESCE(SUM(d.balance_due), 0) as total_outstanding
        FROM demands d
        WHERE ${where}
      `).get(...params);

      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:checkStock', (event, items) => {
    try {
      const errors = [];
      for (const item of items) {
        const availablePacks = getCurrentStock(item.productId);
        // Get businessId from product for pack quantity lookup
        const prod = db.prepare('SELECT business_id FROM products WHERE id = ?').get(item.productId);
        const bizId = prod ? prod.business_id : null;
        const packQty = bizId ? getPackQuantity(bizId, item.productId) : 1;
        const availableUnits = availablePacks * packQty;
        if (item.qty > availableUnits) {
          errors.push({
            productId: item.productId,
            productName: item.productName || item.product_name || 'Unknown',
            required: item.qty,
            available: availableUnits,
            availablePacks,
            packQty,
          });
        }
      }
      return errors.length === 0
        ? { success: true, data: { ok: true } }
        : { success: true, data: { ok: false, errors } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('demands:exportPDF', async (event) => {
    try {
      const { dialog } = require('electron');
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { success: false, error: 'No window available' };

      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: 'Invoice.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) return { success: false, cancelled: true };

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      });
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 6: Change History & Audit IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Product Field History ───────────────────────────────────────────

  ipcMain.handle('history:getByProduct', (event, { businessId, search, columnId, limit, offset }) => {
    try {
      const lim = limit || 100;
      const off = offset || 0;

      let where = 'p.business_id = ?';
      const params = [businessId];

      if (search) {
        where += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
      }
      if (columnId) {
        where += ' AND ch.column_id = ?';
        params.push(columnId);
      }

      const countRow = db.prepare(
        `SELECT COUNT(*) as total FROM column_history ch
         LEFT JOIN products p ON p.id = ch.product_id
         WHERE ${where}`
      ).get(...params);

      const allParams = [...params, lim, off];
      const rows = db.prepare(`
        SELECT ch.*, cc.name as column_name, cc.type as column_type,
               p.name as product_name, p.sku as product_sku
        FROM column_history ch
        LEFT JOIN custom_columns cc ON cc.id = ch.column_id
        LEFT JOIN products p ON p.id = ch.product_id
        WHERE ${where}
        ORDER BY ch.changed_at DESC
        LIMIT ? OFFSET ?
      `).all(...allParams);

      return { success: true, data: { rows, total: countRow.total } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history:getByColumn', (event, { productId, columnId, limit }) => {
    try {
      const lim = limit || 20;
      const rows = db.prepare(`
        SELECT ch.*, cc.name as column_name, cc.type as column_type
        FROM column_history ch
        LEFT JOIN custom_columns cc ON cc.id = ch.column_id
        WHERE ch.product_id = ? AND ch.column_id = ?
        ORDER BY ch.changed_at DESC
        LIMIT ?
      `).all(productId, columnId, lim);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history:getRecentChanges', (event, { businessId, limit }) => {
    try {
      const lim = limit || 50;
      const rows = db.prepare(`
        SELECT ch.*, cc.name as column_name, cc.type as column_type,
               p.name as product_name, p.sku as product_sku
        FROM column_history ch
        LEFT JOIN custom_columns cc ON cc.id = ch.column_id
        LEFT JOIN products p ON p.id = ch.product_id
        WHERE p.business_id = ?
        ORDER BY ch.changed_at DESC
        LIMIT ?
      `).all(businessId, lim);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── System Audit Log ───────────────────────────────────────────────

  ipcMain.handle('audit:getAll', (event, { businessId, action, entityType, userId, dateFrom, dateTo, search, limit, offset }) => {
    try {
      let where = 'business_id = ?';
      const params = [businessId];

      if (action && action !== 'all') { where += ' AND action = ?'; params.push(action); }
      if (entityType && entityType !== 'all') { where += ' AND entity_type = ?'; params.push(entityType); }
      if (userId) { where += ' AND user_id = ?'; params.push(userId); }
      if (dateFrom) { where += ' AND logged_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND logged_at <= ?"; params.push(dateTo + ' 23:59:59'); }
      if (search) { where += ' AND summary LIKE ?'; params.push(`%${search}%`); }

      const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_log WHERE ${where}`).get(...params);

      const lim = limit || 100;
      const off = offset || 0;
      params.push(lim, off);

      const rows = db.prepare(`
        SELECT * FROM audit_log WHERE ${where}
        ORDER BY logged_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);

      return { success: true, data: { rows, total: countRow.total } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit:getByEntity', (event, { entityType, entityId, limit }) => {
    try {
      const lim = limit || 50;
      const rows = db.prepare(`
        SELECT * FROM audit_log
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY logged_at DESC
        LIMIT ?
      `).all(entityType, entityId, lim);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit:getRecentActivity', (event, { businessId, limit }) => {
    try {
      const lim = limit || 20;
      const rows = db.prepare(`
        SELECT * FROM audit_log
        WHERE business_id = ?
        ORDER BY logged_at DESC
        LIMIT ?
      `).all(businessId, lim);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit:getStats', (event, { businessId, dateFrom, dateTo }) => {
    try {
      let where = 'business_id = ?';
      const params = [businessId];
      if (dateFrom) { where += ' AND logged_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND logged_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const rows = db.prepare(`
        SELECT action, entity_type, COUNT(*) as cnt
        FROM audit_log
        WHERE ${where}
        GROUP BY action, entity_type
      `).all(...params);

      const byAction = {};
      const byEntity = {};
      let total = 0;
      for (const r of rows) {
        byAction[r.action] = (byAction[r.action] || 0) + r.cnt;
        byEntity[r.entity_type] = (byEntity[r.entity_type] || 0) + r.cnt;
        total += r.cnt;
      }

      return { success: true, data: { byAction, byEntity, total } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit:exportCSV', (event, { businessId, filters, tab }) => {
    try {
      if (tab === 'product-history') {
        // Export product field history
        let where = 'p.business_id = ?';
        const params = [businessId];
        if (filters?.productId) { where += ' AND ch.product_id = ?'; params.push(filters.productId); }
        if (filters?.columnId) { where += ' AND ch.column_id = ?'; params.push(filters.columnId); }
        if (filters?.dateFrom) { where += ' AND ch.changed_at >= ?'; params.push(filters.dateFrom); }
        if (filters?.dateTo) { where += " AND ch.changed_at <= ?"; params.push(filters.dateTo + ' 23:59:59'); }

        const rows = db.prepare(`
          SELECT ch.changed_at, p.name as product_name, p.sku, cc.name as column_name,
                 ch.old_value, ch.new_value, COALESCE(ch.changed_by, 'Admin') as changed_by
          FROM column_history ch
          LEFT JOIN products p ON p.id = ch.product_id
          LEFT JOIN custom_columns cc ON cc.id = ch.column_id
          WHERE ${where}
          ORDER BY ch.changed_at DESC
        `).all(...params);

        const headers = ['Date', 'Time', 'Product', 'SKU', 'Column', 'Old Value', 'New Value', 'Changed By'];
        const csvRows = [headers.join(',')];
        for (const r of rows) {
          const dt = r.changed_at ? new Date(r.changed_at) : new Date();
          csvRows.push([
            `"${dt.toISOString().split('T')[0]}"`,
            `"${dt.toTimeString().split(' ')[0]}"`,
            `"${(r.product_name || '').replace(/"/g, '""')}"`,
            `"${(r.sku || '').replace(/"/g, '""')}"`,
            `"${(r.column_name || '').replace(/"/g, '""')}"`,
            `"${(r.old_value || '').replace(/"/g, '""')}"`,
            `"${(r.new_value || '').replace(/"/g, '""')}"`,
            `"${r.changed_by || 'Admin'}"`,
          ].join(','));
        }
        return { success: true, data: csvRows.join('\n') };
      }

      if (tab === 'stock-log') {
        // Export stock movements
        let where = 'sm.business_id = ?';
        const params = [businessId];
        if (filters?.productId) { where += ' AND sm.product_id = ?'; params.push(filters.productId); }
        if (filters?.type) { where += ' AND sm.type = ?'; params.push(filters.type); }
        if (filters?.source) { where += ' AND sm.source = ?'; params.push(filters.source); }
        if (filters?.dateFrom) { where += ' AND sm.moved_at >= ?'; params.push(filters.dateFrom); }
        if (filters?.dateTo) { where += " AND sm.moved_at <= ?"; params.push(filters.dateTo + ' 23:59:59'); }

        const rows = db.prepare(`
          SELECT sm.*, p.name as product_name, p.sku
          FROM stock_movements sm
          JOIN products p ON p.id = sm.product_id
          WHERE ${where}
          ORDER BY sm.moved_at DESC
        `).all(...params);

        const headers = ['Date', 'Time', 'Product', 'SKU', 'Type', 'Quantity', 'Before', 'After', 'Reason', 'Source', 'Reference', 'User'];
        const csvRows = [headers.join(',')];
        for (const r of rows) {
          const dt = r.moved_at ? new Date(r.moved_at) : new Date();
          csvRows.push([
            `"${dt.toISOString().split('T')[0]}"`,
            `"${dt.toTimeString().split(' ')[0]}"`,
            `"${(r.product_name || '').replace(/"/g, '""')}"`,
            `"${(r.sku || '').replace(/"/g, '""')}"`,
            `"${r.type}"`,
            `"${r.quantity}"`,
            `"${r.quantity_before}"`,
            `"${r.quantity_after}"`,
            `"${(r.reason || '').replace(/"/g, '""')}"`,
            `"${r.source || ''}"`,
            `"${(r.ref_label || '').replace(/"/g, '""')}"`,
            `"Admin"`,
          ].join(','));
        }
        return { success: true, data: csvRows.join('\n') };
      }

      // Default: system audit log
      let where = 'business_id = ?';
      const params = [businessId];
      if (filters?.action && filters.action !== 'all') { where += ' AND action = ?'; params.push(filters.action); }
      if (filters?.entityType && filters.entityType !== 'all') { where += ' AND entity_type = ?'; params.push(filters.entityType); }
      if (filters?.dateFrom) { where += ' AND logged_at >= ?'; params.push(filters.dateFrom); }
      if (filters?.dateTo) { where += " AND logged_at <= ?"; params.push(filters.dateTo + ' 23:59:59'); }
      if (filters?.search) { where += ' AND summary LIKE ?'; params.push(`%${filters.search}%`); }

      const rows = db.prepare(`
        SELECT * FROM audit_log WHERE ${where}
        ORDER BY logged_at DESC
      `).all(...params);

      const headers = ['Date', 'Time', 'Action', 'Entity Type', 'Entity', 'Summary', 'User'];
      const csvRows = [headers.join(',')];
      for (const r of rows) {
        const dt = r.logged_at ? new Date(r.logged_at) : new Date();
        csvRows.push([
          `"${dt.toISOString().split('T')[0]}"`,
          `"${dt.toTimeString().split(' ')[0]}"`,
          `"${r.action}"`,
          `"${r.entity_type}"`,
          `"${(r.entity_label || '').replace(/"/g, '""')}"`,
          `"${(r.summary || '').replace(/"/g, '""')}"`,
          `"${r.user_label || 'Admin'}"`,
        ].join(','));
      }
      return { success: true, data: csvRows.join('\n') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 7: Reports & Analytics IPC Handlers (all read-only)
  // ═══════════════════════════════════════════════════════════════════════

  ipcMain.handle('reports:getDashboardStats', (event, businessId) => {
    try {
      // Total products
      const totalProducts = db.prepare(
        'SELECT COUNT(*) as c FROM products WHERE business_id = ? AND is_deleted = 0'
      ).get(businessId).c;

      // Out of stock
      const outOfStockCount = db.prepare(`
        SELECT COUNT(*) as c FROM products p
        JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0 AND sl.quantity <= 0
      `).get(businessId).c;

      // Low stock
      const lowStockCount = db.prepare(`
        SELECT COUNT(*) as c FROM products p
        JOIN stock_levels sl ON sl.product_id = p.id
        JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND sl.quantity > 0 AND sl.quantity <= rl.reorder_at AND rl.reorder_at > 0
      `).get(businessId).c;

      // Today's revenue + demand count
      const todayStats = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as todayRevenue,
               COUNT(*) as todayDemandCount
        FROM demands
        WHERE business_id = ?
          AND status NOT IN ('draft', 'cancelled')
          AND DATE(confirmed_at) = DATE('now')
      `).get(businessId);

      // This week revenue
      const weekRevenue = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as v
        FROM demands
        WHERE business_id = ?
          AND status NOT IN ('draft', 'cancelled')
          AND confirmed_at >= DATE('now', '-7 days')
      `).get(businessId).v;

      // This month revenue
      const monthRevenue = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as v
        FROM demands
        WHERE business_id = ?
          AND status NOT IN ('draft', 'cancelled')
          AND confirmed_at >= DATE('now', 'start of month')
      `).get(businessId).v;

      // Outstanding from buyer_balances (buyer-linked)
      const buyerOutstanding = db.prepare(`
        SELECT COUNT(*) as buyerCount, COALESCE(SUM(outstanding), 0) as totalAmt
        FROM buyer_balances bb
        JOIN buyers b ON b.id = bb.buyer_id
        WHERE b.business_id = ? AND b.is_active = 1 AND bb.outstanding > 0
      `).get(businessId);

      // Overall outstanding from demands (includes counter sales)
      const demandOutstanding = db.prepare(`
        SELECT COALESCE(SUM(balance_due), 0) as totalOutstanding,
               COALESCE(SUM(amount_paid), 0) as totalCollected,
               COUNT(CASE WHEN balance_due > 0 THEN 1 END) as outstandingCount
        FROM demands
        WHERE business_id = ? AND status NOT IN ('draft', 'cancelled')
      `).get(businessId);

      // Total buyers
      const totalBuyerCount = db.prepare(
        'SELECT COUNT(*) as c FROM buyers WHERE business_id = ? AND is_active = 1'
      ).get(businessId).c;

      // Revenue by day (last 7 days)
      const revenueByDay = db.prepare(`
        SELECT DATE(confirmed_at) as day,
               COALESCE(SUM(grand_total), 0) as revenue,
               COUNT(*) as demand_count
        FROM demands
        WHERE business_id = ?
          AND status NOT IN ('draft', 'cancelled')
          AND confirmed_at >= DATE('now', '-6 days')
        GROUP BY DATE(confirmed_at)
        ORDER BY day ASC
      `).all(businessId);

      // Revenue by month (last 6 months)
      const revenueByMonth = db.prepare(`
        SELECT strftime('%Y-%m', confirmed_at) as month,
               COALESCE(SUM(grand_total), 0) as revenue
        FROM demands
        WHERE business_id = ?
          AND status NOT IN ('draft', 'cancelled')
          AND confirmed_at >= DATE('now', '-6 months')
        GROUP BY strftime('%Y-%m', confirmed_at)
        ORDER BY month ASC
      `).all(businessId);

      return {
        success: true,
        data: {
          todayRevenue: todayStats.todayRevenue,
          todayDemandCount: todayStats.todayDemandCount,
          totalProducts,
          outOfStockCount,
          lowStockCount,
          outstandingBuyers: buyerOutstanding.buyerCount,
          outstandingAmount: demandOutstanding.totalOutstanding,
          totalCollected: demandOutstanding.totalCollected,
          outstandingOrderCount: demandOutstanding.outstandingCount,
          totalBuyerCount,
          weekRevenue,
          monthRevenue,
          revenueByDay,
          revenueByMonth,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getStockStatus', (event, { businessId, category, stockStatus, sortBy, sortDir, search }) => {
    try {
      // Find purchase price column
      const costCol = db.prepare(`
        SELECT id FROM custom_columns
        WHERE business_id = ? AND name IN ('Purchase Price', 'Cost Price', 'Recipe Cost')
        LIMIT 1
      `).get(businessId);

      // Find sale price column
      const saleCol = db.prepare(`
        SELECT id FROM custom_columns
        WHERE business_id = ? AND name IN ('Sale Price', 'Bulk Sale Price', 'Menu Price')
        LIMIT 1
      `).get(businessId);

      let where = 'p.business_id = ? AND p.is_deleted = 0';
      const params = [businessId];

      if (category) { where += ' AND p.category = ?'; params.push(category); }
      if (search) { where += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

      const rows = db.prepare(`
        SELECT p.id as product_id, p.name, p.sku, p.category, p.image_path,
               COALESCE(sl.quantity, 0) as current_stock,
               COALESCE(rl.reorder_at, 0) as reorder_at,
               COALESCE(rl.reorder_qty, 0) as reorder_qty,
               ${costCol ? `CAST(COALESCE(pv_cost.value, '0') AS REAL)` : '0'} as purchase_price,
               ${saleCol ? `CAST(COALESCE(pv_sale.value, '0') AS REAL)` : '0'} as sale_price
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        ${costCol ? `LEFT JOIN product_values pv_cost ON pv_cost.product_id = p.id AND pv_cost.column_id = ${costCol.id}` : ''}
        ${saleCol ? `LEFT JOIN product_values pv_sale ON pv_sale.product_id = p.id AND pv_sale.column_id = ${saleCol.id}` : ''}
        WHERE ${where}
        ORDER BY ${sortBy === 'name' ? 'p.name' : sortBy === 'value' ? 'current_stock * purchase_price' : 'sl.quantity'} ${sortDir === 'asc' ? 'ASC' : 'DESC'}
      `).all(...params);

      const result = rows.map(r => {
        let status = 'ok';
        if (r.current_stock <= 0) status = 'out';
        else if (r.reorder_at > 0 && r.current_stock <= r.reorder_at) status = 'low';
        const stockValue = r.current_stock * r.purchase_price;
        return { ...r, stock_status: status, stock_value: stockValue };
      });

      const filtered = stockStatus && stockStatus !== 'all'
        ? result.filter(r => r.stock_status === stockStatus)
        : result;

      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getLowStockReport', (event, businessId) => {
    try {
      const costCol = db.prepare(`
        SELECT id FROM custom_columns
        WHERE business_id = ? AND name IN ('Purchase Price', 'Cost Price', 'Recipe Cost')
        LIMIT 1
      `).get(businessId);

      const rows = db.prepare(`
        SELECT p.id as product_id, p.name, p.sku, p.category,
               COALESCE(sl.quantity, 0) as current_stock,
               COALESCE(rl.reorder_at, 0) as reorder_at,
               COALESCE(rl.reorder_qty, 20) as reorder_qty,
               ${costCol ? `CAST(COALESCE(pv_cost.value, '0') AS REAL)` : '0'} as purchase_price
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        ${costCol ? `LEFT JOIN product_values pv_cost ON pv_cost.product_id = p.id AND pv_cost.column_id = ${costCol.id}` : ''}
        WHERE p.business_id = ? AND p.is_deleted = 0
          AND (sl.quantity <= 0 OR (rl.reorder_at > 0 AND sl.quantity <= rl.reorder_at))
        ORDER BY (COALESCE(sl.quantity, 0) - COALESCE(rl.reorder_at, 0)) ASC
      `).all(businessId);

      const result = rows.map(r => ({
        ...r,
        stock_status: r.current_stock <= 0 ? 'out' : 'low',
        suggested_order: Math.max(0, (r.reorder_qty || 20) - r.current_stock),
      }));

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getTopProducts', (event, { businessId, dateFrom, dateTo, sortBy, limit: lim }) => {
    try {
      const topLimit = lim || 10;
      let where = "d.business_id = ? AND d.status NOT IN ('draft', 'cancelled')";
      const params = [businessId];
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const orderBy = sortBy === 'qty_sold' ? 'total_qty_sold DESC' : 'total_revenue DESC';

      const rows = db.prepare(`
        SELECT p.id as product_id, p.name, p.sku, p.category,
               SUM(di.quantity) as total_qty_sold,
               SUM(di.line_total) as total_revenue,
               COALESCE(sl.quantity, 0) as current_stock
        FROM demand_items di
        JOIN demands d ON d.id = di.demand_id
        JOIN products p ON p.id = di.product_id
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE ${where}
        GROUP BY di.product_id
        ORDER BY ${orderBy}
        LIMIT ?
      `).all(...params, topLimit);

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getSalesSummary', (event, { businessId, groupBy, dateFrom, dateTo }) => {
    try {
      let groupExpr, labelExpr;
      switch (groupBy) {
        case 'week':
          groupExpr = "strftime('%Y-W%W', d.confirmed_at)";
          labelExpr = "strftime('%Y-W%W', d.confirmed_at)";
          break;
        case 'month':
          groupExpr = "strftime('%Y-%m', d.confirmed_at)";
          labelExpr = "strftime('%Y-%m', d.confirmed_at)";
          break;
        default: // day
          groupExpr = "DATE(d.confirmed_at)";
          labelExpr = "DATE(d.confirmed_at)";
      }

      let where = "d.business_id = ? AND d.status NOT IN ('draft', 'cancelled')";
      const params = [businessId];
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const rows = db.prepare(`
        SELECT ${labelExpr} as period,
               COALESCE(SUM(d.grand_total), 0) as revenue,
               COUNT(*) as demand_count,
               COALESCE(SUM(d.total_discount), 0) as total_discount,
               COALESCE(SUM(d.total_tax), 0) as total_tax
        FROM demands d
        WHERE ${where}
        GROUP BY ${groupExpr}
        ORDER BY ${groupExpr} ASC
      `).all(...params);

      const result = rows.map(r => ({
        ...r,
        avg_order_value: r.demand_count > 0 ? Math.round(r.revenue / r.demand_count) : 0,
      }));

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getProfitLoss', (event, { businessId, dateFrom, dateTo, groupBy }) => {
    try {
      // ── Discover all cost-related columns for this business ──
      const allCols = db.prepare(
        `SELECT id, name, type FROM custom_columns WHERE business_id = ? AND is_visible = 1`
      ).all(businessId);

      const colByName = {};
      for (const c of allCols) colByName[c.name] = c;

      // Direct per-unit cost columns (priority order)
      const directCostCol = colByName['Purchase Price'] || colByName['Cost Price'] || colByName['Recipe Cost'] || null;
      // Pack-based cost columns
      const packPriceCol = colByName['Pack Price'] || null;
      const packQtyCol = colByName['Pack Quantity'] || null;
      // Combined cost columns (tailor etc.)
      const stitchingCostCol = colByName['Stitching Cost'] || null;
      const materialCostCol = colByName['Material Cost'] || null;

      // Determine the COGS strategy:
      // 1. Direct cost column (Purchase Price, Cost Price, Recipe Cost)
      // 2. Pack-based: Pack Price / Pack Quantity
      // 3. Combined costs: Stitching Cost + Material Cost
      // Strategy: compute per-product cost in a sub-select, then aggregate
      let costExpr = '0';
      const costJoins = [];
      if (directCostCol) {
        costJoins.push(`LEFT JOIN product_values pv_cost ON pv_cost.product_id = p.id AND pv_cost.column_id = ${directCostCol.id}`);
        if (packPriceCol && packQtyCol) {
          // Use direct cost if available, else fall back to Pack Price / Pack Quantity
          costJoins.push(`LEFT JOIN product_values pv_pp ON pv_pp.product_id = p.id AND pv_pp.column_id = ${packPriceCol.id}`);
          costJoins.push(`LEFT JOIN product_values pv_pq ON pv_pq.product_id = p.id AND pv_pq.column_id = ${packQtyCol.id}`);
          costExpr = `CASE
            WHEN CAST(COALESCE(pv_cost.value, '0') AS REAL) > 0
              THEN di.quantity * CAST(pv_cost.value AS REAL)
            WHEN CAST(COALESCE(pv_pq.value, '0') AS REAL) > 0
              THEN di.quantity * (CAST(COALESCE(pv_pp.value, '0') AS REAL) / CAST(pv_pq.value AS REAL))
            ELSE 0
          END`;
        } else {
          costExpr = `di.quantity * CAST(COALESCE(pv_cost.value, '0') AS REAL)`;
        }
      } else if (packPriceCol && packQtyCol) {
        costJoins.push(`LEFT JOIN product_values pv_pp ON pv_pp.product_id = p.id AND pv_pp.column_id = ${packPriceCol.id}`);
        costJoins.push(`LEFT JOIN product_values pv_pq ON pv_pq.product_id = p.id AND pv_pq.column_id = ${packQtyCol.id}`);
        costExpr = `CASE
          WHEN CAST(COALESCE(pv_pq.value, '0') AS REAL) > 0
            THEN di.quantity * (CAST(COALESCE(pv_pp.value, '0') AS REAL) / CAST(pv_pq.value AS REAL))
          ELSE 0
        END`;
      } else if (stitchingCostCol || materialCostCol) {
        if (stitchingCostCol) costJoins.push(`LEFT JOIN product_values pv_sc ON pv_sc.product_id = p.id AND pv_sc.column_id = ${stitchingCostCol.id}`);
        if (materialCostCol) costJoins.push(`LEFT JOIN product_values pv_mc ON pv_mc.product_id = p.id AND pv_mc.column_id = ${materialCostCol.id}`);
        const parts = [];
        if (stitchingCostCol) parts.push("CAST(COALESCE(pv_sc.value, '0') AS REAL)");
        if (materialCostCol) parts.push("CAST(COALESCE(pv_mc.value, '0') AS REAL)");
        costExpr = `di.quantity * (${parts.join(' + ')})`;
      }

      const hasCostData = costExpr !== '0';

      let groupExpr;
      switch (groupBy) {
        case 'week': groupExpr = "strftime('%Y-W%W', d.confirmed_at)"; break;
        case 'month': groupExpr = "strftime('%Y-%m', d.confirmed_at)"; break;
        default: groupExpr = "DATE(d.confirmed_at)";
      }

      let where = "d.business_id = ? AND d.status NOT IN ('draft', 'cancelled')";
      const params = [businessId];
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const rows = db.prepare(`
        SELECT ${groupExpr} as period,
               COALESCE(SUM(di.line_total), 0) as revenue,
               COALESCE(SUM(${costExpr}), 0) as cogs,
               COUNT(DISTINCT d.id) as demand_count
        FROM demand_items di
        JOIN demands d ON d.id = di.demand_id
        JOIN products p ON p.id = di.product_id
        ${costJoins.join('\n        ')}
        WHERE ${where}
        GROUP BY ${groupExpr}
        ORDER BY ${groupExpr} ASC
      `).all(...params);

      // Count products missing cost data
      let missingCostCount = 0;
      if (hasCostData) {
        // Build a condition to check that at least one cost value exists
        const missingConditions = [];
        if (directCostCol) missingConditions.push(`(pv_cost.value IS NULL OR pv_cost.value = '' OR pv_cost.value = '0')`);
        if (packPriceCol && packQtyCol && !directCostCol) {
          missingConditions.push(`(pv_pp.value IS NULL OR pv_pp.value = '' OR pv_pp.value = '0')`);
        }
        if (stitchingCostCol && !directCostCol) missingConditions.push(`(pv_sc.value IS NULL OR pv_sc.value = '' OR pv_sc.value = '0')`);
        if (materialCostCol && !directCostCol) missingConditions.push(`(pv_mc.value IS NULL OR pv_mc.value = '' OR pv_mc.value = '0')`);

        // For direct + pack combo, missing = both are missing
        let missingWhere;
        if (directCostCol && packPriceCol && packQtyCol) {
          missingWhere = `(pv_cost.value IS NULL OR pv_cost.value = '' OR pv_cost.value = '0') AND (pv_pp.value IS NULL OR pv_pp.value = '' OR pv_pp.value = '0')`;
        } else if (missingConditions.length > 0) {
          missingWhere = missingConditions.join(' AND ');
        } else {
          missingWhere = '1=1';
        }

        missingCostCount = db.prepare(`
          SELECT COUNT(DISTINCT di.product_id) as c
          FROM demand_items di
          JOIN demands d ON d.id = di.demand_id
          JOIN products p ON p.id = di.product_id
          ${costJoins.join('\n          ')}
          WHERE ${where} AND (${missingWhere})
        `).get(...params).c;
      } else {
        missingCostCount = db.prepare(`
          SELECT COUNT(DISTINCT di.product_id) as c
          FROM demand_items di
          JOIN demands d ON d.id = di.demand_id
          WHERE ${where}
        `).get(...params).c;
      }

      const result = rows.map(r => {
        const grossProfit = r.revenue - r.cogs;
        return {
          ...r,
          gross_profit: grossProfit,
          margin_pct: r.revenue > 0 ? Math.round((grossProfit / r.revenue) * 10000) / 100 : 0,
        };
      });

      return { success: true, data: { rows: result, missingCostCount } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getBuyerOutstandingReport', (event, { businessId, sortBy, minBalance, search }) => {
    try {
      // --- Buyer-linked outstanding ---
      let buyerWhere = 'b.business_id = ? AND b.is_active = 1 AND COALESCE(bb.outstanding, 0) > 0';
      const buyerParams = [businessId];
      if (minBalance) { buyerWhere += ' AND bb.outstanding >= ?'; buyerParams.push(minBalance); }
      if (search) { buyerWhere += ' AND (b.full_name LIKE ? OR b.buyer_code LIKE ?)'; buyerParams.push(`%${search}%`, `%${search}%`); }

      const buyerRows = db.prepare(`
        SELECT b.id as buyer_id, b.buyer_code, b.full_name, b.business_name, b.phone,
               COALESCE(bb.total_billed, 0) as total_billed,
               COALESCE(bb.total_paid, 0) as total_paid,
               COALESCE(bb.outstanding, 0) as outstanding,
               COALESCE(bb.demands_count, 0) as demands_count,
               bb.last_demand_at,
               bb.last_payment_at
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
        WHERE ${buyerWhere}
        ORDER BY COALESCE(bb.outstanding, 0) DESC
      `).all(...buyerParams);

      // --- Counter sale outstanding (demands with no buyer_id) ---
      let csWhere = "d.business_id = ? AND d.buyer_id IS NULL AND d.status NOT IN ('draft','cancelled') AND d.balance_due > 0";
      const csParams = [businessId];
      if (minBalance) { csWhere += ' AND d.balance_due >= ?'; csParams.push(minBalance); }
      if (search) { csWhere += ' AND (COALESCE(d.buyer_name, \'Counter Sale\') LIKE ?)'; csParams.push(`%${search}%`); }

      const csRows = db.prepare(`
        SELECT d.id as demand_id, d.demand_code,
               COALESCE(d.buyer_name, 'Counter Sale') as full_name,
               d.grand_total as total_billed,
               d.amount_paid as total_paid,
               d.balance_due as outstanding,
               1 as demands_count,
               d.confirmed_at as last_demand_at,
               NULL as last_payment_at,
               NULL as buyer_id, NULL as buyer_code, NULL as business_name, NULL as phone,
               1 as is_counter_sale
        FROM demands d
        WHERE ${csWhere}
        ORDER BY d.balance_due DESC
      `).all(...csParams);

      // Merge both lists
      const allRows = [
        ...buyerRows.map(r => ({ ...r, is_counter_sale: 0 })),
        ...csRows,
      ];

      // Sort merged list
      if (sortBy === 'name') allRows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      else if (sortBy === 'last_activity') allRows.sort((a, b) => (b.last_payment_at || '').localeCompare(a.last_payment_at || ''));
      else allRows.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

      const result = allRows.map(r => ({
        ...r,
        days_since_last_payment: r.last_payment_at
          ? Math.floor((Date.now() - new Date(r.last_payment_at).getTime()) / 86400000)
          : null,
      }));

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getBuyerStatement', (event, { buyerId, dateFrom, dateTo }) => {
    try {
      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
      if (!buyer) return { success: false, error: 'Buyer not found' };

      // Opening balance: sum of confirmed demand totals - payments before dateFrom
      let openingBalance = 0;
      if (dateFrom) {
        const priorBilled = db.prepare(`
          SELECT COALESCE(SUM(grand_total), 0) as v FROM demands
          WHERE buyer_id = ? AND status NOT IN ('draft','cancelled') AND confirmed_at < ?
        `).get(buyerId, dateFrom).v;
        const priorPaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as v FROM payments WHERE buyer_id = ? AND paid_at < ?
        `).get(buyerId, dateFrom).v;
        openingBalance = priorBilled - priorPaid;
      }

      // Demands in range
      let demandWhere = "buyer_id = ? AND status NOT IN ('draft','cancelled')";
      const demandParams = [buyerId];
      if (dateFrom) { demandWhere += ' AND confirmed_at >= ?'; demandParams.push(dateFrom); }
      if (dateTo) { demandWhere += " AND confirmed_at <= ?"; demandParams.push(dateTo + ' 23:59:59'); }

      const demands = db.prepare(`
        SELECT 'demand' as type, demand_code as ref_code, confirmed_at as event_date,
               grand_total as debit, 0 as credit, notes
        FROM demands WHERE ${demandWhere}
      `).all(...demandParams);

      // Payments in range
      let payWhere = 'buyer_id = ?';
      const payParams = [buyerId];
      if (dateFrom) { payWhere += ' AND paid_at >= ?'; payParams.push(dateFrom); }
      if (dateTo) { payWhere += " AND paid_at <= ?"; payParams.push(dateTo + ' 23:59:59'); }

      const payments = db.prepare(`
        SELECT 'payment' as type,
               CASE WHEN demand_id IS NOT NULL THEN 'D-' || demand_id ELSE 'General' END as ref_code,
               paid_at as event_date, 0 as debit, amount as credit, notes
        FROM payments WHERE ${payWhere}
      `).all(...payParams);

      const allEntries = [...demands, ...payments].sort((a, b) =>
        (a.event_date || '').localeCompare(b.event_date || '')
      );

      let running = openingBalance;
      const entries = allEntries.map(e => {
        running = running + e.debit - e.credit;
        return { ...e, running_balance: running };
      });

      const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredits = entries.reduce((s, e) => s + e.credit, 0);

      return {
        success: true,
        data: {
          buyer,
          openingBalance,
          entries,
          closingBalance: running,
          totalDebits,
          totalCredits,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getDemandHistoryReport', (event, { businessId, buyerId, status, dateFrom, dateTo, limit: lim, offset: off }) => {
    try {
      let where = 'd.business_id = ?';
      const params = [businessId];
      if (buyerId) { where += ' AND d.buyer_id = ?'; params.push(buyerId); }
      if (status) { where += ' AND d.status = ?'; params.push(status); }
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const total = db.prepare(`SELECT COUNT(*) as c FROM demands d WHERE ${where}`).get(...params).c;

      const rows = db.prepare(`
        SELECT d.id, d.demand_code, d.status, d.grand_total, d.amount_paid, d.balance_due,
               d.confirmed_at, d.created_at, d.notes,
               COALESCE(b.full_name, d.buyer_name, 'Counter Sale') as buyer_name, b.buyer_code,
               (SELECT COUNT(*) FROM demand_items di WHERE di.demand_id = d.id) as items_count
        FROM demands d
        LEFT JOIN buyers b ON b.id = d.buyer_id
        WHERE ${where}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, lim || 50, off || 0);

      return { success: true, data: { rows, total } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getDemandSummary', (event, { businessId, dateFrom, dateTo }) => {
    try {
      let where = "d.business_id = ? AND d.status NOT IN ('draft', 'cancelled')";
      const params = [businessId];
      if (dateFrom) { where += ' AND d.confirmed_at >= ?'; params.push(dateFrom); }
      if (dateTo) { where += " AND d.confirmed_at <= ?"; params.push(dateTo + ' 23:59:59'); }

      const summary = db.prepare(`
        SELECT COUNT(*) as total_demands,
               COALESCE(SUM(d.grand_total), 0) as total_value,
               COALESCE(SUM(d.amount_paid), 0) as total_collected,
               COALESCE(SUM(d.balance_due), 0) as total_outstanding
        FROM demands d WHERE ${where}
      `).get(...params);

      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:exportCSV', async (event, { data, filename }) => {
    try {
      const { dialog } = require('electron');
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow();
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: filename || 'report.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { success: false, cancelled: true };

      // data is an array of objects — convert to CSV
      if (!data || data.length === 0) return { success: false, error: 'No data to export' };
      const headers = Object.keys(data[0]);
      const csvLines = [headers.join(',')];
      for (const row of data) {
        csvLines.push(headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
      }
      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:exportExcel', async (event, { data, sheetName, filename }) => {
    try {
      const XLSX = require('xlsx');
      const { dialog } = require('electron');
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow();
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: filename || 'report.xlsx',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      });
      if (canceled || !filePath) return { success: false, cancelled: true };

      if (!data || data.length === 0) return { success: false, error: 'No data to export' };
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');

      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length + 2, ...data.map(r => String(r[key] || '').length).slice(0, 50))
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, filePath);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:exportPDF', async (event, { filename, title, headers, rows, summary, currency }) => {
    try {
      const { dialog } = require('electron');
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return { success: false, error: 'No window available' };

      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: (filename || 'report') + '.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) return { success: false, cancelled: true };

      // If no structured data passed, fallback to empty
      if (!headers || !rows || rows.length === 0) {
        return { success: false, error: 'No data to export' };
      }

      const cur = currency || '₹';
      const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Build summary cards HTML
      let summaryHtml = '';
      if (summary && summary.length > 0) {
        const cards = summary.map(s =>
          `<div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;text-align:center;">
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;">${s.label}</div>
            <div style="font-size:18px;font-weight:700;color:${s.color || '#111827'};">${s.value}</div>
          </div>`
        ).join('');
        summaryHtml = `<div style="display:flex;gap:12px;margin-bottom:20px;">${cards}</div>`;
      }

      // Build table HTML
      const thCells = headers.map(h =>
        `<th style="text-align:${h.align || 'left'};padding:8px 10px;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;white-space:nowrap;">${h.label}</th>`
      ).join('');

      const bodyRows = rows.map((row, i) => {
        const cells = headers.map(h => {
          const val = row[h.key] ?? '';
          return `<td style="text-align:${h.align || 'left'};padding:7px 10px;font-size:11px;color:${h.key === 'status' ? '#374151' : '#111827'};border-bottom:1px solid #f3f4f6;font-family:${h.mono ? "'Consolas','Courier New',monospace" : 'inherit'};font-weight:${h.bold ? '600' : 'normal'};">${val}</td>`;
        }).join('');
        return `<tr style="background:${i % 2 ? '#fafafa' : '#fff'};">${cells}</tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Inter', Arial, sans-serif; color: #111827; padding: 32px 28px; }
  @page { size: A4; margin: 15mm 12mm; }
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #111827;padding-bottom:12px;">
    <div>
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:2px;">${title || 'Report'}</h1>
      <p style="font-size:11px;color:#6b7280;">Generated on ${now}</p>
    </div>
  </div>
  ${summaryHtml}
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#f9fafb;">${thCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div style="margin-top:16px;font-size:9px;color:#9ca3af;text-align:center;">Page generated by InstaMall</div>
</body></html>`;

      // Render in a hidden BrowserWindow for clean A4 PDF
      const hiddenWin = new BrowserWindow({
        width: 800, height: 600, show: false,
        webPreferences: { offscreen: true },
      });

      await hiddenWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      // Small delay for rendering
      await new Promise(r => setTimeout(r, 500));

      const pdfBuffer = await hiddenWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      hiddenWin.destroy();

      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 8: Authentication & User Management IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Authentication ──────────────────────────────────────────────────

  ipcMain.handle('auth:login', (event, { businessId, username, pin }) => {
    try {
      const user = db.prepare(
        'SELECT * FROM users WHERE business_id = ? AND username = ? AND is_active = 1'
      ).get(businessId, username);
      if (!user) return { success: false, error: 'invalid_credentials' };
      if (!verifyPin(pin, user.pin_hash)) return { success: false, error: 'invalid_credentials' };

      db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);
      db.prepare('UPDATE app_settings SET last_active_user_id = ? WHERE business_id = ?').run(user.id, businessId);

      logAudit(db, {
        businessId, userId: user.id, userLabel: user.display_name,
        action: 'USER_LOGIN', entityType: 'user', entityId: user.id,
        entityLabel: user.display_name, summary: `${user.display_name} logged in`,
      });

      return { success: true, data: _sanitizeUser({ ...user, last_login_at: new Date().toISOString() }) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:loginNoPin', (event, { businessId, userId }) => {
    try {
      const user = db.prepare(
        'SELECT * FROM users WHERE id = ? AND business_id = ? AND is_active = 1'
      ).get(userId, businessId);
      if (!user) return { success: false, error: 'user_not_found' };

      db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);
      return { success: true, data: _sanitizeUser({ ...user, last_login_at: new Date().toISOString() }) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:checkStartupLock', (event, businessId) => {
    try {
      const settings = db.prepare('SELECT * FROM app_settings WHERE business_id = ?').get(businessId);
      if (!settings) {
        db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(businessId);
        return { success: true, data: { requiresPin: false, lastActiveUserId: null } };
      }
      return {
        success: true,
        data: {
          requiresPin: settings.require_pin_on_startup === 1,
          lastActiveUserId: settings.last_active_user_id,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', (event, { businessId, userId }) => {
    try {
      const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(userId);
      logAudit(db, {
        businessId, userId, userLabel: user?.display_name || 'Unknown',
        action: 'USER_LOGOUT', entityType: 'user', entityId: userId,
        entityLabel: user?.display_name, summary: `${user?.display_name || 'User'} logged out`,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:changePin', (event, { userId, currentPin, newPin }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, error: 'user_not_found' };
      if (!verifyPin(currentPin, user.pin_hash)) return { success: false, error: 'wrong_current_pin' };

      db.prepare('UPDATE users SET pin_hash = ?, pin_length = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hashPin(newPin), newPin.length, userId);

      logAudit(db, {
        businessId: user.business_id, userId, userLabel: user.display_name,
        action: 'USER_PIN_CHANGED', entityType: 'user', entityId: userId,
        entityLabel: user.display_name, summary: `${user.display_name} changed their PIN`,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:resetPin', (event, { targetUserId, newPin, requestingUserId }) => {
    try {
      const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(requestingUserId);
      if (!requester || requester.role !== 'admin') return { success: false, error: 'unauthorized' };

      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
      if (!target) return { success: false, error: 'user_not_found' };

      db.prepare('UPDATE users SET pin_hash = ?, pin_length = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hashPin(newPin), newPin.length, targetUserId);

      logAudit(db, {
        businessId: target.business_id, userId: requestingUserId, userLabel: requester.display_name,
        action: 'ADMIN_PIN_RESET', entityType: 'user', entityId: targetUserId,
        entityLabel: target.display_name,
        summary: `${requester.display_name} reset PIN for ${target.display_name}`,
        detailJson: { targetUserId, requestingUserId },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:verifyPin', (event, { userId, pin }) => {
    try {
      const user = db.prepare('SELECT pin_hash FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false };
      return { success: verifyPin(pin, user.pin_hash) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── User Management ─────────────────────────────────────────────────

  ipcMain.handle('users:getAll', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT id, username, display_name, role, avatar_color, is_active, is_default,
               last_login_at, created_at, pin_length, auth_method
        FROM users WHERE business_id = ?
        ORDER BY
          CASE role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 WHEN 'salesperson' THEN 2 WHEN 'viewer' THEN 3 END,
          created_at ASC
      `).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:getById', (event, userId) => {
    try {
      const user = db.prepare(
        'SELECT id, username, display_name, role, avatar_color, is_active, is_default, last_login_at, created_at, pin_length, auth_method, business_id FROM users WHERE id = ?'
      ).get(userId);
      return { success: true, data: user || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:create', (event, { businessId, username, displayName, role, pin, avatarColor }) => {
    try {
      // Validate username unique
      const existing = db.prepare('SELECT id FROM users WHERE business_id = ? AND username = ?').get(businessId, username);
      if (existing) return { success: false, error: 'Username already exists' };

      // Validate PIN
      if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return { success: false, error: 'PIN must be 4–6 digits' };
      }

      const result = db.prepare(`
        INSERT INTO users (business_id, username, display_name, role, pin_hash, pin_length, avatar_color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, username.toLowerCase().trim(), displayName.trim(), role, hashPin(pin), pin.length, avatarColor || '#2E86AB');

      const created = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

      logAudit(db, {
        businessId, action: 'CREATE_USER', entityType: 'user',
        entityId: created.id, entityLabel: displayName,
        summary: `Created user "${displayName}" with role ${role}`,
      });

      return { success: true, data: _sanitizeUser(created) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:update', (event, { userId, displayName, role, avatarColor }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, error: 'User not found' };

      const changes = [];
      if (displayName && displayName !== user.display_name) changes.push(`name: "${user.display_name}" → "${displayName}"`);
      if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
      if (avatarColor && avatarColor !== user.avatar_color) changes.push('avatar color changed');

      db.prepare(`
        UPDATE users SET display_name = ?, role = ?, avatar_color = ?, updated_at = datetime('now') WHERE id = ?
      `).run(displayName || user.display_name, role || user.role, avatarColor || user.avatar_color, userId);

      logAudit(db, {
        businessId: user.business_id, action: 'UPDATE_USER', entityType: 'user',
        entityId: userId, entityLabel: displayName || user.display_name,
        summary: `Updated user "${displayName || user.display_name}": ${changes.join(', ') || 'no changes'}`,
      });

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return { success: true, data: _sanitizeUser(updated) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:deactivate', (event, { userId, requestingUserId }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, error: 'User not found' };
      if (user.id === requestingUserId) return { success: false, error: 'Cannot deactivate yourself' };
      if (user.is_default === 1) return { success: false, error: 'Cannot deactivate the default admin' };

      // Check if this is the last active admin
      if (user.role === 'admin') {
        const activeAdmins = db.prepare(
          "SELECT COUNT(*) as c FROM users WHERE business_id = ? AND role = 'admin' AND is_active = 1"
        ).get(user.business_id).c;
        if (activeAdmins <= 1) return { success: false, error: 'Cannot deactivate the only active admin' };
      }

      db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(userId);

      logAudit(db, {
        businessId: user.business_id, action: 'DEACTIVATE_USER', entityType: 'user',
        entityId: userId, entityLabel: user.display_name,
        summary: `Deactivated user "${user.display_name}"`,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:reactivate', (event, userId) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, error: 'User not found' };

      db.prepare("UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(userId);

      logAudit(db, {
        businessId: user.business_id, action: 'REACTIVATE_USER', entityType: 'user',
        entityId: userId, entityLabel: user.display_name,
        summary: `Reactivated user "${user.display_name}"`,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:delete', (event, { userId, requestingUserId }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return { success: false, error: 'User not found' };
      if (user.is_default === 1) return { success: false, error: 'Cannot delete the default admin' };
      if (user.id === requestingUserId) return { success: false, error: 'Cannot delete yourself' };

      // Check if user has audit history
      const historyCount = db.prepare('SELECT COUNT(*) as c FROM audit_log WHERE user_id = ?').get(userId).c;
      if (historyCount > 0) {
        return { success: false, error: 'User has history — deactivate instead of deleting' };
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      logAudit(db, {
        businessId: user.business_id, userId: requestingUserId,
        action: 'DELETE_USER', entityType: 'user',
        entityId: userId, entityLabel: user.display_name,
        summary: `Deleted user "${user.display_name}"`,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Auth Settings ───────────────────────────────────────────────────

  ipcMain.handle('settings:getAuthSettings', (event, businessId) => {
    try {
      let settings = db.prepare('SELECT * FROM app_settings WHERE business_id = ?').get(businessId);
      if (!settings) {
        db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(businessId);
        settings = { require_pin_on_startup: 0, auto_lock_after_minutes: 0, last_active_user_id: null };
      }
      return {
        success: true,
        data: {
          require_pin_on_startup: settings.require_pin_on_startup,
          auto_lock_after_minutes: settings.auto_lock_after_minutes,
          last_active_user_id: settings.last_active_user_id,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:updateAuthSettings', (event, { businessId, requirePinOnStartup, autoLockAfterMinutes }) => {
    try {
      db.prepare(`
        INSERT INTO app_settings (business_id, require_pin_on_startup, auto_lock_after_minutes)
        VALUES (?, ?, ?)
        ON CONFLICT(business_id) DO UPDATE SET
          require_pin_on_startup = excluded.require_pin_on_startup,
          auto_lock_after_minutes = excluded.auto_lock_after_minutes
      `).run(businessId, requirePinOnStartup ? 1 : 0, autoLockAfterMinutes || 0);

      logAudit(db, {
        businessId, action: 'UPDATE_SETTINGS', entityType: 'settings',
        summary: `Updated security settings: startup_lock=${requirePinOnStartup ? 'on' : 'off'}, auto_lock=${autoLockAfterMinutes || 0}min`,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:hasUsers', (event, businessId) => {
    try {
      const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE business_id = ?').get(businessId).c;
      return { success: true, data: count > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:setupAdmin', (event, { businessId, displayName, username, pin }) => {
    try {
      if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return { success: false, error: 'PIN must be 4–6 digits' };
      }
      // Check if any users already exist
      const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE business_id = ?').get(businessId).c;
      if (count > 0) return { success: false, error: 'Admin already exists' };

      const result = db.prepare(`
        INSERT INTO users (business_id, username, display_name, role, pin_hash, pin_length, avatar_color, is_active, is_default)
        VALUES (?, ?, ?, 'admin', ?, ?, '#1E3A5F', 1, 1)
      `).run(businessId, username.toLowerCase().trim(), displayName.trim(), hashPin(pin), pin.length);

      db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(businessId);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      return { success: true, data: _sanitizeUser(user) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODULE 9: Data & Backup IPC Handlers
  // ═══════════════════════════════════════════════════════════════════════

  // ── Helper: perform backup ──────────────────────────────────────────
  function _performBackup({ businessId, userId, userLabel, triggerType, destinationFolder }) {
    try {
      // Get business name for filename
      const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(businessId);
      const safeName = (biz?.name || 'Business').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const filename = `InstaMall_Backup_${safeName}_${dateStr}_${timeStr}.db`;

      // Determine destination folder
      let folder = destinationFolder;
      if (!folder) {
        const settings = db.prepare('SELECT auto_backup_folder FROM app_settings WHERE business_id = ?').get(businessId);
        folder = settings?.auto_backup_folder;
      }
      if (!folder) {
        folder = path.join(app.getPath('documents'), 'InstaMall Backups');
      }
      fs.mkdirSync(folder, { recursive: true });

      const destPath = path.join(folder, filename);

      // VACUUM INTO creates a clean, compact, atomic backup copy
      db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);

      const stats = fs.statSync(destPath);

      // Insert backup log
      db.prepare(`
        INSERT INTO backup_log (business_id, filename, file_path, file_size_bytes, trigger_type, status)
        VALUES (?, ?, ?, ?, ?, 'success')
      `).run(businessId, filename, destPath, stats.size, triggerType);

      // Update last backup time
      db.prepare(`
        UPDATE app_settings SET last_backup_at = datetime('now')
        WHERE business_id = ?
      `).run(businessId);

      // Enforce max backup copies
      const settingsRow = db.prepare('SELECT max_backup_copies FROM app_settings WHERE business_id = ?').get(businessId);
      const maxCopies = settingsRow?.max_backup_copies || 10;
      if (maxCopies > 0) {
        const allBackups = db.prepare(
          "SELECT id, file_path FROM backup_log WHERE business_id = ? AND status = 'success' ORDER BY created_at DESC"
        ).all(businessId);
        if (allBackups.length > maxCopies) {
          const toDelete = allBackups.slice(maxCopies);
          const delStmt = db.prepare('DELETE FROM backup_log WHERE id = ?');
          for (const old of toDelete) {
            try { if (fs.existsSync(old.file_path)) fs.unlinkSync(old.file_path); } catch (_) {}
            delStmt.run(old.id);
          }
        }
      }

      logAudit(db, {
        businessId, userId, userLabel,
        action: 'BACKUP_CREATED', entityType: 'backup',
        entityLabel: filename,
        summary: `Backup created: ${filename} (${triggerType})`,
      });

      return {
        success: true,
        data: {
          filePath: destPath, filename,
          fileSizeBytes: stats.size,
          createdAt: now.toISOString(),
          triggerType, status: 'success',
        },
      };
    } catch (error) {
      // Log failed backup
      try {
        db.prepare(
          "INSERT INTO backup_log (business_id, filename, file_path, file_size_bytes, trigger_type, status, error_message) VALUES (?, ?, ?, 0, ?, 'failed', ?)"
        ).run(businessId, 'failed_backup', '', triggerType, error.message);
      } catch (_) {}
      return { success: false, error: error.message };
    }
  }

  // ── Backup Handlers ─────────────────────────────────────────────────

  ipcMain.handle('backup:create', async (event, data) => {
    return _performBackup(data);
  });

  ipcMain.handle('backup:chooseFolder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    return { success: true, folderPath: result.filePaths[0] };
  });

  ipcMain.handle('backup:getLog', (event, businessId) => {
    try {
      const rows = db.prepare(
        'SELECT * FROM backup_log WHERE business_id = ? ORDER BY created_at DESC'
      ).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:deleteLogEntry', (event, { logId, deleteFile }) => {
    try {
      if (deleteFile) {
        const entry = db.prepare('SELECT file_path FROM backup_log WHERE id = ?').get(logId);
        if (entry?.file_path) {
          try { if (fs.existsSync(entry.file_path)) fs.unlinkSync(entry.file_path); } catch (_) {}
        }
      }
      db.prepare('DELETE FROM backup_log WHERE id = ?').run(logId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:clearOld', (event, { businessId, keepRecent }) => {
    try {
      const all = db.prepare(
        'SELECT id, file_path FROM backup_log WHERE business_id = ? ORDER BY created_at DESC'
      ).all(businessId);
      const toRemove = all.slice(keepRecent || 3);
      const delStmt = db.prepare('DELETE FROM backup_log WHERE id = ?');
      let deleted = 0;
      for (const entry of toRemove) {
        try { if (entry.file_path && fs.existsSync(entry.file_path)) fs.unlinkSync(entry.file_path); } catch (_) {}
        delStmt.run(entry.id);
        deleted++;
      }
      return { success: true, data: { deleted } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:getSettings', (event, businessId) => {
    try {
      db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(businessId);
      const settings = db.prepare(`
        SELECT auto_backup_enabled, auto_backup_frequency, auto_backup_time,
               auto_backup_folder, max_backup_copies, last_backup_at
        FROM app_settings WHERE business_id = ?
      `).get(businessId);
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:updateSettings', (event, {
    businessId, userId, userLabel,
    autoBackupEnabled, autoBackupFrequency, autoBackupTime,
    autoBackupFolder, maxBackupCopies
  }) => {
    try {
      db.prepare('INSERT OR IGNORE INTO app_settings (business_id) VALUES (?)').run(businessId);
      db.prepare(`
        UPDATE app_settings SET
          auto_backup_enabled = ?,
          auto_backup_frequency = ?,
          auto_backup_time = ?,
          auto_backup_folder = ?,
          max_backup_copies = ?
        WHERE business_id = ?
      `).run(
        autoBackupEnabled ? 1 : 0,
        autoBackupFrequency || 'daily',
        autoBackupTime || '23:00',
        autoBackupFolder || null,
        maxBackupCopies || 10,
        businessId
      );
      logAudit(db, {
        businessId, userId, userLabel,
        action: 'UPDATE_SETTINGS', entityType: 'settings',
        summary: `Backup schedule updated: ${autoBackupEnabled ? 'enabled' : 'disabled'}, ${autoBackupFrequency}, ${autoBackupTime}`,
      });
      const updated = db.prepare(`
        SELECT auto_backup_enabled, auto_backup_frequency, auto_backup_time,
               auto_backup_folder, max_backup_copies, last_backup_at
        FROM app_settings WHERE business_id = ?
      `).get(businessId);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:verifyFile', async (event, filePath) => {
    let testDb = null;
    try {
      if (!filePath || !filePath.endsWith('.db')) {
        return { success: true, data: { valid: false, error: 'File must be a .db file' } };
      }
      if (!fs.existsSync(filePath)) {
        return { success: true, data: { valid: false, error: 'File not found' } };
      }

      const stats = fs.statSync(filePath);
      testDb = new Database(filePath, { readonly: true, fileMustExist: true });

      // Integrity check
      const integrity = testDb.pragma('integrity_check');
      if (!integrity || integrity[0]?.integrity_check !== 'ok') {
        testDb.close();
        return { success: true, data: { valid: false, error: 'Database integrity check failed' } };
      }

      // Check expected tables
      const tables = testDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all().map(t => t.name);
      const requiredTables = ['businesses', 'products', 'buyers', 'demands'];
      const missing = requiredTables.filter(t => !tables.includes(t));
      if (missing.length > 0) {
        testDb.close();
        return { success: true, data: { valid: false, error: `Missing tables: ${missing.join(', ')}` } };
      }

      // Read record counts
      const countOf = (table) => {
        try { return testDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c; } catch { return 0; }
      };
      const tableCounts = {
        businesses: countOf('businesses'),
        products: countOf('products'),
        buyers: countOf('buyers'),
        demands: countOf('demands'),
        payments: countOf('payments'),
        stock_movements: countOf('stock_movements'),
        audit_log: countOf('audit_log'),
        users: countOf('users'),
      };

      // Read business names
      let businessNames = [];
      try {
        businessNames = testDb.prepare('SELECT name, type FROM businesses').all();
      } catch {}

      // Estimate backup date from audit_log or file modification
      let estimatedDate = new Date(stats.mtimeMs).toISOString();
      try {
        const lastAudit = testDb.prepare('SELECT created_at FROM audit_log ORDER BY id DESC LIMIT 1').get();
        if (lastAudit) estimatedDate = lastAudit.created_at;
      } catch {}

      testDb.close();

      const fileSize = stats.size;
      const fileSizeFormatted = fileSize < 1024 * 1024
        ? `${(fileSize / 1024).toFixed(1)} KB`
        : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

      return {
        success: true,
        data: {
          valid: true,
          fileSize,
          fileSizeFormatted,
          tables: tableCounts,
          businessNames,
          estimatedBackupDate: estimatedDate,
        },
      };
    } catch (error) {
      if (testDb) try { testDb.close(); } catch {}
      return { success: true, data: { valid: false, error: error.message } };
    }
  });

  // ── Restore Handler ─────────────────────────────────────────────────

  ipcMain.handle('backup:restore', async (event, { businessId, userId, userLabel, backupFilePath }) => {
    const liveDbPath = getDbPath();

    try {
      // Step 1: Pre-restore safety backup
      const safetyResult = _performBackup({
        businessId, userId, userLabel,
        triggerType: 'pre_restore',
        destinationFolder: null,
      });
      if (!safetyResult.success) {
        return { success: false, error: 'Failed to create safety backup: ' + safetyResult.error };
      }

      // Step 2: Close current DB connection
      db.close();

      // Step 3: Replace DB file
      fs.copyFileSync(backupFilePath, liveDbPath);

      // Step 4: Reopen DB connection with all migrations
      db = new Database(liveDbPath);
      db.pragma('journal_mode = WAL');

      // Re-run CREATE TABLE IF NOT EXISTS for any tables that might be newer
      // (minimal — just ensure backup_log and migration columns exist)
      db.exec(`
        CREATE TABLE IF NOT EXISTS backup_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size_bytes INTEGER,
          trigger_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'success',
          error_message TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'salesperson',
          pin_hash TEXT, password_hash TEXT, auth_method TEXT DEFAULT 'pin',
          pin_length INTEGER DEFAULT 4, avatar_color TEXT DEFAULT '#2E86AB',
          is_active INTEGER DEFAULT 1, is_default INTEGER DEFAULT 0,
          last_login_at TEXT, created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(business_id, username)
        );
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER NOT NULL,
          require_pin_on_startup INTEGER DEFAULT 0,
          auto_lock_after_minutes INTEGER DEFAULT 0,
          last_active_user_id INTEGER,
          UNIQUE(business_id)
        );
      `);

      // Re-run M9 column migrations
      const cols = db.prepare("PRAGMA table_info(app_settings)").all().map(c => c.name);
      if (!cols.includes('auto_backup_enabled')) db.exec('ALTER TABLE app_settings ADD COLUMN auto_backup_enabled INTEGER DEFAULT 0');
      if (!cols.includes('auto_backup_frequency')) db.exec("ALTER TABLE app_settings ADD COLUMN auto_backup_frequency TEXT DEFAULT 'daily'");
      if (!cols.includes('auto_backup_time')) db.exec("ALTER TABLE app_settings ADD COLUMN auto_backup_time TEXT DEFAULT '23:00'");
      if (!cols.includes('auto_backup_folder')) db.exec('ALTER TABLE app_settings ADD COLUMN auto_backup_folder TEXT');
      if (!cols.includes('max_backup_copies')) db.exec('ALTER TABLE app_settings ADD COLUMN max_backup_copies INTEGER DEFAULT 10');
      if (!cols.includes('last_backup_at')) db.exec('ALTER TABLE app_settings ADD COLUMN last_backup_at TEXT');

      // Step 5: Log restore in the NEW database
      logAudit(db, {
        businessId, userId, userLabel,
        action: 'RESTORE_DONE', entityType: 'backup',
        summary: `Data restored from backup: ${path.basename(backupFilePath)}`,
      });

      return { success: true, preRestoreBackupPath: safetyResult.data.filePath };
    } catch (error) {
      // Attempt to reopen the database if it's closed
      try {
        if (!db || !db.open) {
          db = new Database(liveDbPath);
          db.pragma('journal_mode = WAL');
        }
      } catch {}
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:chooseFile', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'InstaMall Backup', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    return { success: true, filePath: result.filePaths[0] };
  });

  // ── Data Import Handlers ────────────────────────────────────────────

  ipcMain.handle('import:parseFile', async (event, { filePath, fileType, fullData }) => {
    try {
      let headers = [];
      let allRows = [];

      if (fileType === 'csv' || filePath.endsWith('.csv')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const Papa = require('papaparse');
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
        headers = parsed.meta.fields || [];
        allRows = parsed.data;
      } else {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length > 0) headers = Object.keys(json[0]);
        allRows = json;
      }

      return {
        success: true,
        data: {
          headers,
          preview: allRows.slice(0, 5),
          allRows: fullData ? allRows : undefined,
          totalRows: allRows.length,
          fileSize: fs.statSync(filePath).size,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import:importProducts', (event, { businessId, userId, userLabel, rows, onConflict }) => {
    try {
      let imported = 0, updated = 0, skipped = 0;
      const errors = [];

      const insertProduct = db.prepare(`
        INSERT INTO products (business_id, name, sku, barcode, category, image_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', datetime('now'), datetime('now'))
      `);
      const findBySku = db.prepare('SELECT id FROM products WHERE business_id = ? AND sku = ? AND is_deleted = 0');
      const updateProduct = db.prepare('UPDATE products SET name = ?, barcode = ?, category = ?, updated_at = datetime(\'now\') WHERE id = ?');
      const insertStockLevel = db.prepare('INSERT OR IGNORE INTO stock_levels (product_id, quantity) VALUES (?, 0)');
      const insertReorder = db.prepare('INSERT OR IGNORE INTO reorder_levels (product_id, reorder_at) VALUES (?, 0)');

      // Get custom columns for this business
      const columns = db.prepare(
        'SELECT id, name, column_type FROM custom_columns WHERE business_id = ? AND is_deleted = 0 ORDER BY position'
      ).all(businessId);

      const insertValue = db.prepare(`
        INSERT OR REPLACE INTO product_values (product_id, column_id, value) VALUES (?, ?, ?)
      `);

      const txn = db.transaction(() => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          if (!row.name || !row.name.trim()) {
            errors.push({ row: i + 1, field: 'name', message: 'Product Name is required' });
            continue;
          }

          // Check SKU duplicate
          if (row.sku) {
            const existing = findBySku.get(businessId, row.sku);
            if (existing) {
              if (onConflict === 'skip') { skipped++; continue; }
              if (onConflict === 'update') {
                updateProduct.run(row.name.trim(), row.barcode || '', row.category || '', existing.id);
                // Update custom column values
                if (row.values) {
                  for (const col of columns) {
                    if (row.values[col.name] !== undefined) {
                      insertValue.run(existing.id, col.id, String(row.values[col.name]));
                    }
                  }
                }
                updated++;
                continue;
              }
            }
          }

          // Insert new product
          const result = insertProduct.run(businessId, row.name.trim(), row.sku || '', row.barcode || '', row.category || '');
          const productId = result.lastInsertRowid;
          insertStockLevel.run(productId);
          insertReorder.run(productId);

          // Insert custom column values
          if (row.values) {
            for (const col of columns) {
              if (row.values[col.name] !== undefined) {
                insertValue.run(productId, col.id, String(row.values[col.name]));
              }
            }
          }

          imported++;
        }
      });

      txn();

      logAudit(db, {
        businessId, userId, userLabel,
        action: 'IMPORT_PRODUCTS', entityType: 'product',
        summary: `Imported ${imported} products from file (updated: ${updated}, skipped: ${skipped}, errors: ${errors.length})`,
      });

      return { success: true, data: { imported, updated, skipped, errors } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import:importBuyers', (event, { businessId, userId, userLabel, rows, onConflict }) => {
    try {
      let imported = 0, updated = 0, skipped = 0;
      const errors = [];

      const insertBuyer = db.prepare(`
        INSERT INTO buyers (business_id, full_name, business_name, phone, email, address, city, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      const findByPhone = db.prepare("SELECT id FROM buyers WHERE business_id = ? AND phone = ? AND is_active = 1");
      const updateBuyer = db.prepare("UPDATE buyers SET full_name = ?, business_name = ?, email = ?, address = ?, city = ?, updated_at = datetime('now') WHERE id = ?");
      const insertBalance = db.prepare('INSERT OR IGNORE INTO buyer_balances (buyer_id, total_billed, total_paid, outstanding) VALUES (?, 0, 0, 0)');

      const txn = db.transaction(() => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          if (!row.fullName || !row.fullName.trim()) {
            errors.push({ row: i + 1, field: 'fullName', message: 'Full Name is required' });
            continue;
          }

          if (row.phone) {
            const existing = findByPhone.get(businessId, row.phone);
            if (existing) {
              if (onConflict === 'skip') { skipped++; continue; }
              if (onConflict === 'update') {
                updateBuyer.run(row.fullName.trim(), row.businessName || '', row.email || '', row.address || '', row.city || '', existing.id);
                updated++;
                continue;
              }
            }
          }

          const result = insertBuyer.run(businessId, row.fullName.trim(), row.businessName || '', row.phone || '', row.email || '', row.address || '', row.city || '');
          insertBalance.run(result.lastInsertRowid);
          imported++;
        }
      });

      txn();

      logAudit(db, {
        businessId, userId, userLabel,
        action: 'IMPORT_BUYERS', entityType: 'buyer',
        summary: `Imported ${imported} buyers from file (updated: ${updated}, skipped: ${skipped}, errors: ${errors.length})`,
      });

      return { success: true, data: { imported, updated, skipped, errors } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import:validateRows', (event, { rows, entityType, businessId }) => {
    try {
      const valid = [];
      const invalid = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors = [];

        if (entityType === 'products') {
          if (!row.name || !row.name.trim()) rowErrors.push({ field: 'name', message: 'Product Name is required' });
        } else if (entityType === 'buyers') {
          if (!row.fullName || !row.fullName.trim()) rowErrors.push({ field: 'fullName', message: 'Full Name is required' });
        }

        if (rowErrors.length > 0) {
          invalid.push({ row: i + 1, errors: rowErrors, data: row });
        } else {
          valid.push(row);
        }
      }

      return { success: true, data: { valid, invalid } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Data Export Handlers ────────────────────────────────────────────

  ipcMain.handle('export:products', (event, { businessId, filters }) => {
    try {
      let query = `
        SELECT p.*, sl.quantity as stock_qty, rl.reorder_at as reorder_level
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN reorder_levels rl ON rl.product_id = p.id
        WHERE p.business_id = ? AND p.is_deleted = 0
      `;
      const params = [businessId];

      if (filters?.category) {
        query += ' AND p.category = ?';
        params.push(filters.category);
      }
      if (filters?.stockStatus === 'out') {
        query += ' AND (sl.quantity IS NULL OR sl.quantity <= 0)';
      } else if (filters?.stockStatus === 'low') {
        query += ' AND sl.quantity > 0 AND sl.quantity <= COALESCE(rl.reorder_at, 0)';
      } else if (filters?.stockStatus === 'in') {
        query += ' AND sl.quantity > 0';
      }
      if (filters?.search) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY p.name';
      const products = db.prepare(query).all(...params);

      // Get custom columns
      const columns = db.prepare(
        'SELECT id, name, type FROM custom_columns WHERE business_id = ? ORDER BY position'
      ).all(businessId);

      // Get all product values
      const allValues = db.prepare(
        'SELECT product_id, column_id, value FROM product_values WHERE product_id IN (SELECT id FROM products WHERE business_id = ? AND is_deleted = 0)'
      ).all(businessId);

      const valueMap = {};
      for (const v of allValues) {
        if (!valueMap[v.product_id]) valueMap[v.product_id] = {};
        valueMap[v.product_id][v.column_id] = v.value;
      }

      // Build export rows
      const exportRows = products.map(p => {
        const row = {
          'Product Name': p.name,
          'SKU': p.sku || '',
          'Barcode': p.barcode || '',
          'Category': p.category || '',
        };
        // Add custom column values (skip cost-type if restricted)
        for (const col of columns) {
          if (filters?.hideCost && col.type === 'currency' && col.name.toLowerCase().includes('purchase')) continue;
          row[col.name] = valueMap[p.id]?.[col.id] || '';
        }
        row['Current Stock'] = p.stock_qty ?? 0;
        row['Reorder Level'] = p.reorder_level ?? 0;
        return row;
      });

      return { success: true, data: exportRows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('export:buyers', (event, { businessId, filters }) => {
    try {
      let query = `
        SELECT b.*, bb.total_billed, bb.total_paid, bb.outstanding,
               (SELECT COUNT(*) FROM demands d WHERE d.buyer_id = b.id) as demand_count,
               (SELECT MAX(d.created_at) FROM demands d WHERE d.buyer_id = b.id) as last_demand_date
        FROM buyers b
        LEFT JOIN buyer_balances bb ON bb.buyer_id = b.id
         WHERE b.business_id = ? AND b.is_active = 1
      `;
      const params = [businessId];

      if (filters?.status === 'outstanding') {
        query += ' AND bb.outstanding > 0';
      } else if (filters?.status === 'paid') {
        query += ' AND (bb.outstanding IS NULL OR bb.outstanding <= 0)';
      }

      query += ' ORDER BY b.full_name';
      const buyers = db.prepare(query).all(...params);

      const exportRows = buyers.map(b => ({
        'Buyer Code': b.buyer_code || '',
        'Full Name': b.full_name,
        'Business Name': b.business_name || '',
        'Phone': b.phone || '',
        'Email': b.email || '',
        'City': b.city || '',
        'Address': b.address || '',
        'Total Billed': b.total_billed ?? 0,
        'Total Paid': b.total_paid ?? 0,
        'Outstanding': b.outstanding ?? 0,
        'Demand Count': b.demand_count ?? 0,
        'Last Demand Date': b.last_demand_date || '',
      }));

      return { success: true, data: exportRows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('export:demands', (event, { businessId, filters }) => {
    try {
      let query = `
        SELECT d.*,
               b.full_name as buyer_name, b.buyer_code, b.phone as buyer_phone,
               (SELECT COUNT(*) FROM demand_items di WHERE di.demand_id = d.id) as items_count
        FROM demands d
        LEFT JOIN buyers b ON b.id = d.buyer_id
        WHERE d.business_id = ?
      `;
      const params = [businessId];

      if (filters?.status) {
        query += ' AND d.status = ?';
        params.push(filters.status);
      }
      if (filters?.buyerId) {
        query += ' AND d.buyer_id = ?';
        params.push(filters.buyerId);
      }
      if (filters?.dateFrom) {
        query += ' AND d.created_at >= ?';
        params.push(filters.dateFrom);
      }
      if (filters?.dateTo) {
        query += ' AND d.created_at <= ?';
        params.push(filters.dateTo + ' 23:59:59');
      }

      query += ' ORDER BY d.created_at DESC';
      const demands = db.prepare(query).all(...params);

      const exportRows = demands.map(d => ({
        'Demand Code': d.demand_code || '',
        'Date': d.created_at ? d.created_at.slice(0, 10) : '',
        'Buyer Name': d.buyer_name || '',
        'Buyer Code': d.buyer_code || '',
        'Buyer Phone': d.buyer_phone || '',
        'Items Count': d.items_count ?? 0,
        'Subtotal': d.subtotal ?? 0,
        'Discount': d.discount ?? 0,
        'Tax': d.tax ?? 0,
        'Grand Total': d.grand_total ?? 0,
        'Amount Paid': d.amount_paid ?? 0,
        'Balance Due': (d.grand_total ?? 0) - (d.amount_paid ?? 0),
        'Status': d.status || '',
      }));

      return { success: true, data: exportRows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('export:saveFile', async (event, { defaultName, extension, content }) => {
    try {
      const { dialog } = require('electron');
      const filterName = extension === 'xlsx' ? 'Excel' : 'CSV';
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: filterName, extensions: [extension] }],
      });
      if (result.canceled) return { success: false, cancelled: true };

      if (extension === 'csv') {
        fs.writeFileSync(result.filePath, content, 'utf-8');
      } else {
        // content is a base64 buffer for xlsx
        fs.writeFileSync(result.filePath, Buffer.from(content, 'base64'));
      }

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // MODULE 10: Scanner & Label IPC Handlers
  // ═══════════════════════════════════════════════════════════════════

  // ── Scanner Settings ──────────────────────────────────────────────

  ipcMain.handle('scanner:getSettings', (event, businessId) => {
    try {
      let row = db.prepare('SELECT * FROM scanner_settings WHERE business_id = ?').get(businessId);
      if (!row) {
        // Create default settings row
        db.prepare(`INSERT OR IGNORE INTO scanner_settings (business_id) VALUES (?)`).run(businessId);
        row = db.prepare('SELECT * FROM scanner_settings WHERE business_id = ?').get(businessId);
      }
      return {
        success: true,
        data: {
          scannerType: row.scanner_type,
          scanDelayMs: row.scan_delay_ms,
          prefix: row.prefix || '',
          suffix: row.suffix || '',
          beepEnabled: !!row.beep_enabled,
          beepVolume: row.beep_volume,
          autoScanOnStartup: !!row.auto_scan_on_startup,
          webcamDeviceId: row.webcam_device_id,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:updateSettings', (event, data) => {
    try {
      const { businessId, userId, userLabel, ...settings } = data;
      const existing = db.prepare('SELECT id FROM scanner_settings WHERE business_id = ?').get(businessId);
      if (existing) {
        db.prepare(`
          UPDATE scanner_settings SET
            scanner_type = ?, scan_delay_ms = ?, prefix = ?, suffix = ?,
            beep_enabled = ?, beep_volume = ?, auto_scan_on_startup = ?,
            webcam_device_id = ?
          WHERE business_id = ?
        `).run(
          settings.scannerType || 'hid',
          settings.scanDelayMs || 80,
          settings.prefix || '',
          settings.suffix || '',
          settings.beepEnabled ? 1 : 0,
          settings.beepVolume ?? 0.7,
          settings.autoScanOnStartup ? 1 : 0,
          settings.webcamDeviceId || null,
          businessId
        );
      } else {
        db.prepare(`
          INSERT INTO scanner_settings (business_id, scanner_type, scan_delay_ms, prefix, suffix,
            beep_enabled, beep_volume, auto_scan_on_startup, webcam_device_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          businessId,
          settings.scannerType || 'hid',
          settings.scanDelayMs || 80,
          settings.prefix || '',
          settings.suffix || '',
          settings.beepEnabled ? 1 : 0,
          settings.beepVolume ?? 0.7,
          settings.autoScanOnStartup ? 1 : 0,
          settings.webcamDeviceId || null
        );
      }

      logAudit(db, {
        businessId, userId, userLabel,
        action: 'update_settings',
        entityType: 'scanner_settings',
        entityId: businessId,
        entityLabel: 'Scanner Settings',
        summary: 'Scanner settings updated',
        detailJson: JSON.stringify(settings),
      });

      // return updated settings
      const row = db.prepare('SELECT * FROM scanner_settings WHERE business_id = ?').get(businessId);
      return {
        success: true,
        data: {
          scannerType: row.scanner_type,
          scanDelayMs: row.scan_delay_ms,
          prefix: row.prefix || '',
          suffix: row.suffix || '',
          beepEnabled: !!row.beep_enabled,
          beepVolume: row.beep_volume,
          autoScanOnStartup: !!row.auto_scan_on_startup,
          webcamDeviceId: row.webcam_device_id,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Scan Lookup ───────────────────────────────────────────────────

  ipcMain.handle('scanner:lookupCode', (event, { businessId, code }) => {
    try {
      const product = db.prepare(`
        SELECT p.id, p.name, p.sku, p.barcode, p.image_path, p.category
        FROM products p
        WHERE p.business_id = ?
          AND p.is_deleted = 0
          AND (p.barcode = ? OR p.sku = ?)
        LIMIT 1
      `).get(businessId, code, code);

      if (!product) {
        return { success: true, data: { found: false, scannedCode: code } };
      }

      // Get stock level
      const stockRow = db.prepare('SELECT quantity FROM stock_levels WHERE product_id = ?').get(product.id);
      const currentStock = stockRow ? stockRow.quantity : 0;

      // Get reorder level
      const reorderRow = db.prepare('SELECT reorder_at FROM reorder_levels WHERE product_id = ?').get(product.id);
      const reorderAt = reorderRow ? reorderRow.reorder_at : 0;

      // Determine stock status
      let stockStatus = 'in_stock';
      if (currentStock <= 0) stockStatus = 'out_of_stock';
      else if (reorderAt > 0 && currentStock <= reorderAt) stockStatus = 'low_stock';

      // Get Sale Price & Purchase Price from product_values
      const salePriceCol = db.prepare(`
        SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Sale Price' AND is_system = 1
      `).get(businessId);
      const purchasePriceCol = db.prepare(`
        SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Purchase Price' AND is_system = 1
      `).get(businessId);

      let salePrice = null, purchasePrice = null;
      if (salePriceCol) {
        const v = db.prepare('SELECT value FROM product_values WHERE product_id = ? AND column_id = ?')
          .get(product.id, salePriceCol.id);
        salePrice = v ? parseFloat(v.value) : null;
      }
      if (purchasePriceCol) {
        const v = db.prepare('SELECT value FROM product_values WHERE product_id = ? AND column_id = ?')
          .get(product.id, purchasePriceCol.id);
        purchasePrice = v ? parseFloat(v.value) : null;
      }

      return {
        success: true,
        data: {
          found: true,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            category: product.category,
            imagePath: product.image_path,
            currentStock,
            salePrice,
            purchasePrice,
            stockStatus,
          },
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:logScan', (event, data) => {
    try {
      const { businessId, sessionId, scannedCode, productId, productName, actionTaken, context } = data;
      const result = db.prepare(`
        INSERT INTO scan_history (business_id, session_id, scanned_code, product_id, product_name, action_taken, context)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, sessionId, scannedCode, productId, productName, actionTaken, context);
      return {
        success: true,
        data: {
          id: result.lastInsertRowid,
          businessId, sessionId, scannedCode, productId, productName, actionTaken, context,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:getSessionHistory', (event, { businessId, sessionId, limit }) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM scan_history
        WHERE business_id = ? AND session_id = ?
        ORDER BY scanned_at DESC
        LIMIT ?
      `).all(businessId, sessionId, limit || 50);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:clearSessionHistory', (event, sessionId) => {
    try {
      db.prepare('DELETE FROM scan_history WHERE session_id = ?').run(sessionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Label Templates ───────────────────────────────────────────────

  ipcMain.handle('labels:getTemplates', (event, businessId) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM label_templates WHERE business_id = ? ORDER BY is_default DESC, name ASC
      `).all(businessId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('labels:saveTemplate', (event, data) => {
    try {
      const { businessId, id, ...template } = data;
      if (template.is_default) {
        db.prepare('UPDATE label_templates SET is_default = 0 WHERE business_id = ?').run(businessId);
      }
      if (id) {
        db.prepare(`
          UPDATE label_templates SET
            name = ?, width_mm = ?, height_mm = ?,
            show_product_name = ?, show_sku = ?, show_price = ?,
            show_category = ?, show_business_name = ?,
            code_type = ?, code_position = ?,
            font_size_name = ?, font_size_detail = ?, is_default = ?
          WHERE id = ?
        `).run(
          template.name, template.width_mm, template.height_mm,
          template.show_product_name ? 1 : 0, template.show_sku ? 1 : 0,
          template.show_price ? 1 : 0, template.show_category ? 1 : 0,
          template.show_business_name ? 1 : 0,
          template.code_type, template.code_position,
          template.font_size_name, template.font_size_detail,
          template.is_default ? 1 : 0,
          id
        );
        return { success: true, data: { id, ...template } };
      } else {
        const result = db.prepare(`
          INSERT INTO label_templates (business_id, name, width_mm, height_mm,
            show_product_name, show_sku, show_price, show_category, show_business_name,
            code_type, code_position, font_size_name, font_size_detail, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          businessId,
          template.name, template.width_mm, template.height_mm,
          template.show_product_name ? 1 : 0, template.show_sku ? 1 : 0,
          template.show_price ? 1 : 0, template.show_category ? 1 : 0,
          template.show_business_name ? 1 : 0,
          template.code_type, template.code_position,
          template.font_size_name, template.font_size_detail,
          template.is_default ? 1 : 0
        );
        return { success: true, data: { id: result.lastInsertRowid, ...template } };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('labels:deleteTemplate', (event, templateId) => {
    try {
      db.prepare('DELETE FROM label_templates WHERE id = ?').run(templateId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('labels:printLabels', async (event, { html }) => {
    try {
      const { BrowserWindow } = require('electron');
      const printWin = new BrowserWindow({ show: false, width: 800, height: 600 });
      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((resolve) => printWin.webContents.on('did-finish-load', resolve));
      printWin.webContents.print({ silent: false, printBackground: true }, (success) => {
        printWin.close();
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('labels:exportLabelsPDF', async (event, { html, filename }) => {
    try {
      const { BrowserWindow, dialog } = require('electron');
      const result = await dialog.showSaveDialog({
        defaultPath: filename || 'labels.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result.canceled) return { success: false, cancelled: true };

      const printWin = new BrowserWindow({ show: false, width: 800, height: 600 });
      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((resolve) => printWin.webContents.on('did-finish-load', resolve));
      const pdfData = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'none' },
      });
      printWin.close();
      fs.writeFileSync(result.filePath, pdfData);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCEMENT: Sidebar Settings Handlers
  // ═══════════════════════════════════════════════════════════════════

  ipcMain.handle('sidebar:getSettings', (event, businessId) => {
    try {
      const bizId = typeof businessId === 'object' ? businessId.businessId : businessId;
      const rows = db.prepare('SELECT id, business_id, item_key AS module_key, is_visible, position AS sort_order FROM sidebar_settings WHERE business_id = ? ORDER BY position ASC').all(bizId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sidebar:updateSettings', (event, { businessId, settings }) => {
    try {
      const upsert = db.prepare(`
        INSERT INTO sidebar_settings (business_id, item_key, is_visible, position)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(business_id, item_key) DO UPDATE SET
          is_visible = excluded.is_visible,
          position = excluded.position
      `);
      const tx = db.transaction(() => {
        for (const s of settings) {
          const key = s.module_key || s.item_key;
          upsert.run(businessId, key, s.is_visible ? 1 : 0, s.position || s.sort_order || 0);
        }
      });
      tx();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCEMENT: User Module Access Handlers
  // ═══════════════════════════════════════════════════════════════════

  ipcMain.handle('users:getModuleAccess', (event, userId) => {
    try {
      const rows = db.prepare('SELECT * FROM user_module_access WHERE user_id = ?').all(userId);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:updateModuleAccess', (event, { userId, modules }) => {
    try {
      const upsert = db.prepare(`
        INSERT INTO user_module_access (user_id, module_key, has_access)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, module_key) DO UPDATE SET
          has_access = excluded.has_access
      `);
      const tx = db.transaction(() => {
        for (const m of modules) {
          upsert.run(userId, m.module_key, m.has_access ? 1 : 0);
        }
      });
      tx();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCEMENT: Serial Number / Demand Sequence Settings
  // ═══════════════════════════════════════════════════════════════════

  ipcMain.handle('settings:getSerialSettings', (event, businessId) => {
    try {
      const seq = db.prepare('SELECT * FROM demand_sequences WHERE business_id = ?').get(businessId);
      if (!seq) {
        db.prepare('INSERT INTO demand_sequences (business_id) VALUES (?)').run(businessId);
        return { success: true, data: { prefix: 'INV', next_number: 1, padding: 5 } };
      }
      return { success: true, data: seq };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:updateSerialPrefix', (event, { businessId, prefix, padding }) => {
    try {
      db.prepare(`
        INSERT INTO demand_sequences (business_id, prefix, padding)
        VALUES (?, ?, ?)
        ON CONFLICT(business_id) DO UPDATE SET
          prefix = excluded.prefix,
          padding = excluded.padding,
          updated_at = datetime('now')
      `).run(businessId, prefix || 'INV', padding || 5);

      // Also update business serial_prefix for quick access
      db.prepare("UPDATE businesses SET serial_prefix = ?, updated_at = datetime('now') WHERE id = ?").run(prefix || 'INV', businessId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCEMENT: Pack Info Helper
  // ═══════════════════════════════════════════════════════════════════

  ipcMain.handle('products:getPackInfo', (event, { businessId }) => {
    try {
      // Find the Pack Quantity and Pack Price columns for this business
      const packQtyCol = db.prepare("SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Pack Quantity'").get(businessId);
      const packPriceCol = db.prepare("SELECT id FROM custom_columns WHERE business_id = ? AND name = 'Pack Price'").get(businessId);

      if (!packQtyCol && !packPriceCol) {
        return { success: true, data: { hasPackSystem: false, packInfo: {} } };
      }

      // Get pack values for all products
      const products = db.prepare('SELECT id FROM products WHERE business_id = ? AND is_deleted = 0').all(businessId);
      const packInfo = {};

      for (const p of products) {
        const packQty = packQtyCol
          ? db.prepare('SELECT value FROM product_values WHERE product_id = ? AND column_id = ?').get(p.id, packQtyCol.id)
          : null;
        const packPrice = packPriceCol
          ? db.prepare('SELECT value FROM product_values WHERE product_id = ? AND column_id = ?').get(p.id, packPriceCol.id)
          : null;

        const qty = packQty ? parseFloat(packQty.value) || 0 : 0;
        const price = packPrice ? parseFloat(packPrice.value) || 0 : 0;

        if (qty > 0) {
          packInfo[p.id] = {
            packQuantity: qty,
            packPrice: price,
            unitPrice: price > 0 && qty > 0 ? Math.round((price / qty) * 1000) / 1000 : 0,
          };
        }
      }

      return { success: true, data: { hasPackSystem: true, packInfo, packQtyColId: packQtyCol?.id, packPriceColId: packPriceCol?.id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENHANCEMENT: Buyer Price History — returns last prices a buyer paid
  // ═══════════════════════════════════════════════════════════════════

  ipcMain.handle('demands:getBuyerPriceHistory', (event, { buyerId }) => {
    try {
      if (!buyerId) return { success: true, data: {} };

      // Get the most recent unit_price for each product from confirmed/outstanding/partial/paid demands
      const rows = db.prepare(`
        SELECT di.product_id, di.unit_price, di.quantity, di.discount_type, di.discount_value, d.confirmed_at
        FROM demand_items di
        JOIN demands d ON d.id = di.demand_id
        WHERE d.buyer_id = ?
          AND d.status IN ('outstanding', 'partial', 'paid', 'confirmed')
        ORDER BY d.confirmed_at DESC
      `).all(buyerId);

      // Build a map: productId → { price, quantity, discount_type, discount_value, lastDate }
      // Only keep the most recent entry per product (first encountered since ORDER BY DESC)
      const priceMap = {};
      for (const row of rows) {
        if (!priceMap[row.product_id]) {
          priceMap[row.product_id] = {
            price: row.unit_price,
            quantity: row.quantity,
            discount_type: row.discount_type,
            discount_value: row.discount_value,
            lastDate: row.confirmed_at,
          };
        }
      }

      return { success: true, data: priceMap };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DATA CLEARING: Remove all business data (keep businesses & users)
  // ═══════════════════════════════════════════════════════════════════════
  ipcMain.handle('data:clearAll', (event, businessId) => {
    try {
      const clear = db.transaction(() => {
        // Delete in dependency order
        db.prepare('DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM demands WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM payments WHERE demand_id IN (SELECT id FROM demands WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM demands WHERE business_id = ?').run(businessId);
        db.prepare('DELETE FROM stock_history WHERE product_id IN (SELECT id FROM products WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM stock_levels WHERE product_id IN (SELECT id FROM products WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM reorder_levels WHERE product_id IN (SELECT id FROM products WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM product_column_data WHERE product_id IN (SELECT id FROM products WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM products WHERE business_id = ?').run(businessId);
        db.prepare('DELETE FROM buyer_balances WHERE buyer_id IN (SELECT id FROM buyers WHERE business_id = ?)').run(businessId);
        db.prepare('DELETE FROM buyers WHERE business_id = ?').run(businessId);
        db.prepare('DELETE FROM audit_logs WHERE business_id = ?').run(businessId);
        db.prepare('DELETE FROM scanner_history WHERE business_id = ?').run(businessId);
      });
      clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── Database Clean (Reset All Data) ────────────────────────────────
  ipcMain.handle('database:clean', async () => {
    try {
      const liveDbPath = getDbPath();
      // Close current connection
      db.close();
      // Delete the database file completely
      if (fs.existsSync(liveDbPath)) fs.unlinkSync(liveDbPath);
      // Wipe WAL / SHM side-files if present
      if (fs.existsSync(liveDbPath + '-wal')) fs.unlinkSync(liveDbPath + '-wal');
      if (fs.existsSync(liveDbPath + '-shm')) fs.unlinkSync(liveDbPath + '-shm');
      // Re-initialise: creates a brand-new empty database with all tables
      initDatabase();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// Expose db reference and backup helper for scheduler
function getDb() { return db; }
function performBackup(args) { return require('./db')._performBackupFn?.(args); }

module.exports = { initDatabase, registerIpcHandlers, getDb, getDbPath };
