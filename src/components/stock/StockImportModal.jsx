import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import useStockStore from '@/stores/stockStore';
import useBusinessStore from '@/stores/businessStore';
import { ScanLine, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

/**
 * Quick CSV paste / file import for stock levels.
 */
export default function StockImportModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const importCSV = useStockStore((s) => s.importCSV);

  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState('add'); // 'add' or 'set'
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleParsePreview = () => {
    if (!csvText.trim()) return;
    const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
    setPreview(parsed.data);
    setResult(null);
  };

  const handleFileUpload = async () => {
    const res = await window.electronAPI.dialog.openFile(['csv']);
    if (res.success && res.data) {
      // Read file content via IPC
      try {
        const fileResult = await window.electronAPI.dialog.readFile(res.data);
        if (!fileResult.success) {
          toast({ title: 'Error', description: 'Failed to read file' });
          return;
        }
        const text = fileResult.data;
        setCsvText(text);
        const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
        setPreview(parsed.data);
        setResult(null);
      } catch {
        // Fallback: user can paste content
        toast({ title: 'Note', description: 'Please paste the CSV content directly' });
      }
    }
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);

    const res = await importCSV({
      businessId: activeBusiness.id,
      rows: preview,
      mode,
    });

    setImporting(false);

    if (res.success) {
      setResult(res.data);
      toast({
        title: 'Import Complete',
        description: `${res.data.imported} products updated${res.data.errors.length > 0 ? `, ${res.data.errors.length} errors` : ''}`,
      });
    } else {
      toast({ title: 'Import Failed', description: res.error, variant: 'destructive' });
    }
  };

  const handleClose = (val) => {
    if (!val) {
      setCsvText('');
      setPreview(null);
      setResult(null);
      setMode('add');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Import Stock
          </DialogTitle>
          <DialogDescription>
            Paste CSV data with columns: SKU (or Product Name), Quantity, and optionally Mode (add/set)
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Mode selector */}
          <div className="space-y-1.5">
            <Label>Default Mode</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('add')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  mode === 'add' ? 'bg-green-50 border-green-300 text-green-700' : 'border-border text-text-muted hover:bg-gray-50'
                )}
              >
                Add to current
              </button>
              <button
                onClick={() => setMode('set')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  mode === 'set' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-border text-text-muted hover:bg-gray-50'
                )}
              >
                Set exact
              </button>
            </div>
          </div>

          {/* CSV input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>CSV Data</Label>
              <Button variant="ghost" size="sm" onClick={handleFileUpload} className="text-xs text-accent">
                Choose file...
              </Button>
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setPreview(null); setResult(null); }}
              placeholder={'SKU,Quantity\nABC-001,50\nXYZ-002,100'}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          {!preview && (
            <Button onClick={handleParsePreview} disabled={!csvText.trim()} variant="outline" className="w-full">
              Preview Data
            </Button>
          )}

          {/* Preview */}
          {preview && !result && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-text-primary">
                Preview: {preview.length} row{preview.length !== 1 ? 's' : ''} detected
              </div>
              <div className="max-h-[160px] overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      {Object.keys(preview[0] || {}).map(key => (
                        <th key={key} className="px-2 py-1.5 text-left font-medium text-text-muted">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1.5">{val}</td>
                        ))}
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan={Object.keys(preview[0]).length} className="px-2 py-1.5 text-center text-text-muted">
                          ...and {preview.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-2 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium">{result.imported} products imported successfully</span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="max-h-[100px] overflow-y-auto text-xs text-text-muted space-y-0.5">
                    {result.errors.map((err, i) => (
                      <div key={i}>Row {err.row}: {err.error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {preview && !result && (
            <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {importing ? 'Importing...' : `Import ${preview.length} Rows`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
