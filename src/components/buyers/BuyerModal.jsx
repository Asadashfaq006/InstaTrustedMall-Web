import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import useBuyerStore from '@/stores/buyerStore';
import useBusinessStore from '@/stores/businessStore';
import { getAvatarColor, getBuyerInitials } from '@/utils/buyerHelpers';
import { Camera, User, X } from 'lucide-react';

const EMPTY_FORM = {
  fullName: '',
  businessName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  photoPath: '',
  notes: '',
};

export default function BuyerModal({ open, onOpenChange, buyer = null }) {
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const createBuyer = useBuyerStore((s) => s.createBuyer);
  const updateBuyer = useBuyerStore((s) => s.updateBuyer);

  const isEdit = !!buyer;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (buyer) {
        setForm({
          fullName: buyer.full_name || '',
          businessName: buyer.business_name || '',
          phone: buyer.phone || '',
          email: buyer.email || '',
          address: buyer.address || '',
          city: buyer.city || '',
          photoPath: buyer.photo_path || '',
          notes: buyer.notes || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, buyer]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handlePhotoUpload = async () => {
    try {
      const filePath = await window.electronAPI.dialog.openFile(['png', 'jpg', 'jpeg', 'webp']);
      if (filePath) {
        const res = await window.electronAPI.buyers.uploadPhoto(filePath);
        if (res.success) {
          setField('photoPath', res.data);
        }
      }
    } catch {
      // cancelled
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      let res;
      if (isEdit) {
        res = await updateBuyer({
          buyerId: buyer.id,
          fullName: form.fullName.trim(),
          businessName: form.businessName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          photoPath: form.photoPath,
          notes: form.notes.trim(),
        });
      } else {
        res = await createBuyer({
          businessId: activeBusiness.id,
          fullName: form.fullName.trim(),
          businessName: form.businessName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          photoPath: form.photoPath,
          notes: form.notes.trim(),
        });
      }

      if (res.success) {
        toast({ title: isEdit ? 'Buyer updated' : 'Buyer created' });
        onOpenChange(false);
      } else {
        toast({ title: res.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Buyer' : 'Add New Buyer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing ${buyer.buyer_code}`
              : 'Create a new buyer profile. A buyer code will be auto-generated.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-5">
          {/* Photo + Name Section */}
          <div className="flex items-start gap-4">
            {/* Avatar / Photo */}
            <div className="flex-shrink-0">
              {form.photoPath ? (
                <div className="relative group">
                  <img
                    src={`local-file://${form.photoPath}`}
                    alt="Buyer"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                  />
                  <button
                    onClick={() => setField('photoPath', '')}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoUpload}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-colors border-2 border-dashed border-gray-300 hover:border-accent hover:bg-accent/5"
                  style={
                    isEdit && buyer
                      ? { backgroundColor: getAvatarColor(buyer.id), border: 'none' }
                      : undefined
                  }
                  title="Upload photo"
                >
                  {isEdit && buyer ? (
                    <span className="text-white font-bold text-lg">
                      {getBuyerInitials(form.fullName)}
                    </span>
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              )}
              {!form.photoPath && (
                <button
                  onClick={handlePhotoUpload}
                  className="text-[11px] text-accent hover:underline mt-1 block text-center w-16"
                >
                  Upload
                </button>
              )}
            </div>

            {/* Name fields */}
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  placeholder="Enter buyer's full name"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="businessName">Business / Shop Name</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setField('businessName', e.target.value)}
                  placeholder="Optional business name"
                />
              </div>
            </div>
          </div>

          {/* Buyer Code (edit only) */}
          {isEdit && buyer && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Buyer Code:</span>
              <span className="text-sm font-mono font-semibold text-text-primary">
                {buyer.buyer_code}
              </span>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="buyer@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="City"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Any notes about this buyer..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.fullName.trim()}>
            {saving ? 'Saving...' : isEdit ? 'Update Buyer' : 'Create Buyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
