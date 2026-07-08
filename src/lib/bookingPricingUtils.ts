import { BookingServiceItem, ServiceRow } from '@/types';

type ServiceCurrency = 'PKR' | 'SAR';
export type PassengerCounts = { adults: number; children: number; infants: number };

const toInt = (v: string | number | undefined) => parseInt(String(v ?? 0), 10) || 0;
const toNum = (v: string | number | undefined) => parseFloat(String(v ?? 0)) || 0;

const nightsBetween = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const n = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return n > 0 ? n : 0;
};

export const itemCurrency = (item: BookingServiceItem): ServiceCurrency =>
  item.details?.currency === 'SAR' ? 'SAR' : 'PKR';

const rowCostNative = (item: BookingServiceItem, row: ServiceRow) =>
  item.serviceType === 'HOTEL'
    ? toNum(row.costPerNight || '0') * nightsBetween(row.checkInDate, row.checkOutDate) * (toInt(row.numRooms || '1') || 1)
    : toNum(row.cost || '0');

const rowSaleNative = (item: BookingServiceItem, row: ServiceRow) =>
  item.serviceType === 'HOTEL'
    ? toNum(row.salePerNight || '0') * nightsBetween(row.checkInDate, row.checkOutDate) * (toInt(row.numRooms || '1') || 1)
    : toNum(row.sale || '0');

export const serviceCostNative = (item: BookingServiceItem, counts: PassengerCounts): number => {
  switch (item.serviceType) {
    case 'HOTEL':
    case 'TRANSPORT':
      return (item.rows || []).reduce((s, r) => s + rowCostNative(item, r), 0);
    case 'TICKET':
      return counts.adults * toNum(item.details?.costAdult || '0') +
        counts.children * toNum(item.details?.costChild || '0') +
        counts.infants * toNum(item.details?.costInfant || '0');
    case 'VISA':
      return toNum(item.details?.costPrice ?? String(item.costAmount ?? 0));
    default:
      return toNum(item.details?.costPrice ?? String(item.costAmount ?? 0));
  }
};

export const serviceSaleNative = (item: BookingServiceItem, counts: PassengerCounts): number => {
  switch (item.serviceType) {
    case 'HOTEL':
    case 'TRANSPORT':
      return (item.rows || []).reduce((s, r) => s + rowSaleNative(item, r), 0);
    case 'TICKET':
      return counts.adults * toNum(item.details?.saleAdult || '0') +
        counts.children * toNum(item.details?.saleChild || '0') +
        counts.infants * toNum(item.details?.saleInfant || '0');
    case 'VISA':
      return toNum(item.details?.salePrice ?? String(item.amount ?? 0));
    default:
      return toNum(item.details?.salePrice ?? String(item.amount ?? 0));
  }
};

export const toPkr = (native: number, currency: ServiceCurrency, rateValue: number) =>
  currency === 'SAR' ? native * rateValue : native;

export function buildServiceItemsPayload(
  items: BookingServiceItem[],
  counts: PassengerCounts,
  priceMode: 'DETERMINED' | 'BREAKDOWN',
  defaultRate: number
) {
  return items.map((s) => {
    const cur = itemCurrency(s);
    const rateValue = toNum(s.details?.exchangeRate) || defaultRate || 1;
    const costNative = serviceCostNative(s, counts);
    const saleNative = serviceSaleNative(s, counts);
    const rowBased = s.serviceType === 'HOTEL' || s.serviceType === 'TRANSPORT';
    const rowVendorId = (s.rows || []).map((r) => r.vendorId).find(Boolean);
    const rows = (s.rows || []).map((r) =>
      rowBased
        ? { ...r, costTotal: String(rowCostNative(s, r)), saleTotal: String(rowSaleNative(s, r)) }
        : r
    );

    return {
      id: s.id,
      serviceType: s.serviceType,
      description: s.description,
      amount: priceMode === 'BREAKDOWN' ? Math.round(toPkr(saleNative, cur, rateValue)) : 0,
      costAmount: Math.round(toPkr(costNative, cur, rateValue)),
      vendorId: rowBased ? (rowVendorId || undefined) : s.vendorId || undefined,
      details: {
        ...(s.details || {}),
        currency: cur,
        exchangeRate: String(rateValue),
        costOriginal: String(costNative),
        saleOriginal: String(saleNative),
        ...(rows.length ? { rows } : {}),
      },
    };
  });
}
