'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Search, BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { RootState } from '@/store';
import { Customer, CustomerLedger, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatDate, formatCurrency, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { LedgerTransactionTable, LedgerTransactionRow } from '@/components/ledger/LedgerTransactionTable';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const emptyForm = {
  customerType: 'B2C' as 'B2C' | 'B2B',
  firstName: '',
  lastName: '',
  companyName: '',
  contactPerson: '',
  ntn: '',
  email: '',
  phone: '',
  address: '',
  passportNo: '',
  notes: '',
};

export default function CustomersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [ledgerTx, setLedgerTx] = useState<LedgerTransactionRow[]>([]);
  const [ledgerCurrency, setLedgerCurrency] = useState<'PKR' | 'SAR'>('PKR');
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadCustomers = () => {
    setLoading(true);
    api.get<ApiResponse<Customer[]>>(`/customers?search=${search}`)
      .then((res) => setCustomers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomers(); }, [search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      customerType: c.customerType || 'B2C',
      firstName: c.firstName,
      lastName: c.lastName,
      companyName: c.companyName || '',
      contactPerson: c.contactPerson || '',
      ntn: c.ntn || '',
      email: c.email || '',
      phone: c.phone,
      address: c.address || '',
      passportNo: c.passportNo || '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post('/customers', form);
      }
      resetForm();
      loadCustomers();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const viewLedger = async (c: Customer, currency: 'PKR' | 'SAR' = ledgerCurrency) => {
    setLedgerLoading(true);
    try {
      const res = await api.get<ApiResponse<CustomerLedger & { transactions: LedgerTransactionRow[] }>>(`/customers/${c.id}/ledger?currency=${currency}`);
      setLedger(res.data || null);
      setLedgerTx((res.data?.transactions as LedgerTransactionRow[]) || []);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!await confirmDelete(`${c.firstName} ${c.lastName}`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      loadCustomers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Customer Management"
        subtitle="Manage your travel agency customers"
        action={canCreateResource(user, 'customers') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
        ) : undefined}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Customer' : 'New Customer'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Customer Type"
                value={form.customerType}
                onChange={(e) => setForm({ ...form, customerType: e.target.value as 'B2C' | 'B2B' })}
                options={[{ value: 'B2C', label: 'B2C (Individual)' }, { value: 'B2B', label: 'B2B (Trade Partner)' }]}
              />
              {form.customerType === 'B2B' ? (
                <>
                  <Input label="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
                  <Input label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                  <Input label="NTN (optional)" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
                </>
              ) : (
                <>
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </>
              )}
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Passport No" value={form.passportNo} onChange={(e) => setForm({ ...form, passportNo: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-2" />
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Update Customer' : 'Save Customer'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 sm:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            placeholder="Search customers by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? <LoadingSpinner label="Loading customers..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {customers.length === 0 ? (
              <EmptyState message="No customers found. Add your first customer to get started." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Trade Partner ID</TableHeaderCell>
                      <TableHeaderCell>Phone</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Email</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Passport</TableHeaderCell>
                      <TableHeaderCell className="hidden lg:table-cell">Added</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell><span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100">{c.customerType || 'B2C'}</span></TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          {c.customerType === 'B2B' ? c.companyName : `${c.firstName} ${c.lastName}`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">{c.tradePartnerId || '—'}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell className="hidden sm:table-cell">{c.email || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.passportNo || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-slate-500">{formatDate(c.createdAt)}</TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" onClick={() => viewLedger(c)} title="View ledger" loading={ledgerLoading}><BookOpen className="w-4 h-4" /></Button>
                            <RowActions
                              onEdit={() => startEdit(c)}
                              onDelete={() => handleDelete(c)}
                              canEdit={canEditResource(user, 'customers')}
                              canDelete={canDeleteResource(user, 'customers')}
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

      {ledger && (
        <Card className="mt-6">
          <CardBody>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">
                  Customer Ledger — {ledger.customer.customerType === 'B2B' ? ledger.customer.companyName : `${ledger.customer.firstName} ${ledger.customer.lastName}`}
                </h3>
                <p className="text-sm text-slate-500">
                  {ledger.customer.phone}
                  {ledger.customer.tradePartnerId ? ` · ${ledger.customer.tradePartnerId}` : ''}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setLedger(null)}>Close</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Total Billed</p><p className="font-bold">{formatCurrency(ledger.summary.totalBilled)}</p></div>
              <div className="p-3 bg-teal-50 rounded-lg"><p className="text-xs text-slate-500">Total Paid</p><p className="font-bold text-teal-700">{formatCurrency(ledger.summary.totalPaid)}</p></div>
              <div className="p-3 bg-amber-50 rounded-lg"><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold text-amber-700">{formatCurrency(ledger.summary.outstanding)}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Ledger ({ledgerCurrency})</p>
                <p className="font-bold">{formatCurrency(ledgerCurrency === 'SAR' ? (ledger.summary as { ledgerBalanceSar?: number }).ledgerBalanceSar || 0 : (ledger.summary as { ledgerBalancePkr?: number }).ledgerBalancePkr ?? ledger.summary.ledgerBalance)}</p>
              </div>
            </div>
            <div className="mb-4 max-w-xs">
              <Select
                label="Currency view"
                value={ledgerCurrency}
                onChange={(e) => {
                  const cur = e.target.value as 'PKR' | 'SAR';
                  setLedgerCurrency(cur);
                  if (ledger.customer) viewLedger(ledger.customer as Customer, cur);
                }}
                options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]}
              />
            </div>
            {ledgerTx.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Transaction History</h4>
                <LedgerTransactionTable rows={ledgerTx} currency={ledgerCurrency} />
              </div>
            )}
            {ledger.invoices.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Invoices</h4>
                <div className="space-y-1 text-sm">
                  {ledger.invoices.map((inv) => (
                    <div key={inv.id} className="flex justify-between py-1 border-b border-slate-100">
                      <span>{inv.invoiceNumber} ({inv.status})</span>
                      <span>{formatCurrency(inv.totalAmount)} — paid {formatCurrency(inv.paidAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
