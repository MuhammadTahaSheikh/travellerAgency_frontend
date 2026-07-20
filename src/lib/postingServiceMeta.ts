import { BookingServiceItem, ServiceRow } from '@/types';

export type PostingMeta = {
  vendorResNo: string;
  cost: number;
  currency: 'PKR' | 'SAR';
  sector?: string;
  label?: string;
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

function nightsBetween(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const n = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  return n > 0 ? n : 0;
}

function rowCost(serviceType: string, row: ServiceRow): number {
  const fromTotal = parseFloat(String(row.costTotal || 0)) || 0;
  if (fromTotal > 0) return fromTotal;
  if (serviceType === 'HOTEL') {
    const perNight = parseFloat(String(row.costPerNight || 0)) || 0;
    const rooms = Math.max(1, parseInt(String(row.numRooms || '1'), 10) || 1);
    return perNight * nightsBetween(row.checkInDate, row.checkOutDate) * rooms;
  }
  return parseFloat(String(row.cost || 0)) || 0;
}

function rowLabel(serviceType: string, row: ServiceRow, fallback: string): string {
  if (serviceType === 'HOTEL') {
    return [row.hotelName, row.city, row.roomType].filter(Boolean).join(' — ') || fallback;
  }
  if (serviceType === 'TRANSPORT') {
    return [row.sector, row.vehicleType].filter(Boolean).join(' — ') || fallback;
  }
  return fallback;
}

function rowSector(serviceType: string, row: ServiceRow, item: BookingServiceItem): string {
  if (serviceType === 'TRANSPORT') return row.sector || '—';
  if (serviceType === 'HOTEL') return [row.hotelName, row.roomType].filter(Boolean).join(' / ') || '—';
  if (serviceType === 'TICKET') return item.details?.sector || '—';
  if (serviceType === 'VISA') return item.details?.country || item.details?.visaType || '—';
  return '—';
}

/** Resolve vendor res# and cost/currency for a posting from linked service items. */
export function resolvePostingServiceMeta(
  posting: { description: string; serviceType: string; expectedCost: number; currency?: 'PKR' | 'SAR' },
  serviceItems?: BookingServiceItem[],
): PostingMeta {
  const currency = posting.currency === 'SAR' ? 'SAR' : 'PKR';
  let vendorResNo = '';
  let sector = '—';
  let label = posting.description;

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
            sector: rowSector(item.serviceType, matched, item),
            label: rowLabel(item.serviceType, matched, item.description),
          };
        }
      }

      if (!vendorResNo && item.details?.vendorResNo) {
        vendorResNo = item.details.vendorResNo;
      }
      if (item.details?.sector) sector = item.details.sector;
      else if (item.details?.country) sector = item.details.country;
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
    sector,
    label,
  };
}

export type ServicePostingPreview = {
  key: string;
  serviceType: string;
  description: string;
  label: string;
  sector: string;
  cost: number;
  currency: 'PKR' | 'SAR';
  vendorResNo: string;
};

/** Build service/sector rows from booking service items (fallback when vendor postings missing). */
export function buildServicePostingPreviews(serviceItems?: BookingServiceItem[]): ServicePostingPreview[] {
  if (!serviceItems?.length) return [];
  const previews: ServicePostingPreview[] = [];

  serviceItems.forEach((item, itemIdx) => {
    const currency: 'PKR' | 'SAR' = item.details?.currency === 'SAR' ? 'SAR' : 'PKR';
    const rows = parseRows(item);
    const rowBased = item.serviceType === 'HOTEL' || item.serviceType === 'TRANSPORT';

    if (rowBased && rows.length > 0) {
      rows.forEach((row, rowIdx) => {
        previews.push({
          key: `${item.id || itemIdx}-${rowIdx}`,
          serviceType: item.serviceType,
          description: item.description,
          label: rowLabel(item.serviceType, row, item.description),
          sector: rowSector(item.serviceType, row, item),
          cost: rowCost(item.serviceType, row),
          currency,
          vendorResNo: row.vendorResNo || '—',
        });
      });
      return;
    }

    const cost =
      item.details?.costOriginal != null
        ? parseFloat(String(item.details.costOriginal)) || 0
        : Number(item.costAmount || 0);

    previews.push({
      key: `${item.id || itemIdx}`,
      serviceType: item.serviceType,
      description: item.description,
      label: item.description,
      sector: item.details?.sector || item.details?.country || item.details?.visaType || '—',
      cost,
      currency,
      vendorResNo: item.details?.vendorResNo || '—',
    });
  });

  return previews;
}
