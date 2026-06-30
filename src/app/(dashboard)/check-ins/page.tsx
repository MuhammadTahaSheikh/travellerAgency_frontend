'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { CheckInRecord, Booking, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, Badge, formatDate, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

export default function CheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
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

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    const query = filterType ? `?upcoming=true&scheduleType=${filterType}` : '?upcoming=true';
    Promise.allSettled([
      api.get<ApiResponse<CheckInRecord[]>>(`/check-ins${query}`),
      api.get<ApiResponse<Booking[]>>('/bookings'),
    ])
      .then(([cRes, bRes]) => {
        if (cRes.status === 'fulfilled') setCheckIns(cRes.value.data || []);
        else setLoadError(cRes.reason?.message || 'Failed to load schedules');
        if (bRes.status === 'fulfilled') setBookings(bRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filterType]);

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
        subtitle="Hotel check-ins and transport — shows vendor posted status"
        action={<Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Schedule</Button>}
      />

      <div className="mb-4 flex gap-2">
        <Button variant={filterType === '' ? 'primary' : 'secondary'} onClick={() => setFilterType('')}>All</Button>
        <Button variant={filterType === 'HOTEL' ? 'primary' : 'secondary'} onClick={() => setFilterType('HOTEL')}>Hotel</Button>
        <Button variant={filterType === 'TRANSPORT' ? 'primary' : 'secondary'} onClick={() => setFilterType('TRANSPORT')}>Transport</Button>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Type" value={form.scheduleType} onChange={(e) => setForm({ ...form, scheduleType: e.target.value })} options={[{ value: 'HOTEL', label: 'Hotel' }, { value: 'TRANSPORT', label: 'Transport' }]} />
              <Select label="Booking (optional)" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} options={[{ value: '', label: 'None' }, ...bookings.map((b) => ({ value: b.id, label: `${b.bookingNumber} - ${b.customer?.firstName} ${b.customer?.lastName}` }))]} />
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
              <EmptyState message="No upcoming schedules. Schedules are auto-created when invoice payments are received." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Guest</TableHeaderCell>
                      <TableHeaderCell>Details</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Vendor Posted</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {checkIns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell><Badge status={c.scheduleType || 'HOTEL'}>{c.scheduleType || 'HOTEL'}</Badge></TableCell>
                        <TableCell>{c.guestName || c.booking?.customer?.firstName || '—'}</TableCell>
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
