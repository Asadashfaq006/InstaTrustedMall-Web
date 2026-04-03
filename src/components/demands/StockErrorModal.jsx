import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal displaying stock insufficiency errors when confirming a demand.
 * Props:
 *   open          - boolean
 *   onOpenChange  - (open) => void
 *   errors        - array of { product_name, sku, requested, available }
 */
export default function StockErrorModal({ open, onOpenChange, errors = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Insufficient Stock
          </DialogTitle>
          <DialogDescription>
            The following products do not have enough stock to fulfill this demand.
            Please adjust quantities or add stock before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-2 font-medium text-text-secondary">Product</th>
                <th className="pb-2 font-medium text-text-secondary text-right">Requested</th>
                <th className="pb-2 font-medium text-text-secondary text-right">Available</th>
                <th className="pb-2 font-medium text-text-secondary text-right">Short</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2">
                    <p className="font-medium text-text-primary">{err.product_name}</p>
                    {err.sku && <p className="text-[11px] text-text-muted font-mono">{err.sku}</p>}
                  </td>
                  <td className="py-2 text-right font-medium text-text-primary">{err.requested}</td>
                  <td className="py-2 text-right text-red-600 font-medium">{err.available}</td>
                  <td className="py-2 text-right text-red-700 font-bold">
                    {err.requested - err.available}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            OK, I'll Fix It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
