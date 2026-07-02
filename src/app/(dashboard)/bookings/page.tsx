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
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

/** Service types that render as repeatable multi-row tables (hotel rooms, transport sectors). */
const ROW_BASED_TYPES: BookingServiceItem['serviceType'][] = ['HOTEL', 'TRANSPORT'];

const emptyHotelRow = (): ServiceRow => ({ hotelName: '', checkInDate: '', checkOutDate: '', roomType: '', numRooms: '1' });
const emptyTransportRow = (): ServiceRow => ({ from: '', to: '', date: '', vehicleType: '' });

const defaultRowFor = (type: BookingServiceItem['serviceType']): ServiceRow =>
  type === 'HOTEL' ? emptyHotelRow() : emptyTransportRow();

const emptyServiceItem = (): BookingServiceItem => ({
  serviceType: 'TICKET',
  description: '',
  amount: 0,
  costAmount: 0,
  details: {},
  rows: [],
});

const emptyForm = {
  bookingType: 'B2B' as BookingType,
  customerId: '',
  guestName: '',
  packageId: '',
  currency: 'PKR' as 'PKR' | 'SAR',
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

export default function BookingsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
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

  const currencySuffix = (label: string) => `${label} (${form.currency})`;

  /**
   * Determined mode charges the customer flat per-passenger category rates.
   * Breakdown mode sums the sale price of every active service block.
   */
  const calcTotal = (next: FormState) => {
    if (next.priceMode === 'DETERMINED') {
      const total =
        toInt(next.adults) * toNum(next.priceAdult) +
        toInt(next.children) * toNum(next.priceChild) +
        toInt(next.infants) * toNum(next.priceInfant);
      return String(total);
    }
    const total = next.serviceItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    return String(total);
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
        const { rows: persistedRows, ...restDetails } = rawDetails;
        return {
          serviceType: s.serviceType,
          description: s.description,
          amount: s.amount,
          costAmount: s.costAmount || 0,
          vendorId: s.vendorId,
          details: restDetails as Record<string, string>,
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
    setSaving(true);
    const numTravelers = toInt(form.adults) + toInt(form.children) + toInt(form.infants);
    const payload = {
      bookingType: form.bookingType,
      customerId: form.bookingType === 'B2B' ? form.customerId : undefined,
      guestName: form.bookingType === 'B2C' ? form.guestName.trim() : undefined,
      packageId: form.packageId || undefined,
      currency: form.currency,
      priceMode: form.priceMode,
      totalAmount: parseFloat(form.totalAmount) || 0,
      numTravelers: numTravelers || 1,
      adults: toInt(form.adults),
      children: toInt(form.children),
      infants: toInt(form.infants),
      priceAdult: form.priceMode === 'DETERMINED' ? toNum(form.priceAdult) : 0,
      priceChild: form.priceMode === 'DETERMINED' ? toNum(form.priceChild) : 0,
      priceInfant: form.priceMode === 'DETERMINED' ? toNum(form.priceInfant) : 0,
      travelDate: form.travelDate || undefined,
      returnDate: form.returnDate || undefined,
      notes: form.notes,
      status: form.status,
      serviceItems: form.serviceItems.map((s) => ({
        serviceType: s.serviceType,
        description: s.description || `${s.serviceType} service`,
        // Determined mode captures cost only; the customer-facing amount comes from per-passenger rates.
        amount: form.priceMode === 'BREAKDOWN' ? Number(s.amount) : 0,
        costAmount: Number(s.costAmount || 0),
        vendorId: s.vendorId || undefined,
        details: { ...(s.details || {}), ...(s.rows && s.rows.length ? { rows: s.rows } : {}) },
      })),
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

  const vendorCategoryForType = (type: string) =>
    type === 'HOTEL' ? 'HOTEL'
      : type === 'VISA' ? 'VISA'
      : type === 'TICKET' ? 'TICKETING'
      : type === 'TRANSPORT' ? 'TRANSPORT'
      : 'OTHER';

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
                  <div className="flex flex-wrap items-center gap-4">
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
                    {form.priceMode === 'BREAKDOWN' && (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Currency</span>
                        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                          {(['PKR', 'SAR'] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateForm({ currency: c })}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                form.currency === c ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {form.priceMode === 'DETERMINED' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Price per Adult" type="number" value={form.priceAdult} onChange={(e) => updateForm({ priceAdult: e.target.value })} hint={`${form.adults || 0} adult(s)`} />
                    <Input label="Price per Child" type="number" value={form.priceChild} onChange={(e) => updateForm({ priceChild: e.target.value })} hint={`${form.children || 0} child(ren)`} />
                    <Input label="Price per Infant" type="number" value={form.priceInfant} onChange={(e) => updateForm({ priceInfant: e.target.value })} hint={`${form.infants || 0} infant(s)`} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Pricing is captured per service block below (cost &amp; sale) in {form.currency}.</p>
                )}

                <div className="mt-4 flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
                  <span className="text-sm font-medium text-teal-800">Total Amount</span>
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
                    {form.serviceItems.map((item, idx) => (
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
                          <Input label="Description" value={item.description} onChange={(e) => updateServiceItem(idx, { description: e.target.value })} placeholder="e.g. Dubai Flight" />

                          {/* Cost price is always captured; sale price only in breakdown mode. */}
                          <Input label={currencySuffix('Cost Price')} type="number" value={String(item.costAmount || 0)} onChange={(e) => updateServiceItem(idx, { costAmount: parseFloat(e.target.value) || 0 })} />
                          {form.priceMode === 'BREAKDOWN' && (
                            <Input label={currencySuffix('Sale Price')} type="number" value={String(item.amount)} onChange={(e) => updateServiceItem(idx, { amount: parseFloat(e.target.value) || 0 })} />
                          )}
                          <SearchableSelect label="Vendor (posting)" value={item.vendorId || ''} onChange={(v) => updateServiceItem(idx, { vendorId: v })} onSearch={(q) => searchVendors(q, vendorCategoryForType(item.serviceType))} options={[{ value: '', label: 'Auto-assign' }]} />

                          {item.serviceType === 'TICKET' && (
                            <>
                              <Select label="Trip Type" value={item.details?.tripType || 'ONE_WAY'} onChange={(e) => updateServiceDetails(idx, 'tripType', e.target.value)} options={[
                                { value: 'ONE_WAY', label: 'One Way' },
                                { value: 'ROUND_TRIP', label: 'Round Trip' },
                              ]} />
                              <Input label="Origin" value={item.details?.origin || ''} onChange={(e) => updateServiceDetails(idx, 'origin', e.target.value)} />
                              <Input label="Destination" value={item.details?.destination || ''} onChange={(e) => updateServiceDetails(idx, 'destination', e.target.value)} />
                              <Input label="Airline" value={item.details?.airline || ''} onChange={(e) => updateServiceDetails(idx, 'airline', e.target.value)} />
                              {item.details?.tripType === 'ROUND_TRIP' && (
                                <Input label="Return Date" type="date" value={item.details?.returnDate || ''} onChange={(e) => updateServiceDetails(idx, 'returnDate', e.target.value)} />
                              )}
                            </>
                          )}

                          {item.serviceType === 'VISA' && (
                            <>
                              <Input label="Country" value={item.details?.country || ''} onChange={(e) => updateServiceDetails(idx, 'country', e.target.value)} />
                              <Input label="Visa Type" value={item.details?.visaType || ''} onChange={(e) => updateServiceDetails(idx, 'visaType', e.target.value)} placeholder="Tourist, Business..." />
                              <Input label="Processing Days" value={item.details?.processingDays || ''} onChange={(e) => updateServiceDetails(idx, 'processingDays', e.target.value)} />
                            </>
                          )}
                        </div>

                        {ROW_BASED_TYPES.includes(item.serviceType) && (
                          <ServiceRows
                            item={item}
                            idx={idx}
                            onAddRow={() => addServiceRow(idx)}
                            onRemoveRow={(rowIdx) => removeServiceRow(idx, rowIdx)}
                            onUpdateRow={(rowIdx, key, value) => updateServiceRow(idx, rowIdx, key, value)}
                          />
                        )}
                      </div>
                    ))}
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

interface ServiceRowsProps {
  item: BookingServiceItem;
  idx: number;
  onAddRow: () => void;
  onRemoveRow: (rowIdx: number) => void;
  onUpdateRow: (rowIdx: number, key: string, value: string) => void;
}

function ServiceRows({ item, onAddRow, onRemoveRow, onUpdateRow }: ServiceRowsProps) {
  const isHotel = item.serviceType === 'HOTEL';
  const rows = item.rows || [];
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{isHotel ? 'Hotel Rooms' : 'Transport Sectors'}</span>
        <Button type="button" variant="secondary" onClick={onAddRow}><Plus className="w-4 h-4 mr-1" />Add Row</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No rows yet — click &quot;Add Row&quot; to begin.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Row #{rowIdx + 1}</span>
                <button type="button" onClick={() => onRemoveRow(rowIdx)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />Delete Row
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {isHotel ? (
                  <>
                    <Input label="Hotel Name" value={row.hotelName || ''} onChange={(e) => onUpdateRow(rowIdx, 'hotelName', e.target.value)} />
                    <Input label="Room Type" value={row.roomType || ''} onChange={(e) => onUpdateRow(rowIdx, 'roomType', e.target.value)} />
                    <Input label="Rooms" type="number" min={1} value={row.numRooms || '1'} onChange={(e) => onUpdateRow(rowIdx, 'numRooms', e.target.value)} />
                    <Input label="Check-in Date" type="date" value={row.checkInDate || ''} onChange={(e) => onUpdateRow(rowIdx, 'checkInDate', e.target.value)} />
                    <Input label="Check-out Date" type="date" value={row.checkOutDate || ''} onChange={(e) => onUpdateRow(rowIdx, 'checkOutDate', e.target.value)} />
                  </>
                ) : (
                  <>
                    <Input label="From" value={row.from || ''} onChange={(e) => onUpdateRow(rowIdx, 'from', e.target.value)} />
                    <Input label="To" value={row.to || ''} onChange={(e) => onUpdateRow(rowIdx, 'to', e.target.value)} />
                    <Input label="Date" type="date" value={row.date || ''} onChange={(e) => onUpdateRow(rowIdx, 'date', e.target.value)} />
                    <Input label="Vehicle Type" value={row.vehicleType || ''} onChange={(e) => onUpdateRow(rowIdx, 'vehicleType', e.target.value)} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
