'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import api from '@/lib/api';
import { searchB2BCustomers, searchVendors, mergeSelectedOption } from '@/lib/searchableOptions';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

export type InternalEntityType = 'B2B' | 'VENDOR';

export type InternalTransferPrefill = {
  sourceType?: InternalEntityType;
  sourceEntityId?: string;
  sourceLabel?: string;
  targetType?: InternalEntityType;
  targetEntityId?: string;
  targetLabel?: string;
};

type InternalTransferModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefill?: InternalTransferPrefill;
};

const emptyForm = {
  sourceType: 'VENDOR' as InternalEntityType,
  sourceEntityId: '',
  sourceLabel: '',
  targetType: 'VENDOR' as InternalEntityType,
  targetEntityId: '',
  targetLabel: '',
  amount: '',
  currency: 'SAR' as 'PKR' | 'SAR',
  exchangeRate: '75',
  remarks: '',
  date: '',
};

export function InternalTransferModal({ open, onClose, onSuccess, prefill }: InternalTransferModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      sourceType: prefill?.sourceType || emptyForm.sourceType,
      sourceEntityId: prefill?.sourceEntityId || '',
      sourceLabel: prefill?.sourceLabel || '',
      targetType: prefill?.targetType || emptyForm.targetType,
      targetEntityId: prefill?.targetEntityId || '',
      targetLabel: prefill?.targetLabel || '',
    });
  }, [open, prefill]);

  if (!open) return null;

  const searchEntity = (type: InternalEntityType) =>
    type === 'B2B' ? searchB2BCustomers : searchVendors;

  const entityOptions = (type: InternalEntityType, entityId: string, label: string) =>
    mergeSelectedOption(
      [{ value: '', label: type === 'B2B' ? 'Select B2B client' : 'Select vendor' }],
      entityId,
      label || undefined
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sourceEntityId || !form.targetEntityId) {
      alert('Please select both source and target entities.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ message?: string; data?: { transferReference?: string } }>('/ledger/internal-transfers', {
        sourceType: form.sourceType,
        sourceEntityId: form.sourceEntityId,
        targetType: form.targetType,
        targetEntityId: form.targetEntityId,
        amount: parseFloat(form.amount),
        currency: form.currency,
        exchangeRate: parseFloat(form.exchangeRate) || undefined,
        remarks: form.remarks || undefined,
        date: form.date || undefined,
      });
      alert(res.message || `Internal transfer ${res.data?.transferReference || ''} completed.`);
      onClose();
      onSuccess?.();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <CardBody>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                Internal Transfer
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Move balance directly between B2B client and vendor ledgers. Cash and bank accounts are not affected.
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Source Type"
              value={form.sourceType}
              onChange={(e) => setForm({
                ...form,
                sourceType: e.target.value as InternalEntityType,
                sourceEntityId: '',
                sourceLabel: '',
              })}
              options={[
                { value: 'B2B', label: 'B2B Client' },
                { value: 'VENDOR', label: 'Vendor (Supplier)' },
              ]}
            />
            <SearchableSelect
              label="Source Entity"
              value={form.sourceEntityId}
              onChange={(v) => setForm({ ...form, sourceEntityId: v })}
              onSearch={searchEntity(form.sourceType)}
              options={entityOptions(form.sourceType, form.sourceEntityId, form.sourceLabel)}
            />
            <Select
              label="Target Type"
              value={form.targetType}
              onChange={(e) => setForm({
                ...form,
                targetType: e.target.value as InternalEntityType,
                targetEntityId: '',
                targetLabel: '',
              })}
              options={[
                { value: 'B2B', label: 'B2B Client' },
                { value: 'VENDOR', label: 'Vendor (Supplier)' },
              ]}
            />
            <SearchableSelect
              label="Target Entity"
              value={form.targetEntityId}
              onChange={(v) => setForm({ ...form, targetEntityId: v })}
              onSearch={searchEntity(form.targetType)}
              options={entityOptions(form.targetType, form.targetEntityId, form.targetLabel)}
            />
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as 'PKR' | 'SAR' })}
              options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]}
            />
            <Input
              label="Exchange Rate"
              type="number"
              step="0.0001"
              value={form.exchangeRate}
              onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
            />
            <Input
              label="Date (optional)"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Remarks / Narration"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={3}
                placeholder='e.g. "Balance adjustment via Adan Hotel for Grand Hotel"'
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving}>Submit Internal Transfer</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export function InternalTransferButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button variant="secondary" onClick={onClick} className={className}>
      <ArrowRightLeft className="w-4 h-4 mr-2" />
      Internal Transfer
    </Button>
  );
}
