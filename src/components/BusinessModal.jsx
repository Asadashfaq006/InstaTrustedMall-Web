import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Step1TypeSelect from '@/components/BusinessModal/Step1TypeSelect';
import Step2Details from '@/components/BusinessModal/Step2Details';
import Step3Financial from '@/components/BusinessModal/Step3Financial';
import useBusinessStore from '@/stores/businessStore';
import { toast } from '@/components/ui/use-toast';
import { CURRENCIES } from '@/constants/businessPresets';

const STEP_TITLES = [
  { title: 'Choose Business Type', description: "We'll set up the right columns and fields for your business automatically." },
  { title: 'Business Details', description: 'Tell us about your business.' },
  { title: 'Financial Settings', description: 'Financial & display preferences.' },
];

export default function BusinessModal({ open, onOpenChange, mode = 'create', editData = null }) {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { createBusiness, updateBusiness } = useBusinessStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    logo_path: '',
    currency: 'PKR',
    currency_symbol: '₨',
    tax_name: 'GST',
    tax_rate: 17,
    date_format: 'DD/MM/YYYY',
    footer_text: '',
    admin_pin: '',
  });

  // Pre-fill form data if editing
  useEffect(() => {
    if (mode === 'edit' && editData) {
      setFormData({
        type: editData.type || '',
        name: editData.name || '',
        phone: editData.phone || '',
        email: editData.email || '',
        address: editData.address || '',
        logo_path: editData.logo_path || '',
        currency: editData.currency || 'PKR',
        currency_symbol: editData.currency_symbol || '₨',
        tax_name: editData.tax_name || 'GST',
        tax_rate: editData.tax_rate ?? 17,
        date_format: editData.date_format || 'DD/MM/YYYY',
        footer_text: editData.footer_text || '',
        admin_pin: '',
      });
      // Skip step 1 for edit mode since type can't be changed
      setCurrentStep(1);
    } else {
      setFormData({
        type: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        logo_path: '',
        currency: 'PKR',
        currency_symbol: '₨',
        tax_name: 'GST',
        tax_rate: 17,
        date_format: 'DD/MM/YYYY',
        footer_text: '',
        admin_pin: '',
      });
      setCurrentStep(0);
    }
    setErrors({});
  }, [open, mode, editData]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 0 && !formData.type) {
      newErrors.type = 'Please select a business type.';
    }
    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Business name is required.';
      }
    }
    if (step === 2 && mode === 'create') {
      if (!formData.admin_pin || formData.admin_pin.length < 4) {
        newErrors.admin_pin = 'Admin PIN must be 4-6 digits.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({ title: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  const handleBack = () => {
    const minStep = mode === 'edit' ? 1 : 0;
    setCurrentStep((prev) => Math.max(prev - 1, minStep));
  };

  const handleFinish = async () => {
    if (!validateStep(currentStep)) {
      toast({ title: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit' && editData) {
        const result = await updateBusiness(editData.id, formData);
        if (result && !result.error) {
          toast({ title: 'Changes saved successfully.', variant: 'success' });
          onOpenChange(false);
        } else {
          toast({ title: result?.error || 'Failed to save changes.', variant: 'destructive' });
        }
      } else {
        const result = await createBusiness(formData);
        if (result && !result.error) {
          toast({
            title: `✅ ${result.name} is ready! Let's add your products.`,
            variant: 'success',
          });
          onOpenChange(false);
          navigate('/dashboard');
        } else {
          toast({ title: result?.error || 'Failed to create business.', variant: 'destructive' });
        }
      }
    } catch (err) {
      toast({ title: 'An error occurred.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-2">
      {STEP_TITLES.map((_, index) => {
        // In edit mode, hide step 0
        if (mode === 'edit' && index === 0) return null;
        const stepNum = mode === 'edit' ? index : index;
        const isActive = currentStep === index;
        const isCompleted = currentStep > index;
        return (
          <React.Fragment key={index}>
            {index > (mode === 'edit' ? 1 : 0) && (
              <div
                className={`h-px flex-1 ${isCompleted ? 'bg-accent' : 'bg-border'}`}
              />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : isCompleted
                  ? 'bg-accent/20 text-accent'
                  : 'bg-gray-100 text-text-muted'
              }`}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : mode === 'edit' ? index : index + 1}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          {renderStepIndicator()}
          <DialogTitle className="text-xl">
            {STEP_TITLES[currentStep].title}
          </DialogTitle>
          <DialogDescription>
            {STEP_TITLES[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 min-h-[320px]">
          <div
            className="transition-all duration-200"
            style={{
              transform: `translateX(0)`,
              opacity: 1,
            }}
          >
            {currentStep === 0 && (
              <Step1TypeSelect
                selectedType={formData.type}
                onSelect={(type) => updateField('type', type)}
                error={errors.type}
              />
            )}
            {currentStep === 1 && (
              <Step2Details
                formData={formData}
                updateField={updateField}
                errors={errors}
              />
            )}
            {currentStep === 2 && (
              <Step3Financial
                formData={formData}
                updateField={updateField}
                errors={errors}
                mode={mode}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <div>
            {currentStep > (mode === 'edit' ? 1 : 0) && (
              <Button variant="ghost" onClick={handleBack} disabled={saving}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div>
            {currentStep < 2 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === 'edit' ? 'Save Changes' : 'Finish Setup'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
