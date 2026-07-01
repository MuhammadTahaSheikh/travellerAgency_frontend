'use client';

import { useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { searchCustomers, searchVendors, searchBookings } from '@/lib/searchableOptions';
import { CheckInRecord, Booking, Customer, Vendor, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, SearchableSelect } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatDate, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

export default function CheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [b2bOnly, setB2bOnly] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [form, setForm] = useState({
    bookingId: '',
    scheduleType: 'HOTEL',
    hotelName: '',
    checkInDate: '',
    transportDate: '',
    pickupLocation: '',
    dropoffLocation: '',
    guestName: '',
    roomDetails: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const buildFilters = (dates = appliedDates) => buildQueryString({
    upcoming: upcomingOnly ? 'true' : undefined,
    scheduleType: filterType || undefined,
    startDate: dates.startDate || undefined,
    endDate: dates.endDate || undefined,
    customerId: customerId || undefined,
    vendorId: vendorId || undefined,
    b2bOnly: b2bOnly ? 'true' : undefined,
    limit: '200',
  });

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      api.get<ApiResponse<CheckInRecord[]>>(`/check-ins${buildFilters(dates)}`),
      api.get<ApiResponse<Booking[]>>('/bookings?limit=200'),
      api.get<ApiResponse<Customer[]>>('/customers?limit=200'),
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
    ])
      .then(([cRes, bRes, custRes, venRes]) => {
        if (cRes.status === 'fulfilled') setCheckIns(cRes.value.data || []);
        else setLoadError(cRes.reason?.message || 'Failed to load schedules');
        if (bRes.status === 'fulfilled') setBookings(bRes.value.data || []);
        if (custRes.status === 'fulfilled') setCustomers(custRes.value.data || []);
        if (venRes.status === 'fulfilled') setVendors(venRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filterType, customerId, vendorId, b2bOnly, upcomingOnly]);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadData(dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setCustomerId('');
    setVendorId('');
    setB2bOnly(false);
    setAppliedDates({ startDate: '', endDate: '' });
    loadData({ startDate: '', endDate: '' });
  };

  const handleExport = async (format: 'csv' | 'html') => {
    const query = buildFilters();
    const qs = query ? `${query}&format=${format}` : `?format=${format}`;
    try {
      if (format === 'html') {
        const html = await api.getHtml(`/check-ins/export${qs}`);
        api.openHtmlInNewTab(html);
      } else {
        await api.downloadFile(`/check-ins/export${qs}`, 'arrival-sheet.csv');
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/check-ins', form);
      setShowForm(false);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div>
      <PageHeader
        title="Travel Schedules"
        subtitle="Hotel check-ins and transport arrival sheets — filter and download before sharing"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => handleExport('csv')}><Download className="w-4 h-4 mr-2" />Excel (CSV)</Button>
            <Button variant="secondary" onClick={() => handleExport('html')}><Download className="w-4 h-4 mr-2" />PDF (Print)</Button>
            <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Schedule</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={filterType === '' ? 'primary' : 'secondary'} onClick={() => setFilterType('')}>All</Button>
        <Button variant={filterType === 'HOTEL' ? 'primary' : 'secondary'} onClick={() => setFilterType('HOTEL')}>Hotel</Button>
        <Button variant={filterType === 'TRANSPORT' ? 'primary' : 'secondary'} onClick={() => setFilterType('TRANSPORT')}>Transport</Button>
        <Button variant={upcomingOnly ? 'primary' : 'secondary'} onClick={() => setUpcomingOnly(!upcomingOnly)}>
          {upcomingOnly ? 'Upcoming only' : 'All dates'}
        </Button>
        <Button variant={b2bOnly ? 'primary' : 'secondary'} onClick={() => setB2bOnly(!b2bOnly)}>B2B only</Button>
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={{ count: checkIns.length, label: 'Schedules' }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl">
        <SearchableSelect
          label="B2B Customer"
          value={customerId}
          onChange={setCustomerId}
          onSearch={searchCustomers}
          options={[{ value: '', label: 'All customers' }]}
        />
        <SearchableSelect
          label="Vendor"
          value={vendorId}
          onChange={setVendorId}
          onSearch={searchVendors}
          options={[{ value: '', label: 'All vendors' }]}
        />
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SearchableSelect label="Type" value={form.scheduleType} onChange={(v) => setForm({ ...form, scheduleType: v })} options={[{ value: 'HOTEL', label: 'Hotel' }, { value: 'TRANSPORT', label: 'Transport' }]} searchThreshold={99} />
              <SearchableSelect label="Booking (optional)" value={form.bookingId} onChange={(v) => setForm({ ...form, bookingId: v })} onSearch={searchBookings} options={[{ value: '', label: 'None' }]} />
              {form.scheduleType === 'HOTEL' ? (
                <>
                  <Input label="Hotel Name" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} required />
                  <Input label="Check-in Date" type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} required />
                  <Input label="Room Details" value={form.roomDetails} onChange={(e) => setForm({ ...form, roomDetails: e.target.value })} />
                </>
              ) : (
                <>
                  <Input label="Transport Date" type="date" value={form.transportDate} onChange={(e) => setForm({ ...form, transportDate: e.target.value })} required />
                  <Input label="Pickup" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
                  <Input label="Drop-off" value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} />
                </>
              )}
              <Input label="Guest Name" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Save</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading schedules..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {checkIns.length === 0 ? (
              <EmptyState message="No schedules match your filters." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Guest</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Details</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Vendor Posted</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {checkIns.map((c) => {
                      const cust = c.booking?.customer;
                      const customerLabel = cust?.customerType === 'B2B' && cust.companyName
                        ? cust.companyName
                        : cust ? `${cust.firstName} ${cust.lastName}` : '—';
                      return (
                        <TableRow key={c.id}>
                          <TableCell><Badge status={c.scheduleType || 'HOTEL'}>{c.scheduleType || 'HOTEL'}</Badge></TableCell>
                          <TableCell>{c.guestName || customerLabel}</TableCell>
                          <TableCell>{customerLabel}</TableCell>
                          <TableCell>
                            {c.scheduleType === 'TRANSPORT'
                              ? `${c.pickupLocation || ''} → ${c.dropoffLocation || ''}`
                              : c.hotelName || '—'}
                          </TableCell>
                          <TableCell>{formatDate((c.scheduleType === 'TRANSPORT' ? c.transportDate : c.checkInDate) || '')}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.vendorPosted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {c.vendorPosted ? 'Posted' : 'Not Posted'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
