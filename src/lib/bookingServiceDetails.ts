import { BookingServiceItem, ServiceRow } from '@/types';
import { formatDate } from '@/components/ui/Common';

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

function fmtDate(d?: string) {
  return d ? formatDate(d) : '';
}

/** Service-type-specific detail lines for booking view (not ticket fields on transport). */
export function formatServiceDetailLines(item: BookingServiceItem): string[] {
  const d = item.details || {};
  const rows = parseRows(item);

  switch (item.serviceType) {
    case 'TRANSPORT':
      if (rows.length > 0) {
        return rows.flatMap((row, i) => {
          const lines: string[] = [];
          const prefix = rows.length > 1 ? `Trip ${i + 1}: ` : '';
          if (row.sector) lines.push(`${prefix}${row.sector}`);
          if (row.vehicleType) lines.push(`${prefix}By ${row.vehicleType}`);
          if (row.date) lines.push(`${prefix}Date: ${fmtDate(row.date)}`);
          if (row.vendorResNo) lines.push(`${prefix}Vendor Res#: ${row.vendorResNo}`);
          return lines;
        });
      }
      return [d.sector, d.vehicleType ? `By ${d.vehicleType}` : '', d.date ? `Date: ${fmtDate(d.date)}` : ''].filter(Boolean) as string[];

    case 'HOTEL':
      if (rows.length > 0) {
        return rows.flatMap((row, i) => {
          const lines: string[] = [];
          const prefix = rows.length > 1 ? `Room ${i + 1}: ` : '';
          const hotel = [row.hotelName, row.city].filter(Boolean).join(', ');
          if (hotel) lines.push(`${prefix}${hotel}`);
          if (row.roomType) lines.push(`${prefix}Room: ${row.roomType}`);
          if (row.checkInDate || row.checkOutDate) {
            lines.push(`${prefix}Check-in: ${fmtDate(row.checkInDate) || '—'} → Check-out: ${fmtDate(row.checkOutDate) || '—'}`);
          }
          if (row.mealPlan) lines.push(`${prefix}Meal: ${row.mealPlan}`);
          if (row.vendorResNo) lines.push(`${prefix}Vendor Res#: ${row.vendorResNo}`);
          return lines;
        });
      }
      return [];

    case 'TICKET': {
      const lines: string[] = [];
      if (d.airline) lines.push(`Airline: ${d.airline}`);
      if (d.sector) lines.push(`Sector: ${d.sector}`);
      if (d.tripType) lines.push(`Trip: ${d.tripType.replace(/_/g, ' ')}`);
      if (d.departureDate) lines.push(`Departure: ${fmtDate(d.departureDate)}`);
      if (d.returnDate) lines.push(`Return: ${fmtDate(d.returnDate)}`);
      if (d.baggage) lines.push(`Baggage: ${d.baggage}`);
      if (d.vendorResNo) lines.push(`Vendor Res#: ${d.vendorResNo}`);
      if (d.tripType === 'MULTI_CITY' && rows.length > 0) {
        rows.forEach((row, i) => {
          if (row.sector) lines.push(`Sector ${i + 1}: ${row.sector} · ${fmtDate(row.date)}`);
        });
      }
      return lines;
    }

    case 'VISA': {
      const lines: string[] = [];
      if (d.country) lines.push(`Country: ${d.country}`);
      if (d.visaType) lines.push(`Type: ${d.visaType}`);
      if (d.vendorResNo) lines.push(`Vendor Res#: ${d.vendorResNo}`);
      return lines;
    }

    default:
      return [];
  }
}

export function serviceItemCurrency(item: BookingServiceItem): 'PKR' | 'SAR' {
  return item.details?.currency === 'SAR' ? 'SAR' : 'PKR';
}
