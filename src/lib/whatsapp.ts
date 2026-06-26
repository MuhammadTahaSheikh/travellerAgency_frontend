import { User, Invoice, Voucher } from '@/types';

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizePhone(phone);
  if (!digits) throw new Error('Invalid phone number');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShare(phone: string, message: string): boolean {
  try {
    window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}

function getCustomerPhone(invoice: Invoice): string | null {
  const phone = invoice.customer?.phone?.trim();
  return phone || null;
}

function getVoucherRecipientPhone(voucher: Voucher): string | null {
  const phone = voucher.booking?.customer?.phone?.trim();
  return phone || null;
}

function staffSignature(user: User | null): string {
  if (!user) return 'Moazin Travel Agency';
  const name = `${user.firstName} ${user.lastName}`.trim();
  const lines = ['Moazin Travel Agency'];
  if (name) lines.unshift(`— ${name}`);
  if (user.phone?.trim()) lines.push(user.phone.trim());
  return lines.join('\n');
}

function formatRs(amount: number | string): string {
  return `Rs ${Number(amount).toLocaleString('en-PK')}`;
}

function formatDateShort(value: string): string {
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function buildInvoiceWhatsAppMessage(invoice: Invoice, user: User | null): string {
  const customerName = invoice.customer
    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim()
    : 'Customer';

  return [
    'Dear ' + customerName + ',',
    '',
    'Your invoice has been generated:',
    '',
    `Invoice #: ${invoice.invoiceNumber}`,
    `Total: ${formatRs(invoice.totalAmount)}`,
    invoice.paidAmount ? `Paid: ${formatRs(invoice.paidAmount)}` : '',
    `Due Date: ${formatDateShort(invoice.dueDate)}`,
    invoice.booking?.bookingNumber ? `Booking: ${invoice.booking.bookingNumber}` : '',
    '',
    'Thank you for choosing us.',
    staffSignature(user),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildVoucherWhatsAppMessage(voucher: Voucher, user: User | null): string {
  return [
    'Dear ' + voucher.guestName + ',',
    '',
    'Your hotel voucher details:',
    '',
    `Voucher #: ${voucher.voucherNumber}`,
    `Hotel: ${voucher.hotelName}`,
    `Check-in: ${formatDateShort(voucher.checkInDate)}`,
    voucher.checkOutDate ? `Check-out: ${formatDateShort(voucher.checkOutDate)}` : '',
    voucher.roomDetails ? `Room: ${voucher.roomDetails}` : '',
    '',
    'Please present this voucher at check-in.',
    staffSignature(user),
  ]
    .filter(Boolean)
    .join('\n');
}

export function shareInvoiceViaWhatsApp(invoice: Invoice, user: User | null): boolean {
  const recipientPhone = getCustomerPhone(invoice);
  if (!recipientPhone) {
    alert('This customer has no phone number. Add a phone number on the customer record to send via WhatsApp.');
    return false;
  }
  return openWhatsAppShare(recipientPhone, buildInvoiceWhatsAppMessage(invoice, user));
}

export function shareVoucherViaWhatsApp(voucher: Voucher, user: User | null): boolean {
  const recipientPhone = getVoucherRecipientPhone(voucher);
  if (!recipientPhone) {
    alert('This customer has no phone number. Add a phone number on the customer record to send via WhatsApp.');
    return false;
  }
  return openWhatsAppShare(recipientPhone, buildVoucherWhatsAppMessage(voucher, user));
}
