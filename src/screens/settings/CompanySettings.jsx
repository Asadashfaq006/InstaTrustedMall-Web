import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import useBusinessStore from '@/stores/businessStore';
import { CURRENCIES, DATE_FORMATS, getBusinessTypeInfo } from '@/constants/businessPresets';
import { toast } from '@/components/ui/use-toast';
import { localFileUrl } from '@/lib/utils';

export default function CompanySettings() {
  const { activeBusiness, updateBusiness, loadActive } = useBusinessStore();
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    loadActive();
  }, []);

  useEffect(() => {
    if (activeBusiness) {
      setFormData({
        name: activeBusiness.name || '',
        phone: activeBusiness.phone || '',
        logo_path: activeBusiness.logo_path || '',
        currency: activeBusiness.currency || 'PKR',
        currency_symbol: activeBusiness.currency_symbol || '₨',
        tax_name: activeBusiness.tax_name || '',
        tax_rate: activeBusiness.tax_rate ?? 0,
        date_format: activeBusiness.date_format || 'DD/MM/YYYY',
        footer_text: activeBusiness.footer_text || '',
      });
    }
  }, [activeBusiness]);

  const hasChanges = useMemo(() => {
    if (!formData || !activeBusiness) return false;
    return (
      formData.name !== (activeBusiness.name || '') ||
      formData.phone !== (activeBusiness.phone || '') ||
      formData.logo_path !== (activeBusiness.logo_path || '') ||
      formData.currency !== (activeBusiness.currency || 'PKR') ||
      formData.tax_name !== (activeBusiness.tax_name || '') ||
      formData.tax_rate !== (activeBusiness.tax_rate ?? 0) ||
      formData.date_format !== (activeBusiness.date_format || 'DD/MM/YYYY') ||
      formData.footer_text !== (activeBusiness.footer_text || '')
    );
  }, [formData, activeBusiness]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (code) => {
    const curr = CURRENCIES.find((c) => c.code === code);
    if (curr) {
      updateField('currency', curr.code);
      updateField('currency_symbol', curr.symbol);
    }
  };

  const fileInputRef = useRef(null);

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const onLogoFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadResult = await window.electronAPI.businesses.uploadLogo(file);
      if (uploadResult.success) {
        updateField('logo_path', uploadResult.data);
        toast({ title: 'Logo updated.', variant: 'success' });
      }
    } catch (err) {
      console.error('Logo upload failed:', err);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!activeBusiness || !formData) return;
    if (!formData.name.trim()) {
      toast({ title: 'Business name is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const result = await updateBusiness(activeBusiness.id, formData);
    setSaving(false);

    if (result) {
      toast({ title: 'Changes saved successfully.', variant: 'success' });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } else {
      toast({ title: 'Failed to save changes.', variant: 'destructive' });
    }
  };

  if (!activeBusiness || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted">No active business selected.</p>
      </div>
    );
  }

  const typeInfo = getBusinessTypeInfo(activeBusiness.type);

  return (
    <div className="p-6 max-w-[640px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Company Information</h1>
          <p className="text-sm text-text-secondary mt-1">
            Settings &gt; Company Info
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="text-sm text-success font-medium animate-pulse">
              All changes saved ✓
            </span>
          )}
          {hasChanges && !savedMessage && (
            <span className="flex items-center gap-1.5 text-sm text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Unsaved changes
            </span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Section: Business Identity */}
      <div className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-4 pb-2 border-b border-border">
          Business Identity
        </h2>
        <div className="space-y-5">
          {/* Logo */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onLogoFileSelected}
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
          />
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                {formData.logo_path ? (
                  <img
                    src={localFileUrl(formData.logo_path)}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: typeInfo.color }}
                  >
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleLogoUpload}>
                  <Upload className="w-4 h-4 mr-1.5" />
                  Change Logo
                </Button>
                {formData.logo_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField('logo_path', '')}
                    className="text-error hover:text-error"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          {/* Type (read-only) */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-text-primary">
                {typeInfo.icon} {typeInfo.label}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Business type cannot be changed after creation.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section: Financial Settings */}
      <div className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-4 pb-2 border-b border-border">
          Financial Settings
        </h2>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={formData.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-1.5">
            <Label htmlFor="tax-name">Tax Name</Label>
            <Input
              id="tax-name"
              value={formData.tax_name}
              onChange={(e) => updateField('tax_name', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.tax_rate}
              onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Section: Display & Print */}
      <div className="mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-4 pb-2 border-b border-border">
          Display & Print
        </h2>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Date Format</Label>
            <Select value={formData.date_format} onValueChange={(val) => updateField('date_format', val)}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-1.5">
            <Label htmlFor="footer">Bill Footer</Label>
            <Textarea
              id="footer"
              rows={2}
              value={formData.footer_text}
              onChange={(e) => updateField('footer_text', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
