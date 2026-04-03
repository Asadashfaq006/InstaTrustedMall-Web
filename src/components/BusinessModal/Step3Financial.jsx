import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCIES, DATE_FORMATS, COLUMN_PRESETS, getBusinessTypeInfo } from '@/constants/businessPresets';

export default function Step3Financial({ formData, updateField, mode = 'create' }) {
  const typeInfo = getBusinessTypeInfo(formData.type);
  const presetCount = (COLUMN_PRESETS[formData.type] || []).length;
  const selectedCurrency = CURRENCIES.find((c) => c.code === formData.currency);

  const handleCurrencyChange = (code) => {
    const curr = CURRENCIES.find((c) => c.code === code);
    if (curr) {
      updateField('currency', curr.code);
      updateField('currency_symbol', curr.symbol);
    }
  };

  return (
    <div className="space-y-5">
      {/* Currency */}
      <div className="space-y-1.5">
        <Label>Currency <span className="text-error">*</span></Label>
        <Select value={formData.currency} onValueChange={handleCurrencyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tax Name */}
      <div className="space-y-1.5">
        <Label htmlFor="tax-name">Tax Name</Label>
        <Input
          id="tax-name"
          placeholder="e.g. GST, VAT, Sales Tax"
          value={formData.tax_name}
          onChange={(e) => updateField('tax_name', e.target.value)}
        />
      </div>

      {/* Tax Rate */}
      <div className="space-y-1.5">
        <Label htmlFor="tax-rate">Tax Rate (%)</Label>
        <Input
          id="tax-rate"
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="e.g. 17"
          value={formData.tax_rate}
          onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || 0)}
        />
        <p className="text-xs text-text-muted">Leave 0 if no tax applies</p>
      </div>

      {/* Date Format */}
      <div className="space-y-1.5">
        <Label>Date Format</Label>
        <Select value={formData.date_format} onValueChange={(val) => updateField('date_format', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select date format" />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bill Footer */}
      <div className="space-y-1.5">
        <Label htmlFor="footer">Bill Footer Text</Label>
        <Textarea
          id="footer"
          rows={2}
          placeholder="e.g. Thank you for your business! Returns accepted within 7 days."
          value={formData.footer_text}
          onChange={(e) => updateField('footer_text', e.target.value)}
        />
        <p className="text-xs text-text-muted">
          This text will appear at the bottom of every printed bill.
        </p>
      </div>

      {/* Admin PIN — only for new business setup */}
      {mode === 'create' && (
        <div className="space-y-1.5 border-t border-border pt-4">
          <Label htmlFor="admin-pin">Admin PIN <span className="text-error">*</span></Label>
          <Input
            id="admin-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter 4-6 digit PIN"
            value={formData.admin_pin || ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              updateField('admin_pin', val);
            }}
          />
          <p className="text-xs text-text-muted">
            Set a 4-6 digit PIN for the admin account. You will use this PIN to log in.
          </p>
          {formData.admin_pin && (formData.admin_pin.length < 4) && (
            <p className="text-xs text-error">PIN must be at least 4 digits</p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          📋 Summary
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-text-secondary">Business:</span>
          <span className="text-text-primary font-medium">
            {formData.name || '—'}
          </span>

          <span className="text-text-secondary">Type:</span>
          <span className="text-text-primary font-medium">
            {typeInfo.icon} {typeInfo.label}
          </span>

          <span className="text-text-secondary">Currency:</span>
          <span className="text-text-primary font-medium">
            {formData.currency} ({formData.currency_symbol})
          </span>

          <span className="text-text-secondary">Tax:</span>
          <span className="text-text-primary font-medium">
            {formData.tax_name || 'None'} @ {formData.tax_rate}%
          </span>

          <span className="text-text-secondary">Columns:</span>
          <span className="text-text-primary font-medium">
            {presetCount} pre-configured columns
          </span>
        </div>
      </div>
    </div>
  );
}
