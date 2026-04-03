import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Package, Users } from 'lucide-react';
import { applyMapping } from '../../utils/columnMatcher';

export default function ImportWizardStep3({
  parsedData,
  entityType,
  mapping,
  onConflict,
  importResult,
  isImporting,
  onImport,
}) {
  // Build mapped rows from preview for display only
  const previewMapped = useMemo(() => {
    if (!parsedData?.preview) return [];
    return parsedData.preview.map((raw) => applyMapping(raw, mapping));
  }, [parsedData, mapping]);

  const mappedFields = Object.entries(mapping).filter(([_, v]) => v);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-1">Review & Import</h3>
        <p className="text-xs text-gray-500">
          Review the mapping summary below, then start the import.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">{parsedData?.totalRows ?? 0}</p>
          <p className="text-[10px] text-gray-500">Total Rows</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-emerald-700">{mappedFields.length}</p>
          <p className="text-[10px] text-gray-500">Mapped Columns</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-700 capitalize">{onConflict}</p>
          <p className="text-[10px] text-gray-500">On Duplicate</p>
        </div>
      </div>

      {/* Mapping summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Column Mapping</h4>
        <div className="space-y-1">
          {mappedFields.map(([field, header]) => (
            <div key={field} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-32 truncate">{header}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-800 font-medium">
                {field.startsWith('custom:') ? field.split(':').slice(2).join(':') : field}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview mapped data */}
      {previewMapped.length > 0 && !importResult && (
        <div>
          <p className="text-[10px] font-medium text-gray-500 mb-1">Preview (first {previewMapped.length} rows):</p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="text-[10px] w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {mappedFields.map(([field]) => (
                    <th key={field} className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">
                      {field.startsWith('custom:') ? field.split(':').slice(2).join(':') : field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewMapped.map((row, i) => (
                  <tr key={i} className="border-t">
                    {mappedFields.map(([field]) => (
                      <td key={field} className="px-2 py-1 whitespace-nowrap text-gray-600 max-w-[120px] truncate">
                        {field.startsWith('custom:')
                          ? row.values?.[field.split(':').slice(2).join(':')] ?? ''
                          : row[field] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {!importResult && (
        <button
          onClick={onImport}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#5B6EAE] rounded-lg hover:bg-[#4A5D9D] disabled:opacity-60 transition-colors"
        >
          {isImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Importing {parsedData?.totalRows} rows...
            </>
          ) : (
            <>
              {entityType === 'products' ? (
                <Package className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Import {parsedData?.totalRows} {entityType === 'products' ? 'Products' : 'Buyers'}
            </>
          )}
        </button>
      )}

      {/* Import result */}
      {importResult && (
        <div
          className={`rounded-lg p-5 ${
            importResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          {importResult.success ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-semibold text-emerald-800">Import Complete!</h4>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white/60 rounded">
                  <p className="text-lg font-bold text-emerald-700">{importResult.data.imported}</p>
                  <p className="text-[10px] text-gray-500">New</p>
                </div>
                <div className="p-2 bg-white/60 rounded">
                  <p className="text-lg font-bold text-blue-700">{importResult.data.updated}</p>
                  <p className="text-[10px] text-gray-500">Updated</p>
                </div>
                <div className="p-2 bg-white/60 rounded">
                  <p className="text-lg font-bold text-amber-700">{importResult.data.skipped}</p>
                  <p className="text-[10px] text-gray-500">Skipped</p>
                </div>
                <div className="p-2 bg-white/60 rounded">
                  <p className="text-lg font-bold text-red-700">{importResult.data.errors?.length || 0}</p>
                  <p className="text-[10px] text-gray-500">Errors</p>
                </div>
              </div>
              {importResult.data.errors?.length > 0 && (
                <div className="mt-3 text-xs text-red-600">
                  {importResult.data.errors.slice(0, 5).map((e, i) => (
                    <p key={i}>Row {e.row}: {e.message}</p>
                  ))}
                  {importResult.data.errors.length > 5 && (
                    <p>...and {importResult.data.errors.length - 5} more errors</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{importResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
