type VendorLike = { name?: string | null; vendorCode?: string | null } | null | undefined;
type CustomerLike = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  customerType?: string | null;
} | null | undefined;

/** e.g. ADEN (HHV-0001) */
export function formatVendorDisplay(vendor: VendorLike, fallback = '—'): string {
  if (!vendor?.name) return fallback;
  return vendor.vendorCode ? `${vendor.name} (${vendor.vendorCode})` : vendor.name;
}

/** e.g. AFZAL (BK-001) */
export function formatCustomerDisplay(customer: CustomerLike, bookingNumber?: string | null, fallback = '—'): string {
  if (!customer) return fallback;
  if (customer.customerType === 'B2B' && customer.companyName?.trim()) {
    const base = customer.companyName.trim();
    return bookingNumber ? `${base} (${bookingNumber})` : base;
  }
  const base = [customer.firstName, customer.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  if (!base) return fallback;
  return bookingNumber ? `${base} (${bookingNumber})` : base;
}

export function formatAccountDisplay(
  account: { name: string; vendor?: VendorLike; customer?: CustomerLike },
): string {
  if (account.vendor?.name) return formatVendorDisplay(account.vendor);
  if (account.customer) {
    const legacy = account.name.match(/^Customer:\s*(.+)$/);
    if (legacy) {
      const parsed = legacy[1].trim();
      if (parsed.includes('(')) return parsed;
      return formatCustomerDisplay(account.customer);
    }
    return account.name;
  }
  return account.name;
}
