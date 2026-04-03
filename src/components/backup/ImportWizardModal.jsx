import React, { useState, useEffect } from 'react';
import { X, Upload, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import useBackupStore from '../../stores/backupStore';
import { applyMapping } from '../../utils/columnMatcher';
import ImportWizardStep1 from './ImportWizardStep1';
import ImportWizardStep2 from './ImportWizardStep2';
import ImportWizardStep3 from './ImportWizardStep3';

const STEPS = ['Select File', 'Map Columns', 'Review & Import'];

export default function ImportWizardModal({ businessId, currentUser, entityType, onClose }) {
  const { parseImportFile, importProducts, importBuyers, isImporting } = useBackupStore();

  const [step, setStep] = useState(0);

  // Step 1 state
  const [filePath, setFilePath] = useState(null);
  const [fileType, setFileType] = useState('csv');
  const [parsedData, setParsedData] = useState(null); // { headers, preview, totalRows }

  // Step 2 state
  const [mapping, setMapping] = useState({});
  const [onConflict, setOnConflict] = useState('skip');
  const [customColumns, setCustomColumns] = useState([]);

  // Step 3 state
  const [importResult, setImportResult] = useState(null);

  // Load custom columns for products
  useEffect(() => {
    if (entityType === 'products') {
      window.electronAPI.columns.getAll(businessId).then((res) => {
        if (res.success) setCustomColumns(res.data || []);
      });
    }
  }, [businessId, entityType]);

  const handleFileSelected = async (selectedPath) => {
    setFilePath(selectedPath);
    const ft = selectedPath.endsWith('.csv') ? 'csv' : 'xlsx';
    setFileType(ft);
    const res = await parseImportFile({ filePath: selectedPath, fileType: ft });
    if (res.success) {
      setParsedData(res.data);
    } else {
      setParsedData(null);
      alert('Failed to parse file: ' + res.error);
    }
  };

  const handleImport = async () => {
    // Re-parse the full file to get ALL rows (not just preview)
    const fullRes = await window.electronAPI.dataImport.parseFile({
      filePath, fileType, fullData: true,
    });
    if (!fullRes.success || !fullRes.data.allRows) {
      setImportResult({ success: false, error: fullRes.error || 'Failed to read full file data' });
      return;
    }

    // Apply column mapping to all rows
    const allMappedRows = fullRes.data.allRows.map((raw) => applyMapping(raw, mapping));

    const label = currentUser?.display_name || currentUser?.username || 'Unknown';
    let res;
    if (entityType === 'products') {
      res = await importProducts({
        businessId,
        userId: currentUser?.id,
        userLabel: label,
        rows: allMappedRows,
        onConflict,
      });
    } else {
      res = await importBuyers({
        businessId,
        userId: currentUser?.id,
        userLabel: label,
        rows: allMappedRows,
        onConflict,
      });
    }
    setImportResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-[#1E3A5F]">
              Import {entityType === 'products' ? 'Products' : 'Buyers'}
            </h2>
            <p className="text-xs text-gray-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={() => onClose(importResult)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    i === step ? 'text-[#5B6EAE]' : i < step ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === step
                        ? 'bg-[#5B6EAE] text-white'
                        : i < step
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  {s}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 0 && (
            <ImportWizardStep1
              filePath={filePath}
              parsedData={parsedData}
              entityType={entityType}
              onFileSelected={handleFileSelected}
            />
          )}
          {step === 1 && (
            <ImportWizardStep2
              parsedData={parsedData}
              entityType={entityType}
              mapping={mapping}
              setMapping={setMapping}
              onConflict={onConflict}
              setOnConflict={setOnConflict}
              customColumns={customColumns}
            />
          )}
          {step === 2 && (
            <ImportWizardStep3
              parsedData={parsedData}
              entityType={entityType}
              mapping={mapping}
              onConflict={onConflict}
              importResult={importResult}
              isImporting={isImporting}
              onImport={handleImport}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => (step === 0 ? onClose(importResult) : setStep(step - 1))}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            {step === 0 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" /> Back
              </>
            )}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 0 && !parsedData) ||
                (step === 1 && Object.values(mapping).filter(Boolean).length === 0)
              }
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#5B6EAE] rounded-lg hover:bg-[#4A5D9D] disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : importResult?.success ? (
            <button
              onClick={() => onClose(importResult)}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
