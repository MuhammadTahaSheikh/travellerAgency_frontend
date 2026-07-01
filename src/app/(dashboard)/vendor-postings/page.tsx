'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Pencil, Plus } from 'lucide-react';
import { searchVendors } from '@/lib/searchableOptions';
import api from '@/lib/api';
import { Vendor, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, Badge, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface VendorPosting {
  id: string;
  serviceType: string;
  description: string;
  expectedCost: number;
  actualCost?: number;
  currency: string;
  postingType: string;
  status: string;
  dueDate?: string;
  vendor?: Vendor;
  invoice?: { invoiceNumber: string; customer?: { firstName: string; lastName: string; companyName?: string; customerType?: string } };
}

export default function VendorPostingsPage() {
  const [postings, setPostings] = useState<VendorPosting[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [editing, setEditing] = useState<VendorPosting | null>(null);
  const [editForm, setEditForm] = useState({ vendorId: '', expectedCost: '', dueDate: '', description: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    vendorId: '', serviceType: 'HOTEL', description: '', expectedCost: '', dueDate: '', postingType: 'PENDING', currency: 'PKR',
  });
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ totalPending: number } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<VendorPosting[]>>(`/vendor-postings${filter ? `?status=${filter}` : ''}`),
      api.get<ApiResponse<Vendor[]>>('/vendors?limit=200'),
      api.get<ApiResponse<{ totalPending: number }>>('/vendor-postings/pending-summary'),
    ])
      .then(([pRes, vRes, sRes]) => {
        setPostings(pRes.data || []);
        setVendors(vRes.data || []);
        setSummary(sRes.data || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filter]);

  const startEdit = (p: VendorPosting) => {
    setEditing(p);
    setEditForm({
      vendorId: p.vendor?.id || '',
      expectedCost: String(p.expectedCost),
      dueDate: p.dueDate ? p.dueDate.split('T')[0] : '',
      description: p.description,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/vendor-postings/${editing.id}`, {
        ...editForm,
        expectedCost: parseFloat(editForm.expectedCost),
      });
      setEditing(null);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (p: VendorPosting) => {
    const actual = prompt('Actual cost (leave blank to use expected):', String(p.expectedCost));
    if (actual === null) return;
    try {
      await api.post(`/vendor-postings/${p.id}/confirm`, {
        actualCost: actual ? parseFloat(actual) : undefined,
      });
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/vendor-postings', {
        ...createForm,
        expectedCost: parseFloat(createForm.expectedCost),
      });
      setShowCreate(false);
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
        title="Vendor Postings"
        subtitle="Manage instant and pending vendor costs — editable until confirmed"
        action={<Button onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />Add Posting</Button>}
      />

      {summary && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">Total pending vendor costs: <strong>{formatCurrency(summary.totalPending)}</strong></p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['PENDING', 'POSTED', 'CANCELLED', ''].map((s) => (
          <Button key={s || 'all'} variant={filter === s ? 'primary' : 'secondary'} onClick={() => setFilter(s)}>
            {s || 'All'}
          </Button>
        ))}
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect label="Vendor" value={createForm.vendorId} onChange={(v) => setCreateForm({ ...createForm, vendorId: v })} onSearch={searchVendors} options={[{ value: '', label: 'Select vendor' }]} />
              <Select label="Service" value={createForm.serviceType} onChange={(e) => setCreateForm({ ...createForm, serviceType: e.target.value })} options={[{ value: 'HOTEL', label: 'Hotel' }, { value: 'TICKET', label: 'Ticket' }, { value: 'VISA', label: 'Visa' }, { value: 'TRANSPORT', label: 'Transport' }]} />
              <Input label="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required />
              <Input label="Expected Cost" type="number" value={createForm.expectedCost} onChange={(e) => setCreateForm({ ...createForm, expectedCost: e.target.value })} required />
              <Select label="Currency" value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })} options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]} />
              <Input label="Due Date" type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} />
              <Select label="Type" value={createForm.postingType} onChange={(e) => setCreateForm({ ...createForm, postingType: e.target.value })} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'INSTANT', label: 'Instant' }]} />
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Save</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {editing && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold mb-4">Edit Pending Posting</h3>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect label="Vendor" value={editForm.vendorId} onChange={(v) => setEditForm({ ...editForm, vendorId: v })} onSearch={searchVendors} options={[{ value: '', label: 'Select vendor' }]} />
              <Input label="Expected Cost" type="number" value={editForm.expectedCost} onChange={(e) => setEditForm({ ...editForm, expectedCost: e.target.value })} />
              <Input label="Due Date" type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
              <Input label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="md:col-span-2" />
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Update</Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading vendor postings..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {postings.length === 0 ? (
              <EmptyState message="No vendor postings for this filter." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Service</TableHeaderCell>
                      <TableHeaderCell>Description</TableHeaderCell>
                      <TableHeaderCell>Customer / Invoice</TableHeaderCell>
                      <TableHeaderCell>Vendor</TableHeaderCell>
                      <TableHeaderCell>Cost</TableHeaderCell>
                      <TableHeaderCell>Due</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {postings.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.serviceType}</TableCell>
                        <TableCell>{p.description}</TableCell>
                        <TableCell className="text-sm">
                          {p.invoice?.customer?.customerType === 'B2B'
                            ? p.invoice.customer.companyName
                            : p.invoice ? `${p.invoice.customer?.firstName} ${p.invoice.customer?.lastName}` : '—'}
                          {p.invoice?.invoiceNumber && <span className="block text-xs text-slate-500">{p.invoice.invoiceNumber}</span>}
                        </TableCell>
                        <TableCell>{p.vendor?.name || '—'}</TableCell>
                        <TableCell>{formatCurrency(p.expectedCost)} {p.currency}</TableCell>
                        <TableCell>{p.dueDate ? formatDate(p.dueDate) : '—'}</TableCell>
                        <TableCell><Badge status={p.status}>{p.status}</Badge></TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            {p.status === 'PENDING' && (
                              <>
                                <Button variant="secondary" onClick={() => startEdit(p)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                                <Button variant="secondary" onClick={() => handleConfirm(p)} title="Post to ledger"><CheckCircle className="w-4 h-4 text-green-600" /></Button>
                              </>
                            )}
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
