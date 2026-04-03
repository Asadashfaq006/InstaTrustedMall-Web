import React from 'react';
import { getAvatarColor, getBuyerInitials, getPaymentStatusConfig, formatCurrency } from '@/utils/buyerHelpers';
import { Phone, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact read-only buyer reference card for use in demand forms, invoices, etc.
 * Props:
 *   buyer     - buyer object with id, full_name, buyer_code, phone, business_name, outstanding, payment_status, photo_path
 *   className - additional classes
 *   onClick   - optional click handler
 */
export default function BuyerMiniCard({ buyer, className, onClick }) {
  if (!buyer) return null;

  const statusConfig = getPaymentStatusConfig(buyer.payment_status);
  const avatarColor = getAvatarColor(buyer.id);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200',
        onClick && 'cursor-pointer hover:border-accent/30 hover:shadow-sm transition-all',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      {buyer.photo_path ? (
        <img
          src={`local-file://${buyer.photo_path}`}
          alt={buyer.full_name}
          className="w-10 h-10 rounded-full object-cover ring-1 ring-border flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          <span className="text-white font-bold text-sm">
            {getBuyerInitials(buyer.full_name)}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate">
            {buyer.full_name}
          </span>
          <span className="text-[11px] text-text-muted font-mono flex-shrink-0">
            {buyer.buyer_code}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {buyer.business_name && (
            <span className="text-[11px] text-text-secondary flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3" />
              {buyer.business_name}
            </span>
          )}
          {buyer.phone && (
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {buyer.phone}
            </span>
          )}
        </div>
      </div>

      {/* Status + Balance */}
      <div className="text-right flex-shrink-0">
        <span className={cn(
          'inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium',
          statusConfig.bgColor, statusConfig.textColor
        )}>
          {statusConfig.label}
        </span>
        {buyer.outstanding > 0 && (
          <p className="text-xs font-semibold text-red-600 mt-0.5">
            {formatCurrency(buyer.outstanding)}
          </p>
        )}
      </div>
    </div>
  );
}
