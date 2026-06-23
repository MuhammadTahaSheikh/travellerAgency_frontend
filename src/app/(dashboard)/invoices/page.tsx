'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, CheckCircle, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import { Invoice, Customer, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const emptyForm = { customerId: '', subtotal: '', tax: '0', discount: '0', dueDate: '', status: 'SENT' };

export default function InvoicesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      api.get<ApiResponse<Invoice[]>>(`/invoices${query}`),
      api.get<ApiResponse<Customer[]>>('/customers'),
    ])
      .then(([invRes, custRes]) => {
        setInvoices(invRes.data || []);
        setCustomers(custRes.data || []);
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

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setForm({
      customerId: inv.customer?.id || '',
      subtotal: String(inv.subtotal),
      tax: String(inv.tax),
      discount: String(inv.discount),
      dueDate: inv.dueDate.split('T')[0],
      status: inv.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      subtotal: parseFloat(form.subtotal),
      tax: parseFloat(form.tax),
      discount: parseFloat(form.discount),
    };
    try {
      if (editingId) {
        await api.put(`/invoices/${editingId}`, payload);
      } else {
        await api.post('/invoices', payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (inv: Invoice) => {
    if (!confirm(`Confirm invoice ${inv.invoiceNumber}? This will debit the customer ledger.`)) return;
    try {
      await api.post(`/invoices/${inv.id}/confirm`, {});
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleView = async (inv: Invoice) => {
    try {
      const html = await api.getHtml(`/invoices/${inv.id}/html`);
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!await confirmDelete(`invoice ${inv.invoiceNumber}`)) return;
    try {
      await api.delete(`/invoices/${inv.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoice Management"
        subtitle="Create and track customer invoices"
        action={canCreateResource(user, 'invoices') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
        ) : undefined}
      />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={{ count: invoices.length, label: 'Invoices' }}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Invoice' : 'New Invoice'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={[{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]} required />
              <Input label="Subtotal" type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} required />
              <Input label="Tax" type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
              <Input label="Discount" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              {editingId && (
                <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'PARTIAL', label: 'Partial' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'OVERDUE', label: 'Overdue' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]} />
              )}
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Update Invoice' : 'Create Invoice'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading invoices..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {invoices.length === 0 ? (
              <EmptyState message="No invoices found for the selected period." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Invoice #</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Total</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Paid</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Due Date</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold text-slate-900">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customer?.firstName} {inv.customer?.lastName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-teal-700">{formatCurrency(inv.paidAmount)}</TableCell>
                        <TableCell><Badge status={inv.status}>{inv.status}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-slate-500">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" onClick={() => handleView(inv)} title="View invoice"><ExternalLink className="w-4 h-4" /></Button>
                            {!inv.confirmedAt && inv.status !== 'CANCELLED' && canEditResource(user, 'invoices') && (
                              <Button variant="secondary" onClick={() => handleConfirm(inv)} title="Confirm & debit ledger"><CheckCircle className="w-4 h-4" /></Button>
                            )}
                            <RowActions
                              onEdit={() => startEdit(inv)}
                              onDelete={() => handleDelete(inv)}
                              canEdit={canEditResource(user, 'invoices')}
                              canDelete={canDeleteResource(user, 'invoices')}
                            />
                          </div>
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
