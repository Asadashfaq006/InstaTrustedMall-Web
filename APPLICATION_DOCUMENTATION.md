# InstaMall - Complete Application Documentation

## 📋 Table of Contents
1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [State Management](#state-management)
6. [Business Types & Presets](#business-types--presets)
7. [Modules & Features](#modules--features)
8. [All Screens (UI)](#all-screens-ui)
9. [Reusable Components](#reusable-components)
10. [Utilities & Helpers](#utilities--helpers)
11. [User Roles & Permissions](#user-roles--permissions)
12. [File Structure](#file-structure)

---

## Application Overview

**InstaMall** is a comprehensive **offline-first business management application** built with Electron and React. It helps businesses manage inventory, track buyers, create orders/bills, monitor stock levels, generate reports, and maintain audit trails — all without requiring an internet connection.

### Key Features
- ✅ **100% Offline** — Works completely without internet
- 🏪 **Multiple Business Types** — Retail, Wholesale, Pharmacy, Restaurant, Warehouse, Electronics, Clothes, Tailor, Custom
- 📦 **Product Management** — Custom columns, formulas, categories, bulk import/export
- 📊 **Stock Control** — Real-time tracking, adjustments, low stock alerts, reorder levels
- 👥 **Buyer Management** — Customer profiles, outstanding balances, payment tracking
- 🧾 **Demand/Order System** — Bill generation, partial payments, stock deduction
- 📈 **Reports & Analytics** — Sales, profit/loss, top products, buyer statements
- 🔐 **User Access Control** — Role-based permissions (Admin, Manager, Salesperson, Viewer)
- 🔍 **Barcode/QR Scanner** — Built-in webcam scanner for products
- 📋 **Audit Trail** — Complete history of all changes
- 💾 **Auto Backup** — Scheduled database backups

---

## Technology Stack

### Frontend
- **React 18.3.1** — UI framework
- **React Router DOM 6.30.3** — Client-side routing
- **Zustand 5.0.11** — State management
- **TailwindCSS 3.4.19** — Styling
- **Radix UI** — Accessible UI components (Dialog, Dropdown, Select, etc.)
- **Recharts 3.7.0** — Charts for dashboard
- **Lucide React 0.574.0** — Icon library
- **date-fns 4.1.0** — Date formatting
- **mathjs 15.1.1** — Formula evaluation engine
- **PapaParse 5.5.3** — CSV import/export
- **XLSX 0.18.5** — Excel file handling
- **JsBarcode 3.12.3** — Barcode generation
- **QRCode 1.5.4** — QR code generation
- **@zxing** — Barcode/QR scanner library
- **@dnd-kit** — Drag-and-drop functionality

### Backend
- **Electron 40.4.1** — Desktop application framework
- **Better-SQLite3 12.6.2** — Local database
- **Node.js** — Runtime environment

### Build Tools
- **Vite 7.3.1** — Fast build tool
- **Electron Builder 26.7.0** — Application packaging
- **PostCSS & Autoprefixer** — CSS processing

---

## Architecture

### Application Structure

```
InstaMall (Electron App)
├── Main Process (Node.js)
│   ├── main.js           — Window management, IPC handlers
│   ├── db.js             — SQLite database & all IPC handlers
│   ├── preload.js        — Secure context bridge (electronAPI)
│   ├── scheduler.js      — Auto-backup scheduler
│   └── auditLogger.js    — Audit trail recording
│
└── Renderer Process (React)
    ├── App.jsx           — Root component, routing
    ├── main.jsx          — React entry point
    ├── stores/           — Zustand state management
    ├── screens/          — Full-page views
    ├── components/       — Reusable UI components
    ├── utils/            — Helper functions
    └── constants/        — Static configuration
```

### Data Flow

1. **React Components** → Call `window.electronAPI.*` methods (exposed via preload.js)
2. **IPC Call** → Sent to main process via Electron IPC
3. **Main Process** → Handles request in `db.js`, executes SQL queries
4. **Response** → Returned to renderer process
5. **Zustand Store** → Updates state, triggers re-render

### Security Model
- **Context Isolation**: Enabled (renderer cannot access Node.js directly)
- **Node Integration**: Disabled
- **Preload Script**: Exposes safe, whitelisted API via `contextBridge`
- **SQL Injection Protection**: All queries use parameterized statements

---

## Database Schema

InstaMall uses **SQLite** with the **better-sqlite3** driver. The database file is stored in the user's app data directory.

### Core Tables

#### 1. **businesses**
Stores business profiles (user can manage multiple businesses).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| name | TEXT | Business name |
| type | TEXT | Business type (retail, pharmacy, etc.) |
| logo_path | TEXT | Path to logo image |
| currency | TEXT | Currency code (default: PKR) |
| currency_symbol | TEXT | Symbol (default: ₨) |
| tax_rate | REAL | Default tax rate (%) |
| tax_name | TEXT | Tax label (e.g., "GST", "VAT") |
| address | TEXT | Business address |
| phone | TEXT | Contact phone |
| email | TEXT | Contact email |
| footer_text | TEXT | Bill footer text |
| date_format | TEXT | Date display format |
| number_format | TEXT | Number locale format |
| is_active | INTEGER | Currently active business (0/1) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

#### 2. **products**
Product catalog with dynamic custom columns.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| name | TEXT | Product name |
| sku | TEXT | Stock Keeping Unit (unique per business) |
| barcode | TEXT | Barcode/QR code |
| category | TEXT | Product category |
| image_path | TEXT | Path to product image |
| is_deleted | INTEGER | Soft delete flag (0/1) |
| deleted_at | TEXT | Deletion timestamp |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

#### 3. **custom_columns**
Dynamic, configurable columns for products (varies by business type).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| name | TEXT | Column name (e.g., "Sale Price", "MRP") |
| type | TEXT | Data type: text, number, currency, date, dropdown, checkbox, formula |
| formula | TEXT | Formula string for calculated columns |
| dropdown_options | TEXT | JSON array of dropdown options |
| position | INTEGER | Display order |
| is_visible | INTEGER | Visible in table (0/1) |
| is_required | INTEGER | Required field (0/1) |
| is_system | INTEGER | System-created preset (0/1) |
| created_at | TEXT | Creation timestamp |

#### 4. **product_values**
Stores dynamic column values for each product.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| product_id | INTEGER | Foreign key → products(id) |
| column_id | INTEGER | Foreign key → custom_columns(id) |
| value | TEXT | Column value (stored as text) |
| updated_at | TEXT | Last update timestamp |

**Unique constraint**: (product_id, column_id)

#### 5. **stock_movements**
Complete log of all stock changes.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| product_id | INTEGER | Foreign key → products(id) |
| type | TEXT | Movement type: 'in', 'out', 'adjust' |
| quantity | REAL | Quantity moved (positive or negative) |
| quantity_before | REAL | Stock level before movement |
| quantity_after | REAL | Stock level after movement |
| reason | TEXT | Reason code (purchase, sale, adjustment, etc.) |
| source | TEXT | Source: 'manual', 'demand', 'import' |
| ref_id | INTEGER | Reference ID (e.g., demand ID) |
| ref_label | TEXT | Reference label (e.g., demand code) |
| notes | TEXT | Additional notes |
| moved_by | INTEGER | User ID who made the movement |
| moved_at | TEXT | Movement timestamp |

#### 6. **stock_levels**
Current stock quantity for each product (kept in sync via trigger).

| Column | Type | Description |
|--------|------|-------------|
| product_id | INTEGER PRIMARY KEY | Foreign key → products(id) |
| quantity | REAL | Current stock quantity |
| last_moved_at | TEXT | Last movement timestamp |

#### 7. **reorder_levels**
Reorder thresholds for low stock alerts.

| Column | Type | Description |
|--------|------|-------------|
| product_id | INTEGER PRIMARY KEY | Foreign key → products(id) |
| reorder_at | REAL | Alert threshold (default: 0) |
| reorder_qty | REAL | Suggested reorder quantity |
| updated_at | TEXT | Last update timestamp |

#### 8. **buyers**
Customer/client profiles.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| buyer_code | TEXT | Unique buyer code |
| full_name | TEXT | Buyer's full name |
| business_name | TEXT | Buyer's business name |
| phone | TEXT | Phone number |
| email | TEXT | Email address |
| address | TEXT | Full address |
| city | TEXT | City |
| postal_code | TEXT | Postal/ZIP code |
| photo_path | TEXT | Path to buyer photo |
| notes | TEXT | Additional notes |
| is_archived | INTEGER | Archived flag (0/1) |
| archived_at | TEXT | Archive timestamp |
| created_at | TEXT | Creation timestamp |
| last_activity_at | TEXT | Last transaction/activity timestamp |

#### 9. **payments**
Payment records from buyers (can be standalone or linked to demands).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| buyer_id | INTEGER | Foreign key → buyers(id) |
| demand_id | INTEGER | Foreign key → demands(id) (optional) |
| amount | REAL | Payment amount |
| payment_date | TEXT | Payment date |
| payment_method | TEXT | Method: cash, card, bank_transfer, etc. |
| notes | TEXT | Payment notes |
| created_by | INTEGER | User ID who recorded payment |
| created_at | TEXT | Record creation timestamp |

#### 10. **demands**
Orders/bills created for buyers.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| buyer_id | INTEGER | Foreign key → buyers(id) (optional for walk-in) |
| demand_code | TEXT | Unique demand number (e.g., DEM-0001) |
| status | TEXT | 'draft', 'outstanding', 'partial', 'paid', 'cancelled' |
| subtotal | REAL | Sum of all line items before discounts/tax |
| overall_discount_type | TEXT | 'percent' or 'flat' |
| overall_discount_value | REAL | Overall discount amount or percentage |
| apply_tax | INTEGER | Apply business tax rate (0/1) |
| tax_amount | REAL | Calculated tax amount |
| grand_total | REAL | Final total after discounts and tax |
| amount_paid | REAL | Total amount paid so far |
| balance_due | REAL | Remaining balance (grand_total - amount_paid) |
| notes | TEXT | Order notes |
| confirmed_at | TEXT | Confirmation timestamp (when stock deducted) |
| cancelled_at | TEXT | Cancellation timestamp |
| cancel_reason | TEXT | Reason for cancellation |
| created_by | INTEGER | User ID who created the demand |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

#### 11. **demand_items**
Line items for each demand (products ordered).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| demand_id | INTEGER | Foreign key → demands(id) |
| product_id | INTEGER | Foreign key → products(id) |
| product_name | TEXT | Product name (snapshot) |
| product_sku | TEXT | Product SKU (snapshot) |
| unit_price | REAL | Price per unit |
| quantity | REAL | Quantity ordered |
| discount_type | TEXT | 'flat' or 'percent' |
| discount_value | REAL | Discount amount/percentage per line |
| tax_type | TEXT | 'percent' (currently only percent supported) |
| tax_value | REAL | Tax rate (%) |
| line_total | REAL | (unit_price * quantity) - discount + tax |

#### 12. **users**
User accounts for authentication and access control.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| username | TEXT | Unique username |
| pin_hash | TEXT | Hashed PIN (using bcrypt-style hashing) |
| full_name | TEXT | User's full name |
| role | TEXT | 'admin', 'manager', 'salesperson', 'viewer' |
| is_active | INTEGER | Active status (0/1) |
| created_at | TEXT | Creation timestamp |
| last_login_at | TEXT | Last login timestamp |

#### 13. **auth_settings**
Per-business authentication settings.

| Column | Type | Description |
|--------|------|-------------|
| business_id | INTEGER PRIMARY KEY | Foreign key → businesses(id) |
| require_auth | INTEGER | Require login (0/1) |
| auto_lock_after_minutes | INTEGER | Auto-lock timeout (0 = disabled) |
| max_login_attempts | INTEGER | Max failed login attempts |
| session_timeout_minutes | INTEGER | Inactive session timeout |

#### 14. **audit_logs**
System-wide audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| user_id | INTEGER | User who performed action |
| username | TEXT | Username (denormalized for history) |
| action | TEXT | Action type: 'create', 'update', 'delete', 'login', 'logout', etc. |
| entity_type | TEXT | Entity affected: 'product', 'buyer', 'demand', 'stock', etc. |
| entity_id | INTEGER | ID of affected entity |
| entity_label | TEXT | Human-readable label (e.g., product name) |
| old_value_json | TEXT | JSON snapshot of old state |
| new_value_json | TEXT | JSON snapshot of new state |
| ip_address | TEXT | IP address (for network audits) |
| changes_summary | TEXT | Human-readable change description |
| created_at | TEXT | Audit timestamp |

#### 15. **column_history**
Detailed history of product field changes (supplement to audit_logs).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| product_id | INTEGER | Foreign key → products(id) |
| column_id | INTEGER | Foreign key → custom_columns(id) |
| old_value | TEXT | Previous value |
| new_value | TEXT | New value |
| changed_by | INTEGER | User ID |
| changed_at | TEXT | Change timestamp |

#### 16. **categories**
Product categories (per business).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| name | TEXT | Category name |
| color | TEXT | Category color (hex code) |

**Unique constraint**: (business_id, name)

#### 17. **saved_filters**
Saved filter presets for product list.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| business_id | INTEGER | Foreign key → businesses(id) |
| name | TEXT | Filter name |
| filter_json | TEXT | JSON-encoded filter criteria |
| created_at | TEXT | Creation timestamp |

#### 18. **backup_settings**
Auto-backup configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Always 1 (singleton) |
| enabled | INTEGER | Auto-backup enabled (0/1) |
| frequency_hours | INTEGER | Backup frequency in hours |
| backup_path | TEXT | Directory path for backups |
| max_backups | INTEGER | Maximum backup files to keep |
| last_backup_at | TEXT | Last successful backup timestamp |

---

## State Management

InstaMall uses **Zustand** for state management. Each store is a hook that components can subscribe to.

### Store Architecture

```
stores/
├── authStore.js          — Authentication, current user, session lock
├── businessStore.js      — Business profiles, active business
├── productStore.js       — Products, columns, categories
├── stockStore.js         — Stock levels, movements, alerts
├── buyerStore.js         — Buyers, payments
├── demandStore.js        — Demands/orders
├── auditStore.js         — Audit logs, activity feed
├── reportStore.js        — Dashboard stats, report data
├── filterStore.js        — Product filters, saved filters
├── scannerStore.js       — Barcode scanner state
└── backupStore.js        — Backup status, settings
```

### Key Stores

#### **authStore.js**
Manages user authentication and permissions.

**State:**
- `currentUser` — Logged-in user object
- `isAuthenticated` — Boolean login status
- `isLocked` — App lock status (for auto-lock)
- `lastActivity` — Timestamp for auto-lock timer

**Actions:**
- `login(user)` — Authenticate user
- `logout(businessId)` — Log out current user
- `lock()` — Lock the app
- `unlock()` — Unlock after PIN re-entry
- `touch()` — Update last activity timestamp
- `can(permission)` — Check if user has permission
- `isAdmin()` — Check if user is admin

#### **businessStore.js**
Manages business profiles.

**State:**
- `businesses` — Array of all businesses
- `activeBusiness` — Currently active business
- `isLoading` — Loading state
- `error` — Error message

**Actions:**
- `loadAll()` — Fetch all businesses
- `loadActive()` — Fetch active business
- `createBusiness(data)` — Create new business
- `updateBusiness(id, data)` — Update business
- `deleteBusiness(id)` — Delete business
- `switchBusiness(id)` — Switch active business

#### **productStore.js**
Manages products and custom columns.

**State:**
- `products` — Array of products
- `columns` — Array of custom columns
- `categories` — Array of categories
- `selectedProducts` — Selected product IDs (for bulk actions)
- `editingCell` — Currently editing cell (inline edit)
- `isLoading` — Loading state

**Actions:**
- `loadProducts(businessId)` — Fetch products
- `loadColumns(businessId)` — Fetch columns
- `loadCategories(businessId)` — Fetch categories
- `createProduct(data)` — Create product
- `updateCell(productId, columnId, value)` — Update cell value
- `softDelete(productId)` — Move to recycle bin
- `duplicateProduct(productId)` — Duplicate product
- `recalculateFormulas(products, columns)` — Re-evaluate formula columns

#### **stockStore.js**
Manages stock levels and movements.

**State:**
- `stockLevels` — Current stock quantities
- `movements` — Stock movement history
- `lowStockProducts` — Products below reorder level
- `outOfStockProducts` — Products with zero stock
- `lowStockCount` — Count of low stock items
- `outOfStockCount` — Count of out-of-stock items

**Actions:**
- `fetchStockLevels(businessId)` — Load stock levels
- `fetchMovements(params)` — Load movement history
- `adjustIn(data)` — Stock in adjustment
- `adjustOut(data)` — Stock out adjustment
- `adjustExact(data)` — Set exact stock level
- `setReorderLevel(data)` — Set reorder threshold
- `importCSV(data)` — Bulk stock import
- `exportCSV(data)` — Export stock data

#### **buyerStore.js**
Manages buyer profiles and payments.

**State:**
- `buyers` — Active buyers
- `archivedBuyers` — Archived buyers
- `selectedBuyerId` — Currently selected buyer
- `searchQuery` — Search filter
- `sortBy` — Sort option
- `filterStatus` — Payment status filter
- `viewMode` — 'card' or 'list' view

**Actions:**
- `loadBuyers(businessId)` — Fetch active buyers
- `loadArchivedBuyers(businessId)` — Fetch archived buyers
- `createBuyer(data)` — Create new buyer
- `updateBuyer(data)` — Update buyer
- `archiveBuyer(buyerId)` — Archive buyer
- `restoreBuyer(buyerId, businessId)` — Restore archived buyer
- `deleteBuyer(buyerId)` — Permanently delete buyer
- `createPayment(data)` — Record payment
- `deletePayment(paymentId, buyerId)` — Delete payment

#### **demandStore.js**
Manages orders/demands.

**State:**
- `demands` — List of demands
- `totalDemands` — Total count (for pagination)
- `statusCounts` — Counts by status (draft, outstanding, etc.)
- `selectedDemandId` — Selected demand
- `selectedDemand` — Full demand details
- `searchQuery` — Search filter
- `statusFilter` — Status filter
- `sortBy` — Sort option
- `page` — Current page
- `pageSize` — Items per page

**Actions:**
- `loadDemands(businessId)` — Fetch demands
- `loadDemandDetail(demandId)` — Fetch single demand with items
- `createDemand(data)` — Create draft demand
- `updateItems(data)` — Update demand items
- `updateNotes(data)` — Update demand notes
- `confirmDemand(demandId)` — Confirm demand (deduct stock)
- `cancelDemand(demandId, reason)` — Cancel demand
- `deleteDemand(demandId)` — Delete demand
- `reopenDemand(demandId)` — Reopen cancelled demand
- `recordPayment(data)` — Record payment for demand
- `checkStock(items)` — Validate stock availability

---

## Business Types & Presets

InstaMall supports **9 business types**, each with pre-configured custom columns:

### 1. **Retail / General Store** 🛒
**Preset Columns:**
- Purchase Price (currency, required)
- Company Discount % (number)
- Retail Price (formula: `{Purchase Price} * (1 - {Company Discount %} / 100)`)
- Sale Price (currency, required)
- Category (dropdown)
- Reorder Level (number)
- Stock Value (formula: `{Sale Price} * {Stock Quantity}`)

### 2. **Wholesale** 🏭
**Preset Columns:**
- Purchase Price (currency, required)
- Company Discount % (number)
- Retail Price (formula)
- Bulk Sale Price (currency, required)
- Unit (dropdown)
- Min Order Qty (number)
- Reorder Level (number)

### 3. **Pharmacy** 💊
**Preset Columns:**
- Generic Name (text)
- Batch Number (text)
- Expiry Date (date)
- Purchase Price (currency, required)
- Company Discount % (number)
- MRP (currency, required)
- Rack Location (text)
- Profit (formula: `{MRP} - {Purchase Price}`)

### 4. **Restaurant / Food** 🍽
**Preset Columns:**
- Category (dropdown)
- Portion Size (text)
- Recipe Cost (currency)
- Selling Price (currency, required)
- Available Today (checkbox)
- Prep Time (mins) (number)
- Margin % (formula: `({Selling Price} - {Recipe Cost}) / {Selling Price} * 100`)

### 5. **Warehouse / Logistics** 🏗
**Preset Columns:**
- Location Code (text)
- Weight (kg) (number)
- Volume (cbm) (number)
- Purchase Price (currency)
- Reorder Level (number)

### 6. **Electronics / Repair** 💻
**Preset Columns:**
- Model Number (text)
- Brand (text)
- Purchase Price (currency, required)
- Company Discount % (number)
- Retail Price (formula)
- Sale Price (currency, required)
- Warranty (months) (number)
- Profit (formula: `{Sale Price} - {Purchase Price}`)

### 7. **Clothes / Fashion** 👗
**Preset Columns:**
- Brand (text)
- Size (dropdown)
- Color (dropdown)
- Material (text)
- Purchase Price (currency, required)
- Company Discount % (number)
- Retail Price (formula)
- Sale Price (currency, required)

### 8. **Tailor / Stitching** 🧵
**Preset Columns:**
- Fabric Type (text)
- Measurement Set (text)
- Stitching Cost (currency)
- Material Cost (currency)
- Sale Price (currency, required)
- Due Date (date)
- Profit (formula: `{Sale Price} - {Stitching Cost} - {Material Cost}`)

### 9. **Custom** ⚙️
No preset columns — start from scratch.

---

## Modules & Features

### Module 1: Business Profile Management
**Purpose:** Manage multiple business entities.

**Features:**
- Create, edit, delete business profiles
- Switch between businesses
- Per-business settings (currency, tax rate, logo, footer text)
- Business type selection (determines preset columns)

**Files:**
- `src/screens/BusinessManager.jsx` — Business list and management
- `src/screens/Welcome.jsx` — First-time setup
- `src/components/BusinessModal.jsx` — Create/edit modal
- `src/components/BusinessCard.jsx` — Business card UI
- `src/stores/businessStore.js` — State management

### Module 2: Product & Inventory Management
**Purpose:** Manage product catalog with flexible custom columns.

**Features:**
- Unlimited custom columns per business
- Column types: text, number, currency, date, dropdown, checkbox, formula
- Formula engine (mathjs) for calculated fields
- Product images
- SKU & barcode support
- Categories with colors
- Bulk import/export (CSV)
- Advanced filtering & search
- Saved filter presets
- Inline cell editing
- Duplicate products
- Soft delete (recycle bin)
- Column history tracking

**Files:**
- `src/screens/ProductList.jsx` — Main product list view
- `src/screens/RecycleBin.jsx` — Deleted products
- `src/components/products/ProductGrid.jsx` — Virtualized product table
- `src/components/products/ProductModal.jsx` — Create/edit product
- `src/components/products/ProductDetailPanel.jsx` — Side panel with details
- `src/components/products/ColumnManager.jsx` — Manage custom columns
- `src/components/products/CellHistoryPopover.jsx` — View field change history
- `src/components/products/ImportWizard.jsx` — CSV import wizard
- `src/stores/productStore.js` — Product state management
- `src/stores/filterStore.js` — Filter state management
- `src/utils/formulaEngine.js` — Formula evaluation
- `src/utils/columnMatcher.js` — CSV column mapping

### Module 3: Stock Control
**Purpose:** Real-time stock tracking and adjustments.

**Features:**
- Stock overview dashboard
- Stock in/out adjustments (manual or bulk)
- Set exact stock levels
- Movement log with filters
- Low stock alerts
- Out-of-stock tracking
- Reorder level configuration
- Bulk reorder level import
- Stock import/export (CSV)
- Stock history per product
- Automatic stock deduction on demand confirmation

**Files:**
- `src/screens/StockControl.jsx` — Main stock control screen
- `src/screens/stock/StockOverview.jsx` — Stock levels table
- `src/screens/stock/MovementLog.jsx` — Movement history
- `src/screens/stock/LowStockPanel.jsx` — Low stock alerts
- `src/screens/stock/ReorderLevels.jsx` — Reorder level management
- `src/components/stock/BatchStockInModal.jsx` — Batch stock-in
- `src/components/stock/StockImportModal.jsx` — CSV import
- `src/components/stock/StockIndicator.jsx` — Stock status badge
- `src/stores/stockStore.js` — Stock state management

### Module 4: Buyer Management
**Purpose:** Manage customer/client profiles and payments.

**Features:**
- Buyer profiles (name, business, phone, email, address, photo)
- Auto-generated buyer codes
- Outstanding balance tracking
- Payment status (none, paid, partial, outstanding)
- Payment history
- Record standalone payments (not tied to demands)
- Archive/restore buyers
- Search and filter (by status, name, code)
- Card and list view modes
- Buyer detail panel
- Payment timeline
- Outstanding buyers badge (sidebar)

**Files:**
- `src/screens/BuyerDirectory.jsx` — Main buyer list
- `src/screens/ArchivedBuyers.jsx` — Archived buyers
- `src/components/buyers/BuyerModal.jsx` — Create/edit buyer
- `src/components/buyers/BuyerDetailPanel.jsx` — Side panel with payments
- `src/components/buyers/RecordPaymentModal.jsx` — Payment modal
- `src/components/buyers/BuyerSearchDropdown.jsx` — Search dropdown (for demand builder)
- `src/components/buyers/BuyerMiniCard.jsx` — Mini buyer card
- `src/components/buyers/OutstandingBuyersBadge.jsx` — Sidebar badge
- `src/stores/buyerStore.js` — Buyer state management
- `src/utils/buyerHelpers.js` — Helper functions
- `src/constants/buyerConstants.js` — Status configs, sort options

### Module 5: Demand/Order Management
**Purpose:** Create bills/orders, track sales, deduct stock.

**Features:**
- Draft → Outstanding → Partial → Paid workflow
- Associate buyer (or walk-in customer)
- Add products with custom pricing
- Line item discounts (flat or percent)
- Overall discount (flat or percent)
- Tax calculation (per line or overall)
- Stock availability check
- Automatic stock deduction on confirmation
- Record payments (full or partial)
- Payment history per demand
- Cancel demands (with reason, restore stock)
- Reopen cancelled demands
- Bill preview & print (thermal or A4)
- Demand codes (auto-generated)
- Search and filter by status
- Pagination
- Outstanding demands badge (sidebar)

**Files:**
- `src/screens/DemandList.jsx` — Demand list view
- `src/screens/DemandBuilder.jsx` — Create/edit demand
- `src/components/demands/DemandDetailPanel.jsx` — Side panel with details
- `src/components/demands/DemandPaymentModal.jsx` — Record payment
- `src/components/demands/BillPreview.jsx` — Print preview
- `src/components/demands/LineItemRow.jsx` — Line item editor
- `src/components/demands/OrderSummaryPanel.jsx` — Order totals panel
- `src/components/demands/StockErrorModal.jsx` — Stock error modal
- `src/components/demands/OutstandingDemandsBadge.jsx` — Sidebar badge
- `src/stores/demandStore.js` — Demand state management
- `src/utils/demandCalculations.js` — Totals calculation
- `src/constants/demandConstants.js` — Status configs

### Module 6: Audit & Activity Log
**Purpose:** Complete audit trail for compliance and debugging.

**Features:**
- System audit log (all CRUD operations)
- Product field change history
- Stock movement log
- Recent activity feed (dashboard)
- Filter by date range, action, entity type, user
- Export audit logs (CSV)
- View entity-specific audit trail
- Column-specific history for products

**Files:**
- `src/screens/AuditHub.jsx` — Main audit screen
- `src/screens/audit/SystemAuditLog.jsx` — System audit tab
- `src/screens/audit/ProductHistoryLog.jsx` — Product change history
- `src/screens/audit/StockChangeLog.jsx` — Stock movement log
- `src/components/audit/RecentActivityFeed.jsx` — Recent activity widget
- `src/stores/auditStore.js` — Audit state management
- `main/auditLogger.js` — Backend audit logger

### Module 7: Reports & Analytics
**Purpose:** Business intelligence and insights.

**Reports:**
1. **Dashboard Overview**
   - Today's revenue, week, month
   - Outstanding amount
   - Total products, buyers, demands
   - Low stock, out-of-stock alerts
   - 7-day revenue chart
   - 6-month revenue trend
   - Recent activity feed

2. **Stock Status Report**
   - Current stock levels for all products
   - Stock value calculation
   - Filter by category

3. **Low Stock Report**
   - Products below reorder level
   - Out-of-stock items
   - Suggested reorder quantities

4. **Top Products Report**
   - Best-selling products by quantity/revenue
   - Date range filter
   - Chart visualization

5. **Sales Summary Report**
   - Revenue by day/week/month
   - Demand count, average order value
   - Chart visualization

6. **Profit & Loss Report**
   - Revenue vs. cost analysis
   - Profit margin calculation
   - Date range filter

7. **Buyer Outstanding Report**
   - Buyers with outstanding balances
   - Aging analysis
   - Export options

8. **Buyer Statement Report**
   - Detailed statement for a single buyer
   - All demands and payments
   - Running balance

9. **Demand History Report**
   - All demands with filters
   - Export to CSV/Excel

**Files:**
- `src/screens/Dashboard.jsx` — Main dashboard
- `src/screens/ReportsHub.jsx` — Report hub
- `src/screens/reports/StockStatusReport.jsx`
- `src/screens/reports/LowStockReport.jsx`
- `src/screens/reports/TopProductsReport.jsx`
- `src/screens/reports/SalesSummaryReport.jsx`
- `src/screens/reports/ProfitLossReport.jsx`
- `src/screens/reports/BuyerOutstandingReport.jsx`
- `src/screens/reports/BuyerStatementReport.jsx`
- `src/screens/reports/DemandHistoryReport.jsx`
- `src/components/reports/ReportStatCard.jsx`
- `src/components/reports/DateRangePicker.jsx`
- `src/components/reports/ExportButton.jsx`
- `src/stores/reportStore.js` — Report state management

### Module 8: User & Access Control
**Purpose:** Multi-user support with role-based permissions.

**Features:**
- User accounts per business
- PIN-based authentication (no passwords)
- 4 roles: Admin, Manager, Salesperson, Viewer
- Granular permissions (50+ permission checks)
- User profile management
- Change PIN
- Reset PIN (admin only)
- Auto-lock after inactivity
- Session management
- Login history

**Roles & Permissions:**
- **Admin**: Full access (manage users, settings, all modules)
- **Manager**: Full access except user management
- **Salesperson**: Create/edit buyers, demands, view reports (no cost/profit data)
- **Viewer**: Read-only access

**Files:**
- `src/screens/UserManagement.jsx` — User list and management
- `src/screens/LoginScreen.jsx` — Login screen
- `src/screens/settings/SecuritySettings.jsx` — Auth settings
- `src/components/users/UserModal.jsx` — Create/edit user
- `src/components/users/ChangePinModal.jsx` — Change PIN
- `src/components/users/ResetPinModal.jsx` — Reset PIN (admin)
- `src/components/auth/AppLockOverlay.jsx` — Lock screen
- `src/components/auth/PermissionGate.jsx` — Permission wrapper
- `src/components/auth/PinPad.jsx` — PIN input UI
- `src/components/auth/UserAvatar.jsx` — User avatar
- `src/stores/authStore.js` — Auth state management
- `src/utils/permissions.js` — Permission checker
- `src/constants/roles.js` — Role definitions & permission matrix

### Module 9: Data & Backup
**Purpose:** Data integrity and disaster recovery.

**Features:**
- Manual database backup
- Auto-backup scheduler (configurable frequency)
- Restore from backup
- Backup file management (delete old backups)
- Backup location configuration
- Max backup count (auto-cleanup)
- Backup status indicator (sidebar)
- Export data to CSV/Excel
- Import data from CSV

**Files:**
- `src/screens/DataBackup.jsx` — Backup management screen
- `src/components/backup/BackupCard.jsx` — Backup file card
- `src/components/layout/BackupStatusIndicator.jsx` — Status indicator
- `src/stores/backupStore.js` — Backup state management
- `main/scheduler.js` — Auto-backup scheduler

### Module 10: Scanner & Labels
**Purpose:** Barcode/QR code scanning and label printing.

**Features:**
- Webcam-based barcode/QR scanner (@zxing)
- Scan to find product (in product list)
- Scan to add to demand (in demand builder)
- Scan to adjust stock (in stock control)
- Global scan mode toggle
- Generate QR codes for products
- Generate barcodes (Code128, EAN13, etc.)
- Print labels (thermal or A4)
- Label customization (size, format)

**Files:**
- `src/screens/LabelGenerator.jsx` — Label generator
- `src/screens/settings/ScannerSettings.jsx` — Scanner settings
- `src/components/scanner/ScanModeButton.jsx` — Scan toggle button
- `src/components/scanner/WebcamScannerOverlay.jsx` — Scanner overlay
- `src/components/scanner/GlobalScanPopup.jsx` — Global scan popup
- `src/components/scanner/GlobalScanToggle.jsx` — Global toggle (sidebar)
- `src/components/scanner/ProductQRCode.jsx` — QR code component
- `src/stores/scannerStore.js` — Scanner state management
- `src/providers/ScannerProvider.jsx` — Scanner context provider
- `src/utils/scannerListener.js` — Scanner event listener
- `src/utils/scannerAudio.js` — Scanner audio feedback

---

## All Screens (UI)

### 1. Welcome Screen (`Welcome.jsx`)
**Purpose:** First-time user onboarding.

**UI Elements:**
- InstaMall logo (gradient background)
- "Create My First Business" button
- Opens BusinessModal for setup

**When Shown:** When no businesses exist.

---

### 2. Dashboard (`Dashboard.jsx`)
**Layout:** Full-page dashboard with stats, charts, and activity feed.

**UI Elements:**

**Header:**
- Greeting message (Good morning/afternoon/evening)
- Business name and type
- "All Reports" button → Navigate to `/reports`
- Refresh button

**Stat Cards (Row 1) — Key Metrics:**
- Today's Revenue (with order count)
- This Week Revenue
- This Month Revenue
- Outstanding Amount (with buyer count) — *Click to view outstanding report*

**Stat Cards (Row 2) — Inventory:**
- Total Products — *Click to navigate to `/products`*
- Active Buyers — *Click to navigate to `/buyers`*
- Low Stock (count) — *Click to navigate to low stock report*
- Out of Stock (count) — *Click to navigate to low stock report*

**Charts:**
- Last 7 Days Revenue (bar chart, shows revenue + order count per day)
- Monthly Revenue Trend (bar chart, 6 months)

**Recent Activity Feed:**
- Live feed of recent actions (product edits, stock changes, demands, payments)
- Max 15 items, scrollable
- Each entry shows: icon, action, user, timestamp

**Permissions:**
- `dashboard:viewRevenue` — Show revenue stats

---

### 3. Business Manager (`BusinessManager.jsx`)
**Layout:** Grid of business cards.

**UI Elements:**
- Page title: "Manage Businesses"
- "Create New Business" button
- Grid of business cards (2-3 per row)

**Business Card:**
- Business logo (or default icon)
- Business name
- Business type (with icon)
- "Active" badge (if current)
- Switch button (if not active)
- Edit button → Opens BusinessModal
- Delete button (confirmation dialog)

**BusinessModal (Create/Edit):**
- Business name (input)
- Business type (dropdown with icons)
- Logo upload (file picker)
- Currency & symbol (input)
- Tax rate & name (input)
- Address, phone, email (input)
- Footer text (textarea)
- Date & number format (dropdown)
- Save button

---

### 4. Product List (`ProductList.jsx`)
**Layout:** Full-page with top bar, filters, product grid, and detail panel.

**Top Bar:**
- Title: "Products"
- Count: "X of Y products"
- Actions dropdown:
  - Import CSV
  - Export CSV
  - Manage Columns
  - Recycle Bin
- "Add Product" button
- Scanner button (toggles webcam scanner)

**Search & Filter Bar:**
- Search input (searches name, SKU, barcode)
- "Filters" button (opens filter panel)
- Active filter count badge
- "Saved" dropdown (apply saved filters)
- "Clear all" button (if filters active)

**Filter Panel (collapsible):**
- List of active filters (column, operator, value)
- Each filter has:
  - Column dropdown
  - Operator dropdown (contains, equals, greater than, etc.)
  - Value input
  - Remove button
- "Add filter" button
- "Save filter" button (name it and save)

**Bulk Action Bar (when items selected):**
- "X selected" badge
- "Delete" button (moves to recycle bin)
- "Clear selection" button

**Product Grid:**
- Virtualized table (handles 1000+ products smoothly)
- Columns:
  - Checkbox (select)
  - Image thumbnail
  - Name
  - SKU
  - Barcode
  - All custom columns (visible ones)
  - Stock Quantity (with color coding)
  - Actions (duplicate, edit, delete)
- Inline editing (click cell to edit)
- Click row → Opens detail panel
- Sortable columns (click header)

**Detail Panel (side drawer):**
- Product image (large)
- Core fields (name, SKU, barcode, category)
- All custom column values
- Stock level (with indicator)
- "Edit" button → Opens ProductModal
- "Duplicate" button
- "Delete" button
- "View History" button → Opens history popover

**ProductModal (Create/Edit):**
- Product name (input)
- SKU (input, validates uniqueness)
- Barcode (input, with generate button)
- Category (dropdown, create new option)
- Image upload (with preview)
- All custom columns (dynamic form)
- Save button

**ImportWizard:**
- Step 1: Upload CSV file
- Step 2: Map columns (drag-and-drop or dropdown)
- Step 3: Validation & preview
- Step 4: Import (with progress bar)

---

### 5. Recycle Bin (`RecycleBin.jsx`)
**Layout:** Table of deleted products.

**UI Elements:**
- Title: "Recycle Bin"
- "Back to Products" button
- Table with columns: Name, SKU, Deleted At, Actions
- Actions per row:
  - "Restore" button
  - "Delete Permanently" button (confirmation)
- "Empty Recycle Bin" button (deletes all)

---

### 6. Stock Control (`StockControl.jsx`)
**Layout:** Tabbed interface with 4 tabs.

**Header:**
- Title: "Stock Control"
- "Import" button (CSV stock import)
- "Export" button (CSV stock export)
- Scanner button
- "Batch Stock-In" button → Opens batch modal

**Tabs:**
1. **Stock Overview** — Table of all products with stock levels
   - Columns: Product, SKU, Category, Stock Qty, Reorder At, Status
   - Click row → Opens adjustment modal
   - Stock status badges: In Stock (green), Low Stock (yellow), Out of Stock (red)

2. **Movement Log** — History of all stock movements
   - Filters: Product, Type (in/out/adjust), Date range, User
   - Table columns: Date, Product, Type, Qty, Before, After, Reason, User
   - Pagination

3. **Low Stock Alerts** — Products below reorder level
   - Two sections: Low Stock, Out of Stock
   - Each card shows: Product, Current stock, Reorder level, Suggested order
   - "Set Reorder Level" button per product
   - "Bulk Set Reorder Levels" button

4. **Reorder Levels** — Manage all reorder levels
   - Table: Product, Current Stock, Reorder At, Reorder Qty
   - Inline edit for reorder levels
   - Bulk import/export

**BatchStockInModal:**
- Add multiple products at once
- Product search dropdown
- Quantity input
- Reason dropdown (purchase, return, adjustment, etc.)
- Notes (optional)
- List of added products (can edit/remove)
- "Save All" button

**StockImportModal:**
- Upload CSV (columns: SKU or Barcode, Quantity, Reason)
- Map columns
- Preview & validate
- Import

---

### 7. Buyer Directory (`BuyerDirectory.jsx`)
**Layout:** Full-page with search, filters, buyer list, and detail panel.

**Header:**
- Title: "Buyers"
- "Archived" button → Navigate to archived buyers
- "Add Buyer" button

**Search & Controls:**
- Search input (name, phone, code)
- Sort dropdown (recent, name A-Z, outstanding high-low, etc.)
- View toggle (card/list view)

**Status Filter Tabs:**
- All (count)
- Outstanding (count)
- Partial (count)
- Paid (count)
- None (count)

**Card View:**
- Grid of buyer cards (2-3 per row)
- Each card:
  - Avatar/photo
  - Name
  - Buyer code
  - Business name (if any)
  - Contact info (phone, city)
  - Outstanding amount (red if > 0)
  - Total paid (green)
  - Payment status badge
  - Last activity timestamp

**List View:**
- Table with columns:
  - Buyer (avatar + name)
  - Contact (phone, city)
  - Outstanding
  - Total Paid
  - Status
  - Last Activity

**Detail Panel (side drawer):**
- Buyer photo/avatar
- Name, code, business name
- Contact info (phone, email, address)
- Outstanding balance (prominent)
- Total paid
- Payment status
- Tabs:
  - **Demands** — List of buyer's demands (with status)
  - **Payments** — Payment history (date, amount, method, demand link)
- Actions:
  - "Edit" button → Opens BuyerModal
  - "Record Payment" button → Opens RecordPaymentModal
  - "Archive" button

**BuyerModal (Create/Edit):**
- Full name (input)
- Business name (input)
- Phone, email (input)
- Address, city, postal code (input)
- Photo upload (with preview)
- Notes (textarea)
- Save button

**RecordPaymentModal:**
- Amount (input)
- Payment date (date picker, defaults to today)
- Payment method (dropdown: cash, card, bank transfer, cheque, other)
- Link to demand (optional dropdown)
- Notes (textarea)
- Save button

---

### 8. Archived Buyers (`ArchivedBuyers.jsx`)
**Layout:** Table of archived buyers.

**UI Elements:**
- Title: "Archived Buyers"
- "Back to Buyers" button
- Table with columns: Name, Code, Archived At, Actions
- Actions per row:
  - "Restore" button
  - "Delete Permanently" button (confirmation)

---

### 9. Demand List (`DemandList.jsx`)
**Layout:** Full-page with search, filters, demand table, and detail panel.

**Header:**
- Title: "Demands"
- Count: "X demands"
- "New Demand" button → Navigate to `/demands/new`

**Search & Sort:**
- Search input (demand code, buyer name)
- Sort dropdown (recent, oldest, total high-low, etc.)

**Status Filter Tabs:**
- All (count)
- Draft (count)
- Outstanding (count)
- Partial (count)
- Paid (count)
- Cancelled (count)

**Demand Table:**
- Columns:
  - Code (e.g., DEM-0001)
  - Buyer (avatar + name)
  - Status (badge)
  - Total
  - Paid
  - Balance (red if > 0)
  - Date
- Click row → Opens detail panel
- Pagination (prev/next buttons)

**Detail Panel (side drawer):**
- Demand code (header)
- Buyer info (if linked)
- Status badge
- Demand summary:
  - Subtotal
  - Discount
  - Tax
  - Grand Total
  - Paid
  - Balance Due
- Tabs:
  - **Items** — List of products in demand (name, qty, price, discount, line total)
  - **Payments** — Payment history
  - **Timeline** — Activity log (created, confirmed, payments, etc.)
- Actions:
  - "Edit" button (only if draft) → Navigate to edit
  - "Record Payment" button (if outstanding/partial)
  - "Print Bill" button → Opens BillPreview
  - "Cancel" button (if outstanding/partial) → Confirm and cancel
  - "Reopen" button (if cancelled)
  - "Delete" button (confirmation)

**DemandPaymentModal:**
- Amount input (defaults to balance due)
- Payment date (date picker)
- Payment method (dropdown)
- Notes (textarea)
- Save button

**BillPreview:**
- Print-optimized bill layout
- Sections:
  - Business header (logo, name, address, phone)
  - Demand code & date
  - Buyer info
  - Items table (product, qty, price, discount, total)
  - Totals (subtotal, discount, tax, grand total)
  - Payment status
  - Footer text
- Print button (uses Electron print API)
- Close button

---

### 10. Demand Builder (`DemandBuilder.jsx`)
**Layout:** Full-page order form.

**Header:**
- "Back to Demands" button
- Title: "New Demand" or "Edit Demand #DEM-XXXX"
- Save Draft button
- Confirm button
- Print Preview button (if draft exists)

**Buyer Section:**
- BuyerSearchDropdown (autocomplete)
- Selected buyer card (mini card with name, code, outstanding)
- "Walk-in Customer" option (no buyer selected)

**Product Search:**
- Search input (with autocomplete dropdown)
- Scanner button (scan to add product)
- Filtered product list (shows name, SKU, price)
- Click product → Adds to order

**Line Items Table:**
- Columns:
  - Product (thumbnail + name)
  - SKU
  - Qty (editable input)
  - Unit Price (editable input)
  - Discount Type (dropdown: flat/percent)
  - Discount Value (editable input)
  - Tax % (editable input)
  - Line Total (calculated)
  - Remove button (trash icon)
- Each row is editable inline
- Stock indicator (shows available stock, warns if insufficient)

**Order Summary Panel (fixed right side):**
- Subtotal
- Overall Discount:
  - Type toggle (percent/flat)
  - Value input
- Apply Tax checkbox (uses business tax rate)
- Tax Amount (calculated)
- Grand Total (prominent)
- "Save Draft" button
- "Confirm Order" button

**Confirm Flow:**
1. Click "Confirm"
2. Stock check (validates availability)
3. If insufficient stock → Shows StockErrorModal with list of issues
4. If OK → Confirms demand, deducts stock, changes status to "outstanding"
5. Redirects to demand list

**StockErrorModal:**
- Title: "Insufficient Stock"
- List of products with stock issues:
  - Product name
  - Requested qty
  - Available qty
  - Shortage
- Options:
  - "Adjust Quantities" → Closes modal, user can edit line items
  - "Proceed Anyway" (admin only) → Forces confirmation despite stock issues
  - "Cancel" → Closes modal

---

### 11. Audit Hub (`AuditHub.jsx`)
**Layout:** Tabbed interface with 3 tabs.

**Header:**
- Title: "Audit & Activity Log"
- Export button (exports current tab to CSV)

**Tabs:**
1. **System Audit** — All CRUD operations
   - Filters: Date range, action, entity type, user
   - Table columns: Timestamp, User, Action, Entity, Details
   - Pagination
   - Click row → Expands to show full details (old/new values)

2. **Product History** — Product field changes
   - Filters: Product (search), column, date range
   - Table columns: Timestamp, Product, Column, Old Value, New Value, User
   - Pagination

3. **Stock Changes** — Stock movement log
   - Filters: Product, type, date range, user
   - Table columns: Timestamp, Product, Type, Qty, Before, After, Reason, User
   - Pagination

**Statistics Panel (top):**
- Total actions today
- Most active user
- Most edited product
- Recent activity count

---

### 12. Reports Hub (`ReportsHub.jsx`)
**Layout:** Grid of report cards.

**UI Elements:**
- Page title: "Reports & Analytics"
- Grid of report cards (2-3 per row)

**Report Cards:**
1. Stock Status Report (package icon)
2. Low Stock Report (alert icon)
3. Top Products Report (trending up icon)
4. Sales Summary Report (bar chart icon)
5. Profit & Loss Report (dollar sign icon)
6. Buyer Outstanding Report (credit card icon)
7. Buyer Statement Report (file text icon)
8. Demand History Report (list icon)

Each card:
- Icon
- Report name
- Short description
- "View Report" button → Navigate to report

---

### 13-20. Individual Report Screens
**Common Layout:**
- Page title (report name)
- "Back to Reports" button
- Date range picker (for time-based reports)
- Filters (specific to report)
- Export options (CSV, Excel, PDF)
- Data visualization (table, chart, or both)

**13. Stock Status Report (`StockStatusReport.jsx`)**
- Table: Product, Category, Stock Qty, Reorder Level, Stock Value
- Filter by category

**14. Low Stock Report (`LowStockReport.jsx`)**
- Two sections: Low Stock, Out of Stock
- Table: Product, Current Stock, Reorder At, Suggested Order

**15. Top Products Report (`TopProductsReport.jsx`)**
- Date range filter
- Bar chart: Top 10 products by quantity sold
- Table: Product, Qty Sold, Revenue, Profit Margin

**16. Sales Summary Report (`SalesSummaryReport.jsx`)**
- Date range filter
- Group by: day/week/month
- Line chart: Revenue trend
- Stats: Total revenue, demand count, avg order value

**17. Profit & Loss Report (`ProfitLossReport.jsx`)**
- Date range filter
- Table: Product, Qty Sold, Revenue, Cost, Profit, Margin %
- Summary: Total revenue, total cost, total profit, overall margin

**18. Buyer Outstanding Report (`BuyerOutstandingReport.jsx`)**
- Table: Buyer, Outstanding Amount, Last Payment Date, Days Overdue
- Sort by outstanding amount
- Export to CSV/Excel

**19. Buyer Statement Report (`BuyerStatementReport.jsx`)**
- Select buyer (dropdown)
- Date range filter
- Table: Date, Type (demand/payment), Ref Code, Debit, Credit, Balance
- Running balance calculation
- Print statement button

**20. Demand History Report (`DemandHistoryReport.jsx`)**
- Date range filter
- Status filter
- Table: Demand Code, Buyer, Date, Status, Total, Paid, Balance
- Export to CSV/Excel

---

### 21. User Management (`UserManagement.jsx`)
**Layout:** Table of users.

**Header:**
- Title: "User Management"
- "Add User" button (admin only)

**User Table:**
- Columns:
  - Username
  - Full Name
  - Role (badge)
  - Status (Active/Inactive)
  - Last Login
  - Actions
- Actions per row:
  - "Edit" button → Opens UserModal
  - "Change PIN" button (self or admin) → Opens ChangePinModal
  - "Reset PIN" button (admin only) → Opens ResetPinModal
  - "Deactivate/Activate" button (admin only)
  - "Delete" button (admin only, confirmation)

**UserModal (Create/Edit):**
- Username (input, unique)
- Full Name (input)
- Role (dropdown: Admin, Manager, Salesperson, Viewer)
- PIN (input, 4-6 digits, hidden)
- Confirm PIN (input)
- Save button

**ChangePinModal:**
- Current PIN (input)
- New PIN (input)
- Confirm New PIN (input)
- Save button

**ResetPinModal (admin only):**
- New PIN (input)
- Confirm New PIN (input)
- Reset button

---

### 22. Login Screen (`LoginScreen.jsx`)
**Layout:** Centered login card.

**UI Elements:**
- Business name (header)
- "Select User" dropdown (all active users)
- PIN input (PinPad component: 4-6 digit numeric keypad)
- "Login" button
- Failed attempts indicator (locks after 3 failed attempts)
- "Forgot PIN?" link (admin can reset)

**PinPad:**
- Numeric keypad (1-9, 0)
- Backspace button
- Enter button
- PIN dots (hidden input, shows filled dots)

---

### 23. App Lock Overlay (`AppLockOverlay.jsx`)
**Layout:** Full-screen overlay (when app is locked).

**UI Elements:**
- Lock icon
- "App Locked" message
- Current user name
- PIN input (PinPad)
- "Unlock" button
- "Logout" button

---

### 24. Settings Screens

**24a. Company Settings (`CompanySettings.jsx`)**
- Business name, type (display only, cannot change type)
- Logo upload
- Currency & symbol
- Tax rate & name
- Address, phone, email
- Footer text
- Date & number format
- Save button

**24b. Security Settings (`SecuritySettings.jsx`)**
- Require authentication (toggle)
- Auto-lock after X minutes (slider, 0 = disabled)
- Max login attempts (input)
- Session timeout (input)
- Save button

**24c. Scanner Settings (`ScannerSettings.jsx`)**
- Enable scanner (toggle)
- Scanner sound (toggle)
- Camera selection (dropdown)
- Test scanner button
- Save button

---

### 25. Data Backup (`DataBackup.jsx`)
**Layout:** Backup management dashboard.

**Header:**
- Title: "Data Backup & Restore"
- "Create Backup Now" button

**Backup Settings:**
- Enable auto-backup (toggle)
- Backup frequency (dropdown: 1h, 2h, 6h, 12h, 24h)
- Backup location (input with browse button)
- Max backups (input, old backups auto-deleted)
- Save settings button

**Backup List:**
- Table of backup files:
  - Filename (with timestamp)
  - Size
  - Date Created
  - Actions: "Restore", "Delete"
- "Restore" button → Confirmation dialog, then restarts app with restored DB
- "Delete" button → Confirmation dialog

**Import/Export:**
- "Import Data (CSV)" button → Opens import wizard
- "Export Data (CSV)" button → Exports all tables as CSV

---

### 26. Label Generator (`LabelGenerator.jsx`)
**Layout:** Label design and print interface.

**UI Elements:**
- Product selector (search dropdown)
- Label type (dropdown: QR code, barcode, text only)
- Label size (dropdown: 30mm x 20mm, 40mm x 30mm, 50mm x 40mm, A4)
- Layout (dropdown: 1-up, 2-up, 4-up, 6-up)
- Quantity (input)
- Preview (shows rendered label)
- Print button (uses Electron print API)

**Label Preview:**
- Product name
- SKU
- Price (if selected)
- QR code or barcode

---

## Reusable Components

### UI Components (`components/ui/`)
These are shadcn/ui-style components (Radix UI + Tailwind):

- **button.jsx** — Button variants (default, outline, ghost, accent, destructive, etc.)
- **input.jsx** — Text input
- **textarea.jsx** — Multi-line text input
- **label.jsx** — Form label
- **select.jsx** — Dropdown select
- **checkbox.jsx** — Checkbox
- **switch.jsx** — Toggle switch
- **slider.jsx** — Range slider
- **dialog.jsx** — Modal dialog
- **dropdown-menu.jsx** — Context menu / dropdown
- **popover.jsx** — Floating popover
- **tooltip.jsx** — Hover tooltip
- **badge.jsx** — Status badge
- **toast.jsx** — Toast notification
- **toaster.jsx** — Toast container

### Layout Components (`components/layout/`)

- **AppLayout.jsx** — Main app shell (sidebar + top bar + content)
- **Sidebar.jsx** — Left sidebar navigation
- **BusinessSwitcher.jsx** — Business dropdown switcher (in sidebar)
- **SidebarUserMenu.jsx** — User menu (in sidebar footer)
- **BackupStatusIndicator.jsx** — Backup status widget (in sidebar)

### Business Components

- **BusinessCard.jsx** — Business card (BusinessManager)
- **BusinessModal.jsx** — Create/edit business modal

### Product Components (`components/products/`)

- **ProductGrid.jsx** — Virtualized product table (uses @tanstack/react-virtual)
- **ProductModal.jsx** — Create/edit product modal
- **ProductDetailPanel.jsx** — Side panel with product details
- **ColumnManager.jsx** — Manage custom columns modal
- **CellHistoryPopover.jsx** — Cell change history popover
- **ImportWizard.jsx** — CSV import wizard

### Stock Components (`components/stock/`)

- **StockIndicator.jsx** — Stock level badge (color-coded)
- **BatchStockInModal.jsx** — Batch stock-in modal
- **StockImportModal.jsx** — CSV stock import

### Buyer Components (`components/buyers/`)

- **BuyerModal.jsx** — Create/edit buyer modal
- **BuyerDetailPanel.jsx** — Side panel with buyer details
- **RecordPaymentModal.jsx** — Record payment modal
- **BuyerSearchDropdown.jsx** — Autocomplete buyer search (for demand builder)
- **BuyerMiniCard.jsx** — Mini buyer card (demand builder)
- **OutstandingBuyersBadge.jsx** — Sidebar badge (outstanding count)

### Demand Components (`components/demands/`)

- **DemandDetailPanel.jsx** — Side panel with demand details
- **DemandPaymentModal.jsx** — Record payment modal
- **BillPreview.jsx** — Print bill preview
- **LineItemRow.jsx** — Editable line item row (demand builder)
- **OrderSummaryPanel.jsx** — Order totals panel (demand builder)
- **StockErrorModal.jsx** — Stock error modal (insufficient stock)
- **OutstandingDemandsBadge.jsx** — Sidebar badge (outstanding demand count)

### Auth Components (`components/auth/`)

- **PermissionGate.jsx** — Conditional renderer based on permission
- **AppLockOverlay.jsx** — Full-screen lock overlay
- **PinPad.jsx** — Numeric keypad for PIN entry
- **UserAvatar.jsx** — User avatar with initials

### User Components (`components/users/`)

- **UserModal.jsx** — Create/edit user modal
- **ChangePinModal.jsx** — Change PIN modal
- **ResetPinModal.jsx** — Reset PIN modal (admin)

### Scanner Components (`components/scanner/`)

- **ScanModeButton.jsx** — Scanner toggle button
- **WebcamScannerOverlay.jsx** — Full-screen scanner overlay
- **GlobalScanPopup.jsx** — Global scan popup (floating)
- **GlobalScanToggle.jsx** — Global scanner toggle (sidebar)
- **ProductQRCode.jsx** — QR code generator component

### Report Components (`components/reports/`)

- **ReportStatCard.jsx** — Report stat card (dashboard)
- **DateRangePicker.jsx** — Date range picker
- **ExportButton.jsx** — Export button (CSV/Excel/PDF)

### Audit Components (`components/audit/`)

- **RecentActivityFeed.jsx** — Recent activity widget (dashboard)

---

## Utilities & Helpers

### Core Utilities (`utils/`)

#### **permissions.js**
**Purpose:** Check user permissions.

**Functions:**
- `can(role, permission)` — Check if role has permission
- `isAdmin(role)` — Check if admin
- `isAdminOrManager(role)` — Check if admin or manager

**Example:**
```javascript
import { can } from '@/utils/permissions';
const canEdit = can('salesperson', 'products:edit'); // false
```

#### **formulaEngine.js**
**Purpose:** Evaluate formula columns using mathjs.

**Functions:**
- `evaluateFormula(formula, scope)` — Evaluate formula string
  - `formula`: e.g., `"{Purchase Price} * (1 - {Company Discount %} / 100)"`
  - `scope`: e.g., `{ "Purchase Price": 100, "Company Discount %": 10 }`
  - Returns: `{ value: "90", error: null }`
- `validateFormula(formula, availableColumns)` — Validate formula syntax
- `getFormulaColumns(formula)` — Extract column names from formula

**Supported Functions:**
- Math: add, subtract, multiply, divide, mod, pow, sqrt, log
- Rounding: round, ceil, floor, abs
- Aggregate: min, max, sum, mean, median
- Constants: pi, e

**Security:** No `eval()` — uses mathjs parser (safe).

#### **demandCalculations.js**
**Purpose:** Calculate demand totals.

**Functions:**
- `calcLineItem(item)` — Calculate line item total (price × qty - discount + tax)
- `calcDemandTotals(items, options)` — Calculate demand totals (subtotal, discount, tax, grand total)

**Example:**
```javascript
const totals = calcDemandTotals(items, {
  overallDiscountType: 'percent',
  overallDiscountValue: 10,
  applyTax: true,
  taxRate: 5,
});
// { subtotal: 1000, discountAmount: 100, taxAmount: 45, grandTotal: 945 }
```

#### **buyerHelpers.js**
**Purpose:** Buyer-related helpers.

**Functions:**
- `getAvatarColor(id)` — Get consistent avatar color for buyer ID
- `getBuyerInitials(name)` — Get initials (e.g., "John Doe" → "JD")
- `getPaymentStatusConfig(status)` — Get status badge config (color, label)
- `formatCurrency(value, symbol)` — Format currency (e.g., "₨1,234")
- `sortBuyers(buyers, sortBy)` — Sort buyers array
- `filterBuyersByStatus(buyers, status)` — Filter by payment status
- `searchBuyers(buyers, query)` — Search buyers

#### **columnMatcher.js**
**Purpose:** CSV import column mapping.

**Functions:**
- `guessColumnMapping(csvHeaders, availableColumns)` — Auto-match CSV headers to columns
- `validateColumnMapping(mapping)` — Validate mapping

#### **scannerListener.js**
**Purpose:** Keyboard barcode scanner listener.

**Functions:**
- `startScannerListener(callback)` — Listen for rapid keystrokes (keyboard scanner)
- `stopScannerListener()` — Stop listening

#### **scannerAudio.js**
**Purpose:** Scanner audio feedback.

**Functions:**
- `playSuccessBeep()` — Play success sound
- `playErrorBeep()` — Play error sound

### Helper Functions (`lib/utils.js`)

- `cn(...classes)` — Conditional class names (uses `clsx` + `tailwind-merge`)
- `parseDbDate(dateStr)` — Parse SQLite date string to JS Date
- `formatDate(date, format)` — Format date using date-fns

### Constants (`constants/`)

#### **businessPresets.js**
- `BUSINESS_TYPES` — Array of business type configs (key, icon, label, description, color)
- `COLUMN_PRESETS` — Preset columns per business type
- `getBusinessTypeInfo(key)` — Get business type config

#### **roles.js**
- `ROLES` — Role constants (ADMIN, MANAGER, SALESPERSON, VIEWER)
- `ROLE_LABELS` — Role display names
- `ROLE_COLORS` — Role badge colors
- `PERMISSIONS` — Permission matrix (permission → allowed roles)
- `AVATAR_COLORS` — Predefined avatar colors

#### **buyerConstants.js**
- `PAYMENT_STATUS` — Payment status configs (label, colors)
- `STATUS_TABS` — Buyer status filter tabs
- `SORT_OPTIONS` — Buyer sort options

#### **demandConstants.js**
- `DEMAND_STATUS` — Demand status configs (label, colors)
- `DEMAND_STATUS_TABS` — Demand status filter tabs
- `DEMAND_SORT_OPTIONS` — Demand sort options

#### **stockReasons.js**
- `STOCK_IN_REASONS` — Reasons for stock-in (purchase, return, adjustment, etc.)
- `STOCK_OUT_REASONS` — Reasons for stock-out (sale, damage, theft, etc.)

#### **businessThemes.js**
- `applyBusinessTheme(type)` — Apply CSS theme based on business type (changes accent colors)

---

## User Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access — manage everything including users, settings, and sensitive data |
| **Manager** | Full access to business operations — cannot manage users or critical settings |
| **Salesperson** | Create and manage buyers, demands — limited access to cost/profit data |
| **Viewer** | Read-only access — view products, stock, buyers, demands, reports |

### Permission Matrix

| Permission | Admin | Manager | Salesperson | Viewer |
|------------|-------|---------|-------------|--------|
| **Products** |
| products:view | ✅ | ✅ | ✅ | ✅ |
| products:create | ✅ | ✅ | ❌ | ❌ |
| products:edit | ✅ | ✅ | ❌ | ❌ |
| products:delete | ✅ | ✅ | ❌ | ❌ |
| products:import | ✅ | ✅ | ❌ | ❌ |
| products:export | ✅ | ✅ | ✅ | ❌ |
| products:viewCost | ✅ | ✅ | ❌ | ❌ |
| **Stock** |
| stock:view | ✅ | ✅ | ✅ | ✅ |
| stock:adjustIn | ✅ | ✅ | ❌ | ❌ |
| stock:adjustOut | ✅ | ✅ | ❌ | ❌ |
| stock:adjust | ✅ | ✅ | ❌ | ❌ |
| stock:setReorder | ✅ | ✅ | ❌ | ❌ |
| **Buyers** |
| buyers:view | ✅ | ✅ | ✅ | ✅ |
| buyers:create | ✅ | ✅ | ✅ | ❌ |
| buyers:edit | ✅ | ✅ | ✅ | ❌ |
| buyers:archive | ✅ | ✅ | ❌ | ❌ |
| buyers:delete | ✅ | ❌ | ❌ | ❌ |
| buyers:recordPayment | ✅ | ✅ | ✅ | ❌ |
| **Demands** |
| demands:view | ✅ | ✅ | ✅ | ✅ |
| demands:create | ✅ | ✅ | ✅ | ❌ |
| demands:edit | ✅ | ✅ | ✅ | ❌ |
| demands:confirm | ✅ | ✅ | ❌ | ❌ |
| demands:cancel | ✅ | ✅ | ❌ | ❌ |
| demands:delete | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| reports:view | ✅ | ✅ | ✅ | ✅ |
| reports:viewFinancial | ✅ | ✅ | ❌ | ❌ |
| reports:export | ✅ | ✅ | ❌ | ❌ |
| **Audit** |
| audit:view | ✅ | ✅ | ✅ | ✅ |
| audit:viewSystem | ✅ | ❌ | ❌ | ❌ |
| **Settings & Users** |
| users:manage | ✅ | ❌ | ❌ | ❌ |
| settings:manage | ✅ | ❌ | ❌ | ❌ |
| businesses:manage | ✅ | ✅ | ❌ | ❌ |
| backup:manage | ✅ | ❌ | ❌ | ❌ |
| **Dashboard** |
| dashboard:viewRevenue | ✅ | ✅ | ❌ | ❌ |

### Permission Usage

**In Components:**
```jsx
import PermissionGate from '@/components/auth/PermissionGate';

<PermissionGate permission="products:create">
  <Button>Add Product</Button>
</PermissionGate>
```

**In Store:**
```javascript
import useAuthStore from '@/stores/authStore';

const canEdit = useAuthStore((s) => s.can('products:edit'));
```

---

## File Structure

```
InstaMall/
├── main/                           # Electron main process
│   ├── main.js                     # Window & IPC setup
│   ├── db.js                       # SQLite database & all IPC handlers (5587 lines!)
│   ├── preload.js                  # Context bridge (exposes electronAPI)
│   ├── scheduler.js                # Auto-backup scheduler
│   └── auditLogger.js              # Audit trail recording
│
├── src/                            # React app (renderer process)
│   ├── App.jsx                     # Root component, routing
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Global styles (Tailwind base)
│   ├── print.css                   # Print-specific styles
│   │
│   ├── screens/                    # Full-page views
│   │   ├── Welcome.jsx             # First-time setup
│   │   ├── Dashboard.jsx           # Main dashboard
│   │   ├── LoginScreen.jsx         # Login screen
│   │   ├── BusinessManager.jsx     # Business management
│   │   ├── ProductList.jsx         # Product list view
│   │   ├── RecycleBin.jsx          # Deleted products
│   │   ├── StockControl.jsx        # Stock control
│   │   ├── BuyerDirectory.jsx      # Buyer list
│   │   ├── ArchivedBuyers.jsx      # Archived buyers
│   │   ├── DemandList.jsx          # Demand list
│   │   ├── DemandBuilder.jsx       # Create/edit demand
│   │   ├── AuditHub.jsx            # Audit log
│   │   ├── ReportsHub.jsx          # Report hub
│   │   ├── UserManagement.jsx      # User management
│   │   ├── DataBackup.jsx          # Backup management
│   │   ├── LabelGenerator.jsx      # Label printing
│   │   │
│   │   ├── stock/                  # Stock sub-pages
│   │   │   ├── StockOverview.jsx
│   │   │   ├── MovementLog.jsx
│   │   │   ├── LowStockPanel.jsx
│   │   │   └── ReorderLevels.jsx
│   │   │
│   │   ├── reports/                # Report pages
│   │   │   ├── StockStatusReport.jsx
│   │   │   ├── LowStockReport.jsx
│   │   │   ├── TopProductsReport.jsx
│   │   │   ├── SalesSummaryReport.jsx
│   │   │   ├── ProfitLossReport.jsx
│   │   │   ├── BuyerOutstandingReport.jsx
│   │   │   ├── BuyerStatementReport.jsx
│   │   │   └── DemandHistoryReport.jsx
│   │   │
│   │   ├── settings/               # Settings pages
│   │   │   ├── CompanySettings.jsx
│   │   │   ├── SecuritySettings.jsx
│   │   │   └── ScannerSettings.jsx
│   │   │
│   │   ├── audit/                  # Audit sub-pages
│   │   │   ├── SystemAuditLog.jsx
│   │   │   ├── ProductHistoryLog.jsx
│   │   │   └── StockChangeLog.jsx
│   │   │
│   │   └── backup/                 # Backup sub-pages
│   │
│   ├── components/                 # Reusable components
│   │   ├── BusinessCard.jsx
│   │   ├── BusinessModal.jsx
│   │   │
│   │   ├── ui/                     # shadcn/ui-style components
│   │   │   ├── button.jsx
│   │   │   ├── input.jsx
│   │   │   ├── textarea.jsx
│   │   │   ├── label.jsx
│   │   │   ├── select.jsx
│   │   │   ├── checkbox.jsx
│   │   │   ├── switch.jsx
│   │   │   ├── slider.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   ├── popover.jsx
│   │   │   ├── tooltip.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── toast.jsx
│   │   │   └── toaster.jsx
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── AppLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── BusinessSwitcher.jsx
│   │   │   ├── SidebarUserMenu.jsx
│   │   │   └── BackupStatusIndicator.jsx
│   │   │
│   │   ├── auth/                   # Auth components
│   │   │   ├── PermissionGate.jsx
│   │   │   ├── AppLockOverlay.jsx
│   │   │   ├── PinPad.jsx
│   │   │   └── UserAvatar.jsx
│   │   │
│   │   ├── products/               # Product components
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── ProductModal.jsx
│   │   │   ├── ProductDetailPanel.jsx
│   │   │   ├── ColumnManager.jsx
│   │   │   ├── CellHistoryPopover.jsx
│   │   │   └── ImportWizard.jsx
│   │   │
│   │   ├── stock/                  # Stock components
│   │   │   ├── StockIndicator.jsx
│   │   │   ├── BatchStockInModal.jsx
│   │   │   └── StockImportModal.jsx
│   │   │
│   │   ├── buyers/                 # Buyer components
│   │   │   ├── BuyerModal.jsx
│   │   │   ├── BuyerDetailPanel.jsx
│   │   │   ├── RecordPaymentModal.jsx
│   │   │   ├── BuyerSearchDropdown.jsx
│   │   │   ├── BuyerMiniCard.jsx
│   │   │   └── OutstandingBuyersBadge.jsx
│   │   │
│   │   ├── demands/                # Demand components
│   │   │   ├── DemandDetailPanel.jsx
│   │   │   ├── DemandPaymentModal.jsx
│   │   │   ├── BillPreview.jsx
│   │   │   ├── LineItemRow.jsx
│   │   │   ├── OrderSummaryPanel.jsx
│   │   │   ├── StockErrorModal.jsx
│   │   │   └── OutstandingDemandsBadge.jsx
│   │   │
│   │   ├── users/                  # User components
│   │   │   ├── UserModal.jsx
│   │   │   ├── ChangePinModal.jsx
│   │   │   └── ResetPinModal.jsx
│   │   │
│   │   ├── scanner/                # Scanner components
│   │   │   ├── ScanModeButton.jsx
│   │   │   ├── WebcamScannerOverlay.jsx
│   │   │   ├── GlobalScanPopup.jsx
│   │   │   ├── GlobalScanToggle.jsx
│   │   │   └── ProductQRCode.jsx
│   │   │
│   │   ├── reports/                # Report components
│   │   │   ├── ReportStatCard.jsx
│   │   │   ├── DateRangePicker.jsx
│   │   │   └── ExportButton.jsx
│   │   │
│   │   ├── audit/                  # Audit components
│   │   │   └── RecentActivityFeed.jsx
│   │   │
│   │   └── backup/                 # Backup components
│   │
│   ├── stores/                     # Zustand state management
│   │   ├── authStore.js
│   │   ├── businessStore.js
│   │   ├── productStore.js
│   │   ├── stockStore.js
│   │   ├── buyerStore.js
│   │   ├── demandStore.js
│   │   ├── auditStore.js
│   │   ├── reportStore.js
│   │   ├── filterStore.js
│   │   ├── scannerStore.js
│   │   └── backupStore.js
│   │
│   ├── utils/                      # Helper functions
│   │   ├── permissions.js          # Permission checker
│   │   ├── formulaEngine.js        # Formula evaluation (mathjs)
│   │   ├── demandCalculations.js   # Demand totals calculator
│   │   ├── buyerHelpers.js         # Buyer-related helpers
│   │   ├── columnMatcher.js        # CSV column mapping
│   │   ├── scannerListener.js      # Keyboard scanner listener
│   │   └── scannerAudio.js         # Scanner audio feedback
│   │
│   ├── constants/                  # Static configuration
│   │   ├── businessPresets.js      # Business types & column presets
│   │   ├── businessThemes.js       # Theme configs
│   │   ├── roles.js                # Role & permission definitions
│   │   ├── buyerConstants.js       # Buyer status configs
│   │   ├── demandConstants.js      # Demand status configs
│   │   └── stockReasons.js         # Stock movement reasons
│   │
│   ├── providers/                  # React context providers
│   │   └── ScannerProvider.jsx     # Scanner context
│   │
│   └── lib/                        # Core utilities
│       └── utils.js                # Helper functions (cn, date parsing, etc.)
│
├── release/                        # Build output
│   └── win-unpacked/               # Unpacked Windows build
│
├── index.html                      # HTML entry point
├── package.json                    # Dependencies & scripts
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
└── README.md                       # Project README

```

---

## Development Workflow

### Running the App

**Development Mode:**
```bash
npm run dev
```
This starts:
1. Vite dev server (port 5173)
2. Electron app (loads from http://localhost:5173)
3. Opens DevTools automatically

**Production Build:**
```bash
npm run build      # Build React app (output: dist/)
npm run dist       # Package as portable .exe (output: release/)
```

### Database Location

**Development:** `%APPDATA%/instamall/instamall.db`  
**Production:** `%APPDATA%/InstaMall/instamall.db`

### IPC Communication

All backend operations use IPC (Inter-Process Communication).

**Frontend (React):**
```javascript
const result = await window.electronAPI.products.getAll(businessId);
```

**Backend (Main Process):**
```javascript
ipcMain.handle('products:getAll', async (event, businessId) => {
  const products = db.prepare('SELECT * FROM products WHERE business_id = ?').all(businessId);
  return { success: true, data: products };
});
```

**Security:** `contextBridge` exposes only whitelisted APIs (no direct Node.js access).

---

## Key Features Explained

### 1. Dynamic Custom Columns
**Why:** Different businesses need different product data (e.g., pharmacy needs expiry dates, restaurant needs portion sizes).

**How:**
- Admin defines columns per business (name, type, formula, dropdown options)
- Product values stored in `product_values` table (EAV pattern)
- Formula columns auto-calculated using mathjs
- UI dynamically renders form fields & table columns

**Supported Column Types:**
- **text** — Free text (e.g., description, batch number)
- **number** — Numeric (e.g., weight, quantity)
- **currency** — Money (formatted with currency symbol)
- **date** — Date picker
- **dropdown** — Select from predefined options
- **checkbox** — Boolean (yes/no)
- **formula** — Calculated field (e.g., `{Price} * {Qty}`)

### 2. Formula Engine
**Why:** Automate calculations (profit, margin, discounted price).

**How:**
- Uses **mathjs** (safe, no `eval()`)
- Formulas reference other columns by name (e.g., `{Purchase Price} * (1 - {Discount %} / 100)`)
- Evaluated on every data change
- Supports math functions (round, sqrt, min, max, etc.)

**Example:**
```javascript
formula: "{Sale Price} - {Purchase Price}"   // Profit
formula: "round({Price} * {Qty}, 2)"        // Line total
```

### 3. Stock Control with Audit Trail
**Why:** Track every stock movement for compliance & debugging.

**How:**
- Every adjustment creates a `stock_movements` record
- Stores: quantity, before/after, reason, source, user, timestamp
- Trigger auto-updates `stock_levels` table
- Demand confirmation deducts stock automatically

**Stock Sources:**
- **manual** — User adjustment (stock in/out)
- **demand** — Automatic deduction (demand confirmation)
- **import** — CSV import

### 4. Demand Workflow
**Why:** Financial tracking requires strict order lifecycle.

**Lifecycle:**
1. **Draft** — Editable, no stock impact
2. **Outstanding** — Confirmed, stock deducted, full payment due
3. **Partial** — Some payment received
4. **Paid** — Fully paid
5. **Cancelled** — Cancelled (stock restored)

**Key Operations:**
- **Confirm** — Deduct stock, change status to outstanding
- **Record Payment** — Reduce balance, update status (partial/paid)
- **Cancel** — Restore stock, mark cancelled (with reason)
- **Reopen** — Revert cancelled demand to draft

### 5. Role-Based Access Control
**Why:** Prevent unauthorized access to sensitive data.

**How:**
- User must login with PIN (if auth enabled)
- Role determines permissions (50+ permission checks)
- `PermissionGate` component conditionally renders UI
- Backend validates permissions (double-check)

**Example:**
```jsx
<PermissionGate permission="products:edit">
  <Button>Edit</Button>
</PermissionGate>
```

### 6. Auto-Backup Scheduler
**Why:** Prevent data loss.

**How:**
- Node.js `setInterval` runs in main process
- Copies database file to backup location
- Filename: `instamall-backup-YYYY-MM-DD-HH-mm-ss.db`
- Auto-deletes old backups (keeps last N)

**Settings:**
- Frequency: 1h, 2h, 6h, 12h, 24h
- Max backups: 5, 10, 20, 50
- Location: User-selectable folder

---

## Summary

**InstaMall** is a feature-rich, production-grade **offline business management system** built with modern web technologies (Electron + React + SQLite). It supports:

✅ **9 business types** with preset templates  
✅ **Unlimited custom fields** per business  
✅ **Formula engine** for calculated fields  
✅ **Stock tracking** with detailed audit trail  
✅ **Order/bill management** with payment tracking  
✅ **Multi-user support** with role-based permissions  
✅ **Comprehensive reports** (sales, profit, top products, buyer statements)  
✅ **Barcode/QR scanning** via webcam  
✅ **Auto-backup** with restore  
✅ **100% offline** — no internet required  

**Total Lines of Code:** ~15,000+  
**Database Tables:** 18 core tables  
**Screens:** 26 screens  
**Components:** 75+ reusable components  
**Stores:** 11 Zustand stores  
**Permissions:** 50+ granular checks  

---

**End of Documentation** 📄
