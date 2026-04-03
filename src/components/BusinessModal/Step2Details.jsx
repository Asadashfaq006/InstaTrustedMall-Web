import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { localFileUrl } from '@/lib/utils';

export default function Step2Details({ formData, updateField, errors }) {
  const fileInputRef = useRef(null);

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadResult = await window.electronAPI.businesses.uploadLogo(file);
      if (uploadResult.success) {
        updateField('logo_path', uploadResult.data);
      }
    } catch (err) {
      console.error('Logo upload failed:', err);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    updateField('logo_path', '');
  };

  return (
    <div className="space-y-5">
      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
      />
      <div className="space-y-1.5">
        <Label htmlFor="business-name">
          Business Name <span className="text-error">*</span>
        </Label>
        <Input
          id="business-name"
          placeholder="e.g. Ahmed General Store"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={errors.name ? 'border-error focus:ring-error' : ''}
        />
        {errors.name && (
          <p className="text-xs text-error">{errors.name}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          placeholder="+92 300 0000000"
          value={formData.phone}
          onChange={(e) => updateField('phone', e.target.value)}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="store@example.com"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Business Address</Label>
        <Textarea
          id="address"
          rows={3}
          placeholder="Street, City, Province"
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
        />
      </div>

      {/* Logo Upload */}
      <div className="space-y-1.5">
        <Label>Business Logo (optional)</Label>
        <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-gray-50/50">
          {/* Preview */}
          <div className="w-20 h-20 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            {formData.logo_path ? (
              <img
                src={localFileUrl(formData.logo_path)}
                alt="Logo preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Upload className="w-8 h-8 text-text-muted" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogoUpload}
                type="button"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Browse & Select Logo
              </Button>
              {formData.logo_path && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  type="button"
                  className="text-error hover:text-error"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-text-muted">
              Supported: PNG, JPG, SVG · Max size: 2MB
            </p>
            <p className="text-xs text-text-muted">
              Used on printed bills & PDF exports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
