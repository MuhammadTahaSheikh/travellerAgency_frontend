'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { searchCustomers, searchPackages, searchVendors } from '@/lib/searchableOptions';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import { Booking, Customer, Package, Vendor, BookingServiceItem, Invoice, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { shareInvoiceViaWhatsApp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const emptyServiceItem = (): BookingServiceItem => ({
  serviceType: 'TICKET',
  description: '',
  amount: 0,
  costAmount: 0,
  details: {},
});

const emptyForm = {
  packageId: '',
  customerId: '',
  totalAmount: '',
  numTravelers: '1',
  travelDate: '',
  returnDate: '',
  notes: '',
  status: 'PENDING',
  serviceItems: [] as BookingServiceItem[],
};

export default function BookingsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [loadError, setLoadError] = useState('');

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    setLoadError('');
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    Promise.allSettled([
      api.get<ApiResponse<Booking[]>>(`/bookings${query}`),
      api.get<ApiResponse<Customer[]>>('/customers?limit=200'),
      api.get<ApiResponse<Package[]>>('/packages?limit=200'),
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
    ])
      .then(([bookingsRes, customersRes, packagesRes, vendorsRes]) => {
        if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value.data || []);
        else setLoadError(bookingsRes.reason?.message || 'Failed to load bookings');
        if (customersRes.status === 'fulfilled') setCustomers(customersRes.value.data || []);
        if (packagesRes.status === 'fulfilled') setPackages(packagesRes.value.data || []);
        if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const calcTotal = (packageId: string, numTravelers: string, items: BookingServiceItem[]) => {
    let total = 0;
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) total += Number(pkg.price) * (parseInt(numTravelers, 10) || 1);
    total += items.reduce((s, i) => s + Number(i.amount || 0), 0);
    return String(total);
  };

  const updateForm = (updates: Partial<typeof form>) => {
    const next = { ...form, ...updates };
    next.totalAmount = calcTotal(next.packageId, next.numTravelers, next.serviceItems);
    setForm(next);
  };

  const addServiceItem = () => {
    updateForm({ serviceItems: [...form.serviceItems, emptyServiceItem()] });
  };

  const removeServiceItem = (idx: number) => {
    const items = form.serviceItems.filter((_, i) => i !== idx);
    updateForm({ serviceItems: items });
  };

  const updateServiceItem = (idx: number, updates: Partial<BookingServiceItem>) => {
    const items = form.serviceItems.map((item, i) => (i === idx ? { ...item, ...updates } : item));
    updateForm({ serviceItems: items });
  };

  const updateServiceDetails = (idx: number, key: string, value: string) => {
    const item = form.serviceItems[idx];
    updateServiceItem(idx, { details: { ...item.details, [key]: value } });
  };

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setForm({
      packageId: b.package?.id || '',
      customerId: b.customer?.id || '',
      totalAmount: String(b.totalAmount),
      numTravelers: String(b.numTravelers),
      travelDate: b.travelDate ? b.travelDate.split('T')[0] : '',
      returnDate: b.returnDate ? b.returnDate.split('T')[0] : '',
      notes: b.notes || '',
      status: b.status,
      serviceItems: b.serviceItems?.map((s) => ({
        serviceType: s.serviceType,
        description: s.description,
        amount: s.amount,
        costAmount: s.costAmount || 0,
        vendorId: s.vendorId,
        details: (s.details as Record<string, string>) || {},
      })) || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      packageId: form.packageId || undefined,
      customerId: form.customerId,
      totalAmount: parseFloat(form.totalAmount),
      numTravelers: parseInt(form.numTravelers),
      travelDate: form.travelDate || undefined,
      returnDate: form.returnDate || undefined,
      notes: form.notes,
      status: form.status,
      serviceItems: form.serviceItems.map((s) => ({
        serviceType: s.serviceType,
        description: s.description || `${s.serviceType} service`,
        amount: Number(s.amount),
        costAmount: Number(s.costAmount || 0),
        vendorId: s.vendorId || undefined,
        details: s.details,
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
    type === 'HOTEL' ? 'HOTEL' : type === 'VISA' ? 'VISA' : type === 'TICKET' ? 'TICKETING' : 'OTHER';

  return (
    <div>
      <PageHeader
        title="Booking Management"
        subtitle="Create bookings with ticket, visa, and hotel services"
        action={canCreateResource(user, 'bookings') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />New Booking</Button>
        ) : undefined}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
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

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Booking' : 'New Booking'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SearchableSelect label="Customer" value={form.customerId} onChange={(v) => updateForm({ customerId: v })} onSearch={searchCustomers} options={[{ value: '', label: 'Select customer' }]} />
                <SearchableSelect label="Package (optional)" value={form.packageId} onChange={(v) => updateForm({ packageId: v })} onSearch={searchPackages} options={[{ value: '', label: 'No package' }]} />
                <Input label="Total Amount" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
                <Input label="Travelers" type="number" min={1} value={form.numTravelers} onChange={(e) => updateForm({ numTravelers: e.target.value })} />
                <Input label="Travel Date" type="date" value={form.travelDate} onChange={(e) => updateForm({ travelDate: e.target.value })} />
                <Input label="Return Date" type="date" value={form.returnDate} onChange={(e) => updateForm({ returnDate: e.target.value })} />
                <Select label="Status" value={form.status} onChange={(e) => updateForm({ status: e.target.value })} options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed (auto-invoice & ledger)' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Service Items (Ticket / Visa / Hotel)</h4>
                  <Button type="button" variant="secondary" onClick={addServiceItem}><Plus className="w-4 h-4 mr-1" />Add Service</Button>
                </div>
                {form.serviceItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Add ticket, visa, or hotel services with custom details.</p>
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
                            { value: 'HOTEL', label: 'Hotel' },
                          ]} />
                          <Input label="Description" value={item.description} onChange={(e) => updateServiceItem(idx, { description: e.target.value })} placeholder="e.g. Dubai Flight" />
                          <Input label="Selling Price" type="number" value={String(item.amount)} onChange={(e) => updateServiceItem(idx, { amount: parseFloat(e.target.value) || 0 })} />
                          <Input label="Vendor Cost" type="number" value={String(item.costAmount || 0)} onChange={(e) => updateServiceItem(idx, { costAmount: parseFloat(e.target.value) || 0 })} />
                          <SearchableSelect label="Vendor" value={item.vendorId || ''} onChange={(v) => updateServiceItem(idx, { vendorId: v })} onSearch={(q) => searchVendors(q, vendorCategoryForType(item.serviceType))} options={[{ value: '', label: 'Auto-assign' }]} />

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

                          {item.serviceType === 'HOTEL' && (
                            <>
                              <Input label="Hotel Name" value={item.details?.hotelName || ''} onChange={(e) => updateServiceDetails(idx, 'hotelName', e.target.value)} />
                              <Input label="Check-in Date" type="date" value={item.details?.checkInDate || ''} onChange={(e) => updateServiceDetails(idx, 'checkInDate', e.target.value)} />
                              <Input label="Check-out Date" type="date" value={item.details?.checkOutDate || ''} onChange={(e) => updateServiceDetails(idx, 'checkOutDate', e.target.value)} />
                              <Input label="Room Type" value={item.details?.roomType || ''} onChange={(e) => updateServiceDetails(idx, 'roomType', e.target.value)} />
                              <Input label="Rooms" type="number" value={item.details?.numRooms || '1'} onChange={(e) => updateServiceDetails(idx, 'numRooms', e.target.value)} />
                            </>
                          )}
                        </div>
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
      )}

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
                        <TableCell>{b.customer?.firstName} {b.customer?.lastName}</TableCell>
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
