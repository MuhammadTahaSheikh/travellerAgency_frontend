import { BookingServiceItem, ServiceRow } from '@/types';

type PostingMeta = {
  vendorResNo: string;
  cost: number;
  currency: 'PKR' | 'SAR';
};

function parseRows(item: BookingServiceItem): ServiceRow[] {
  const details = item.details as Record<string, unknown> | undefined;
  const raw = details?.rows ?? item.rows;
  if (Array.isArray(raw)) return raw as ServiceRow[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ServiceRow[];
    } catch {
      return [];
    }
  }
  return [];
}

function postingMatchesRow(description: string, row: ServiceRow): boolean {
  const markers = [row.hotelName, row.roomType, row.sector, row.vehicleType].filter(Boolean) as string[];
  return markers.some((marker) => description.includes(marker));
}

/** Resolve vendor res# and cost/currency for a posting from linked service items. */
export function resolvePostingServiceMeta(
  posting: { description: string; serviceType: string; expectedCost: number; currency?: 'PKR' | 'SAR' },
  serviceItems?: BookingServiceItem[],
): PostingMeta {
  const currency = posting.currency === 'SAR' ? 'SAR' : 'PKR';
  let vendorResNo = '';

  if (serviceItems?.length) {
    for (const item of serviceItems) {
      if (item.serviceType !== posting.serviceType) continue;

      const rows = parseRows(item);
      if (rows.length) {
        const matched = rows.find((row) => postingMatchesRow(posting.description, row));
        if (matched) {
          return {
            vendorResNo: matched.vendorResNo || '—',
            cost: posting.expectedCost,
            currency,
          };
        }
      }

      if (!vendorResNo && item.details?.vendorResNo) {
        vendorResNo = item.details.vendorResNo;
      }
    }
  }

  const parsed = posting.description.match(/—\(([^)]+)\)\s*$/);
  if (parsed?.[1] && parsed[1] !== 'Vendor Res#') {
    vendorResNo = parsed[1];
  }

  return {
    vendorResNo: vendorResNo || '—',
    cost: posting.expectedCost,
    currency,
  };
}
