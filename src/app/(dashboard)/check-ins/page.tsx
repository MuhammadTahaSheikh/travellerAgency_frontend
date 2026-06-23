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
  const [form, setForm] = useState({ bookingId: '', hotelName: '', checkInDate: '', guestName: '', roomDetails: '' });
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      api.get<ApiResponse<CheckInRecord[]>>('/check-ins?upcoming=true'),
      api.get<ApiResponse<Booking[]>>('/bookings'),
    ])
      .then(([cRes, bRes]) => {
        if (cRes.status === 'fulfilled') setCheckIns(cRes.value.data || []);
        else setLoadError(cRes.reason?.message || 'Failed to load check-ins');
        if (bRes.status === 'fulfilled') setBookings(bRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

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
        title="Check-in Records"
        subtitle="Track hotel check-ins — reminders sent 1 day prior"
        action={<Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Check-in</Button>}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Booking" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} options={[{ value: '', label: 'Select booking' }, ...bookings.map((b) => ({ value: b.id, label: `${b.bookingNumber} - ${b.customer?.firstName} ${b.customer?.lastName}` }))]} required />
              <Input label="Hotel Name" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} required />
              <Input label="Check-in Date" type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} required />
              <Input label="Guest Name" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
              <Input label="Room Details" value={form.roomDetails} onChange={(e) => setForm({ ...form, roomDetails: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Save Check-in</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading check-ins..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {checkIns.length === 0 ? (
              <EmptyState message="No upcoming check-ins. Check-ins are auto-created from hotel bookings when confirmed." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Guest</TableHeaderCell>
                      <TableHeaderCell>Hotel</TableHeaderCell>
                      <TableHeaderCell>Check-in Date</TableHeaderCell>
                      <TableHeaderCell>Booking</TableHeaderCell>
                      <TableHeaderCell>Reminder</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {checkIns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.guestName || c.booking?.customer?.firstName}</TableCell>
                        <TableCell>{c.hotelName}</TableCell>
                        <TableCell>{formatDate(c.checkInDate)}</TableCell>
                        <TableCell>{c.booking?.bookingNumber || '—'}</TableCell>
                        <TableCell>
                          <Badge status={c.reminderSent ? 'COMPLETED' : 'PENDING'}>
                            {c.reminderSent ? 'Sent' : 'Scheduled'}
                          </Badge>
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
