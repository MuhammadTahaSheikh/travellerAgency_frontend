'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, CheckCircle, ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import { Invoice, Customer, Vendor, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { shareInvoiceViaWhatsApp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const SERVICE_OPTIONS = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'TICKET', label: 'Air Ticket' },
  { value: 'VISA', label: 'Visa' },
  { value: 'TRANSPORT', label: 'Transportation' },
];

const emptyItem = () => ({
  serviceType: 'HOTEL',
  description: '',
  quantity: 1,
  unitPrice: '',
  costAmount: '',
  vendorId: '',
  dueDate: '',
  postingType: 'PENDING' as 'INSTANT' | 'PENDING',
});

const emptyForm = { customerId: '', subtotal: '', tax: '0', discount: '0', dueDate: '', status: 'SENT' };

export default function InvoicesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lineItems, setLineItems] = useState([emptyItem()]);
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
      api.get<ApiResponse<Vendor[]>>('/vendors'),
    ])
      .then(([invRes, custRes, vendRes]) => {
        setInvoices(invRes.data || []);
        setCustomers(custRes.data || []);
        setVendors(vendRes.data || []);
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

  const removeLineItem = (idx: number) => {
    setLineItems(lineItems.length > 1 ? lineItems.filter((_, i) => i !== idx) : [emptyItem()]);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setLineItems([emptyItem()]);
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
    const items = lineItems
      .filter((i) => i.description && i.unitPrice)
      .map((i) => {
        const unitPrice = parseFloat(i.unitPrice);
        const qty = i.quantity || 1;
        return {
          serviceType: i.serviceType,
          description: i.description,
          quantity: qty,
          unitPrice,
          amount: unitPrice * qty,
          costAmount: i.costAmount ? parseFloat(i.costAmount) : 0,
          vendorId: i.vendorId || undefined,
          dueDate: i.dueDate || undefined,
          postingType: i.postingType,
        };
      });
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const payload = {
      ...form,
      subtotal,
      tax: parseFloat(form.tax),
      discount: parseFloat(form.discount),
      items,
    };
    try {
      if (editingId) {
        await api.put(`/invoices/${editingId}`, payload);
      } else {
        const res = await api.post<ApiResponse<Invoice>>('/invoices', payload);
        if (res.data) shareInvoiceViaWhatsApp(res.data, user);
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
      const res = await api.post<ApiResponse<Invoice>>(`/invoices/${inv.id}/confirm`, {});
      if (res.data) shareInvoiceViaWhatsApp(res.data, user);
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select label="Customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={[{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c.id, label: c.customerType === 'B2B' ? `${c.companyName} (${c.tradePartnerId || 'B2B'})` : `${c.firstName} ${c.lastName}` }))]} required />
                <Input label="Tax" type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
                <Input label="Discount" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              </div>

              {!editingId && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-slate-800">Services</h4>
                    <Button type="button" variant="secondary" onClick={() => setLineItems([...lineItems, emptyItem()])}>Add Service</Button>
                  </div>
                  <div className="space-y-3">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 p-3 bg-slate-50 rounded-xl relative">
                        <div className="absolute top-2 right-2">
                          <button type="button" onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700" title="Remove service">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <Select label="Type" value={item.serviceType} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, serviceType: e.target.value }; setLineItems(next); }} options={SERVICE_OPTIONS} />
                        <Input label="Description" value={item.description} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, description: e.target.value }; setLineItems(next); }} />
                        <Input label="Unit Price" type="number" value={item.unitPrice} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, unitPrice: e.target.value }; setLineItems(next); }} />
                        <Input label="Qty" type="number" value={String(item.quantity)} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, quantity: parseInt(e.target.value) || 1 }; setLineItems(next); }} />
                        <Input label="Est. Cost" type="number" value={item.costAmount} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, costAmount: e.target.value }; setLineItems(next); }} />
                        <Select label="Vendor" value={item.vendorId} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, vendorId: e.target.value }; setLineItems(next); }} options={[{ value: '', label: 'None' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]} />
                        <Input label="Due Date" type="date" value={item.dueDate} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, dueDate: e.target.value }; setLineItems(next); }} />
                        <Select label="Vendor Post" value={item.postingType} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...item, postingType: e.target.value as 'INSTANT' | 'PENDING' }; setLineItems(next); }} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'INSTANT', label: 'Instant' }]} />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Subtotal: {formatCurrency(lineItems.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (i.quantity || 1), 0))}
                  </p>
                </div>
              )}

              {editingId && (
                <Input label="Subtotal" type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} required />
              )}

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

              <div className="flex gap-2">
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
                            <Button variant="secondary" onClick={() => shareInvoiceViaWhatsApp(inv, user)} title="Send via WhatsApp"><MessageCircle className="w-4 h-4" /></Button>
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
