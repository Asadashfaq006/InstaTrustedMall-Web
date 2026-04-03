import { AVATAR_COLORS, PAYMENT_STATUS } from '@/constants/buyerConstants';

/**
 * Get avatar background color by buyer id (cycles through 8 colors).
 */
export function getAvatarColor(buyerId) {
  return AVATAR_COLORS[(buyerId - 1) % AVATAR_COLORS.length];
}

/**
 * Get buyer initials from full_name (up to 2 characters).
 */
export function getBuyerInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get payment status configuration object.
 */
export function getPaymentStatusConfig(status) {
  return PAYMENT_STATUS[status] || PAYMENT_STATUS.none;
}

/**
 * Format currency value (basic PKR format).
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return 'Rs. 0';
  const num = Number(amount);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  return `${sign}Rs. ${abs.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Sort buyers array by given sort key.
 */
export function sortBuyers(buyers, sortBy) {
  const sorted = [...buyers];
  switch (sortBy) {
    case 'name_asc':
      return sorted.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    case 'name_desc':
      return sorted.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''));
    case 'outstanding_desc':
      return sorted.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));
    case 'outstanding_asc':
      return sorted.sort((a, b) => (a.outstanding || 0) - (b.outstanding || 0));
    case 'recent':
    default:
      return sorted.sort((a, b) => {
        const dateA = a.last_activity_at || a.created_at || '';
        const dateB = b.last_activity_at || b.created_at || '';
        return dateB.localeCompare(dateA);
      });
  }
}

/**
 * Filter buyers by payment status.
 */
export function filterBuyersByStatus(buyers, statusFilter) {
  if (!statusFilter || statusFilter === 'all') return buyers;
  return buyers.filter(b => b.payment_status === statusFilter);
}

/**
 * Search buyers by query string (full_name, phone, buyer_code, business_name).
 */
export function searchBuyers(buyers, query) {
  if (!query || !query.trim()) return buyers;
  const q = query.toLowerCase().trim();
  return buyers.filter(b =>
    (b.full_name || '').toLowerCase().includes(q) ||
    (b.phone || '').toLowerCase().includes(q) ||
    (b.buyer_code || '').toLowerCase().includes(q) ||
    (b.business_name || '').toLowerCase().includes(q)
  );
}
