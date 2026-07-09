import { Booking, User, VendorPostingSummary } from '@/types';
import { getUserRole, isSuperAdmin } from '@/lib/permissions';

export type PaymentStatusLabel = 'Unpaid' | 'Paid' | 'Partially-Paid';
export type PostingStatusLabel = 'Posted' | 'Un-Posted' | 'Partially Posted';

export type { VendorPostingSummary };

export function getPaymentStatus(booking: Booking): PaymentStatusLabel {
  if (booking.paymentStatus) return booking.paymentStatus as PaymentStatusLabel;
  const paid = Number(booking.paidAmount);
  const total = Number(booking.totalAmount);
  if (paid <= 0) return 'Unpaid';
  if (paid >= total) return 'Paid';
  return 'Partially-Paid';
}

export function getPostingStatus(booking: Booking): PostingStatusLabel {
  if (booking.postingStatus) return booking.postingStatus as PostingStatusLabel;
  const postings = booking.vendorPostings || [];
  if (!postings.length) return 'Un-Posted';
  const posted = postings.filter((p) => p.status === 'POSTED').length;
  if (posted === 0) return 'Un-Posted';
  if (posted === postings.length) return 'Posted';
  return 'Partially Posted';
}

export function formatBookingStatusLabel(status: string): string {
  if (status === 'REQUEST_CONFIRMATION') return 'Request Confirmation';
  if (status === 'PARTIALLY_REFUNDED') return 'Partially Refunded';
  if (status === 'REFUNDED') return 'Refunded';
  return status;
}

export function canModifyBooking(user: User | null, booking: Booking): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const role = getUserRole(user);
  if (role === 'ADMIN') return true;
  return booking.status !== 'CONFIRMED'
    && booking.status !== 'REQUEST_CONFIRMATION'
    && booking.status !== 'PARTIALLY_REFUNDED'
    && booking.status !== 'REFUNDED';
}

export function canDirectPost(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function paymentStatusColor(status: PaymentStatusLabel): string {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'Partially-Paid':
      return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    default:
      return 'bg-red-50 text-red-700 ring-red-600/20';
  }
}

export function postingStatusColor(status: PostingStatusLabel): string {
  switch (status) {
    case 'Posted':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'Partially Posted':
      return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-500/20';
  }
}
