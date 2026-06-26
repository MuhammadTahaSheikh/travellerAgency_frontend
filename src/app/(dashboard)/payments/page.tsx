'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { RootState } from '@/store';
import { Invoice, Account, Payment, Voucher, ApiResponse } from '@/types';
import { canDeleteResource } from '@/lib/permissions';
import { shareVoucherViaWhatsApp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface PaymentRow extends Payment {
  paymentNumber: string;
}

export default function PaymentsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceId: '', accountId: '', amount: '', method: 'CASH' });
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    setLoadError('');
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    Promise.allSettled([
      api.get<ApiResponse<PaymentRow[]>>(`/payments${query}`),
      api.get<ApiResponse<Invoice[]>>('/invoices'),
      api.get<ApiResponse<Account[]>>('/payments/accounts'),
    ])
      .then(([payRes, invRes, accRes]) => {
        if (payRes.status === 'fulfilled') {
          setPayments(payRes.value.data || []);
          setSummary({
            count: payRes.value.summary?.count ?? payRes.value.pagination?.total ?? 0,
            total: payRes.value.summary?.totalAmount ?? 0,
          });
        } else setLoadError(payRes.reason?.message || 'Failed to load payments');
        if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
        if (accRes.status === 'fulfilled') setAccounts(accRes.value.data || []);
      })
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Payment> & { voucher?: Voucher | null }>('/payments', { ...form, amount: parseFloat(form.amount) });
      if (res.voucher) shareVoucherViaWhatsApp(res.voucher, user);
      setShowForm(false);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (p: PaymentRow) => {
    try {
      const res = await api.post<ApiResponse<Payment> & { voucher?: Voucher | null }>(`/payments/${p.id}/verify`, {});
      if (res.voucher) shareVoucherViaWhatsApp(res.voucher, user);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (p: PaymentRow) => {
    if (!await confirmDelete(`payment ${p.paymentNumber}`)) return;
    try {
      await api.delete(`/payments/${p.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment Management"
        subtitle="Record and track customer payments"
        action={<Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Record Payment</Button>}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={summary ? { count: summary.count, total: summary.total, label: 'Filtered total' } : undefined}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select label="Invoice (optional)" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} options={[{ value: '', label: 'No invoice' }, ...invoices.map((i) => ({ value: i.id, label: `${i.invoiceNumber} - ${formatCurrency(i.totalAmount)}` }))]} />
              <Select label="Account" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} options={[{ value: '', label: 'Select account' }, ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.type})` }))]} required />
              <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              <Select label="Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={[{ value: 'CASH', label: 'Cash' }, { value: 'BANK_TRANSFER', label: 'Bank Transfer' }, { value: 'CARD', label: 'Card' }, { value: 'CHEQUE', label: 'Cheque' }]} />
              <div className="md:col-span-2 lg:col-span-4 flex gap-2">
                <Button type="submit" loading={saving}>Record Payment</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading payments..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {payments.length === 0 ? (
              <EmptyState message="No payments recorded for the selected period." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Payment #</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Invoice</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Method</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-slate-900">{p.paymentNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">{p.invoice?.invoiceNumber || '—'}</TableCell>
                        <TableCell className="font-medium text-teal-700">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">{p.method.replace('_', ' ').toLowerCase()}</TableCell>
                        <TableCell className="capitalize text-sm">{p.verificationStatus?.toLowerCase() || 'verified'}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(p.paymentDate)}</TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            {p.verificationStatus === 'PENDING' && (
                              <Button variant="secondary" onClick={() => handleVerify(p)} title="Verify payment"><CheckCircle className="w-4 h-4" /></Button>
                            )}
                            <RowActions
                              onDelete={() => handleDelete(p)}
                              canEdit={false}
                              canDelete={canDeleteResource(user, 'payments')}
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
