'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import { Booking, Customer, Package, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const emptyForm = { packageId: '', customerId: '', totalAmount: '', numTravelers: '1', travelDate: '', notes: '', status: 'PENDING' };

export default function BookingsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    Promise.all([
      api.get<ApiResponse<Booking[]>>(`/bookings${query}`),
      api.get<ApiResponse<Customer[]>>('/customers'),
      api.get<ApiResponse<Package[]>>('/packages'),
    ])
      .then(([bookingsRes, customersRes, packagesRes]) => {
        setBookings(bookingsRes.data || []);
        setCustomers(customersRes.data || []);
        setPackages(packagesRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadData(dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadData({ startDate: '', endDate: '' });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const calcTotalFromPackage = (packageId: string, numTravelers: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return null;
    const travelers = Math.max(1, parseInt(numTravelers, 10) || 1);
    return String(Number(pkg.price) * travelers);
  };

  const handlePackageChange = (packageId: string) => {
    const totalAmount = calcTotalFromPackage(packageId, form.numTravelers);
    setForm({ ...form, packageId, totalAmount: totalAmount ?? form.totalAmount });
  };

  const handleTravelersChange = (numTravelers: string) => {
    const totalAmount = calcTotalFromPackage(form.packageId, numTravelers);
    setForm({ ...form, numTravelers, totalAmount: totalAmount ?? form.totalAmount });
  };

  const selectedPackage = packages.find((p) => p.id === form.packageId);

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setForm({
      packageId: b.package?.id || '',
      customerId: b.customer?.id || '',
      totalAmount: String(b.totalAmount),
      numTravelers: String(b.numTravelers),
      travelDate: b.travelDate ? b.travelDate.split('T')[0] : '',
      notes: b.notes || '',
      status: b.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      totalAmount: parseFloat(form.totalAmount),
      numTravelers: parseInt(form.numTravelers),
    };
    try {
      if (editingId) {
        await api.put(`/bookings/${editingId}`, payload);
      } else {
        await api.post('/bookings', payload);
      }
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

  return (
    <div>
      <PageHeader
        title="Booking Management"
        subtitle="Create and manage travel bookings"
        action={canCreateResource(user, 'bookings') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />New Booking</Button>
        ) : undefined}
      />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={{ count: bookings.length, label: 'Bookings' }}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Booking' : 'New Booking'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={[{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]} required />
              <Select label="Package" value={form.packageId} onChange={(e) => handlePackageChange(e.target.value)} options={[{ value: '', label: 'Select package' }, ...packages.map((p) => ({ value: p.id, label: `${p.name} (${formatCurrency(p.price)}/person)` }))]} required />
              <Input label="Total Amount" type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required hint={selectedPackage ? `${formatCurrency(selectedPackage.price)} × ${form.numTravelers || 1} traveler(s)` : undefined} />
              <Input label="Travelers" type="number" min={1} value={form.numTravelers} onChange={(e) => handleTravelersChange(e.target.value)} />
              <Input label="Travel Date" type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} />
              <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]} />
              <div className="md:col-span-2 lg:col-span-3">
                <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
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
                      <TableHeaderCell className="hidden md:table-cell">Package</TableHeaderCell>
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
                        <TableCell className="hidden md:table-cell">{b.package?.name}</TableCell>
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
