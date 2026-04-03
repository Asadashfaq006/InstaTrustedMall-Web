import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X } from 'lucide-react';
import useProductStore from '@/stores/productStore';
import { useToast } from '@/components/ui/use-toast';
import FormulaBuilder from './FormulaBuilder';

const COLUMN_TYPES = [
  { value: 'text', label: 'Text', description: 'Plain text field' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'currency', label: 'Currency', description: 'Money values with decimals' },
  { value: 'date', label: 'Date', description: 'Date field' },
  { value: 'boolean', label: 'Yes / No', description: 'Toggle field' },
  { value: 'dropdown', label: 'Dropdown', description: 'Select from options' },
  { value: 'formula', label: 'Formula', description: 'Auto-calculated value' },
];

export default function ColumnForm({ open, onOpenChange, businessId, column, columns, onBack }) {
  const { createColumn, updateColumn } = useProductStore();
  const { toast } = useToast();
  const isEdit = !!column;

  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [formula, setFormula] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (column) {
      setName(column.name || '');
      setType(column.type || 'text');
      setFormula(column.formula || '');
      setIsRequired(!!column.is_required);
      try {
        setDropdownOptions(
          typeof column.dropdown_options === 'string'
            ? JSON.parse(column.dropdown_options)
            : column.dropdown_options || []
        );
      } catch {
        setDropdownOptions([]);
      }
    } else {
      setName('');
      setType('text');
      setFormula('');
      setDropdownOptions([]);
      setNewOption('');
      setIsRequired(false);
    }
  }, [column, open]);

  const handleAddOption = () => {
    if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) {
      setDropdownOptions([...dropdownOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (opt) => {
    setDropdownOptions(dropdownOptions.filter((o) => o !== opt));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Column name is required', variant: 'destructive' });
      return;
    }

    if (type === 'dropdown' && dropdownOptions.length === 0) {
      toast({ title: 'Add at least one dropdown option', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const result = await updateColumn({
          columnId: column.id,
          name,
          type,
          formula: type === 'formula' ? formula : null,
          dropdownOptions: type === 'dropdown' ? dropdownOptions : null,
        });

        if (result?.error) {
          toast({ title: 'Failed to update column', description: result.error, variant: 'destructive' });
          return;
        }
        toast({ title: 'Column updated' });
      } else {
        const result = await createColumn({
          businessId,
          name,
          type,
          formula: type === 'formula' ? formula : null,
          dropdownOptions: type === 'dropdown' ? dropdownOptions : null,
          isRequired,
        });

        if (result?.error) {
          toast({ title: 'Failed to create column', description: result.error, variant: 'destructive' });
          return;
        }
        toast({ title: 'Column created' });
      }

      onBack();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherColumns = (columns || []).filter((c) => c.id !== column?.id && c.type !== 'formula');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DialogTitle>{isEdit ? 'Edit Column' : 'Add Column'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <Label>Column Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Purchase Price"
              className="mt-1"
            />
          </div>

          {/* Type */}
          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COLUMN_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setType(ct.value)}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
                    type === ct.value
                      ? 'border-accent bg-accent-light/50 ring-1 ring-accent'
                      : 'border-border hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">{ct.label}</span>
                  <span className="text-[10px] text-text-muted">{ct.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown options */}
          {type === 'dropdown' && (
            <div>
              <Label>Dropdown Options</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  placeholder="Type an option..."
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {dropdownOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dropdownOptions.map((opt) => (
                    <Badge key={opt} variant="secondary" className="gap-1 pr-1">
                      {opt}
                      <button onClick={() => handleRemoveOption(opt)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formula */}
          {type === 'formula' && (
            <FormulaBuilder
              formula={formula}
              onChange={setFormula}
              availableColumns={otherColumns}
            />
          )}

          {/* Required toggle */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-text-secondary">Required field</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Column'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
