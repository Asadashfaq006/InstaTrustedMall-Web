import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, QrCode, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * QR Code / Barcode display for a single product.
 * Used in Product Detail Panel.
 *
 * Props:
 *  - product: { id, name, sku, barcode, salePrice }
 *  - onPrintLabel(product) — opens Label Generator with this product
 */
export default function ProductQRCode({ product, onPrintLabel }) {
  const [codeType, setCodeType] = useState('qr'); // 'qr' | 'barcode'
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  const codeValue = product?.barcode || product?.sku || '';

  // Render QR code
  useEffect(() => {
    if (codeType !== 'qr' || !canvasRef.current || !codeValue) return;
    let cancelled = false;
    const render = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        if (cancelled) return;
        const data = JSON.stringify({
          productId: product?.id,
          sku: product?.sku,
          name: product?.name,
        });
        await QRCode.toCanvas(canvasRef.current, data, {
          width: 180,
          margin: 1,
          color: { dark: '#1A202C', light: '#FFFFFF' },
        });
      } catch (err) {
        console.error('QR render error:', err);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [codeType, codeValue, product]);

  // Render barcode
  useEffect(() => {
    if (codeType !== 'barcode' || !svgRef.current || !codeValue) return;
    const render = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        JsBarcode(svgRef.current, codeValue, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: false,
          lineColor: '#1A202C',
          background: '#FFFFFF',
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    };
    render();
  }, [codeType, codeValue]);

  const handleDownloadPNG = async () => {
    try {
      let dataUrl;
      if (codeType === 'qr' && canvasRef.current) {
        dataUrl = canvasRef.current.toDataURL('image/png');
      } else if (codeType === 'barcode' && svgRef.current) {
        // Convert SVG to canvas then PNG
        const svg = svgRef.current;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
          triggerDownload(dataUrl);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        return;
      }
      if (dataUrl) triggerDownload(dataUrl);
    } catch { /* silent */ }
  };

  const triggerDownload = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product?.sku || 'product'}-${codeType}.png`;
    a.click();
  };

  if (!codeValue) {
    return (
      <div className="p-6 text-center text-text-muted text-sm">
        No SKU or barcode set for this product.
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCodeType('qr')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              codeType === 'qr' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary'
            )}
          >
            QR Code
          </button>
          <button
            onClick={() => setCodeType('barcode')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              codeType === 'barcode' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary'
            )}
          >
            Barcode
          </button>
        </div>
      </div>

      {/* Code display */}
      <div className="flex items-center gap-6 mb-4">
        <div className="bg-white border border-border rounded-lg p-3 flex items-center justify-center">
          {codeType === 'qr' ? (
            <canvas ref={canvasRef} />
          ) : (
            <svg ref={svgRef} />
          )}
        </div>
        <div>
          <p className="font-bold text-text-primary">{product?.name}</p>
          <p className="text-sm text-text-muted">SKU: {product?.sku || '—'}</p>
          {product?.salePrice != null && (
            <p className="text-sm font-bold text-navy mt-1">
              ₨ {Number(product.salePrice).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onPrintLabel && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onPrintLabel(product)}>
            <Printer className="w-3.5 h-3.5" /> Print Label
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleDownloadPNG}>
          <Download className="w-3.5 h-3.5" /> Download PNG
        </Button>
      </div>
    </div>
  );
}
