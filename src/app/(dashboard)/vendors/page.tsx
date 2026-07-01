'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Wallet, BookOpen, Download } from 'lucide-react';
import { searchPaymentAccounts } from '@/lib/searchableOptions';
import api from '@/lib/api';
import { exportLedgerCsv, exportLedgerPdf } from '@/lib/ledgerExport';
import { RootState } from '@/store';
import { isAdminOrAbove } from '@/lib/permissions';
import { Vendor, Account, ApiResponse } from '@/types';
import { uploadAttachment } from '@/lib/upload';
import { LedgerTransactionTable, LedgerTransactionRow } from '@/components/ledger/LedgerTransactionTable';
import { InternalTransferButton, InternalTransferModal } from '@/components/ledger/InternalTransferModal';
import { ExchangeRateInput } from '@/components/currency/ExchangeRateInput';
import { Input, Select, SearchableSelect } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatCurrency, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const emptyForm = { name: '', category: 'HOTEL', contactPerson: '', email: '', phone: '' };

type VendorPayable = {
  vendorId: string;
  vendorName: string;
  category: string;
  totalAllocated: number;
  totalPaid: number;
  outstanding: number;
  accountBalance: number;
};

export default function VendorsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const canTransfer = isAdminOrAbove(user);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payables, setPayables] = useState<VendorPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [payVendor, setPayVendor] = useState<Vendor | null>(null);
  const [payForm, setPayForm] = useState({ accountId: '', amount: '', currency: 'PKR', exchangeRate: '75', method: 'BANK_TRANSFER', notes: '' });
  const [payFile, setPayFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendorLedger, setVendorLedger] = useState<{ vendor: Vendor; transactions: LedgerTransactionRow[] } | null>(null);
  const [ledgerCurrency, setLedgerCurrency] = useState<'PKR' | 'SAR'>('PKR');
  const [showInternalTransfer, setShowInternalTransfer] = useState(false);

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
      api.get<ApiResponse<typeof payables>>('/vendors/payables'),
      api.get<ApiResponse<Account[]>>('/payments/accounts'),
    ])
      .then(([vendorsRes, payablesRes, accRes]) => {
        if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value.data || []);
        else setLoadError(vendorsRes.reason?.message || 'Failed to load vendors');
        if (payablesRes.status === 'fulfilled') setPayables(payablesRes.value.data || []);
        if (accRes.status === 'fulfilled') setAccounts(accRes.value.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/vendors', form);
      setForm(emptyForm);
      setShowForm(false);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const payablesByVendorId = Object.fromEntries(payables.map((p) => [p.vendorId, p]));

  const handlePayVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payVendor) return;
    setSaving(true);
    try {
      let attachmentPath: string | undefined;
      if (payFile) attachmentPath = await uploadAttachment(payFile);
      await api.post(`/vendors/${payVendor.id}/pay`, {
        ...payForm,
        amount: parseFloat(payForm.amount),
        exchangeRate: parseFloat(payForm.exchangeRate),
        attachmentPath,
      });
      setPayVendor(null);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const viewVendorLedger = async (v: Vendor, currency = ledgerCurrency) => {
    try {
      const res = await api.get<ApiResponse<{ vendor: Vendor; transactions: LedgerTransactionRow[] }>>(`/vendors/${v.id}/ledger?currency=${currency}`);
      setVendorLedger({ vendor: res.data!.vendor, transactions: res.data!.transactions || [] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const exportVendorLedgerFile = async (format: 'csv' | 'html') => {
    if (!vendorLedger) return;
    const { vendor, transactions } = vendorLedger;
    const title = `Vendor Ledger — ${vendor.name}`;
    try {
      if (format === 'html') {
        await exportLedgerPdf(title, vendor.category, transactions, ledgerCurrency, 'vendor-ledger.pdf');
      } else {
        exportLedgerCsv(transactions, ledgerCurrency, 'vendor-ledger.csv');
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Vendor Management"
        subtitle="Manage hotel, visa, and ticketing suppliers with ledger accounts"
        action={(
          <div className="flex flex-wrap gap-2">
            {canTransfer && (
              <InternalTransferButton onClick={() => setShowInternalTransfer(true)} />
            )}
            <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>
          </div>
        )}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {payVendor && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold mb-4">Pay Vendor — {payVendor.name}</h3>
            <form onSubmit={handlePayVendor} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect label="From Account" value={payForm.accountId} onChange={(v) => setPayForm({ ...payForm, accountId: v })} onSearch={searchPaymentAccounts} options={[{ value: '', label: 'Select' }]} />
              <Input label="Amount" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
              <Select label="Currency" value={payForm.currency} onChange={(e) => setPayForm({ ...payForm, currency: e.target.value })} options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]} />
              <ExchangeRateInput value={payForm.exchangeRate} onChange={(v) => setPayForm({ ...payForm, exchangeRate: v })} />
              <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
              <div><label className="block text-sm font-medium mb-1">Proof</label><input type="file" accept="image/*,.pdf" onChange={(e) => setPayFile(e.target.files?.[0] || null)} /></div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Record Payment</Button>
                <Button type="button" variant="secondary" onClick={() => setPayVendor(null)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {vendorLedger && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <h3 className="font-bold">Vendor Ledger — {vendorLedger.vendor.name}</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => exportVendorLedgerFile('csv')}>
                  <Download className="w-4 h-4 mr-1" />Excel
                </Button>
                <Button variant="secondary" onClick={() => exportVendorLedgerFile('html')}>
                  <Download className="w-4 h-4 mr-1" />PDF
                </Button>
                {canTransfer && (
                  <InternalTransferButton onClick={() => setShowInternalTransfer(true)} />
                )}
                <Button variant="secondary" onClick={() => setVendorLedger(null)}>Close</Button>
              </div>
            </div>
            <div className="max-w-xs mb-4">
              <Select label="Currency" value={ledgerCurrency} onChange={(e) => { const c = e.target.value as 'PKR' | 'SAR'; setLedgerCurrency(c); viewVendorLedger(vendorLedger.vendor, c); }} options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]} />
            </div>
            <LedgerTransactionTable rows={vendorLedger.transactions} currency={ledgerCurrency} />
          </CardBody>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Vendor Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={[
                { value: 'HOTEL', label: 'Hotel' },
                { value: 'VISA', label: 'Visa' },
                { value: 'TICKETING', label: 'Ticketing' },
                { value: 'TRANSPORT', label: 'Transport' },
                { value: 'OTHER', label: 'Other' },
              ]} />
              <Input label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Create Vendor</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading vendors..." /> : (
        <>
          <Card className="mb-6">
            <CardBody className="p-0 sm:p-0">
              <div className="px-4 py-3 border-b border-slate-100"><h3 className="font-semibold">Vendor Payables</h3></div>
              {payables.length === 0 ? (
                <EmptyState message="No vendor payables yet." />
              ) : (
                <TableWrapper>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Vendor</TableHeaderCell>
                        <TableHeaderCell>Category</TableHeaderCell>
                        <TableHeaderCell>Allocated</TableHeaderCell>
                        <TableHeaderCell>Paid</TableHeaderCell>
                        <TableHeaderCell>Outstanding</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {payables.map((p) => (
                        <TableRow key={p.vendorName}>
                          <TableCell className="font-medium">{p.vendorName}</TableCell>
                          <TableCell>{p.category}</TableCell>
                          <TableCell>{formatCurrency(p.totalAllocated)}</TableCell>
                          <TableCell>{formatCurrency(p.totalPaid)}</TableCell>
                          <TableCell className="font-semibold text-amber-700">{formatCurrency(p.outstanding)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrapper>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0 sm:p-0">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold">All Vendors</h3>
                <p className="text-xs text-slate-500 mt-1">Outstanding = booking costs minus payments. Ledger balance is negative when you owe the vendor.</p>
              </div>
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Contact</TableHeaderCell>
                      <TableHeaderCell>Outstanding</TableHeaderCell>
                      <TableHeaderCell>Ledger Balance</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {vendors.map((v) => {
                      const payable = payablesByVendorId[v.id];
                      const outstanding = payable?.outstanding ?? 0;
                      const ledger = Number(v.account?.balance || 0);
                      const inSync = Math.abs(ledger + outstanding) < 0.01;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.category}</TableCell>
                          <TableCell>{v.contactPerson || v.phone || '—'}</TableCell>
                          <TableCell className="font-semibold text-amber-700">{formatCurrency(outstanding)}</TableCell>
                          <TableCell className={inSync ? '' : 'text-red-600'}>
                            <span title={inSync ? undefined : 'Ledger does not match outstanding — contact admin to reconcile'}>
                              {formatCurrency(ledger)}
                            </span>
                          </TableCell>
                          <TableCell align="right">
                            <div className="flex justify-end gap-1">
                              <Button variant="secondary" onClick={() => viewVendorLedger(v)} title="Ledger"><BookOpen className="w-4 h-4" /></Button>
                              <Button variant="secondary" onClick={() => setPayVendor(v)} title="Pay vendor"><Wallet className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableWrapper>
            </CardBody>
          </Card>
        </>
      )}

      <InternalTransferModal
        open={showInternalTransfer}
        onClose={() => setShowInternalTransfer(false)}
        onSuccess={loadData}
        prefill={vendorLedger ? {
          sourceType: 'VENDOR',
          sourceEntityId: vendorLedger.vendor.id,
          sourceLabel: vendorLedger.vendor.name,
        } : undefined}
      />
    </div>
  );
}
