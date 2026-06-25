'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { Vendor, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payables, setPayables] = useState<VendorPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      api.get<ApiResponse<Vendor[]>>('/vendors'),
      api.get<ApiResponse<typeof payables>>('/vendors/payables'),
    ])
      .then(([vendorsRes, payablesRes]) => {
        if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value.data || []);
        else setLoadError(vendorsRes.reason?.message || 'Failed to load vendors');
        if (payablesRes.status === 'fulfilled') setPayables(payablesRes.value.data || []);
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

  return (
    <div>
      <PageHeader
        title="Vendor Management"
        subtitle="Manage hotel, visa, and ticketing suppliers with ledger accounts"
        action={<Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>}
      />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
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
                          <TableCell className={inSync ? '' : 'text-red-600'} title={inSync ? undefined : 'Ledger does not match outstanding — contact admin to reconcile'}>
                            {formatCurrency(ledger)}
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
    </div>
  );
}
