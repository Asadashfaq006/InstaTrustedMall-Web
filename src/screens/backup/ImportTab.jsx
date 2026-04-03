import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Users, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import ImportWizardModal from '../../components/backup/ImportWizardModal';

export default function ImportTab({ businessId, currentUser }) {
  const [showWizard, setShowWizard] = useState(false);
  const [entityType, setEntityType] = useState('products');
  const [lastResult, setLastResult] = useState(null);

  const handleStartImport = (type) => {
    setEntityType(type);
    setLastResult(null);
    setShowWizard(true);
  };

  const handleWizardClose = (result) => {
    setShowWizard(false);
    if (result) setLastResult(result);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Import wizard modal */}
      {showWizard && (
        <ImportWizardModal
          businessId={businessId}
          currentUser={currentUser}
          entityType={entityType}
          onClose={handleWizardClose}
        />
      )}

      {/* Import cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Products import */}
        <div className="bg-white rounded-xl border p-6 hover:border-[#5B6EAE]/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1E3A5F]">Import Products</h3>
              <p className="text-xs text-gray-500">From CSV or Excel file</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            Bulk import products with name, SKU, barcode, category, and custom column values.
            Supports duplicate handling (skip or update).
          </p>
          <button
            onClick={() => handleStartImport('products')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#5B6EAE] border border-[#5B6EAE]/30 rounded-lg hover:bg-[#5B6EAE]/5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Products
          </button>
        </div>

        {/* Buyers import */}
        <div className="bg-white rounded-xl border p-6 hover:border-[#5B6EAE]/40 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-purple-50">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1E3A5F]">Import Buyers</h3>
              <p className="text-xs text-gray-500">From CSV or Excel file</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            Bulk import buyers with name, business name, phone, email, address, and city.
            Duplicate detection via phone number.
          </p>
          <button
            onClick={() => handleStartImport('buyers')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#5B6EAE] border border-[#5B6EAE]/30 rounded-lg hover:bg-[#5B6EAE]/5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Buyers
          </button>
        </div>
      </div>

      {/* Supported formats */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">Supported Formats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">CSV (.csv)</p>
              <p className="text-xs text-gray-500">Comma-separated values, UTF-8</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">Excel (.xlsx, .xls)</p>
              <p className="text-xs text-gray-500">First sheet is imported</p>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>• First row must contain column headers</p>
          <p>• Auto-mapping matches headers to InstaMall fields using keyword matching</p>
          <p>• You can review and adjust mappings before importing</p>
        </div>
      </div>

      {/* Last import result */}
      {lastResult && (
        <div
          className={`rounded-xl border p-5 ${
            lastResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          {lastResult.success ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-800">Import Completed</h3>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white/60 rounded-lg">
                  <p className="text-lg font-bold text-emerald-700">{lastResult.data.imported}</p>
                  <p className="text-[10px] text-gray-500">Imported</p>
                </div>
                <div className="p-2 bg-white/60 rounded-lg">
                  <p className="text-lg font-bold text-blue-700">{lastResult.data.updated}</p>
                  <p className="text-[10px] text-gray-500">Updated</p>
                </div>
                <div className="p-2 bg-white/60 rounded-lg">
                  <p className="text-lg font-bold text-amber-700">{lastResult.data.skipped}</p>
                  <p className="text-[10px] text-gray-500">Skipped</p>
                </div>
                <div className="p-2 bg-white/60 rounded-lg">
                  <p className="text-lg font-bold text-red-700">{lastResult.data.errors?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Errors</p>
                </div>
              </div>
              {lastResult.data.errors?.length > 0 && (
                <div className="mt-3 text-xs text-red-600">
                  {lastResult.data.errors.slice(0, 5).map((e, i) => (
                    <p key={i}>Row {e.row}: {e.message}</p>
                  ))}
                  {lastResult.data.errors.length > 5 && (
                    <p>...and {lastResult.data.errors.length - 5} more errors</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{lastResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
