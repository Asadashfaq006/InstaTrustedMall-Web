const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  businesses: {
    getAll: () => ipcRenderer.invoke('businesses:getAll'),
    getActive: () => ipcRenderer.invoke('businesses:getActive'),
    create: (data) => ipcRenderer.invoke('businesses:create', data),
    update: (id, data) => ipcRenderer.invoke('businesses:update', id, data),
    delete: (id) => ipcRenderer.invoke('businesses:delete', id),
    setActive: (id) => ipcRenderer.invoke('businesses:setActive', id),
    uploadLogo: (path) => ipcRenderer.invoke('businesses:uploadLogo', path),
  },
  presets: {
    getByType: (type) => ipcRenderer.invoke('presets:getByType', type),
  },
  dialog: {
    openFile: (extensions) => ipcRenderer.invoke('dialog:openFile', extensions),
    readFile: (filePath) => ipcRenderer.invoke('dialog:readFile', filePath),
  },

  // Module 2: Inventory Management
  products: {
    getAll: (businessId) => ipcRenderer.invoke('products:getAll', businessId),
    getById: (productId) => ipcRenderer.invoke('products:getById', productId),
    create: (data) => ipcRenderer.invoke('products:create', data),
    update: (data) => ipcRenderer.invoke('products:update', data),
    updateCore: (data) => ipcRenderer.invoke('products:updateCore', data),
    softDelete: (productId) => ipcRenderer.invoke('products:softDelete', productId),
    softDeleteBulk: (productIds) => ipcRenderer.invoke('products:softDeleteBulk', productIds),
    restore: (productId) => ipcRenderer.invoke('products:restore', productId),
    hardDelete: (productId) => ipcRenderer.invoke('products:hardDelete', productId),
    duplicate: (productId) => ipcRenderer.invoke('products:duplicate', productId),
    getRecycleBin: (businessId) => ipcRenderer.invoke('products:getRecycleBin', businessId),
    getCellHistory: (data) => ipcRenderer.invoke('products:getCellHistory', data),
    uploadImage: (srcPath) => ipcRenderer.invoke('products:uploadImage', srcPath),
    importCSV: (data) => ipcRenderer.invoke('products:importCSV', data),
    exportCSV: (data) => ipcRenderer.invoke('products:exportCSV', data),
    getPackInfo: (data) => ipcRenderer.invoke('products:getPackInfo', data),
  },
  columns: {
    getAll: (businessId) => ipcRenderer.invoke('columns:getAll', businessId),
    create: (data) => ipcRenderer.invoke('columns:create', data),
    update: (data) => ipcRenderer.invoke('columns:update', data),
    delete: (columnId) => ipcRenderer.invoke('columns:delete', columnId),
    reorder: (data) => ipcRenderer.invoke('columns:reorder', data),
    toggleVisibility: (data) => ipcRenderer.invoke('columns:toggleVisibility', data),
    seedFromPresets: (data) => ipcRenderer.invoke('columns:seedFromPresets', data),
  },
  categories: {
    getAll: (businessId) => ipcRenderer.invoke('categories:getAll', businessId),
    create: (data) => ipcRenderer.invoke('categories:create', data),
    delete: (categoryId) => ipcRenderer.invoke('categories:delete', categoryId),
  },
  filters: {
    getAll: (businessId) => ipcRenderer.invoke('filters:getAll', businessId),
    save: (data) => ipcRenderer.invoke('filters:save', data),
    delete: (filterId) => ipcRenderer.invoke('filters:delete', filterId),
  },

  // Module 3: Stock Control
  stock: {
    adjustIn: (data) => ipcRenderer.invoke('stock:adjustIn', data),
    adjustOut: (data) => ipcRenderer.invoke('stock:adjustOut', data),
    adjust: (data) => ipcRenderer.invoke('stock:adjust', data),
    batchAdjustIn: (data) => ipcRenderer.invoke('stock:batchAdjustIn', data),
    demandOut: (data) => ipcRenderer.invoke('stock:demandOut', data),
    demandCancelIn: (data) => ipcRenderer.invoke('stock:demandCancelIn', data),
    getLevel: (productId) => ipcRenderer.invoke('stock:getLevel', productId),
    getLevels: (businessId) => ipcRenderer.invoke('stock:getLevels', businessId),
    getMovements: (data) => ipcRenderer.invoke('stock:getMovements', data),
    getMovementsByProduct: (data) => ipcRenderer.invoke('stock:getMovementsByProduct', data),
    getLowStockProducts: (businessId) => ipcRenderer.invoke('stock:getLowStockProducts', businessId),
    getOutOfStockProducts: (businessId) => ipcRenderer.invoke('stock:getOutOfStockProducts', businessId),
    getLowStockCount: (businessId) => ipcRenderer.invoke('stock:getLowStockCount', businessId),
    setReorderLevel: (data) => ipcRenderer.invoke('stock:setReorderLevel', data),
    setBulkReorderLevels: (items) => ipcRenderer.invoke('stock:setBulkReorderLevels', items),
    getReorderLevel: (productId) => ipcRenderer.invoke('stock:getReorderLevel', productId),
    getExpiryProducts: (data) => ipcRenderer.invoke('stock:getExpiryProducts', data),
    importCSV: (data) => ipcRenderer.invoke('stock:importCSV', data),
    exportCSV: (data) => ipcRenderer.invoke('stock:exportCSV', data),
  },

  // Module 4: Buyer Management
  buyers: {
    getAll: (businessId) => ipcRenderer.invoke('buyers:getAll', businessId),
    getById: (buyerId) => ipcRenderer.invoke('buyers:getById', buyerId),
    search: (data) => ipcRenderer.invoke('buyers:search', data),
    create: (data) => ipcRenderer.invoke('buyers:create', data),
    update: (data) => ipcRenderer.invoke('buyers:update', data),
    archive: (buyerId) => ipcRenderer.invoke('buyers:archive', buyerId),
    restore: (buyerId) => ipcRenderer.invoke('buyers:restore', buyerId),
    deleteBuyer: (buyerId) => ipcRenderer.invoke('buyers:delete', buyerId),
    uploadPhoto: (srcPath) => ipcRenderer.invoke('buyers:uploadPhoto', srcPath),
    getArchived: (businessId) => ipcRenderer.invoke('buyers:getArchived', businessId),
    recalcBalance: (buyerId) => ipcRenderer.invoke('buyers:recalcBalance', buyerId),
    getStatement: (data) => ipcRenderer.invoke('buyers:getStatement', data),
  },
  payments: {
    create: (data) => ipcRenderer.invoke('payments:create', data),
    getByBuyer: (buyerId) => ipcRenderer.invoke('payments:getByBuyer', buyerId),
    deletePayment: (paymentId) => ipcRenderer.invoke('payments:delete', paymentId),
    getByBusiness: (businessId) => ipcRenderer.invoke('payments:getByBusiness', businessId),
  },

  // Module 5: Demand Management
  demands: {
    getAll: (data) => ipcRenderer.invoke('demands:getAll', data),
    getById: (demandId) => ipcRenderer.invoke('demands:getById', demandId),
    getByBuyer: (data) => ipcRenderer.invoke('demands:getByBuyer', data),
    create: (data) => ipcRenderer.invoke('demands:create', data),
    updateItems: (data) => ipcRenderer.invoke('demands:updateItems', data),
    updateNotes: (data) => ipcRenderer.invoke('demands:updateNotes', data),
    confirm: (data) => ipcRenderer.invoke('demands:confirm', data),
    cancel: (data) => ipcRenderer.invoke('demands:cancel', data),
    deleteDemand: (demandId) => ipcRenderer.invoke('demands:delete', demandId),
    reopen: (demandId) => ipcRenderer.invoke('demands:reopen', demandId),
    recordPayment: (data) => ipcRenderer.invoke('demands:recordPayment', data),
    getPayments: (demandId) => ipcRenderer.invoke('demands:getPayments', demandId),
    getSummary: (data) => ipcRenderer.invoke('demands:getSummary', data),
    checkStock: (items) => ipcRenderer.invoke('demands:checkStock', items),
    getBuyerPriceHistory: (data) => ipcRenderer.invoke('demands:getBuyerPriceHistory', data),
    exportPDF: () => ipcRenderer.invoke('demands:exportPDF'),
  },

  // Module 6: Change History & Audit
  history: {
    getByProduct: (data) => ipcRenderer.invoke('history:getByProduct', data),
    getByColumn: (data) => ipcRenderer.invoke('history:getByColumn', data),
    getRecentChanges: (data) => ipcRenderer.invoke('history:getRecentChanges', data),
  },
  audit: {
    getAll: (data) => ipcRenderer.invoke('audit:getAll', data),
    getByEntity: (data) => ipcRenderer.invoke('audit:getByEntity', data),
    getRecentActivity: (data) => ipcRenderer.invoke('audit:getRecentActivity', data),
    getStats: (data) => ipcRenderer.invoke('audit:getStats', data),
    exportCSV: (data) => ipcRenderer.invoke('audit:exportCSV', data),
  },

  // Module 7: Reports & Analytics
  reports: {
    getDashboardStats: (businessId) => ipcRenderer.invoke('reports:getDashboardStats', businessId),
    getStockStatus: (data) => ipcRenderer.invoke('reports:getStockStatus', data),
    getLowStockReport: (businessId) => ipcRenderer.invoke('reports:getLowStockReport', businessId),
    getTopProducts: (data) => ipcRenderer.invoke('reports:getTopProducts', data),
    getSalesSummary: (data) => ipcRenderer.invoke('reports:getSalesSummary', data),
    getProfitLoss: (data) => ipcRenderer.invoke('reports:getProfitLoss', data),
    getBuyerOutstandingReport: (data) => ipcRenderer.invoke('reports:getBuyerOutstandingReport', data),
    getBuyerStatement: (data) => ipcRenderer.invoke('reports:getBuyerStatement', data),
    getDemandHistoryReport: (data) => ipcRenderer.invoke('reports:getDemandHistoryReport', data),
    getDemandSummary: (data) => ipcRenderer.invoke('reports:getDemandSummary', data),
    exportCSV: (data) => ipcRenderer.invoke('reports:exportCSV', data),
    exportExcel: (data) => ipcRenderer.invoke('reports:exportExcel', data),
    exportPDF: (data) => ipcRenderer.invoke('reports:exportPDF', data),
  },

  // Module 8: User & Access Control
  auth: {
    login: (data) => ipcRenderer.invoke('auth:login', data),
    loginNoPin: (data) => ipcRenderer.invoke('auth:loginNoPin', data),
    checkStartupLock: (businessId) => ipcRenderer.invoke('auth:checkStartupLock', businessId),
    logout: (data) => ipcRenderer.invoke('auth:logout', data),
    changePin: (data) => ipcRenderer.invoke('auth:changePin', data),
    resetPin: (data) => ipcRenderer.invoke('auth:resetPin', data),
    verifyPin: (data) => ipcRenderer.invoke('auth:verifyPin', data),
  },
  users: {
    getAll: (businessId) => ipcRenderer.invoke('users:getAll', businessId),
    getById: (userId) => ipcRenderer.invoke('users:getById', userId),
    create: (data) => ipcRenderer.invoke('users:create', data),
    update: (data) => ipcRenderer.invoke('users:update', data),
    deactivate: (data) => ipcRenderer.invoke('users:deactivate', data),
    reactivate: (userId) => ipcRenderer.invoke('users:reactivate', userId),
    deleteUser: (data) => ipcRenderer.invoke('users:delete', data),
    hasUsers: (businessId) => ipcRenderer.invoke('users:hasUsers', businessId),
    setupAdmin: (data) => ipcRenderer.invoke('users:setupAdmin', data),
    getModuleAccess: (userId) => ipcRenderer.invoke('users:getModuleAccess', userId),
    updateModuleAccess: (data) => ipcRenderer.invoke('users:updateModuleAccess', data),
  },
  authSettings: {
    get: (businessId) => ipcRenderer.invoke('settings:getAuthSettings', businessId),
    update: (data) => ipcRenderer.invoke('settings:updateAuthSettings', data),
  },

  // Enhancement: Sidebar Settings
  sidebar: {
    getSettings: (businessId) => ipcRenderer.invoke('sidebar:getSettings', businessId),
    updateSettings: (data) => ipcRenderer.invoke('sidebar:updateSettings', data),
  },

  // Enhancement: Serial Number Settings
  serialSettings: {
    get: (businessId) => ipcRenderer.invoke('settings:getSerialSettings', businessId),
    updatePrefix: (data) => ipcRenderer.invoke('settings:updateSerialPrefix', data),
  },

  // Module 9: Data & Backup
  backup: {
    create: (data) => ipcRenderer.invoke('backup:create', data),
    chooseFolder: () => ipcRenderer.invoke('backup:chooseFolder'),
    getLog: (businessId) => ipcRenderer.invoke('backup:getLog', businessId),
    deleteLogEntry: (data) => ipcRenderer.invoke('backup:deleteLogEntry', data),
    clearOld: (data) => ipcRenderer.invoke('backup:clearOld', data),
    getSettings: (businessId) => ipcRenderer.invoke('backup:getSettings', businessId),
    updateSettings: (data) => ipcRenderer.invoke('backup:updateSettings', data),
    verifyFile: (filePath) => ipcRenderer.invoke('backup:verifyFile', filePath),
    restore: (data) => ipcRenderer.invoke('backup:restore', data),
    chooseFile: () => ipcRenderer.invoke('backup:chooseFile'),
  },
  dataImport: {
    parseFile: (data) => ipcRenderer.invoke('import:parseFile', data),
    importProducts: (data) => ipcRenderer.invoke('import:importProducts', data),
    importBuyers: (data) => ipcRenderer.invoke('import:importBuyers', data),
    validateRows: (data) => ipcRenderer.invoke('import:validateRows', data),
  },
  dataExport: {
    products: (data) => ipcRenderer.invoke('export:products', data),
    buyers: (data) => ipcRenderer.invoke('export:buyers', data),
    demands: (data) => ipcRenderer.invoke('export:demands', data),
    saveFile: (data) => ipcRenderer.invoke('export:saveFile', data),
  },

  // Printing
  print: {
    getPrinters:  () => ipcRenderer.invoke('print:getPrinters'),
    printDemand:  (data) => ipcRenderer.invoke('print:printDemand', data),
    printHtml:    (html, options) => ipcRenderer.invoke('print:printHtml', html, options),
    printReceipt: (options) => ipcRenderer.invoke('print:printReceipt', options),
    testPrint:    () => ipcRenderer.invoke('print:testPrint'),
  },

  // Database utilities
  database: {
    clean: () => ipcRenderer.invoke('database:clean'),
  },

  // Event listener for main → renderer notifications
  on: (channel, callback) => {
    const validChannels = ['backup:scheduled_completed'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // Module 10: Scanner & Barcode
  scanner: {
    getSettings: (businessId) => ipcRenderer.invoke('scanner:getSettings', businessId),
    updateSettings: (data) => ipcRenderer.invoke('scanner:updateSettings', data),
    lookupCode: (data) => ipcRenderer.invoke('scanner:lookupCode', data),
    logScan: (data) => ipcRenderer.invoke('scanner:logScan', data),
    getSessionHistory: (data) => ipcRenderer.invoke('scanner:getSessionHistory', data),
    clearSessionHistory: (sessionId) => ipcRenderer.invoke('scanner:clearSessionHistory', sessionId),
  },
  labels: {
    getTemplates: (businessId) => ipcRenderer.invoke('labels:getTemplates', businessId),
    saveTemplate: (data) => ipcRenderer.invoke('labels:saveTemplate', data),
    deleteTemplate: (templateId) => ipcRenderer.invoke('labels:deleteTemplate', templateId),
    printLabels: (data) => ipcRenderer.invoke('labels:printLabels', data),
    exportLabelsPDF: (data) => ipcRenderer.invoke('labels:exportLabelsPDF', data),
  },
});
