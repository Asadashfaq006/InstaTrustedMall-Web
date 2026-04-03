import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye, EyeOff, Pencil, Trash2, Plus, GripVertical,
  Type, Hash, DollarSign, Calendar, ToggleLeft, List, Code2,
} from 'lucide-react';
import useProductStore from '@/stores/productStore';
import { useToast } from '@/components/ui/use-toast';
import ColumnForm from './ColumnForm';

const TYPE_ICONS = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
  boolean: ToggleLeft,
  dropdown: List,
  formula: Code2,
};

const TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  boolean: 'Yes/No',
  dropdown: 'Dropdown',
  formula: 'Formula',
};

export default function ColumnManager({ open, onOpenChange, businessId, columns }) {
  const { deleteColumn, toggleColumnVisibility } = useProductStore();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);

  const handleDelete = async (col) => {
    if (col.is_system) {
      toast({ title: 'Cannot delete system column', variant: 'destructive' });
      return;
    }
    const ok = await deleteColumn(col.id);
    if (ok) {
      toast({ title: `Column "${col.name}" deleted` });
    }
  };

  const handleToggleVisibility = async (col) => {
    await toggleColumnVisibility(col.id, !col.is_visible);
  };

  const handleEdit = (col) => {
    setEditingColumn(col);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingColumn(null);
    setShowForm(true);
  };

  if (showForm) {
    return (
      <ColumnForm
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setShowForm(false);
            setEditingColumn(null);
          }
          onOpenChange(v);
        }}
        businessId={businessId}
        column={editingColumn}
        columns={columns}
        onBack={() => {
          setShowForm(false);
          setEditingColumn(null);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>

        <div className="py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1">
            {/* Fixed core columns */}
            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Core Columns (fixed)
            </div>
            {['Product Name', 'SKU', 'Barcode', 'Category'].map((name) => (
              <div key={name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                <Type className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary flex-1">{name}</span>
                <Badge variant="secondary" className="text-[10px]">System</Badge>
              </div>
            ))}

            {/* Custom columns */}
            <div className="px-3 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Custom Columns ({columns.length})
            </div>
            {columns.map((col) => {
              const Icon = TYPE_ICONS[col.type] || Type;
              return (
                <div
                  key={col.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 group transition-colors"
                >
                  <GripVertical className="w-3.5 h-3.5 text-text-muted/30 cursor-grab" />
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate block">{col.name}</span>
                    <span className="text-[10px] text-text-muted">
                      {TYPE_LABELS[col.type] || col.type}
                      {col.is_required ? ' • Required' : ''}
                      {col.is_system ? ' • System' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleVisibility(col)}
                      className="p-1.5 rounded hover:bg-gray-200 text-text-muted"
                      title={col.is_visible ? 'Hide column' : 'Show column'}
                    >
                      {col.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(col)}
                      className="p-1.5 rounded hover:bg-gray-200 text-text-muted"
                      title="Edit column"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!col.is_system && (
                      <button
                        onClick={() => handleDelete(col)}
                        className="p-1.5 rounded hover:bg-red-100 text-text-muted hover:text-red-600"
                        title="Delete column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {!col.is_visible && (
                    <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                  )}
                </div>
              );
            })}

            {columns.length === 0 && (
              <div className="text-center py-6 text-text-muted text-sm">
                No custom columns yet. Add one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button variant="accent" className="gap-1.5" onClick={handleAddNew}>
            <Plus className="w-4 h-4" /> Add Column
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
