import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import useBusinessStore from '@/stores/businessStore';
import useDemandStore from '@/stores/demandStore';
import BuyerSearchDropdown from '@/components/buyers/BuyerSearchDropdown';

import StockErrorModal from '@/components/demands/StockErrorModal';
import BillPreview from '@/components/demands/BillPreview';
import ConfirmDemandDialog from '@/components/demands/ConfirmDemandDialog';
import DemandItemsTable from '@/components/demands/DemandItemsTable';
import { calcLineItem, calcDemandTotals } from '@/utils/demandCalculations';
import { formatCurrency } from '@/utils/buyerHelpers';
import {
  ArrowLeft, Search, Save, CheckCircle, Printer, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ScanModeButton from '@/components/scanner/ScanModeButton';

/**
 * Full-page Demand Builder (create / edit).
 * Route: /demands/new  or  /demands/:id/edit
 */
export default function DemandBuilder() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { id: editId } = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const { createDemand, updateItems, updateNotes, confirmDemand, checkStock } = useDemandStore();

  // Demand state
  const [buyer, setBuyer] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [draftId, setDraftId] = useState(null);
  const [demandCode, setDemandCode] = useState(null);
  const [serialNumber, setSerialNumber] = useState(null);
  const [demandStatus, setDemandStatus] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);

  // Products & stock
  const [products, setProducts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [stockLevels, setStockLevels] = useState({});
  const [packInfo, setPackInfo] = useState({}); // { productId: { packQuantity, packPrice, unitPrice } }
  const [buyerPriceHistory, setBuyerPriceHistory] = useState({}); // { productId: { price, quantity, discount_type, discount_value, lastDate } }
  const [productSearch, setProductSearch] = useState('');
  const [scanFlashId, setScanFlashId] = useState(null);

  // Overall discount & tax
  const [overallDiscountType, setOverallDiscountType] = useState('percent');
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [applyTax, setApplyTax] = useState(false);

  // UI state
  const [quotationMode, setQuotationMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [changeLog, setChangeLog] = useState([]);    // array of { time, field, product, oldVal, newVal }
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [showStockErrors, setShowStockErrors] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const productSearchRef = useRef(null);

  // Load products, columns, and potentially existing demand
  useEffect(() => {
    if (!activeBusiness?.id) return;

    const load = async () => {
      // Load products
      try {
        const pRes = await window.electronAPI.products.getAll(activeBusiness.id);
        if (pRes.success) setProducts(pRes.data);
      } catch { /* silent */ }

      // Load columns (to find Sale Price column)
      try {
        const cRes = await window.electronAPI.columns.getAll(activeBusiness.id);
        if (cRes.success) setColumns(cRes.data);
      } catch { /* silent */ }

      // Load stock levels
      try {
        const sRes = await window.electronAPI.stock.getLevels(activeBusiness.id);
        if (sRes.success) {
          const map = {};
          for (const s of sRes.data) {
            map[s.productId] = s.quantity;
          }
          setStockLevels(map);
        }
      } catch { /* silent */ }

      // Load pack info
      try {
        const piRes = await window.electronAPI.products.getPackInfo({ businessId: activeBusiness.id });
        if (piRes.success && piRes.data.hasPackSystem) {
          setPackInfo(piRes.data.packInfo || {});
        }
      } catch { /* silent */ }

      // If editing, load the demand
      if (editId) {
        try {
          const dRes = await window.electronAPI.demands.getById(parseInt(editId));
          if (dRes.success) {
            const d = dRes.data;
            setDraftId(d.id);
            setDemandCode(d.demand_code);
            setSerialNumber(d.serial_number || null);
            setDemandStatus(d.status);
            setNotes(d.notes || '');
            setAmountPaid(d.amount_paid || 0);

            if (d.buyer_id) {
              setBuyer({
                id: d.buyer_id,
                full_name: d.buyer_name,
                buyer_code: d.buyer_code,
                outstanding: d.buyer_outstanding || 0,
                payment_status: d.buyer_outstanding > 0 ? 'outstanding' : 'paid',
              });
              setCustomerName(d.buyer_name || '');
              // Load buyer price history for the existing demand's buyer
              try {
                const phRes = await window.electronAPI.demands.getBuyerPriceHistory({ buyerId: d.buyer_id });
                if (phRes.success) setBuyerPriceHistory(phRes.data || {});
              } catch { /* silent */ }
            } else if (d.buyer_name) {
              setCustomerName(d.buyer_name);
            }
            if (d.items) {
              setItems(d.items.map((it) => ({
                id: it.id,
                product_id: it.product_id,
                product_name: it.product_name,
                sku: it.sku || it.product_sku || '',
                qty: Number(it.qty ?? it.quantity ?? 0),
                price: Number(it.price ?? it.unit_price ?? it.unitPrice ?? 0),
                discount_type: it.discount_type || 'percent',
                discount_value: it.discount_value || 0,
                tax_rate: it.tax_rate ?? it.tax_value ?? 0,
              })));
            }
          }
        } catch { /* silent */ }
      }

      // Pre-fill buyer from query param
      const buyerIdParam = searchParams.get('buyerId');
      if (buyerIdParam && !editId) {
        try {
          const bRes = await window.electronAPI.buyers.getById(parseInt(buyerIdParam));
          if (bRes.success) {
            setBuyer(bRes.data);
            // Load buyer price history
            try {
              const phRes = await window.electronAPI.demands.getBuyerPriceHistory({ buyerId: parseInt(buyerIdParam) });
              if (phRes.success) setBuyerPriceHistory(phRes.data || {});
            } catch { /* silent */ }
          }
        } catch { /* silent */ }
      }
    };

    load();
  }, [activeBusiness?.id, editId]);

  // Find Sale Price column — matches various business type column names
  // Explicitly excludes Purchase Price, Pack Price, and cost columns
  const salePriceColumn = useMemo(() => {
    const excludeNames = ['Purchase Price', 'Pack Price', 'Recipe Cost', 'Stitching Cost', 'Material Cost'];
    // Priority list of sale-price column names across business types
    const priceNames = ['Sale Price', 'Selling Price', 'MRP', 'Bulk Sale Price'];
    for (const name of priceNames) {
      const col = columns.find((c) => c.name === name && c.type === 'currency');
      if (col) return col;
    }
    // Fallback: find any required currency column that is NOT a cost/purchase column
    const requiredCurrency = columns.filter((c) =>
      c.type === 'currency' && c.is_required && !excludeNames.includes(c.name)
    );
    if (requiredCurrency.length > 0) return requiredCurrency[requiredCurrency.length - 1];
    // Fallback: any non-excluded currency column
    const anyCurrency = columns.filter((c) =>
      c.type === 'currency' && !excludeNames.includes(c.name)
    );
    if (anyCurrency.length > 0) return anyCurrency[anyCurrency.length - 1];
    return null;
  }, [columns]);

  // Filter products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase().trim();
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [products, productSearch]);

  // Get default price for a product
  const getDefaultPrice = useCallback((product) => {
    if (!salePriceColumn || !product.values) return 0;
    const val = product.values[salePriceColumn.id];
    return val ? parseFloat(val) || 0 : 0;
  }, [salePriceColumn]);

  // Add product to items
  const addProduct = useCallback((product) => {
    // Check if already added
    const existing = items.find((it) => it.product_id === product.id);
    if (existing) {
      setItems(items.map((it) =>
        it.product_id === product.id
          ? { ...it, qty: it.qty + 1 }
          : it
      ));
    } else {
      // Priority: buyer's last price > unit price from pack system > Sale Price column
      const basePrice = getDefaultPrice(product);
      const pPack = packInfo[product.id];
      const buyerHistory = buyerPriceHistory[product.id];
      let itemPrice = (pPack && pPack.unitPrice > 0) ? pPack.unitPrice : basePrice;
      let itemDiscount = 0;
      let itemDiscountType = 'percent';
      if (buyerHistory && buyerHistory.price > 0) {
        itemPrice = buyerHistory.price;
        itemDiscount = buyerHistory.discount_value || 0;
        itemDiscountType = buyerHistory.discount_type || 'percent';
      }
      setItems([...items, {
        id: `new_${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku || '',
        qty: 1,
        price: itemPrice,
        discount_type: itemDiscountType,
        discount_value: itemDiscount,
        tax_rate: 0,
      }]);
    }
    setProductSearch('');
    productSearchRef.current?.focus();
  }, [items, getDefaultPrice, packInfo, buyerPriceHistory]);

  // Update a line item (with change tracking)
  const updateItem = useCallback((index, updatedItem) => {
    setItems((prev) => {
      const old = prev[index];
      if (old) {
        const changes = [];
        if (old.price !== updatedItem.price) {
          changes.push({ field: 'Sale Rate', oldVal: old.price, newVal: updatedItem.price });
        }
        if (old.qty !== updatedItem.qty) {
          changes.push({ field: 'Quantity', oldVal: old.qty, newVal: updatedItem.qty });
        }
        if (old.discount_value !== updatedItem.discount_value) {
          changes.push({ field: 'Discount %', oldVal: old.discount_value, newVal: updatedItem.discount_value });
        }
        if (changes.length > 0) {
          const now = new Date().toLocaleTimeString('en-PK');
          setChangeLog((log) => [
            ...log,
            ...changes.map((c) => ({
              time: now,
              product: old.product_name,
              ...c,
            })),
          ]);
        }
      }
      return prev.map((it, i) => i === index ? updatedItem : it);
    });
  }, []);

  // Remove a line item (with change tracking)
  const removeItem = useCallback((index) => {
    setItems((prev) => {
      const removed = prev[index];
      if (removed) {
        const now = new Date().toLocaleTimeString('en-PK');
        setChangeLog((log) => [...log, {
          time: now,
          product: removed.product_name,
          field: 'Removed',
          oldVal: `Qty: ${removed.qty}`,
          newVal: '—',
        }]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Compute totals
  const totals = useMemo(() => calcDemandTotals(items, {
    overallDiscountType,
    overallDiscountValue,
    applyTax,
    taxRate: activeBusiness?.tax_rate || 0,
  }), [items, overallDiscountType, overallDiscountValue, applyTax, activeBusiness?.tax_rate]);

  // Check if view-only (non-draft demand)
  const isViewOnly = demandStatus && demandStatus !== 'draft';

  // Save as draft
  const handleSaveDraft = async () => {
    if (!activeBusiness?.id) return;
    if (items.length === 0) {
      toast({ title: 'Add at least one product', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (draftId) {
        // Update existing draft
        const itemsData = items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.sku || null,
          unit_price: it.price,
          quantity: it.qty,
          discount_type: it.discount_type || 'percent',
          discount_value: it.discount_value || 0,
          tax_type: 'percent',
          tax_value: it.tax_rate || 0,
        }));
        const res = await updateItems({ demandId: draftId, items: itemsData });
        if (res.success) {
          await updateNotes({ demandId: draftId, notes: notes.trim() });
          toast({ title: 'Draft updated' });
        } else {
          toast({ title: res.error || 'Failed to update', variant: 'destructive' });
        }
      } else {
        // Create new draft
        const itemsData = items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.sku || null,
          unit_price: it.price,
          quantity: it.qty,
          discount_type: it.discount_type || 'percent',
          discount_value: it.discount_value || 0,
          tax_type: 'percent',
          tax_value: it.tax_rate || 0,
        }));
        const res = await createDemand({
          businessId: activeBusiness.id,
          buyerId: buyer?.id || null,
          buyerName: buyer?.full_name || customerName || null,
          items: itemsData,
          notes: notes.trim() || null,
        });
        if (res.success) {
          setDraftId(res.data.id);
          setDemandCode(res.data.demand_code);
          setSerialNumber(res.data.serial_number || null);
          setDemandStatus('draft');
          toast({ title: `Draft ${res.data.demand_code} saved` });
        } else {
          toast({ title: res.error || 'Failed to create', variant: 'destructive' });
        }
      }
    } catch (err) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Confirm demand (save first if needed, then confirm)
  const handleConfirm = async () => {
    if (items.length === 0) {
      toast({ title: 'Add products first', variant: 'destructive' });
      return;
    }
    // Open confirm dialog (which has Save/Print/Confirm buttons)
    setShowConfirmDialog(true);
  };

  // Actual confirm logic (called from ConfirmDemandDialog)
  // payOpts: { paymentStatus: 'paid'|'outstanding'|'partial', paidAmount: number, skipNavigation: boolean }
  const doConfirm = async (payOpts = {}) => {
    const { skipNavigation = false, paymentStatus = 'paid', paidAmount = 0 } = payOpts;
    setConfirming(true);
    try {
      // Save first if not saved yet
      let targetId = draftId;
      if (!targetId) {
        const itemsData = items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.sku || null,
          unit_price: it.price,
          quantity: it.qty,
          discount_type: it.discount_type || 'percent',
          discount_value: it.discount_value || 0,
          tax_type: 'percent',
          tax_value: it.tax_rate || 0,
        }));
        const createRes = await createDemand({
          businessId: activeBusiness.id,
          buyerId: buyer?.id || null,
          buyerName: buyer?.full_name || customerName || null,
          items: itemsData,
          notes: notes.trim() || null,
        });
        if (!createRes.success) {
          toast({ title: createRes.error || 'Failed', variant: 'destructive' });
          return false;
        }
        targetId = createRes.data.id;
        setDraftId(targetId);
        setDemandCode(createRes.data.demand_code);
        setSerialNumber(createRes.data.serial_number || null);
      } else {
        // Update items first
        const itemsData = items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.sku || null,
          unit_price: it.price,
          quantity: it.qty,
          discount_type: it.discount_type || 'percent',
          discount_value: it.discount_value || 0,
          tax_type: 'percent',
          tax_value: it.tax_rate || 0,
        }));
        await updateItems({ demandId: targetId, items: itemsData });
        await updateNotes({ demandId: targetId, notes: notes.trim() });
      }

      // Check stock
      const stockCheck = await checkStock(
        activeBusiness.id,
        items.map((it) => ({ product_id: it.product_id, quantity: it.qty, product_name: it.product_name }))
      );
      if (stockCheck.success && stockCheck.data?.errors?.length > 0) {
        setStockErrors(stockCheck.data.errors);
        setShowStockErrors(true);
        return;
      }

      // Confirm with payment status
      const confirmRes = await confirmDemand(targetId, { paymentStatus, paidAmount });
      if (confirmRes.success) {
        const statusLabel = paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Outstanding';
        toast({ title: `Demand confirmed as ${statusLabel}! Stock deducted.` });
        if (!skipNavigation) {
          setShowConfirmDialog(false);
          navigate('/demands');
        }
        return true;
      } else {
        // Might be stock errors from server side
        if (confirmRes.errors) {
          setStockErrors(confirmRes.errors);
          setShowStockErrors(true);
        } else {
          toast({ title: confirmRes.error || 'Failed to confirm', variant: 'destructive' });
        }
        return false;
      }
    } catch (err) {
      toast({ title: err.message, variant: 'destructive' });
      return false;
    } finally {
      setConfirming(false);
    }
  };

  // Confirm & Print wrapper — confirms without navigating, prints, then navigates
  const doConfirmAndPrint = async (payOpts = {}) => {
    const success = await doConfirm({ skipNavigation: true, ...payOpts });
    if (success) {
      // Return true so ConfirmDemandDialog can proceed with printing
      // The dialog will handle print, then we navigate after
      return true;
    }
    return false;
  };

  // Build demand object for BillPreview (or Quotation)
  const buildPreviewDemand = (asQuotation = false) => ({
    id: asQuotation ? null : draftId,
    demand_code: asQuotation ? 'QUOTATION' : (demandCode || 'DRAFT'),
    serial_number: asQuotation ? null : (serialNumber || null),
    status: asQuotation ? 'quotation' : (demandStatus || 'draft'),
    buyer_id: buyer?.id || null,
    buyer_name: buyer?.full_name || customerName || 'Counter Sale',
    buyer_code: buyer?.buyer_code || null,
    notes,
    items: items.map((it) => {
      const { discountAmount, taxAmount, lineTotal } = calcLineItem(it);
      return {
        product_name: it.product_name,
        sku: it.sku,
        qty: it.qty,
        price: it.price,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        line_total: lineTotal,
      };
    }),
    ...totals,
    amount_paid: amountPaid,
    balance_due: totals.grand_total - amountPaid,
    created_at: new Date().toISOString(),
  });

  // Open bill as quotation (no save, no stock effect)
  const handleQuotation = () => {
    if (items.length === 0) {
      toast({ title: 'Add at least one product first', variant: 'destructive' });
      return;
    }
    setQuotationMode(true);
    setShowBill(true);
  };

  // Format current date
  const currentDate = new Date().toLocaleDateString('en-PK', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  // Keyboard shortcuts inside the demand builder
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+S → Save Draft
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!isViewOnly && items.length > 0) handleSaveDraft();
      }
      // Ctrl+Enter → Confirm (open dialog)
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isViewOnly && items.length > 0) handleConfirm();
      }
      // Ctrl+Q → Quotation
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        if (!isViewOnly && items.length > 0) handleQuotation();
      }
      // F2 → Focus product search
      if (e.key === 'F2') {
        e.preventDefault();
        productSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isViewOnly, items.length]);

  // Extract invoice number from serial (e.g. "INV-00012" → "12")
  const invoiceNum = serialNumber ? serialNumber.replace(/^[A-Z]+-0*/i, '') : null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Header Bar — mimics classic invoice header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-border bg-gray-50 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button onClick={() => navigate('/demands')} className="p-1.5 rounded-lg hover:bg-gray-200 text-text-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Invoice No. */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary">Invoice No.</span>
            <span className="text-sm font-bold text-text-primary font-mono bg-white border border-border rounded px-3 py-0.5 min-w-[80px] text-center">
              {invoiceNum || serialNumber || demandCode || (editId ? `#${editId}` : 'NEW')}
            </span>
          </div>

          {/* Demand ID */}
          {(draftId || editId) && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-secondary">ID</span>
              <span className="text-xs font-mono text-text-muted bg-gray-100 border border-border rounded px-2 py-0.5">
                {draftId || editId}
              </span>
            </div>
          )}

          {/* Bill Date */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-secondary">Bill Date</span>
            <span className="text-sm text-text-primary font-mono bg-white border border-border rounded px-3 py-0.5">
              {currentDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isViewOnly && draftId && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBill(true)}>
              <Printer className="w-4 h-4" /> View Bill
            </Button>
          )}
          <button onClick={() => navigate('/demands')} className="px-3 py-1 text-sm font-medium rounded border border-gray-300 hover:bg-gray-100 text-text-secondary">
            Exit
          </button>
        </div>
      </div>

      {/* Customer Name + Product Search Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-semibold text-text-secondary whitespace-nowrap">Customer Name</span>
          {!isViewOnly ? (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <BuyerSearchDropdown
                value={buyer}
                onChange={async (b) => {
                  setBuyer(b);
                  if (b) {
                    setCustomerName(b.full_name);
                    // Load buyer price history for this buyer
                    try {
                      const phRes = await window.electronAPI.demands.getBuyerPriceHistory({ buyerId: b.id });
                      if (phRes.success) setBuyerPriceHistory(phRes.data || {});
                    } catch { /* silent */ }
                  } else {
                    setBuyerPriceHistory({});
                  }
                }}
                customName={customerName}
                onCustomNameChange={setCustomerName}
                placeholder="Counter Sale"
              />
              {(buyer || customerName) && (
                <button
                  onClick={() => { setBuyer(null); setCustomerName(''); setBuyerPriceHistory({}); }}
                  className="text-xs text-red-500 hover:text-red-600 hover:underline whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-text-primary">
              {buyer ? buyer.full_name : (customerName || 'Counter Sale')}
            </span>
          )}
        </div>

        {/* Product Search - inline */}
        {!isViewOnly && (
          <div className="flex items-center gap-2 flex-1 max-w-lg relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted z-10" />
            <Input
              ref={productSearchRef}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search product name, SKU, barcode..."
              className="pl-9 h-8 text-sm"
            />

            {/* Product search dropdown */}
            {filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full top-full mt-1 bg-white rounded-lg border border-border shadow-lg max-h-[240px] overflow-y-auto">
                {filteredProducts.map((p) => {
                  const basePrice = getDefaultPrice(p);
                  const pPack = packInfo[p.id];
                  // Show unit price when pack system is active
                  const displayPrice = (pPack && pPack.unitPrice > 0) ? pPack.unitPrice : basePrice;
                  const stock = stockLevels[p.id];
                  const buyerHistory = buyerPriceHistory[p.id];
                  const hasBuyerPrice = buyerHistory && buyerHistory.price > 0;
                  const pPackQty = (pPack && pPack.packQuantity > 1) ? pPack.packQuantity : 1;
                  const stockUnits = stock != null ? stock : null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Package className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                          {pPack && pPack.packQuantity > 1 && (
                            <span className="shrink-0 text-[9px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                              {pPack.packQuantity} X 1
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted">
                          {p.sku && <span className="font-mono">{p.sku}</span>}
                          {p.category && <span className="ml-2">{p.category}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {hasBuyerPrice ? (
                          <>
                            <p className="text-sm font-medium text-emerald-700">{formatCurrency(buyerHistory.price)}</p>
                            <p className="text-[9px] text-emerald-600 font-medium">Buyer's last price</p>
                          </>
                        ) : displayPrice > 0 ? (
                          <p className="text-sm font-medium text-text-primary">{formatCurrency(displayPrice)}</p>
                        ) : null}
                        {stockUnits != null && (
                          <p className={cn('text-[10px]', stockUnits <= 0 ? 'text-red-500' : 'text-text-muted')}>
                            Stock: {stockUnits}{pPackQty > 1 ? ' units' : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <ScanModeButton
              onScan={(code, result) => {
                if (result?.found && result.product) {
                  const fullProduct = products.find(p => p.id === result.product.id);
                  if (fullProduct) {
                    addProduct(fullProduct);
                    setScanFlashId(fullProduct.id);
                    setTimeout(() => setScanFlashId(null), 600);
                  }
                } else {
                  toast({ title: `Product "${code}" not found`, variant: 'destructive' });
                }
              }}
              context="demand"
            />
          </div>
        )}
      </div>

      {/* Items Table — fills remaining space */}
      <div className="flex-1 overflow-y-auto">
        <DemandItemsTable
          items={items}
          isViewOnly={isViewOnly}
          packInfo={packInfo}
          stockLevels={stockLevels}
          businessType={activeBusiness?.type || 'retail'}
          updateItem={updateItem}
          removeItem={removeItem}
          products={products}
          onAddProduct={addProduct}
          getDefaultPrice={getDefaultPrice}
          buyerPriceHistory={buyerPriceHistory}
        />
      </div>

      {/* Bottom Section: Summary + Actions */}
      <div className="border-t border-border bg-gray-50 shrink-0">
        {/* Summary Row — right-aligned like reference */}
        {items.length > 0 && (
          <div className="flex items-start justify-between px-4 py-2 border-b border-border">
            {/* Notes */}
            <div className="flex-1 max-w-md">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
                rows={3}
                disabled={isViewOnly}
                className="resize-none text-sm bg-white"
              />
            </div>

            {/* Compact Summary — looks like the reference */}
            <div className="w-[280px] space-y-1 text-sm">
              {/* Gross Value (subtotal before discounts) */}
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Gross Value:</span>
                <span className="font-mono font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>

              {/* Overall discount control */}
              {!isViewOnly ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-secondary whitespace-nowrap">Discount</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={overallDiscountValue || ''}
                      onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 h-6 text-xs text-center px-1"
                    />
                    <button
                      onClick={() => setOverallDiscountType(overallDiscountType === 'percent' ? 'flat' : 'percent')}
                      className="h-6 px-1.5 text-[10px] font-bold rounded border border-gray-200 hover:bg-gray-50 text-text-secondary"
                    >
                      {overallDiscountType === 'percent' ? '%' : '₨'}
                    </button>
                  </div>
                  <span className="font-mono font-medium min-w-[80px] text-right">
                    {formatCurrency(totals.overall_discount_amount || 0)}
                  </span>
                </div>
              ) : (
                totals.total_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600">Discount:</span>
                    <span className="font-mono font-medium text-emerald-600">-{formatCurrency(totals.total_discount)}</span>
                  </div>
                )
              )}

              {/* Tax toggle */}
              {!isViewOnly && activeBusiness?.tax_rate > 0 && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="rounded border-gray-300 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-text-secondary">Tax {activeBusiness.tax_rate}%</span>
                  </label>
                  <span className="font-mono font-medium">{formatCurrency(totals.total_tax)}</span>
                </div>
              )}

              {/* Net Amount */}
              <div className="flex items-center justify-between border-t border-gray-300 pt-1">
                <span className="font-bold text-text-primary">Net Amount</span>
                <span className="font-bold text-lg font-mono text-text-primary">{formatCurrency(totals.grand_total)}</span>
              </div>

              {/* Previous balance if buyer */}
              {buyer && buyer.outstanding > 0 && (
                <div className="flex items-center justify-between text-xs text-red-600">
                  <span>Previous Balance</span>
                  <span className="font-mono">{formatCurrency(buyer.outstanding)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Stock info + change-log toggle */}
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {items.length > 0 && (
              <span>{items.length} item{items.length !== 1 && 's'}</span>
            )}
            {changeLog.length > 0 && (
              <button
                onClick={() => setShowChangeLog(!showChangeLog)}
                className="text-xs text-accent hover:underline"
              >
                {showChangeLog ? 'Hide' : 'View'} Changes ({changeLog.length})
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isViewOnly ? (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft} disabled={saving}>
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/demands')}>
                  Cancel
                </Button>
                {items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleQuotation}
                    title="Create a quotation — no save, no stock effect (Ctrl+Q)"
                  >
                    <Printer className="w-3.5 h-3.5" /> Quotation
                  </Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={handleConfirm} disabled={confirming || items.length === 0}>
                  <CheckCircle className="w-3.5 h-3.5" /> {confirming ? 'Confirming...' : 'Confirm'}
                </Button>
              </>
            ) : (
              <>
                {draftId && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBill(true)}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Change Log Panel */}
        {showChangeLog && changeLog.length > 0 && (
          <div className="border-t border-border px-4 py-2 max-h-[140px] overflow-y-auto bg-amber-50/50">
            <p className="text-xs font-semibold text-amber-800 mb-1">Change History</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-amber-700">
                  <th className="pr-3 pb-1">Time</th>
                  <th className="pr-3 pb-1">Product</th>
                  <th className="pr-3 pb-1">Field</th>
                  <th className="pr-3 pb-1">Old</th>
                  <th className="pb-1">New</th>
                </tr>
              </thead>
              <tbody>
                {changeLog.map((c, i) => (
                  <tr key={i} className="text-amber-900/80">
                    <td className="pr-3 py-0.5 font-mono">{c.time}</td>
                    <td className="pr-3 py-0.5 truncate max-w-[120px]">{c.product}</td>
                    <td className="pr-3 py-0.5">{c.field}</td>
                    <td className="pr-3 py-0.5 font-mono">{c.oldVal}</td>
                    <td className="py-0.5 font-mono">{c.newVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Error Modal */}
      <StockErrorModal
        open={showStockErrors}
        onOpenChange={setShowStockErrors}
        errors={stockErrors}
      />

      {/* Bill Preview (for quotation / view-only) */}
      <BillPreview
        open={showBill}
        onOpenChange={(v) => { setShowBill(v); if (!v) setQuotationMode(false); }}
        demand={showBill ? buildPreviewDemand(quotationMode) : null}
      />

      {/* Confirm Dialog — shows bill preview with Save/Print/Confirm */}
      <ConfirmDemandDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        demand={showConfirmDialog ? buildPreviewDemand(false) : null}
        onSave={handleSaveDraft}
        onConfirm={doConfirm}
        onConfirmAndPrint={doConfirmAndPrint}
        saving={saving}
        confirming={confirming}
      />
    </div>
  );
}
