import api from '@/lib/api';
import { formatVendorDisplay } from '@/lib/vendorDisplay';
import { ApiResponse, Customer, Vendor, Booking, Invoice, Account, Package } from '@/types';
import { formatCurrency } from '@/components/ui/Common';

export type SelectOption = { value: string; label: string };

function encode(q: string) {
  return encodeURIComponent(q.trim());
}

export async function searchB2BCustomers(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Customer[]>>(`/customers?search=${encode(query)}&limit=50&customerType=B2B`);
  return (res.data || []).map((c) => ({
    value: c.id,
    label: c.companyName
      ? `${c.companyName} (${c.tradePartnerId || 'B2B'})`
      : `${c.firstName} ${c.lastName}`,
  }));
}

export async function searchCustomers(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Customer[]>>(`/customers?search=${encode(query)}&limit=50`);
  return (res.data || []).map((c) => ({
    value: c.id,
    label: c.customerType === 'B2B' && c.companyName
      ? `${c.companyName} (${c.tradePartnerId || 'B2B'})`
      : `${c.firstName} ${c.lastName}`,
  }));
}

export async function searchVendors(query: string, category?: string): Promise<SelectOption[]> {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await api.get<ApiResponse<Vendor[]>>(`/vendors?search=${encode(query)}&limit=50${cat}`);
  return (res.data || []).map((v) => ({
    value: v.id,
    label: formatVendorDisplay(v, v.name),
  }));
}

export async function searchBookings(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Booking[]>>(`/bookings?search=${encode(query)}&limit=50`);
  return (res.data || []).map((b) => ({
    value: b.id,
    label: `${b.bookingNumber} - ${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim(),
  }));
}

export async function searchInvoices(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Invoice[]>>(`/invoices?search=${encode(query)}&limit=50`);
  return (res.data || []).map((i) => ({
    value: i.id,
    label: `${i.invoiceNumber} - ${formatCurrency(i.totalAmount)}`,
  }));
}

export async function searchPackages(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Package[]>>(`/packages?search=${encode(query)}&limit=50`);
  return (res.data || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${formatCurrency(p.price)}/person)`,
  }));
}

export async function searchLedgerAccounts(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Account[]>>(`/ledger/accounts?search=${encode(query)}`);
  return (res.data || []).map((a) => ({
    value: a.id,
    label: `${a.name} (${a.type})`,
  }));
}

export async function searchPaymentAccounts(query: string): Promise<SelectOption[]> {
  const res = await api.get<ApiResponse<Account[]>>('/payments/accounts');
  const q = query.trim().toLowerCase();
  return (res.data || [])
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q))
    .map((a) => ({ value: a.id, label: `${a.name} (${a.type})` }));
}

export function customerLabel(c: Customer): string {
  return c.customerType === 'B2B' && c.companyName
    ? `${c.companyName} (${c.tradePartnerId || 'B2B'})`
    : `${c.firstName} ${c.lastName}`;
}

export function mergeSelectedOption(options: SelectOption[], value: string, label?: string): SelectOption[] {
  if (!value) return options;
  if (options.some((o) => o.value === value)) return options;
  if (label) return [{ value, label }, ...options];
  return options;
}
