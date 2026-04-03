import React from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export default function ImportWizardStep1({ filePath, parsedData, entityType, onFileSelected }) {
  const handleChooseFile = async () => {
    const res = await window.electronAPI.dialog.openFile(['csv', 'xlsx', 'xls']);
    if (res.success) {
      onFileSelected(res.data);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-1">
          Select {entityType === 'products' ? 'Product' : 'Buyer'} File
        </h3>
        <p className="text-xs text-gray-500">
          Choose a CSV or Excel file to import. The first row must contain column headers.
        </p>
      </div>

      {/* File picker */}
      <button
        onClick={handleChooseFile}
        className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#5B6EAE] hover:bg-[#5B6EAE]/5 transition-colors"
      >
        <Upload className="w-8 h-8 text-gray-400" />
        <span className="text-sm text-gray-600">Browse for CSV or Excel file</span>
        <span className="text-xs text-gray-400">Supported: .csv, .xlsx, .xls</span>
      </button>

      {/* File info */}
      {filePath && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[#5B6EAE]" />
            <span className="text-sm font-medium text-gray-800 truncate">{filePath.split(/[/\\]/).pop()}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{filePath}</p>
        </div>
      )}

      {/* Parse result */}
      {parsedData && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">File parsed successfully</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mt-2">
            <div>
              <span className="font-medium">Columns:</span> {parsedData.headers.length}
            </div>
            <div>
              <span className="font-medium">Rows:</span> {parsedData.totalRows}
            </div>
          </div>

          {/* Preview first few rows */}
          {parsedData.preview?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-medium text-gray-500 mb-1">Preview (first {parsedData.preview.length} rows):</p>
              <div className="overflow-x-auto rounded border border-emerald-200">
                <table className="text-[10px] w-full">
                  <thead>
                    <tr className="bg-emerald-100">
                      {parsedData.headers.map((h, i) => (
                        <th key={i} className="px-2 py-1 text-left font-medium text-emerald-800 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.preview.map((row, ri) => (
                      <tr key={ri} className="border-t border-emerald-100">
                        {parsedData.headers.map((h, ci) => (
                          <td key={ci} className="px-2 py-1 whitespace-nowrap text-gray-600 max-w-[120px] truncate">
                            {row[h] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expected columns hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-blue-800 mb-1">
          Expected columns for {entityType === 'products' ? 'Products' : 'Buyers'}:
        </h4>
        <p className="text-xs text-blue-700">
          {entityType === 'products'
            ? 'Product Name (required), SKU, Barcode, Category, plus any custom columns you have configured.'
            : 'Full Name (required), Business Name, Phone, Email, Address, City.'}
        </p>
        <p className="text-[10px] text-blue-600 mt-1">
          Column headers are auto-matched using keyword matching — you can adjust mappings in the next step.
        </p>
      </div>
    </div>
  );
}
