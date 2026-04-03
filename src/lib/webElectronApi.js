/**
 * Web API Layer
 *
 * Installs window.electronAPI using HTTP fetch() calls to the Express backend.
 * All stores and components call window.electronAPI.* — this module routes
 * those calls to the REST API transparently.
 *
 * Architecture:
 * ┌─────────────────────────────┐
 * │  React Store / Component    │
 * │  window.electronAPI.x.y()   │
 * └─────────────┬───────────────┘
 *               │ (same interface)
 * ┌─────────────▼───────────────┐
 * │  Web API (webElectronApi)   │
 * │  fetch('/api/x/y', body)    │
 * └─────────────┬───────────────┘
 *               │ HTTP
 * ┌─────────────▼───────────────┐
 * │  Express Backend :3001      │
 * │  PostgreSQL                 │
 * └─────────────────────────────┘
 */

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || '/api';

/**
 * Generic POST helper.
 * All IPC methods used POST semantics with a data payload,
 * so we mirror that with POST + JSON body.
 */
async function post(path, data = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error(`[API] POST ${path} failed:`, err);
    return { success: false, error: err.message };
  }
}

async function get(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    return await res.json();
  } catch (err) {
    console.error(`[API] GET ${path} failed:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * File upload helper (multipart/form-data).
 * Used for product images, logos, buyer photos.
 *
 * The caller passes a File/Blob object from a file input.
 * If the argument is a string, it is returned as-is (no browser file system access).
 */
async function uploadFile(path, fileOrPath) {
  if (typeof fileOrPath === 'string') {
    // In web mode, file paths are not usable — return as-is or empty
    return { success: true, data: fileOrPath };
  }
  try {
    const formData = new FormData();
    formData.append('file', fileOrPath);
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// Web API object installed on window.electronAPI
// ═══════════════════════════════════════════════════════════════

if (typeof window === 'undefined') { /* skip on server */ } else
window.electronAPI = {
  // ──── Businesses ────
  businesses: {
    getAll:       ()          => get('/businesses'),
    getAllForUser: (userId)   => get(`/businesses?userId=${userId}`),
    getActive:    ()          => get('/businesses/active'),
    create:       (data)      => post('/businesses', data),
    update:       (id, data)  => { const url = `/businesses/${id}`; return fetch(`${API_BASE}${url}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()).catch(e => ({ success: false, error: e.message })); },
    delete:       (id)        => fetch(`${API_BASE}/businesses/${id}`, { method: 'DELETE' }).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
    setActive:    (id, userId) => post(`/businesses/${id}/setActive`, userId ? { userId } : {}),
    uploadLogo:   (pathOrFile)=> uploadFile('/businesses/uploadLogo', pathOrFile),
  },

  // ──── Presets ────
  presets: {
    getByType: (type) => post('/presets/getByType', { type }),
  },

  // ──── Dialog (web stubs) ────
  dialog: {
    openFile:  () => Promise.resolve({ success: true, data: null }),
    readFile:  () => Promise.resolve({ success: true, data: null }),
  },

  // ──── Products ────
  products: {
    getAll:        (businessId)  => post('/products/getAll', { businessId }),
    getById:       (productId)   => post('/products/getById', { productId }),
    create:        (data)        => post('/products/create', data),
    update:        (data)        => post('/products/update', data),
    updateCore:    (data)        => post('/products/updateCore', data),
    softDelete:    (productId)   => post('/products/softDelete', { productId }),
    softDeleteBulk:(productIds)  => post('/products/softDeleteBulk', { productIds }),
    restore:       (productId)   => post('/products/restore', { productId }),
    hardDelete:    (productId)   => post('/products/hardDelete', { productId }),
    duplicate:     (productId)   => post('/products/duplicate', { productId }),
    getRecycleBin: (businessId)  => post('/products/getRecycleBin', { businessId }),
    getCellHistory:(data)        => post('/products/getCellHistory', data),
    uploadImage:   (pathOrFile)  => uploadFile('/products/uploadImage', pathOrFile),
    importCSV:     (data)        => post('/products/importCSV', data),
    exportCSV:     (data)        => post('/products/exportCSV', data),
    getPackInfo:   (data)        => post('/products/getPackInfo', data),
  },

  // ──── Columns ────
  columns: {
    getAll:           (businessId) => post('/columns/getAll', { businessId }),
    create:           (data)       => post('/columns/create', data),
    update:           (data)       => post('/columns/update', data),
    delete:           (columnId)   => post('/columns/delete', { columnId }),
    reorder:          (data)       => post('/columns/reorder', data),
    toggleVisibility: (data)       => post('/columns/toggleVisibility', data),
    seedFromPresets:  (data)       => post('/columns/seedFromPresets', data),
  },

  // ──── Categories ────
  categories: {
    getAll: (businessId) => post('/categories/getAll', { businessId }),
    create: (data)       => post('/categories/create', data),
    delete: (categoryId) => post('/categories/delete', { categoryId }),
  },

  // ──── Filters ────
  filters: {
    getAll: (businessId) => post('/filters/getAll', { businessId }),
    save:   (data)       => post('/filters/save', data),
    delete: (filterId)   => post('/filters/delete', { filterId }),
  },

  // ──── Stock ────
  stock: {
    adjustIn:            (data)       => post('/stock/adjustIn', data),
    adjustOut:           (data)       => post('/stock/adjustOut', data),
    adjust:              (data)       => post('/stock/adjust', data),
    batchAdjustIn:       (data)       => post('/stock/batchAdjustIn', data),
    demandOut:           (data)       => post('/stock/demandOut', data),
    demandCancelIn:      (data)       => post('/stock/demandCancelIn', data),
    getLevel:            (productId)  => post('/stock/getLevel', { productId }),
    getLevels:           (businessId) => post('/stock/getLevels', { businessId }),
    getMovements:        (data)       => post('/stock/getMovements', data),
    getMovementsByProduct:(data)      => post('/stock/getMovementsByProduct', data),
    getLowStockProducts: (businessId) => post('/stock/getLowStockProducts', { businessId }),
    getOutOfStockProducts:(businessId)=> post('/stock/getOutOfStockProducts', { businessId }),
    getLowStockCount:    (businessId) => post('/stock/getLowStockCount', { businessId }),
    setReorderLevel:     (data)       => post('/stock/setReorderLevel', data),
    setBulkReorderLevels:(items)      => post('/stock/setBulkReorderLevels', { items }),
    getReorderLevel:     (productId)  => post('/stock/getReorderLevel', { productId }),
    getExpiryProducts:   (data)       => post('/stock/getExpiryProducts', data),
    importCSV:           (data)       => post('/stock/importCSV', data),
    exportCSV:           (data)       => post('/stock/exportCSV', data),
  },

  // ──── Buyers ────
  buyers: {
    getAll:       (businessId) => post('/buyers/getAll', { businessId }),
    getById:      (buyerId)    => post('/buyers/getById', { buyerId }),
    search:       (data)       => post('/buyers/search', data),
    create:       (data)       => post('/buyers/create', data),
    update:       (data)       => post('/buyers/update', data),
    archive:      (buyerId)    => post('/buyers/archive', { buyerId }),
    restore:      (buyerId)    => post('/buyers/restore', { buyerId }),
    deleteBuyer:  (buyerId)    => post('/buyers/delete', { buyerId }),
    uploadPhoto:  (pathOrFile) => uploadFile('/buyers/uploadPhoto', pathOrFile),
    getArchived:  (businessId) => post('/buyers/getArchived', { businessId }),
    recalcBalance:(buyerId)    => post('/buyers/recalcBalance', { buyerId }),
    getStatement: (data)       => post('/buyers/getStatement', data),
  },

  // ──── Payments ────
  payments: {
    create:       (data)       => post('/payments/create', data),
    getByBuyer:   (buyerId)    => post('/payments/getByBuyer', { buyerId }),
    deletePayment:(paymentId)  => post('/payments/delete', { paymentId }),
    getByBusiness:(businessId) => post('/payments/getByBusiness', { businessId }),
  },

  // ──── Demands ────
  demands: {
    getAll:              (data)      => post('/demands/getAll', data),
    getById:             (demandId)  => post('/demands/getById', { demandId }),
    getByBuyer:          (data)      => post('/demands/getByBuyer', data),
    create:              (data)      => post('/demands/create', data),
    updateItems:         (data)      => post('/demands/updateItems', data),
    updateNotes:         (data)      => post('/demands/updateNotes', data),
    confirm:             (data)      => post('/demands/confirm', data),
    cancel:              (data)      => post('/demands/cancel', data),
    deleteDemand:        (demandId)  => post('/demands/delete', { demandId }),
    reopen:              (demandId)  => post('/demands/reopen', { demandId }),
    recordPayment:       (data)      => post('/demands/recordPayment', data),
    getPayments:         (demandId)  => post('/demands/getPayments', { demandId }),
    getSummary:          (data)      => post('/demands/getSummary', data),
    checkStock:          (businessId, items) => post('/demands/checkStock', { businessId, items }),
    getBuyerPriceHistory:(data)      => post('/demands/getBuyerPriceHistory', data),
    exportPDF:           ()          => Promise.resolve({ success: true, data: null }),
  },

  // ──── History ────
  history: {
    getByProduct:   (data) => post('/history/getByProduct', data),
    getByColumn:    (data) => post('/history/getByColumn', data),
    getRecentChanges:(data) => post('/history/getRecentChanges', data),
  },

  // ──── Audit ────
  audit: {
    getAll:          (data) => post('/audit/getAll', data),
    getByEntity:     (data) => post('/audit/getByEntity', data),
    getRecentActivity:(data) => post('/audit/getRecentActivity', data),
    getStats:        (data) => post('/audit/getStats', data),
    exportCSV:       (data) => post('/audit/exportCSV', data),
  },

  // ──── Reports ────
  reports: {
    getDashboardStats:       (businessId) => post('/reports/getDashboardStats', { businessId }),
    getStockStatus:          (data) => post('/reports/getStockStatus', data),
    getLowStockReport:       (businessId) => post('/reports/getLowStockReport', { businessId }),
    getTopProducts:          (data) => post('/reports/getTopProducts', data),
    getSalesSummary:         (data) => post('/reports/getSalesSummary', data),
    getProfitLoss:           (data) => post('/reports/getProfitLoss', data),
    getBuyerOutstandingReport:(data) => post('/reports/getBuyerOutstandingReport', data),
    getBuyerStatement:       (data) => post('/reports/getBuyerStatement', data),
    getDemandHistoryReport:  (data) => post('/reports/getDemandHistoryReport', data),
    getDemandSummary:        (data) => post('/reports/getDemandSummary', data),
    exportCSV:               (data) => post('/reports/exportCSV', data),
    exportExcel:             (data) => post('/reports/exportExcel', data),
    exportPDF:               (data) => Promise.resolve({ success: true, data: null }),
  },

  // ──── Sales ────
  sales: {
    getAll:          (data) => post('/sales/getAll', data),
    getSummary:      (data) => post('/sales/getSummary', data),
    getByUser:       (data) => post('/sales/getByUser', data),
    getItems:        (data) => post('/sales/getItems', data),
    getTopProducts:  (data) => post('/sales/getTopProducts', data),
  },

  // ──── Auth ────
  auth: {
    login:           (data) => post('/auth/login', data),
    loginNoPin:      (data) => post('/auth/loginNoPin', data),
    checkStartupLock:(businessId) => post('/auth/checkStartupLock', { businessId }),
    logout:          (data) => post('/auth/logout', data),
    changePin:       (data) => post('/auth/changePin', data),
    resetPin:        (data) => post('/auth/resetPin', data),
    verifyPin:       (data) => post('/auth/verifyPin', data),
  },

  // ──── Users ────
  users: {
    getAll:            (businessId) => post('/auth/users/getAll', { businessId }),
    getById:           (userId)     => post('/auth/users/getById', { userId }),
    create:            (data)       => post('/auth/users/create', data),
    update:            (data)       => post('/auth/users/update', data),
    deactivate:        (data)       => post('/auth/users/deactivate', data),
    reactivate:        (userId)     => post('/auth/users/reactivate', { userId }),
    deleteUser:        (data)       => post('/auth/users/delete', data),
    hasUsers:          (businessId) => post('/auth/users/hasUsers', { businessId }),
    setupAdmin:        (data)       => post('/auth/users/setupAdmin', data),
    getModuleAccess:   (userId)     => post('/auth/users/getModuleAccess', { userId }),
    updateModuleAccess:(data)       => post('/auth/users/updateModuleAccess', data),
  },

  // ──── Auth Settings ────
  authSettings: {
    get:    (businessId) => post('/auth/settings/get', { businessId }),
    update: (data)       => post('/auth/settings/update', data),
  },

  // ──── Sidebar ────
  sidebar: {
    getSettings:    (data) => post('/sidebar/getSettings', typeof data === 'object' ? data : { businessId: data }),
    updateSettings: (data) => post('/sidebar/updateSettings', data),
  },

  // ──── Serial Settings ────
  serialSettings: {
    get:          (businessId) => post('/serial/get', { businessId }),
    updatePrefix: (data)       => post('/serial/updatePrefix', data),
  },

  // ──── Backup / Data ────
  backup: {
    create:         (data)       => post('/data/backup/create', data),
    chooseFolder:   ()           => post('/data/backup/chooseFolder'),
    getLog:         (businessId) => post('/data/backup/getLog', { businessId }),
    deleteLogEntry: (data)       => post('/data/backup/deleteLogEntry', data),
    clearOld:       (data)       => post('/data/backup/clearOld', data),
    getSettings:    (businessId) => post('/data/backup/getSettings', { businessId }),
    updateSettings: (data)       => post('/data/backup/updateSettings', data),
    verifyFile:     (filePath)   => post('/data/backup/verifyFile', { filePath }),
    restore:        (data)       => post('/data/backup/restore', data),
    chooseFile:     ()           => post('/data/backup/chooseFile'),
  },

  // ──── Data Import ────
  dataImport: {
    parseFile:      (data) => post('/data/import/parseFile', data),
    importProducts: (data) => post('/data/import/importProducts', data),
    importBuyers:   (data) => post('/data/import/importBuyers', data),
    validateRows:   (data) => post('/data/import/validateRows', data),
  },

  // ──── Data Export ────
  dataExport: {
    products: (data) => post('/data/export/products', data),
    buyers:   (data) => post('/data/export/buyers', data),
    demands:  (data) => post('/data/export/demands', data),
    saveFile: (data) => post('/data/export/saveFile', data),
  },

  // ──── Printing (web stubs — use browser print) ────
  print: {
    getPrinters:  () => Promise.resolve({ success: true, data: [] }),
    printDemand:  () => Promise.resolve({ success: true }),
    printHtml:    () => { window.print(); return Promise.resolve({ success: true }); },
    printReceipt: () => { window.print(); return Promise.resolve({ success: true }); },
    testPrint:    () => { window.print(); return Promise.resolve({ success: true }); },
  },

  // ──── Database ────
  database: {
    clean: () => post('/data/database/clean'),
  },

  // ──── Event listeners (no-op in web) ────
  on: () => {},
  removeListener: () => {},

  // ──── Scanner ────
  scanner: {
    getSettings:         (businessId) => post('/scanner/getSettings', { businessId }),
    updateSettings:      (data)       => post('/scanner/updateSettings', data),
    lookupCode:          (data)       => post('/scanner/lookupCode', data),
    logScan:             (data)       => post('/scanner/logScan', data),
    getSessionHistory:   (data)       => post('/scanner/getSessionHistory', data),
    clearSessionHistory: (sessionId)  => post('/scanner/clearSessionHistory', { sessionId }),
  },

  // ──── Labels ────
  labels: {
    getTemplates:    (businessId) => post('/scanner/labels/getTemplates', { businessId }),
    saveTemplate:    (data)       => post('/scanner/labels/saveTemplate', data),
    deleteTemplate:  (templateId) => post('/scanner/labels/deleteTemplate', { templateId }),
    printLabels:     ()           => Promise.resolve({ success: true }),
    exportLabelsPDF: ()           => Promise.resolve({ success: true }),
  },
};

console.log('[InstaMall] Web API shim loaded — routing to', API_BASE);
