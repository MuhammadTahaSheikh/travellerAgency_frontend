import { BookingServiceItem, ServiceRow } from '@/types';

export type ReadOnlyDetailField = { label: string; value: string };

function formatDisplayDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function withFallback(value?: string): string {
  return value?.trim() ? value.trim() : '—';
}

export function getHotelRowReadOnlyFields(row: ServiceRow): ReadOnlyDetailField[] {
  return [
    { label: 'Room Type', value: withFallback(row.roomType) },
    { label: 'Check-in', value: formatDisplayDate(row.checkInDate) || '—' },
    { label: 'Check-out', value: formatDisplayDate(row.checkOutDate) || '—' },
    { label: 'Res #', value: withFallback(row.vendorResNo) },
  ];
}

export function getTransportRowReadOnlyFields(row: ServiceRow): ReadOnlyDetailField[] {
  return [
    { label: 'Sector', value: withFallback(row.sector) },
    { label: 'Date', value: formatDisplayDate(row.date) || '—' },
    { label: 'Vehicle', value: withFallback(row.vehicleType) },
    { label: 'Res #', value: withFallback(row.vendorResNo) },
  ];
}

export function getVisaReadOnlyFields(item: BookingServiceItem): ReadOnlyDetailField[] {
  const d = item.details || {};
  return [
    { label: 'Country', value: withFallback(d.country) },
    { label: 'Visa Type', value: withFallback(d.visaType) },
    { label: 'Res #', value: withFallback(d.vendorResNo) },
  ];
}

export function getTicketReadOnlyFields(item: BookingServiceItem): ReadOnlyDetailField[] {
  const d = item.details || {};
  const fields: ReadOnlyDetailField[] = [
    { label: 'Airline', value: withFallback(d.airline) },
    { label: 'Sector', value: withFallback(d.sector) },
    { label: 'Trip', value: d.tripType ? d.tripType.replace(/_/g, ' ') : '—' },
    { label: 'Departure', value: formatDisplayDate(d.departureDate) || '—' },
    { label: 'Return', value: formatDisplayDate(d.returnDate) || '—' },
    { label: 'Baggage', value: withFallback(d.baggage) },
    { label: 'Res #', value: withFallback(d.vendorResNo) },
  ];
  return fields;
}
