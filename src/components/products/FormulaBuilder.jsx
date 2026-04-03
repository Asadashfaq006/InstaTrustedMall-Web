import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Code2 } from 'lucide-react';
import { validateFormula } from '@/utils/formulaEngine';

export default function FormulaBuilder({ formula, onChange, availableColumns }) {
  const [validation, setValidation] = useState({ valid: true, error: null, referencedColumns: [] });

  useEffect(() => {
    if (formula) {
      const colNames = availableColumns.map((c) => c.name);
      const result = validateFormula(formula, colNames);
      setValidation(result);
    } else {
      setValidation({ valid: true, error: null, referencedColumns: [] });
    }
  }, [formula, availableColumns]);

  const insertColumn = (colName) => {
    const newFormula = formula ? `${formula} {${colName}}` : `{${colName}}`;
    onChange(newFormula);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <Code2 className="w-3.5 h-3.5 text-purple-500" />
        Formula
      </Label>

      {/* Formula input */}
      <div className="relative">
        <textarea
          value={formula}
          onChange={(e) => onChange(e.target.value)}
          placeholder='e.g. {Price} * {Quantity}'
          rows={3}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none ${
            formula && !validation.valid
              ? 'border-red-300 bg-red-50'
              : 'border-border bg-white'
          }`}
        />
        {formula && (
          <div className="absolute right-2 top-2">
            {validation.valid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Validation message */}
      {formula && !validation.valid && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {validation.error}
        </p>
      )}

      {/* Available columns */}
      {availableColumns.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">
            Click a column to insert it into the formula:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableColumns.map((col) => (
              <button
                key={col.id}
                onClick={() => insertColumn(col.name)}
                className="inline-flex items-center gap-1"
              >
                <Badge
                  variant={validation.referencedColumns.includes(col.name) ? 'accent' : 'outline'}
                  className="cursor-pointer hover:bg-accent-light transition-colors text-[11px]"
                >
                  {`{${col.name}}`}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-text-muted space-y-1">
        <p className="font-medium text-text-secondary">Formula syntax:</p>
        <p>• Reference columns: <code className="text-purple-600">{'{Column Name}'}</code></p>
        <p>• Math: <code className="text-purple-600">+  -  *  /</code></p>
        <p>• Functions: <code className="text-purple-600">round(x, 2), min(a, b), max(a, b)</code></p>
        <p>• Example: <code className="text-purple-600">{`round({Price} * {Quantity}, 2)`}</code></p>
      </div>
    </div>
  );
}
