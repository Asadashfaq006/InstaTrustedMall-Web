import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import useProductStore from '@/stores/productStore';
import Papa from 'papaparse';

export default function ImportWizard({ open, onOpenChange, businessId, columns }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: upload, 2: map columns, 3: result
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileSelect = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile(['csv', 'txt']);
      if (!result.success) return;

      const filePath = result.data;
      
      // Read file content via IPC
      const fileResult = await window.electronAPI.dialog.readFile(filePath);
      if (!fileResult.success) {
        console.error('Failed to read file:', fileResult.error);
        return;
      }
      const text = fileResult.data;

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          setCsvHeaders(results.meta.fields || []);
          
          // Auto-map columns
          const autoMap = {};
          for (const header of results.meta.fields || []) {
            const lowerHeader = header.toLowerCase().trim();
            if (lowerHeader.includes('name') || lowerHeader.includes('product')) {
              autoMap[header] = 'name';
            } else if (lowerHeader.includes('sku')) {
              autoMap[header] = 'sku';
            } else if (lowerHeader.includes('barcode') || lowerHeader.includes('upc')) {
              autoMap[header] = 'barcode';
            } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
              autoMap[header] = 'category';
            } else {
              // Try to match to custom columns
              const match = columns.find((c) => c.name.toLowerCase() === lowerHeader);
              if (match) {
                autoMap[header] = String(match.id);
              }
            }
          }
          setColumnMap(autoMap);
          setStep(2);
        },
        error: (error) => {
          toast({ title: 'Failed to parse CSV', description: error.message, variant: 'destructive' });
        },
      });
    } catch (err) {
      toast({ title: 'Failed to read file', description: err.message, variant: 'destructive' });
    }
  };

  const handleMapChange = (csvHeader, targetColumn) => {
    setColumnMap((prev) => {
      const updated = { ...prev };
      if (targetColumn === '') {
        delete updated[csvHeader];
      } else {
        updated[csvHeader] = targetColumn;
      }
      return updated;
    });
  };

  const handleImport = async () => {
    if (!csvData || csvData.length === 0) return;

    setImporting(true);
    try {
      const importResult = await window.electronAPI.products.importCSV({
        businessId,
        rows: csvData,
        columnMap,
      });

      if (importResult.success) {
        setResult(importResult.data);
        setStep(3);

        // Reload products
        await useProductStore.getState().loadProducts(businessId);
      } else {
        toast({ title: 'Import failed', description: importResult.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Import error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCsvData(null);
    setCsvHeaders([]);
    setColumnMap({});
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            Import Products from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step >= s ? 'bg-accent text-white' : 'bg-gray-100 text-text-muted'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-accent' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent-light flex items-center justify-center mb-4">
              <Upload className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Select CSV File</h3>
            <p className="text-sm text-text-muted mb-6">
              Choose a CSV file containing your product data to import.
            </p>
            <Button variant="accent" onClick={handleFileSelect} className="gap-2">
              <Upload className="w-4 h-4" /> Choose File
            </Button>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 2 && (
          <div className="py-2 max-h-[50vh] overflow-y-auto">
            <p className="text-sm text-text-muted mb-4">
              Map CSV columns to your product fields. Found <strong>{csvData?.length || 0}</strong> rows.
            </p>
            <div className="space-y-2">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="truncate max-w-full">{header}</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted shrink-0" />
                  <select
                    value={columnMap[header] || ''}
                    onChange={(e) => handleMapChange(header, e.target.value)}
                    className="flex-1 h-8 rounded-lg border border-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Skip</option>
                    <optgroup label="Core Fields">
                      <option value="name">Product Name</option>
                      <option value="sku">SKU</option>
                      <option value="barcode">Barcode</option>
                      <option value="category">Category</option>
                    </optgroup>
                    <optgroup label="Custom Columns">
                      {columns.filter((c) => c.type !== 'formula').map((col) => (
                        <option key={col.id} value={col.id}>{col.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {csvData && csvData.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-text-muted mb-2">Preview (first row):</p>
                <div className="text-xs space-y-0.5">
                  {csvHeaders.slice(0, 5).map((h) => (
                    <p key={h}>
                      <span className="text-text-muted">{h}:</span>{' '}
                      <span className="text-text-primary">{csvData[0]?.[h] || '—'}</span>
                    </p>
                  ))}
                  {csvHeaders.length > 5 && (
                    <p className="text-text-muted">...and {csvHeaders.length - 5} more columns</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button variant="accent" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${csvData?.length || 0} Products`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Import Complete</h3>
            <p className="text-sm text-text-muted mb-4">
              Successfully imported <strong>{result.imported}</strong> products.
            </p>
            {result.errors?.length > 0 && (
              <div className="text-left bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {result.errors.length} errors
                </p>
                <div className="text-xs text-red-600 space-y-0.5 max-h-[100px] overflow-y-auto">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <p key={i}>Row {err.row}: {err.error}</p>
                  ))}
                </div>
              </div>
            )}
            <Button variant="accent" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
