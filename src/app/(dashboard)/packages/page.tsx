'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { RootState } from '@/store';
import { Package, ApiResponse } from '@/types';
import { canCreateResource, canEditResource, canDeleteResource } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatCurrency, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';

const emptyForm = { name: '', description: '', price: '', duration: '', destination: '', country: '' };

export default function PackagesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const currency = useSelector((state: RootState) => state.settings.currency);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadPackages = () => {
    setLoading(true);
    api.get<ApiResponse<Package[]>>('/packages')
      .then((res) => setPackages(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPackages(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (pkg: Package) => {
    const dest = pkg.destinations?.[0];
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      price: String(pkg.price),
      duration: String(pkg.duration),
      destination: dest?.destination || '',
      country: dest?.country || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      duration: parseInt(form.duration),
      destinations: form.destination ? [{ destination: form.destination, country: form.country, nights: parseInt(form.duration) || 1 }] : [],
    };
    try {
      if (editingId) {
        await api.put(`/packages/${editingId}`, payload);
      } else {
        await api.post('/packages', payload);
      }
      resetForm();
      loadPackages();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (!await confirmDelete(pkg.name)) return;
    try {
      await api.delete(`/packages/${pkg.id}`);
      loadPackages();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Travel Packages"
        subtitle="Manage travel packages and destinations"
        action={canCreateResource(user, 'packages') ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />Add Package</Button>
        ) : undefined}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Package' : 'New Package'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Package Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label={`Price (${currency})`} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <Input label="Duration (days)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
              <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <div className="md:col-span-2">
                <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Update Package' : 'Save Package'}</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="group hover:shadow-lg hover:border-teal-200/60 transition-all duration-200">
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-teal-700 transition-colors">{pkg.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold">{pkg.duration}d</span>
                    <RowActions
                      onEdit={() => startEdit(pkg)}
                      onDelete={() => handleDelete(pkg)}
                      canEdit={canEditResource(user, 'packages')}
                      canDelete={canDeleteResource(user, 'packages')}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{pkg.description || 'Travel package'}</p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-2xl font-bold text-teal-600">{formatCurrency(pkg.price)}</span>
                  <span className="text-xs text-slate-400">per person</span>
                </div>
                {pkg.destinations && pkg.destinations.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {pkg.destinations.map((d) => (
                      <span key={d.id} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
                        {d.destination}{d.country ? `, ${d.country}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
          {packages.length === 0 && (
            <div className="col-span-full"><EmptyState message="No travel packages found." /></div>
          )}
        </div>
      )}
    </div>
  );
}
