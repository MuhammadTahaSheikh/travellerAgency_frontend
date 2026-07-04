type VendorLike = { name?: string | null; vendorCode?: string | null } | null | undefined;

/** e.g. ADEN (HHV-0001) */
export function formatVendorDisplay(vendor: VendorLike, fallback = '—'): string {
  if (!vendor?.name) return fallback;
  return vendor.vendorCode ? `${vendor.name} (${vendor.vendorCode})` : vendor.name;
}

export function formatAccountDisplay(
  account: { name: string; vendor?: VendorLike },
): string {
  if (account.vendor?.name) return formatVendorDisplay(account.vendor);
  return account.name;
}
