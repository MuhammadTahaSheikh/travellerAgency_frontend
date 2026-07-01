'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { searchPaymentAccounts, searchVendors } from '@/lib/searchableOptions';
import { buildQueryString } from '@/lib/query';
import { uploadAttachment } from '@/lib/upload';
import { RootState } from '@/store';
import { Account, Vendor, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { ExchangeRateInput } from '@/components/currency/ExchangeRateInput';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  amount: number;
  currency?: 'PKR' | 'SAR';
  amountPkr?: number;
  amountSar?: number;
  description: string;
  vendor?: string;
  expenseDate: string;
}

const emptyForm = {
  category: 'OFFICE', accountId: '', amount: '', currency: 'PKR' as 'PKR' | 'SAR',
  exchangeRate: '75', description: '', vendor: '', vendorId: '', expenseDate: '',
};

const expenseCategories = [
  { value: 'AIRLINE', label: 'Airline Payment' },
  { value: 'HOTEL', label: 'Hotel Payment' },
  { value: 'VISA', label: 'Visa Payment' },
  { value: 'OFFICE', label: 'Office Expense' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Other' },
];

export default function ExpensesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadData = (dates = appliedDates, cat = category) => {
    setLoading(true);
    setLoadError('');
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate, category: cat });
    Promise.allSettled([
      api.get<ApiResponse<Expense[]>>(`/expenses${query}`),
      api.get<ApiResponse<Account[]>>('/payments/accounts'),
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
    ])
      .then(([expRes, accRes, venRes]) => {
        if (expRes.status === 'fulfilled') {
          setExpenses(expRes.value.data || []);
          setSummary({
            count: expRes.value.summary?.count ?? expRes.value.pagination?.total ?? 0,
            total: expRes.value.summary?.totalAmount ?? 0,
          });
        } else setLoadError(expRes.reason?.message || 'Failed to load expenses');
        if (accRes.status === 'fulfilled') setAccounts(accRes.value.data || []);
        if (venRes.status === 'fulfilled') setVendors(venRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadData(dates, category);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadData({ startDate: '', endDate: '' }, '');
  };

  const resetForm = () => {
    setForm(emptyForm);
    setAttachmentFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      category: e.category,
      accountId: '',
      amount: String(e.amount),
      currency: e.currency || 'PKR',
      exchangeRate: '75',
      description: e.description,
      vendor: e.vendor || '',
      vendorId: '',
      expenseDate: e.expenseDate.split('T')[0],
    });
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, {
          category: form.category,
          description: form.description,
          vendor: form.vendor,
          expenseDate: form.expenseDate || undefined,
        });
      } else {
        let receiptPath: string | undefined;
        if (attachmentFile) receiptPath = await uploadAttachment(attachmentFile);
        await api.post('/expenses', {
          ...form,
          amount: parseFloat(form.amount),
          exchangeRate: parseFloat(form.exchangeRate) || undefined,
          receiptPath,
        });
      }
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: Expense) => {
    if (!await confirmDelete(`expense ${e.expenseNumber}`)) return;
    try {
      await api.delete(`/expenses/${e.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Expense Management"
        subtitle="Track airline, hotel, office, salary, and marketing expenses"
        action={canCreateResource(user, 'expenses') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
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
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={summary ? { count: summary.count, total: summary.total, label: 'Filtered total' } : undefined}
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Category filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: 'All categories' }, ...expenseCategories]}
        />
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Expense' : 'New Expense'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={expenseCategories} />
              {!editingId && (
                <>
                  <SearchableSelect label="Account" value={form.accountId} onChange={(v) => setForm({ ...form, accountId: v })} onSearch={searchPaymentAccounts} options={[{ value: '', label: 'Select account' }]} />
                  <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'PKR' | 'SAR' })} options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]} />
                  <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  <ExchangeRateInput
                    value={form.exchangeRate}
                    onChange={(v) => setForm({ ...form, exchangeRate: v })}
                    hint="Used when currency is SAR or for dual-currency ledger posting"
                  />
                </>
              )}
              {editingId && (
                <Input label="Amount (read-only)" type="number" value={form.amount} disabled />
              )}
              <Input label="Expense Date" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
              <SearchableSelect label="Vendor Account" value={form.vendorId} onChange={(v) => setForm({ ...form, vendorId: v })} onSearch={searchVendors} options={[{ value: '', label: 'General expense pool' }]} />
              <Input label="Vendor (text)" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              <div className="md:col-span-2">
                <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} />
              </div>
              {!editingId && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Receipt / Attachment (optional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700" />
                </div>
              )}
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Update Expense' : 'Save Expense'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading expenses..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {expenses.length === 0 ? (
              <EmptyState message="No expenses recorded for the selected period." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Expense #</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Description</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-semibold text-slate-900">{e.expenseNumber}</TableCell>
                        <TableCell className="capitalize">{e.category.replace('_', ' ').toLowerCase()}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate">{e.description}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          {formatCurrency(e.amount, e.currency || 'PKR')}
                          {e.currency === 'SAR' && e.amountPkr ? (
                            <span className="block text-xs text-slate-400">≈ {formatCurrency(e.amountPkr, 'PKR')}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-slate-500">{formatDate(e.expenseDate)}</TableCell>
                        <TableCell align="right">
                          <RowActions
                            onEdit={() => startEdit(e)}
                            onDelete={() => handleDelete(e)}
                            canEdit={canEditResource(user, 'expenses')}
                            canDelete={canDeleteResource(user, 'expenses')}
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
