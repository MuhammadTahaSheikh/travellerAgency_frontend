'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { searchB2BCustomers, searchPackages, searchVendors } from '@/lib/searchableOptions';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import {
  Booking,
  Vendor,
  BookingServiceItem,
  BookingType,
  PriceMode,
  ServiceRow,
  Invoice,
  ApiResponse,
} from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { shareInvoiceViaWhatsApp } from '@/lib/whatsapp';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

type ServiceCurrency = 'PKR' | 'SAR';
type Counts = { adults: number; children: number; infants: number };

/** Service types that render as repeatable multi-row tables (hotel rooms, transport sectors). */
const ROW_BASED_TYPES: BookingServiceItem['serviceType'][] = ['HOTEL', 'TRANSPORT'];

const emptyHotelRow = (): ServiceRow => ({
  hotelName: '', city: '', roomType: '', mealPlan: '', view: '',
  checkInDate: '', checkOutDate: '', numRooms: '1',
  costPerNight: '0', salePerNight: '0', vendorId: '',
});
const emptyTransportRow = (): ServiceRow => ({ sector: '', date: '', vehicleType: '', cost: '0', sale: '0', vendorId: '' });
const emptyTicketSector = (): ServiceRow => ({ sector: '', date: '', baggage: '' });

const defaultRowFor = (type: BookingServiceItem['serviceType']): ServiceRow =>
  type === 'HOTEL' ? emptyHotelRow() : type === 'TRANSPORT' ? emptyTransportRow() : emptyTicketSector();

const emptyServiceItem = (): BookingServiceItem => ({
  serviceType: 'TICKET',
  description: '',
  amount: 0,
  costAmount: 0,
  details: { currency: 'PKR', tripType: 'ONE_WAY' },
  rows: [],
});

const emptyForm = {
  bookingType: 'B2B' as BookingType,
  customerId: '',
  guestName: '',
  packageId: '',
  currency: 'PKR' as ServiceCurrency,
  exchangeRate: '',
  priceMode: 'DETERMINED' as PriceMode,
  totalAmount: '',
  adults: '1',
  children: '0',
  infants: '0',
  priceAdult: '0',
  priceChild: '0',
  priceInfant: '0',
  travelDate: '',
  returnDate: '',
  notes: '',
  status: 'PENDING',
  serviceItems: [] as BookingServiceItem[],
};

type FormState = typeof emptyForm;

const toInt = (v: string) => parseInt(v, 10) || 0;
const toNum = (v: string) => parseFloat(v) || 0;

const nightsBetween = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const n = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return n > 0 ? n : 0;
};

const itemCurrency = (item: BookingServiceItem): ServiceCurrency =>
  item.details?.currency === 'SAR' ? 'SAR' : 'PKR';

const rowCostNative = (item: BookingServiceItem, row: ServiceRow) =>
  item.serviceType === 'HOTEL'
    ? toNum(row.costPerNight || '0') * nightsBetween(row.checkInDate, row.checkOutDate) * (toInt(row.numRooms || '1') || 1)
    : toNum(row.cost || '0');

const rowSaleNative = (item: BookingServiceItem, row: ServiceRow) =>
  item.serviceType === 'HOTEL'
    ? toNum(row.salePerNight || '0') * nightsBetween(row.checkInDate, row.checkOutDate) * (toInt(row.numRooms || '1') || 1)
    : toNum(row.sale || '0');

const serviceCostNative = (item: BookingServiceItem, c: Counts): number => {
  switch (item.serviceType) {
    case 'HOTEL':
    case 'TRANSPORT':
      return (item.rows || []).reduce((s, r) => s + rowCostNative(item, r), 0);
    case 'TICKET':
      return c.adults * toNum(item.details?.costAdult || '0') +
        c.children * toNum(item.details?.costChild || '0') +
        c.infants * toNum(item.details?.costInfant || '0');
    default:
      return toNum(String(item.costAmount ?? 0));
  }
};

const serviceSaleNative = (item: BookingServiceItem, c: Counts): number => {
  switch (item.serviceType) {
    case 'HOTEL':
    case 'TRANSPORT':
      return (item.rows || []).reduce((s, r) => s + rowSaleNative(item, r), 0);
    case 'TICKET':
      return c.adults * toNum(item.details?.saleAdult || '0') +
        c.children * toNum(item.details?.saleChild || '0') +
        c.infants * toNum(item.details?.saleInfant || '0');
    default:
      return toNum(String(item.amount ?? 0));
  }
};

const buildDescription = (item: BookingServiceItem): string => {
  const d = item.details || {};
  switch (item.serviceType) {
    case 'VISA':
      return `Visa${d.country ? ` - ${d.country}` : ''}${d.visaType ? ` (${d.visaType})` : ''}`;
    case 'TICKET': {
      const seg = d.tripType === 'MULTI_CITY'
        ? (item.rows || []).map((r) => r.sector).filter(Boolean).join(', ')
        : d.sector || '';
      return `Ticket${seg ? ` - ${seg}` : ''}${d.airline ? ` (${d.airline})` : ''}`;
    }
    case 'HOTEL': {
      const r = (item.rows || [])[0] || {};
      return `Accommodation${r.hotelName ? ` - ${r.hotelName}` : ''}${r.city ? `, ${r.city}` : ''}`;
    }
    case 'TRANSPORT': {
      const r = (item.rows || [])[0] || {};
      return `Transport${r.sector ? ` - ${r.sector}` : ''}`;
    }
    default:
      return `${item.serviceType} service`;
  }
};

/** Normalises free text into a fixed origin-destination sector code (e.g. LHE-MED). */
const formatSector = (raw: string) => {
  const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  return cleaned.length <= 3 ? cleaned : `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
};

export default function BookingsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { rate } = useExchangeRate();
  const pkrPerSar = rate?.pkrPerSar || rate?.manualDefault || 1;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [loadError, setLoadError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Manual PKR-per-SAR rate: the booking's own entry takes priority, else the system manual rate.
  const rateOf = (f: FormState) => toNum(f.exchangeRate) || pkrPerSar;
  const toPkr = (native: number, currency: ServiceCurrency, rateValue: number) =>
    currency === 'SAR' ? native * rateValue : native;

  const vendorLabel = (id?: string) => (id ? vendors.find((v) => v.id === id)?.name || '' : '');

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    setLoadError('');
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    Promise.allSettled([
      api.get<ApiResponse<Booking[]>>(`/bookings${query}`),
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
    ])
      .then(([bookingsRes, vendorsRes]) => {
        if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data || []);
        else setLoadError(bookingsRes.reason?.message || 'Failed to load bookings');
        if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedCustomerLabel('');
    setEditingId(null);
    setShowForm(false);
  };

  const openNewBookingForm = () => {
    setForm(emptyForm);
    setSelectedCustomerLabel('');
    setEditingId(null);
    setShowForm(true);
  };

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  const countsOf = (f: FormState): Counts => ({
    adults: toInt(f.adults),
    children: toInt(f.children),
    infants: toInt(f.infants),
  });

  /**
   * Determined mode charges the customer flat per-passenger category rates.
   * Breakdown mode sums the (currency-converted) sale price of every active service block.
   */
  const calcTotal = (next: FormState) => {
    if (next.priceMode === 'DETERMINED') {
      const total =
        toInt(next.adults) * toNum(next.priceAdult) +
        toInt(next.children) * toNum(next.priceChild) +
        toInt(next.infants) * toNum(next.priceInfant);
      return String(total);
    }
    const counts = countsOf(next);
    const r = rateOf(next);
    const total = next.serviceItems.reduce(
      (s, item) => s + toPkr(serviceSaleNative(item, counts), itemCurrency(item), r),
      0
    );
    return String(Math.round(total));
  };

  const updateForm = (updates: Partial<FormState>) => {
    const next = { ...form, ...updates };
    next.totalAmount = calcTotal(next);
    setForm(next);
  };

  const addServiceItem = () => {
    updateForm({ serviceItems: [...form.serviceItems, emptyServiceItem()] });
  };

  const removeServiceItem = (idx: number) => {
    updateForm({ serviceItems: form.serviceItems.filter((_, i) => i !== idx) });
  };

  const updateServiceItem = (idx: number, updates: Partial<BookingServiceItem>) => {
    const items = form.serviceItems.map((item, i) => {
      if (i !== idx) return item;
      const nextItem = { ...item, ...updates };
      // When switching to a row-based service, seed one row so the table is usable immediately.
      if (updates.serviceType && ROW_BASED_TYPES.includes(updates.serviceType) && (!nextItem.rows || nextItem.rows.length === 0)) {
        nextItem.rows = [defaultRowFor(updates.serviceType)];
      }
      return nextItem;
    });
    updateForm({ serviceItems: items });
  };

  const updateServiceDetails = (idx: number, key: string, value: string) => {
    const item = form.serviceItems[idx];
    updateServiceItem(idx, { details: { ...item.details, [key]: value } });
  };

  const setTripType = (idx: number, value: string) => {
    const item = form.serviceItems[idx];
    const details = { ...item.details, tripType: value };
    let rows = item.rows || [];
    if (value === 'MULTI_CITY' && rows.length === 0) {
      rows = [emptyTicketSector(), emptyTicketSector()];
    }
    updateServiceItem(idx, { details, rows });
  };

  const addServiceRow = (idx: number) => {
    const item = form.serviceItems[idx];
    const rows = [...(item.rows || []), defaultRowFor(item.serviceType)];
    updateServiceItem(idx, { rows });
  };

  const removeServiceRow = (idx: number, rowIdx: number) => {
    const item = form.serviceItems[idx];
    const rows = (item.rows || []).filter((_, i) => i !== rowIdx);
    updateServiceItem(idx, { rows });
  };

  const updateServiceRow = (idx: number, rowIdx: number, key: string, value: string) => {
    const item = form.serviceItems[idx];
    const rows = (item.rows || []).map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row));
    updateServiceItem(idx, { rows });
  };

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    const bookingType: BookingType = b.bookingType || (b.customer?.customerType === 'B2C' ? 'B2C' : 'B2B');
    // Legacy bookings (created before price modes existed) carried per-item sale prices.
    // Open them in Breakdown mode so those amounts are preserved rather than zeroed.
    const legacyMode: PriceMode = (b.serviceItems?.some((s) => Number(s.amount) > 0) || b.package) ? 'BREAKDOWN' : 'DETERMINED';
    setSelectedCustomerLabel(
      b.customer
        ? b.customer.customerType === 'B2B' && b.customer.companyName
          ? b.customer.companyName
          : `${b.customer.firstName} ${b.customer.lastName}`
        : ''
    );
    setForm({
      bookingType,
      customerId: b.customer?.id || '',
      guestName: b.guestName || (bookingType === 'B2C' ? `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim() : ''),
      packageId: b.package?.id || '',
      currency: b.currency || 'PKR',
      exchangeRate: (() => {
        const found = b.serviceItems
          ?.map((s) => (s.details as Record<string, string> | null)?.exchangeRate)
          .find((v) => v && Number(v) > 0);
        return found ? String(found) : '';
      })(),
      priceMode: b.priceMode || legacyMode,
      totalAmount: String(b.totalAmount),
      adults: String(b.adults ?? b.numTravelers ?? 1),
      children: String(b.children ?? 0),
      infants: String(b.infants ?? 0),
      priceAdult: String(b.priceAdult ?? 0),
      priceChild: String(b.priceChild ?? 0),
      priceInfant: String(b.priceInfant ?? 0),
      travelDate: b.travelDate ? b.travelDate.split('T')[0] : '',
      returnDate: b.returnDate ? b.returnDate.split('T')[0] : '',
      notes: b.notes || '',
      status: b.status,
      serviceItems: b.serviceItems?.map((s) => {
        const rawDetails = (s.details as Record<string, unknown>) || {};
        const { rows: persistedRows, costOriginal, saleOriginal, ...restDetails } = rawDetails as Record<string, unknown> & {
          rows?: ServiceRow[]; costOriginal?: string; saleOriginal?: string;
        };
        // Prefer the originally-entered (native-currency) amounts; fall back to stored PKR values.
        const nativeCost = costOriginal != null ? Number(costOriginal) : Number(s.costAmount || 0);
        const nativeSale = saleOriginal != null ? Number(saleOriginal) : Number(s.amount || 0);
        return {
          serviceType: s.serviceType,
          description: s.description,
          amount: nativeSale,
          costAmount: nativeCost,
          vendorId: s.vendorId,
          details: (restDetails as Record<string, string>) || {},
          rows: (persistedRows as ServiceRow[]) || (s.rows as ServiceRow[]) || [],
        };
      }) || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.bookingType === 'B2B' && !form.customerId) {
      alert('Please select a registered company/client for B2B bookings.');
      return;
    }
    if (form.bookingType === 'B2C' && !form.guestName.trim()) {
      alert('Please enter the guest name for B2C bookings.');
      return;
    }
    // Round trip tickets: return leg must depart after the outbound leg.
    for (const item of form.serviceItems) {
      if (item.serviceType === 'TICKET' && item.details?.tripType === 'ROUND_TRIP') {
        const dep = item.details?.departureDate;
        const ret = item.details?.returnDate;
        if (dep && ret && new Date(ret) <= new Date(dep)) {
          alert('Ticket return date must be after the departure date.');
          return;
        }
      }
    }
    setSaving(true);
    const counts = countsOf(form);
    const rateValue = rateOf(form);
    const numTravelers = counts.adults + counts.children + counts.infants;
    const payload = {
      bookingType: form.bookingType,
      customerId: form.bookingType === 'B2B' ? form.customerId : undefined,
      guestName: form.bookingType === 'B2C' ? form.guestName.trim() : undefined,
      packageId: form.packageId || undefined,
      currency: form.currency,
      priceMode: form.priceMode,
      totalAmount: parseFloat(form.totalAmount) || 0,
      numTravelers: numTravelers || 1,
      adults: counts.adults,
      children: counts.children,
      infants: counts.infants,
      priceAdult: form.priceMode === 'DETERMINED' ? toNum(form.priceAdult) : 0,
      priceChild: form.priceMode === 'DETERMINED' ? toNum(form.priceChild) : 0,
      priceInfant: form.priceMode === 'DETERMINED' ? toNum(form.priceInfant) : 0,
      travelDate: form.travelDate || undefined,
      returnDate: form.returnDate || undefined,
      notes: form.notes,
      status: form.status,
      serviceItems: form.serviceItems.map((s) => {
        const cur = itemCurrency(s);
        const costNative = serviceCostNative(s, counts);
        const saleNative = serviceSaleNative(s, counts);
        const rowBased = s.serviceType === 'HOTEL' || s.serviceType === 'TRANSPORT';
        const rows = (s.rows || []).map((r) =>
          rowBased
            ? { ...r, costTotal: String(rowCostNative(s, r)), saleTotal: String(rowSaleNative(s, r)) }
            : r
        );
        return {
          serviceType: s.serviceType,
          description: buildDescription(s),
          // Amounts are persisted in PKR (base currency) so invoices/ledger stay consistent.
          amount: form.priceMode === 'BREAKDOWN' ? Math.round(toPkr(saleNative, cur, rateValue)) : 0,
          costAmount: Math.round(toPkr(costNative, cur, rateValue)),
          // Row-based services carry their vendor per row, so no item-level vendor.
          vendorId: rowBased ? undefined : s.vendorId || undefined,
          details: {
            ...(s.details || {}),
            currency: cur,
            exchangeRate: String(rateValue),
            costOriginal: String(costNative),
            saleOriginal: String(saleNative),
            ...(rows.length ? { rows } : {}),
          },
        };
      }),
    };
    try {
      let invoice: Invoice | null | undefined;
      if (editingId) {
        const res = await api.put<ApiResponse<Booking> & { invoice?: Invoice | null }>(`/bookings/${editingId}`, payload);
        invoice = res.invoice;
      } else {
        const res = await api.post<ApiResponse<Booking> & { invoice?: Invoice | null }>('/bookings', payload);
        invoice = res.invoice;
      }
      if (invoice) void shareInvoiceViaWhatsApp(invoice, user);
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Booking) => {
    if (!await confirmDelete(`booking ${b.bookingNumber}`)) return;
    try {
      await api.delete(`/bookings/${b.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const customerDisplay = (b: Booking) =>
    b.guestName || (b.customer?.companyName) || `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim() || '—';

  return (
    <div>
      <PageHeader
        title="Booking Management"
        subtitle="Create bookings with ticket, visa, accommodation, and transport services"
        action={canCreateResource(user, 'bookings') ? (
          <Button type="button" onClick={openNewBookingForm}><Plus className="w-4 h-4 mr-2" />New Booking</Button>
        ) : undefined}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {showForm && (
        <div ref={formRef} className="scroll-mt-24">
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Booking' : 'New Booking'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Booking type selector */}
              <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                {(['B2B', 'B2C'] as BookingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateForm({ bookingType: t })}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      form.bookingType === t ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'B2B' ? 'B2B (Company / Client)' : 'B2C (Walk-in Guest)'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {form.bookingType === 'B2B' ? (
                  <SearchableSelect
                    label="Company / Client"
                    value={form.customerId}
                    onChange={(v) => updateForm({ customerId: v })}
                    onSearch={searchB2BCustomers}
                    selectedLabel={selectedCustomerLabel}
                    options={[{ value: '', label: 'Select company/client' }]}
                    required
                  />
                ) : (
                  <Input
                    label="Guest Name"
                    value={form.guestName}
                    onChange={(e) => updateForm({ guestName: e.target.value })}
                    placeholder="Type guest name"
                    required
                  />
                )}
                <SearchableSelect label="Package (optional)" value={form.packageId} onChange={(v) => updateForm({ packageId: v })} onSearch={searchPackages} options={[{ value: '', label: 'No package' }]} />
                <Select label="Status" value={form.status} onChange={(e) => updateForm({ status: e.target.value })} options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed (auto-invoice & ledger)' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]} />

                {/* Passenger counts — shared across both branches */}
                <Input label="Adults" type="number" min={0} value={form.adults} onChange={(e) => updateForm({ adults: e.target.value })} />
                <Input label="Children" type="number" min={0} value={form.children} onChange={(e) => updateForm({ children: e.target.value })} />
                <Input label="Infants" type="number" min={0} value={form.infants} onChange={(e) => updateForm({ infants: e.target.value })} />

                <Input label="Travel Date" type="date" value={form.travelDate} onChange={(e) => updateForm({ travelDate: e.target.value })} />
                <Input label="Return Date" type="date" value={form.returnDate} onChange={(e) => updateForm({ returnDate: e.target.value })} />
              </div>

              {/* Pricing architecture */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h4 className="font-semibold text-slate-800">Pricing</h4>
                  <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                    {([['DETERMINED', 'Determined Prices'], ['BREAKDOWN', 'With Breakdown']] as [PriceMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateForm({ priceMode: mode })}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          form.priceMode === mode ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4 sm:w-72">
                  <Input
                    label="Exchange Rate (PKR per SAR)"
                    type="number"
                    step="0.0001"
                    min={0}
                    value={form.exchangeRate}
                    onChange={(e) => updateForm({ exchangeRate: e.target.value })}
                    placeholder={pkrPerSar.toFixed(4)}
                    hint="Manual rate used to convert any SAR service to PKR"
                  />
                </div>

                {form.priceMode === 'DETERMINED' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Price per Adult" type="number" value={form.priceAdult} onChange={(e) => updateForm({ priceAdult: e.target.value })} hint={`${form.adults || 0} adult(s)`} />
                    <Input label="Price per Child" type="number" value={form.priceChild} onChange={(e) => updateForm({ priceChild: e.target.value })} hint={`${form.children || 0} child(ren)`} />
                    <Input label="Price per Infant" type="number" value={form.priceInfant} onChange={(e) => updateForm({ priceInfant: e.target.value })} hint={`${form.infants || 0} infant(s)`} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Pricing is captured per service block below. Each service has its own currency (PKR/SAR); the total is converted to PKR at {rateOf(form).toFixed(2)} PKR/SAR.</p>
                )}

                <div className="mt-4 flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
                  <span className="text-sm font-medium text-teal-800">Total Amount (PKR)</span>
                  <span className="text-lg font-bold text-teal-900">{formatCurrency(Number(form.totalAmount) || 0)}</span>
                </div>
              </div>

              {/* Service items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Service Items (Ticket / Visa / Accommodation / Transport)</h4>
                  <Button type="button" variant="secondary" onClick={addServiceItem}><Plus className="w-4 h-4 mr-1" />Add Service</Button>
                </div>
                {form.serviceItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Add ticket, visa, accommodation, or transport services with custom details.</p>
                ) : (
                  <div className="space-y-4">
                    {form.serviceItems.map((item, idx) => {
                      const cur = itemCurrency(item);
                      const rowBased = ROW_BASED_TYPES.includes(item.serviceType);
                      const showItemPricing = item.serviceType === 'VISA';
                      return (
                      <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-teal-700">Service #{idx + 1}</span>
                          <button type="button" onClick={() => removeServiceItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Select label="Service Type" value={item.serviceType} onChange={(e) => updateServiceItem(idx, { serviceType: e.target.value as BookingServiceItem['serviceType'] })} options={[
                            { value: 'TICKET', label: 'Ticket' },
                            { value: 'VISA', label: 'Visa' },
                            { value: 'HOTEL', label: 'Accommodation' },
                            { value: 'TRANSPORT', label: 'Transport' },
                          ]} />

                          {/* Per-service currency */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Currency</label>
                            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white">
                              {(['PKR', 'SAR'] as ServiceCurrency[]).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateServiceDetails(idx, 'currency', c)}
                                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                    cur === c ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Ticket: airline shifted up (replaces description) */}
                          {item.serviceType === 'TICKET' && (
                            <Input label="Airline" value={item.details?.airline || ''} onChange={(e) => updateServiceDetails(idx, 'airline', e.target.value)} placeholder="e.g. Saudia" />
                          )}

                          {/* Visa keeps item-level cost/sale/vendor */}
                          {showItemPricing && (
                            <>
                              <Input label={`Cost Price (${cur})`} type="number" value={String(item.costAmount || 0)} onChange={(e) => updateServiceItem(idx, { costAmount: parseFloat(e.target.value) || 0 })} />
                              {form.priceMode === 'BREAKDOWN' && (
                                <Input label={`Sale Price (${cur})`} type="number" value={String(item.amount || 0)} onChange={(e) => updateServiceItem(idx, { amount: parseFloat(e.target.value) || 0 })} />
                              )}
                              <SearchableSelect label="Vendor (posting)" value={item.vendorId || ''} onChange={(v) => updateServiceItem(idx, { vendorId: v })} onSearch={(q) => searchVendors(q)} selectedLabel={vendorLabel(item.vendorId)} options={[{ value: '', label: 'Auto-assign' }]} />
                            </>
                          )}

                          {item.serviceType === 'VISA' && (
                            <>
                              <Input label="Country" value={item.details?.country || ''} onChange={(e) => updateServiceDetails(idx, 'country', e.target.value)} />
                              <Input label="Visa Type" value={item.details?.visaType || ''} onChange={(e) => updateServiceDetails(idx, 'visaType', e.target.value)} placeholder="Tourist, Business..." />
                            </>
                          )}

                          {item.serviceType === 'TICKET' && (
                            <TicketFields
                              item={item}
                              idx={idx}
                              currency={cur}
                              counts={countsOf(form)}
                              priceMode={form.priceMode}
                              vendorLabel={vendorLabel}
                              onDetail={(key, value) => updateServiceDetails(idx, key, value)}
                              onTripType={(v) => setTripType(idx, v)}
                              onVendor={(v) => updateServiceItem(idx, { vendorId: v })}
                            />
                          )}
                        </div>

                        {rowBased && (
                          <ServiceRows
                            item={item}
                            currency={cur}
                            priceMode={form.priceMode}
                            vendorLabel={vendorLabel}
                            onAddRow={() => addServiceRow(idx)}
                            onRemoveRow={(rowIdx) => removeServiceRow(idx, rowIdx)}
                            onUpdateRow={(rowIdx, key, value) => updateServiceRow(idx, rowIdx, key, value)}
                          />
                        )}

                        {item.serviceType === 'TICKET' && item.details?.tripType === 'MULTI_CITY' && (
                          <TicketSectors
                            item={item}
                            onAddRow={() => addServiceRow(idx)}
                            onRemoveRow={(rowIdx) => removeServiceRow(idx, rowIdx)}
                            onUpdateRow={(rowIdx, key, value) => updateServiceRow(idx, rowIdx, key, value)}
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Textarea label="Notes" value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} rows={2} />
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Update Booking' : 'Create Booking'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
        </div>
      )}

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={() => { const d = { startDate, endDate }; setAppliedDates(d); loadData(d); }}
        onClear={() => { setStartDate(''); setEndDate(''); setAppliedDates({ startDate: '', endDate: '' }); loadData({ startDate: '', endDate: '' }); }}
        summary={{ count: bookings.length, label: 'Bookings' }}
      />

      {loading ? <LoadingSpinner label="Loading bookings..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {bookings.length === 0 ? (
              <EmptyState message="No bookings found for the selected period." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Booking #</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Services</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Paid</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className="hidden lg:table-cell">Date</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-semibold text-slate-900">{b.bookingNumber}</TableCell>
                        <TableCell>{customerDisplay(b)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600">
                          {b.serviceItems?.map((s) => s.serviceType).join(', ') || b.package?.name || '—'}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(b.totalAmount)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-teal-700">{formatCurrency(b.paidAmount)}</TableCell>
                        <TableCell><Badge status={b.status}>{b.status}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-slate-500">{formatDate(b.createdAt)}</TableCell>
                        <TableCell align="right">
                          <RowActions
                            onEdit={() => startEdit(b)}
                            onDelete={() => handleDelete(b)}
                            canEdit={canEditResource(user, 'bookings')}
                            canDelete={canDeleteResource(user, 'bookings')}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface TicketFieldsProps {
  item: BookingServiceItem;
  idx: number;
  currency: ServiceCurrency;
  counts: Counts;
  priceMode: PriceMode;
  vendorLabel: (id?: string) => string;
  onDetail: (key: string, value: string) => void;
  onTripType: (value: string) => void;
  onVendor: (value: string) => void;
}

function TicketFields({ item, currency, counts, priceMode, vendorLabel, onDetail, onTripType, onVendor }: TicketFieldsProps) {
  const d = item.details || {};
  const tripType = d.tripType || 'ONE_WAY';
  const breakdown = priceMode === 'BREAKDOWN';
  return (
    <>
      <Select label="Trip Type" value={tripType} onChange={(e) => onTripType(e.target.value)} options={[
        { value: 'ONE_WAY', label: 'One Way' },
        { value: 'ROUND_TRIP', label: 'Round Trip' },
        { value: 'MULTI_CITY', label: 'Multi City' },
      ]} />

      {tripType !== 'MULTI_CITY' && (
        <Input label="Sector" value={d.sector || ''} onChange={(e) => onDetail('sector', formatSector(e.target.value))} placeholder="LHE-MED" />
      )}

      {tripType === 'ONE_WAY' && (
        <>
          <Input label="Departure Date" type="date" value={d.departureDate || ''} onChange={(e) => onDetail('departureDate', e.target.value)} />
          <Input label="Baggage" value={d.baggage || ''} onChange={(e) => onDetail('baggage', e.target.value)} placeholder="e.g. 30kg" />
        </>
      )}

      {tripType === 'ROUND_TRIP' && (
        <>
          <Input label="Departure Date" type="date" value={d.departureDate || ''} onChange={(e) => onDetail('departureDate', e.target.value)} />
          <Input label="Return Date" type="date" value={d.returnDate || ''} min={d.departureDate || undefined} onChange={(e) => onDetail('returnDate', e.target.value)} />
          <Input label="Baggage (Outbound)" value={d.baggageOutbound || ''} onChange={(e) => onDetail('baggageOutbound', e.target.value)} placeholder="e.g. 30kg" />
          <Input label="Baggage (Inbound)" value={d.baggageInbound || ''} onChange={(e) => onDetail('baggageInbound', e.target.value)} placeholder="e.g. 30kg" />
        </>
      )}

      <SearchableSelect label="Vendor (posting)" value={item.vendorId || ''} onChange={onVendor} onSearch={(q) => searchVendors(q)} selectedLabel={vendorLabel(item.vendorId)} options={[{ value: '', label: 'Auto-assign' }]} />

      {/* Per-passenger cost & sale */}
      <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-slate-200 pt-3">
        <div className="col-span-full text-xs font-semibold text-slate-500 uppercase">Per-Passenger Pricing ({currency})</div>
        <Input label={`Cost / Adult (${currency})`} type="number" value={d.costAdult || '0'} onChange={(e) => onDetail('costAdult', e.target.value)} hint={`${counts.adults} adult(s)`} />
        {breakdown && <Input label={`Sale / Adult (${currency})`} type="number" value={d.saleAdult || '0'} onChange={(e) => onDetail('saleAdult', e.target.value)} />}
        {counts.children > 0 && (
          <>
            <Input label={`Cost / Child (${currency})`} type="number" value={d.costChild || '0'} onChange={(e) => onDetail('costChild', e.target.value)} hint={`${counts.children} child(ren)`} />
            {breakdown && <Input label={`Sale / Child (${currency})`} type="number" value={d.saleChild || '0'} onChange={(e) => onDetail('saleChild', e.target.value)} />}
          </>
        )}
        {counts.infants > 0 && (
          <>
            <Input label={`Cost / Infant (${currency})`} type="number" value={d.costInfant || '0'} onChange={(e) => onDetail('costInfant', e.target.value)} hint={`${counts.infants} infant(s)`} />
            {breakdown && <Input label={`Sale / Infant (${currency})`} type="number" value={d.saleInfant || '0'} onChange={(e) => onDetail('saleInfant', e.target.value)} />}
          </>
        )}
      </div>
    </>
  );
}

interface TicketSectorsProps {
  item: BookingServiceItem;
  onAddRow: () => void;
  onRemoveRow: (rowIdx: number) => void;
  onUpdateRow: (rowIdx: number, key: string, value: string) => void;
}

function TicketSectors({ item, onAddRow, onRemoveRow, onUpdateRow }: TicketSectorsProps) {
  const rows = item.rows || [];
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Flight Sectors (Multi City)</span>
        <Button type="button" variant="secondary" onClick={onAddRow}><Plus className="w-4 h-4 mr-1" />Add Flight</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No flights yet — click &quot;Add Flight&quot; to begin.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Flight #{rowIdx + 1}</span>
                <button type="button" onClick={() => onRemoveRow(rowIdx)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Sector" value={row.sector || ''} onChange={(e) => onUpdateRow(rowIdx, 'sector', formatSector(e.target.value))} placeholder="LHE-JED" />
                <Input label="Date" type="date" value={row.date || ''} onChange={(e) => onUpdateRow(rowIdx, 'date', e.target.value)} />
                <Input label="Baggage" value={row.baggage || ''} onChange={(e) => onUpdateRow(rowIdx, 'baggage', e.target.value)} placeholder="e.g. 30kg" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ServiceRowsProps {
  item: BookingServiceItem;
  currency: ServiceCurrency;
  priceMode: PriceMode;
  vendorLabel: (id?: string) => string;
  onAddRow: () => void;
  onRemoveRow: (rowIdx: number) => void;
  onUpdateRow: (rowIdx: number, key: string, value: string) => void;
}

function ServiceRows({ item, currency, priceMode, vendorLabel, onAddRow, onRemoveRow, onUpdateRow }: ServiceRowsProps) {
  const isHotel = item.serviceType === 'HOTEL';
  const breakdown = priceMode === 'BREAKDOWN';
  const rows = item.rows || [];
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{isHotel ? 'Hotel Rooms (per sector / per night)' : 'Transport Sectors'}</span>
        <Button type="button" variant="secondary" onClick={onAddRow}><Plus className="w-4 h-4 mr-1" />Add Row</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No rows yet — click &quot;Add Row&quot; to begin.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIdx) => {
            const nights = isHotel ? nightsBetween(row.checkInDate, row.checkOutDate) : 0;
            return (
            <div key={rowIdx} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Row #{rowIdx + 1}{isHotel && nights > 0 ? ` · ${nights} night(s)` : ''}</span>
                <button type="button" onClick={() => onRemoveRow(rowIdx)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />Delete Row
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {isHotel ? (
                  <>
                    <Input label="Hotel Name" value={row.hotelName || ''} onChange={(e) => onUpdateRow(rowIdx, 'hotelName', e.target.value)} />
                    <Input label="City" value={row.city || ''} onChange={(e) => onUpdateRow(rowIdx, 'city', e.target.value)} placeholder="Makkah, Madinah..." />
                    <Input label="Room Type" value={row.roomType || ''} onChange={(e) => onUpdateRow(rowIdx, 'roomType', e.target.value)} />
                    <Input label="Meal Plan" value={row.mealPlan || ''} onChange={(e) => onUpdateRow(rowIdx, 'mealPlan', e.target.value)} placeholder="Room only, BB, HB..." />
                    <Input label="View" value={row.view || ''} onChange={(e) => onUpdateRow(rowIdx, 'view', e.target.value)} placeholder="Haram view, City view..." />
                    <Input label="Rooms" type="number" min={1} value={row.numRooms || '1'} onChange={(e) => onUpdateRow(rowIdx, 'numRooms', e.target.value)} />
                    <Input label="Check-in Date" type="date" value={row.checkInDate || ''} onChange={(e) => onUpdateRow(rowIdx, 'checkInDate', e.target.value)} />
                    <Input label="Check-out Date" type="date" value={row.checkOutDate || ''} min={row.checkInDate || undefined} onChange={(e) => onUpdateRow(rowIdx, 'checkOutDate', e.target.value)} />
                    <Input label={`Cost / Night (${currency})`} type="number" value={row.costPerNight || '0'} onChange={(e) => onUpdateRow(rowIdx, 'costPerNight', e.target.value)} hint={nights > 0 ? `Total: ${(toNum(row.costPerNight || '0') * nights * (toInt(row.numRooms || '1') || 1)).toLocaleString()} ${currency}` : undefined} />
                    {breakdown && (
                      <Input label={`Sale / Night (${currency})`} type="number" value={row.salePerNight || '0'} onChange={(e) => onUpdateRow(rowIdx, 'salePerNight', e.target.value)} hint={nights > 0 ? `Total: ${(toNum(row.salePerNight || '0') * nights * (toInt(row.numRooms || '1') || 1)).toLocaleString()} ${currency}` : undefined} />
                    )}
                    <SearchableSelect label="Vendor (posting)" value={row.vendorId || ''} onChange={(v) => onUpdateRow(rowIdx, 'vendorId', v)} onSearch={(q) => searchVendors(q)} selectedLabel={vendorLabel(row.vendorId)} options={[{ value: '', label: 'Auto-assign' }]} />
                  </>
                ) : (
                  <>
                    <Input label="Sector" value={row.sector || ''} onChange={(e) => onUpdateRow(rowIdx, 'sector', e.target.value)} placeholder="e.g. Jeddah - Makkah" />
                    <Input label="Date" type="date" value={row.date || ''} onChange={(e) => onUpdateRow(rowIdx, 'date', e.target.value)} />
                    <Input label="Vehicle Type" value={row.vehicleType || ''} onChange={(e) => onUpdateRow(rowIdx, 'vehicleType', e.target.value)} />
                    <Input label={`Cost (${currency})`} type="number" value={row.cost || '0'} onChange={(e) => onUpdateRow(rowIdx, 'cost', e.target.value)} />
                    {breakdown && (
                      <Input label={`Sale (${currency})`} type="number" value={row.sale || '0'} onChange={(e) => onUpdateRow(rowIdx, 'sale', e.target.value)} />
                    )}
                    <SearchableSelect label="Vendor (posting)" value={row.vendorId || ''} onChange={(v) => onUpdateRow(rowIdx, 'vendorId', v)} onSearch={(q) => searchVendors(q)} selectedLabel={vendorLabel(row.vendorId)} options={[{ value: '', label: 'Auto-assign' }]} />
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
