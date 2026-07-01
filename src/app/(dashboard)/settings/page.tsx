'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import api from '@/lib/api';
import { ApiResponse } from '@/types';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { fetchAppSettings } from '@/store/slices/settingsSlice';
import { formatExchangeRateLabel, useExchangeRate } from '@/contexts/ExchangeRateContext';
import { isSuperAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner } from '@/components/ui/Common';

const SETTING_LABELS: Record<string, string> = {
  company_name: 'Company Name',
  company_email: 'Company Email',
  company_phone: 'Company Phone',
  company_address: 'Company Address',
  currency: 'Currency',
  currency_locale: 'Currency Locale (optional)',
  tax_rate: 'Tax Rate (%)',
  invoice_prefix: 'Invoice Prefix',
  default_pkr_sar_rate: 'Default PKR/SAR Rate (manual fallback)',
};

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { rate, loading: rateLoading, refresh } = useExchangeRate();
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDefaultRate, setSavingDefaultRate] = useState(false);

  const loadSettings = () => {
    setLoading(true);
    api.get<ApiResponse<Record<string, Record<string, string>>>>('/settings')
      .then((res) => setSettings(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSave = async (category: string) => {
    setSaving(true);
    try {
      const categorySettings = settings[category] || {};
      await api.put('/settings/bulk', {
        settings: Object.entries(categorySettings).map(([key, value]) => ({ key, value, category })),
      });
      await dispatch(fetchAppSettings());
      alert('Settings saved successfully');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: string, key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const handleSaveDefaultRate = async () => {
    if (!rate) return;
    setSavingDefaultRate(true);
    try {
      await api.put('/currency/default-rate', { rate: rate.pkrPerSar });
      await dispatch(fetchAppSettings());
      loadSettings();
      alert('Default PKR/SAR rate updated from live market rate');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingDefaultRate(false);
    }
  };

  const renderSettingInput = (category: string, key: string, value: string) => {
    const label = SETTING_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    if (key === 'currency') {
      return (
        <Select
          key={key}
          label={label}
          value={value || 'PKR'}
          onChange={(e) => updateSetting(category, key, e.target.value)}
          options={CURRENCY_OPTIONS}
        />
      );
    }

    return (
      <Input
        key={key}
        label={label}
        value={value}
        onChange={(e) => updateSetting(category, key, e.target.value)}
        hint={key === 'currency_locale' ? 'Leave blank to auto-detect from currency (e.g. en-PK for PKR)' : undefined}
      />
    );
  };

  if (loading) return <LoadingSpinner label="Loading settings..." />;

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Configure company info, currency, and financial preferences. Currency applies across the entire app."
      />

      <Card className="mb-6">
        <CardHeader>
          <h3 className="font-bold text-slate-900">PKR / SAR Exchange Rate</h3>
          <p className="text-xs text-slate-500 mt-1">Live market rate refreshes every 30 minutes. Use it when recording SAR payments, expenses, and transfers.</p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-teal-700">
                {rateLoading && !rate ? 'Loading…' : rate ? formatExchangeRateLabel(rate) : 'Rate unavailable'}
              </p>
              {rate && (
                <p className="text-sm text-slate-500 mt-1">
                  System default: <strong>{rate.manualDefault.toFixed(2)} PKR/SAR</strong>
                  {rate.provider ? ` · Source: ${rate.provider}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => refresh(true)} disabled={rateLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${rateLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isSuperAdmin(user) && rate && (
                <Button type="button" onClick={handleSaveDefaultRate} loading={savingDefaultRate}>
                  Set live rate as default
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4 sm:space-y-6">
        {Object.entries(settings).map(([category, categorySettings]) => (
          <Card key={category}>
            <CardHeader>
              <h3 className="font-bold text-slate-900 capitalize">{category.replace('_', ' ')} Settings</h3>
              {category === 'financial' && (
                <p className="text-xs text-slate-500 mt-1">Change currency here to update all amounts, reports, and invoices app-wide.</p>
              )}
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(categorySettings).map(([key, value]) => renderSettingInput(category, key, value))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button onClick={() => handleSave(category)} loading={saving}>Save {category.replace('_', ' ')} Settings</Button>
              </div>
            </CardBody>
          </Card>
        ))}
        {Object.keys(settings).length === 0 && (
          <Card><CardBody><p className="text-sm text-slate-500 text-center py-8">No settings configured.</p></CardBody></Card>
        )}
      </div>
    </div>
  );
}
