'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Trash2, Download, ArrowRightLeft } from 'lucide-react';
import api from '@/lib/api';
import { exportLedgerCsv, exportLedgerPdf } from '@/lib/ledgerExport';
import { searchLedgerAccounts } from '@/lib/searchableOptions';
import { buildQueryString } from '@/lib/query';
import { uploadAttachment } from '@/lib/upload';
import { RootState } from '@/store';
import { isAdminOrAbove, isSuperAdmin } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Input';
import { Account, ApiResponse, LedgerAccountGroup, TrialBalanceRow } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, TabGroup, EmptyState } from '@/components/ui/Common';
import { formatAccountDisplay, formatVendorDisplay } from '@/lib/vendorDisplay';
import { LedgerTransactionTable, LedgerTransactionRow } from '@/components/ledger/LedgerTransactionTable';
import { InternalTransferButton, InternalTransferModal } from '@/components/ledger/InternalTransferModal';
import { ExchangeRateInput } from '@/components/currency/ExchangeRateInput';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  transactions: { id: string; debit: number; credit: number; account: Account }[];
}

interface LedgerTransaction {
  id: string;
  debit: number;
  credit: number;
  description?: string;
  account: Account;
  journalEntry: { entryNumber: string; date: string; description: string };
}

type AccountGroupKey = 'all' | 'company' | 'customers' | 'vendors' | 'employees' | 'unposted';

type JournalLineForm = {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
};

const emptyJournalLine = (): JournalLineForm => ({ accountId: '', debit: '', credit: '', description: '' });

const emptyJournalForm = {
  description: '',
  date: '',
  reference: '',
  notes: '',
};

function groupTotalBalance(group: LedgerAccountGroup, currency: 'PKR' | 'SAR') {
  return currency === 'SAR'
    ? Number(group.totalBalanceSar ?? 0)
    : Number(group.totalBalancePkr ?? group.totalBalance);
}

const groupFilters: { id: AccountGroupKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'company', label: 'Company' },
  { id: 'customers', label: 'Customers' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'unposted', label: 'Unposted Costs' },
  { id: 'employees', label: 'Employees' },
];

function AccountCard({
  acc, currency, onView, onEdit, onDeactivate, showManage,
}: {
  acc: Account;
  currency: 'PKR' | 'SAR';
  onView?: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
  showManage?: boolean;
}) {
  const displayName = acc.vendor ? formatVendorDisplay(acc.vendor) : acc.name;
  const subtitle =
    acc.customer ? (acc.customer as { companyName?: string; firstName?: string; lastName?: string; tradePartnerId?: string }).tradePartnerId
      ? `${(acc.customer as { tradePartnerId?: string }).tradePartnerId}`
      : `${acc.customer?.firstName} ${acc.customer?.lastName}` :
    acc.vendor ? acc.vendor.category :
    acc.employee ? `${acc.employee.firstName} ${acc.employee.lastName}` :
    acc.code;

  const bal = currency === 'SAR' ? Number((acc as Account & { balanceSar?: number }).balanceSar || 0) : Number((acc as Account & { balancePkr?: number }).balancePkr ?? acc.balance);

  return (
    <div className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onView?.()}>
      <Card className="h-full">
        <CardBody>
          <div className="flex items-start justify-between gap-2">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {acc.type}
            </span>
            {showManage && (
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">Edit</button>
                )}
                {onDeactivate && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDeactivate(); }} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-100">Close</button>
                )}
              </div>
            )}
          </div>
          <h3 className="font-bold text-slate-900 mt-2 truncate">{displayName}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
          <p className={`mt-3 text-xl sm:text-2xl font-bold tabular-nums break-words ${bal >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {formatCurrency(bal, currency)}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function accountBalance(acc: Account, currency: 'PKR' | 'SAR') {
  return currency === 'SAR'
    ? Number(acc.balanceSar || 0)
    : Number(acc.balancePkr ?? acc.balance);
}

function CompanyAgencySummary({
  grouped,
  currency,
}: {
  grouped: Record<string, LedgerAccountGroup>;
  currency: 'PKR' | 'SAR';
}) {
  const companyAccounts = grouped.company?.accounts ?? [];
  const customerAccounts = grouped.customers?.accounts ?? [];
  const vendorAccounts = grouped.vendors?.accounts ?? [];
  const unpostedAccounts = grouped.unposted?.accounts ?? [];

  const totalAvailable = companyAccounts
    .filter((a) => (a.type === 'CASH' || a.type === 'BANK') && !a.customerId && !a.vendorId && !a.employeeId)
    .reduce((s, a) => s + accountBalance(a, currency), 0);

  const amountToReceive = customerAccounts.reduce(
    (s, a) => s + Math.max(0, accountBalance(a, currency)),
    0,
  );

  const vendorPayable = vendorAccounts.reduce((s, a) => {
    const b = accountBalance(a, currency);
    return b < 0 ? s + Math.abs(b) : s;
  }, 0);
  const unpostedPayable = unpostedAccounts.reduce(
    (s, a) => s + Math.abs(accountBalance(a, currency)),
    0,
  );
  const amountToPay = vendorPayable + unpostedPayable;
  const grossProfit = totalAvailable + amountToReceive - amountToPay;

  const metricClass = (value: number) =>
    value >= 0 ? 'text-teal-700' : 'text-red-600';

  return (
    <div className="mb-6 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 sm:p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-lg bg-white border border-slate-200 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Available Amount</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cash + Bank accounts</p>
          <p className={`mt-2 text-lg sm:text-xl font-bold tabular-nums ${metricClass(totalAvailable)}`}>
            {formatCurrency(totalAvailable, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount To Be Received</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Customer receivables</p>
          <p className={`mt-2 text-lg sm:text-xl font-bold tabular-nums ${metricClass(amountToReceive)}`}>
            {formatCurrency(amountToReceive, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount To Be Paid</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Vendors + unposted costs</p>
          <p className={`mt-2 text-lg sm:text-xl font-bold tabular-nums ${metricClass(amountToPay)}`}>
            {formatCurrency(amountToPay, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-white border border-teal-200 p-3 sm:p-4 bg-teal-50/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Gross Profit</p>
          <p className="text-[11px] text-teal-600 mt-0.5">Available + Receivable − Payable</p>
          <p className={`mt-2 text-lg sm:text-xl font-bold tabular-nums ${metricClass(grossProfit)}`}>
            {formatCurrency(grossProfit, currency)}
          </p>
        </div>
      </div>

      {companyAccounts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Company Account Balances</h4>
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Account</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">Code</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">Type</TableHeaderCell>
                  <TableHeaderCell align="right">Balance</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {companyAccounts.map((acc) => {
                  const bal = accountBalance(acc, currency);
                  return (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-slate-500">{acc.code}</TableCell>
                      <TableCell className="hidden md:table-cell text-slate-500">{acc.type}</TableCell>
                      <TableCell align="right" className={`font-semibold tabular-nums ${bal >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                        {formatCurrency(bal, currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}
    </div>
  );
}

function GroupSection({
  title,
  accounts,
  totalBalance,
  currency,
  onViewAccount,
  canManageCompany,
  onEditAccount,
  onDeactivateAccount,
  summary,
}: {
  title: string;
  accounts: Account[];
  totalBalance?: number;
  currency: 'PKR' | 'SAR';
  onViewAccount: (acc: Account) => void;
  canManageCompany?: boolean;
  onEditAccount?: (acc: Account) => void;
  onDeactivateAccount?: (acc: Account) => void;
  summary?: React.ReactNode;
}) {
  if (accounts.length === 0 && !summary) return null;
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-2 border-b border-slate-200">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {totalBalance !== undefined && (
          <p className="text-sm text-slate-600">
            Group total:{' '}
            <span className={`font-bold ${totalBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance, currency)}
            </span>
          </p>
        )}
      </div>
      {summary}
      {accounts.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isCompanyCashBank = (acc.type === 'CASH' || acc.type === 'BANK') && !acc.customerId && !acc.vendorId;
          return (
            <AccountCard
              key={acc.id}
              acc={acc}
              currency={currency}
              onView={() => onViewAccount(acc)}
              showManage={canManageCompany && isCompanyCashBank}
              onEdit={onEditAccount ? () => onEditAccount(acc) : undefined}
              onDeactivate={onDeactivateAccount ? () => onDeactivateAccount(acc) : undefined}
            />
          );
        })}
      </div>
      )}
    </div>
  );
}

function TrialBalanceTable({ rows, currency }: { rows: TrialBalanceRow[]; currency: 'PKR' | 'SAR' }) {
  if (rows.length === 0) return null;
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Account</TableHeaderCell>
            <TableHeaderCell className="hidden sm:table-cell">Code</TableHeaderCell>
            <TableHeaderCell align="right">Debit</TableHeaderCell>
            <TableHeaderCell align="right" className="hidden sm:table-cell">Credit</TableHeaderCell>
            <TableHeaderCell align="right">Balance</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((acc) => (
            <TableRow key={acc.accountId}>
              <TableCell>{acc.accountName}</TableCell>
              <TableCell className="hidden sm:table-cell text-slate-500">{acc.accountCode}</TableCell>
              <TableCell align="right">{formatCurrency(acc.debit, currency)}</TableCell>
              <TableCell align="right" className="hidden sm:table-cell">{formatCurrency(acc.credit, currency)}</TableCell>
              <TableCell align="right" className="font-semibold">{formatCurrency(acc.balance, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

export default function LedgerPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const canManageJournal = isAdminOrAbove(user);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grouped, setGrouped] = useState<Record<string, LedgerAccountGroup> | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransactionRow[]>([]);
  const [trialBalance, setTrialBalance] = useState<{
    accounts: TrialBalanceRow[];
    grouped?: Record<string, { label: string; accounts: TrialBalanceRow[] }>;
    totalDebit: number;
    totalCredit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'ledger' | 'trial'>('accounts');
  const [accountGroup, setAccountGroup] = useState<AccountGroupKey>('all');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [currency, setCurrency] = useState<'PKR' | 'SAR'>('PKR');
  const [accountDetail, setAccountDetail] = useState<{ account: Account; transactions: LedgerTransactionRow[] } | null>(null);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalForm, setJournalForm] = useState(emptyJournalForm);
  const [journalLines, setJournalLines] = useState<JournalLineForm[]>([emptyJournalLine(), emptyJournalLine()]);
  const [journalAttachment, setJournalAttachment] = useState<File | null>(null);
  const [journalSaving, setJournalSaving] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showInternalTransfer, setShowInternalTransfer] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '', toAccountId: '', amount: '', currency: 'PKR' as 'PKR' | 'SAR',
    exchangeRate: '75', description: '', date: '', reference: '',
  });
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'BANK' as 'CASH' | 'BANK', description: '', employeeId: '' });
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountForm, setEditAccountForm] = useState({ name: '', description: '', employeeId: '' });
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

  const loadData = (dates = appliedDates, accountId = selectedAccountId, cur = currency) => {
    setLoading(true);
    const query = buildQueryString({
      startDate: dates.startDate,
      endDate: dates.endDate,
      accountId: accountId || undefined,
      currency: cur,
    });
    Promise.all([
      api.get<ApiResponse<Account[]> & { grouped: Record<string, LedgerAccountGroup> }>('/ledger/accounts'),
      api.get<ApiResponse<JournalEntry[]>>(`/ledger/journal-entries${query}`),
      api.get<ApiResponse<LedgerTransactionRow[]> & { currency: string }>(`/ledger/general-ledger${query}`),
      api.get<ApiResponse<typeof trialBalance>>(`/ledger/trial-balance?currency=${cur}`),
      isSuperAdmin(user) ? api.get<ApiResponse<{ id: string; firstName: string; lastName: string }[]>>('/users?limit=100') : Promise.resolve({ data: [] }),
    ])
      .then(([accRes, jeRes, glRes, tbRes, usersRes]) => {
        setAccounts(accRes.data || []);
        setGrouped(accRes.grouped || null);
        setJournalEntries(jeRes.data || []);
        setLedgerTransactions(glRes.data || []);
        setTrialBalance(tbRes.data || null);
        if (usersRes?.data) setUsers(usersRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const viewAccountLedger = async (acc: Account, viewCurrency: 'PKR' | 'SAR' = currency) => {
    try {
      const res = await api.get<ApiResponse<{ account: Account; transactions: LedgerTransactionRow[]; currency: string }>>(
        `/ledger/accounts/${acc.id}/transactions?currency=${viewCurrency}`
      );
      setAccountDetail({ account: res.data!.account, transactions: res.data!.transactions || [] });
      setActiveTab('ledger');
      setSelectedAccountId(acc.id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleExportLedger = async (format: 'csv' | 'html') => {
    const rows = selectedAccountId
      ? (accountDetail?.account.id === selectedAccountId ? accountDetail.transactions : ledgerTransactions)
      : ledgerTransactions;
    const includeAccount = !selectedAccountId;
    const title = selectedAccountId && accountDetail?.account.id === selectedAccountId
      ? `Ledger — ${formatAccountDisplay(accountDetail.account)}`
      : 'General Ledger';
    const subtitle = selectedAccountId && accountDetail?.account.id === selectedAccountId
      ? accountDetail.account.code
      : `${currency} view`;
    const csvName = selectedAccountId ? 'account-ledger.csv' : 'general-ledger.csv';
    const pdfName = selectedAccountId ? 'account-ledger.pdf' : 'general-ledger.pdf';

    try {
      if (format === 'html') {
        await exportLedgerPdf(title, subtitle, rows, currency, pdfName, includeAccount);
      } else {
        exportLedgerCsv(rows, currency, csvName, includeAccount);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSaving(true);
    try {
      await api.post('/ledger/transfers', {
        ...transferForm,
        amount: parseFloat(transferForm.amount),
        exchangeRate: parseFloat(transferForm.exchangeRate) || undefined,
        date: transferForm.date || undefined,
      });
      setShowTransferForm(false);
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '', currency: 'PKR', exchangeRate: '75', description: '', date: '', reference: '' });
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setTransferSaving(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSaving(true);
    try {
      await api.post('/payments/accounts', {
        ...accountForm,
        employeeId: accountForm.employeeId || undefined,
      });
      setShowAccountForm(false);
      setAccountForm({ name: '', type: 'BANK', description: '', employeeId: '' });
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAccountSaving(false);
    }
  };

  const handleDeactivateAccount = async (acc: Account) => {
    if (!confirm(`Deactivate account "${acc.name}"? It must have zero balance.`)) return;
    try {
      await api.delete(`/payments/accounts/${acc.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const startEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setEditAccountForm({
      name: acc.name,
      description: (acc as Account & { description?: string }).description || '',
      employeeId: (acc as Account & { employeeId?: string }).employeeId || '',
    });
    setShowAccountForm(false);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setAccountSaving(true);
    try {
      await api.put(`/payments/accounts/${editingAccount.id}`, {
        ...editAccountForm,
        employeeId: editAccountForm.employeeId || null,
      });
      setEditingAccount(null);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAccountSaving(false);
    }
  };

  const isCompanyCashBank = (acc: Account) =>
    (acc.type === 'CASH' || acc.type === 'BANK') && !acc.customerId && !acc.vendorId;

  const filteredAccounts = useMemo(() => {
    if (accountGroup === 'all' || !grouped) return accounts;
    return grouped[accountGroup]?.accounts || [];
  }, [accountGroup, accounts, grouped]);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadData(dates, selectedAccountId);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadData({ startDate: '', endDate: '' }, selectedAccountId);
  };

  const handleAccountFilterChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    loadData(appliedDates, accountId);
  };

  const journalDebitTotal = journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const journalCreditTotal = journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  const resetJournalForm = () => {
    setJournalForm(emptyJournalForm);
    setJournalLines([emptyJournalLine(), emptyJournalLine()]);
    setJournalAttachment(null);
    setShowJournalForm(false);
  };

  const updateJournalLine = (idx: number, updates: Partial<JournalLineForm>) => {
    setJournalLines(journalLines.map((line, i) => (i === idx ? { ...line, ...updates } : line)));
  };

  const removeJournalLine = (idx: number) => {
    setJournalLines(journalLines.length > 2 ? journalLines.filter((_, i) => i !== idx) : journalLines);
  };

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(journalDebitTotal - journalCreditTotal) > 0.01) {
      alert('Journal entry must balance: total debits must equal total credits.');
      return;
    }
    setJournalSaving(true);
    try {
      let receiptPath: string | undefined;
      if (journalAttachment) receiptPath = await uploadAttachment(journalAttachment);
      const lines = journalLines
        .filter((l) => l.accountId && (parseFloat(l.debit) || parseFloat(l.credit)))
        .map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || journalForm.description,
        }));
      await api.post('/ledger/journal-entries', {
        ...journalForm,
        receiptPath,
        lines,
      });
      resetJournalForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setJournalSaving(false);
    }
  };

  const tabs = [
    { id: 'accounts' as const, label: 'Accounts' },
    { id: 'journal' as const, label: 'Journal Entries' },
    { id: 'ledger' as const, label: 'General Ledger' },
    { id: 'trial' as const, label: 'Trial Balance' },
  ];

  return (
    <div>
      <PageHeader
        title="Internal Ledger System"
        subtitle="Dual-currency ledgers (PKR / SAR) for company, customers, vendors, and employees"
        action={canManageJournal ? (
          <InternalTransferButton onClick={() => setShowInternalTransfer(true)} />
        ) : undefined}
      />

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <Select
          label="Currency view"
          value={currency}
          onChange={(e) => {
            const cur = e.target.value as 'PKR' | 'SAR';
            setCurrency(cur);
            loadData(appliedDates, selectedAccountId, cur);
            if (accountDetail?.account) {
              viewAccountLedger(accountDetail.account, cur);
            }
          }}
          options={[{ value: 'PKR', label: 'PKR (Pakistani Rupee)' }, { value: 'SAR', label: 'SAR (Saudi Riyal)' }]}
        />
      </div>

      {(activeTab === 'journal' || activeTab === 'ledger') && (
        <div className="space-y-4 mb-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApply={handleApplyFilter}
            onClear={handleClearFilter}
            summary={{
              count: activeTab === 'journal' ? journalEntries.length : ledgerTransactions.length,
              label: activeTab === 'journal' ? 'Entries' : 'Transactions',
            }}
          />
          {activeTab === 'ledger' && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-md">
                <SearchableSelect
                  label="Filter by account"
                  value={selectedAccountId}
                  onChange={handleAccountFilterChange}
                  onSearch={searchLedgerAccounts}
                  options={[{ value: '', label: 'All accounts' }]}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleExportLedger('csv')}><Download className="w-4 h-4 mr-2" />Excel</Button>
                <Button variant="secondary" onClick={() => handleExportLedger('html')}><Download className="w-4 h-4 mr-2" />PDF</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <TabGroup tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as typeof activeTab)} />

      {activeTab === 'accounts' && isSuperAdmin(user) && (
        <div className="mb-4 mt-4 flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={() => setShowAccountForm(!showAccountForm)}>
            <Plus className="w-4 h-4 mr-2" />Manage Cash / Bank Account
          </Button>
        </div>
      )}

      {editingAccount && isSuperAdmin(user) && (
        <Card className="mb-6 mt-4">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">Edit Account — {editingAccount.name}</h3>
            <form onSubmit={handleUpdateAccount} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Account Name" value={editAccountForm.name} onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })} required />
              <SearchableSelect label="Assigned To (cash head)" value={editAccountForm.employeeId} onChange={(v) => setEditAccountForm({ ...editAccountForm, employeeId: v })} options={[{ value: '', label: 'None (shared)' }, ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} searchThreshold={99} />
              <Input label="Description" value={editAccountForm.description} onChange={(e) => setEditAccountForm({ ...editAccountForm, description: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-4 flex gap-2">
                <Button type="submit" loading={accountSaving}>Save Changes</Button>
                <Button type="button" variant="secondary" onClick={() => setEditingAccount(null)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {showAccountForm && isSuperAdmin(user) && (
        <Card className="mb-6 mt-4">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">Add Company Account</h3>
            <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Account Name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required placeholder="e.g. Meezan Bank" />
              <Select label="Type" value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as 'CASH' | 'BANK' })} options={[{ value: 'BANK', label: 'Bank Account' }, { value: 'CASH', label: 'Cash Head' }]} />
              <SearchableSelect label="Assigned To (cash head)" value={accountForm.employeeId} onChange={(v) => setAccountForm({ ...accountForm, employeeId: v })} options={[{ value: '', label: 'None (shared)' }, ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]} searchThreshold={99} />
              <Input label="Description" value={accountForm.description} onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })} />
              <div className="md:col-span-2 lg:col-span-4 flex gap-2">
                <Button type="submit" loading={accountSaving}>Create Account</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAccountForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTab === 'accounts' && (
        <div className="flex flex-wrap gap-2 mb-4 mt-4">
          {groupFilters.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setAccountGroup(g.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                accountGroup === g.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          {activeTab === 'accounts' && (
            accounts.length === 0 ? (
              <EmptyState message="No ledger accounts configured yet." />
            ) : accountGroup === 'all' && grouped ? (
              <div>
                <GroupSection
                  title={grouped.company.label}
                  accounts={grouped.company.accounts}
                  totalBalance={groupTotalBalance(grouped.company, currency)}
                  currency={currency}
                  onViewAccount={viewAccountLedger}
                  canManageCompany={isSuperAdmin(user)}
                  onEditAccount={startEditAccount}
                  onDeactivateAccount={handleDeactivateAccount}
                  summary={<CompanyAgencySummary grouped={grouped} currency={currency} />}
                />
                <GroupSection
                  title={grouped.customers.label}
                  accounts={grouped.customers.accounts}
                  totalBalance={groupTotalBalance(grouped.customers, currency)}
                  currency={currency}
                  onViewAccount={viewAccountLedger}
                />
                <GroupSection
                  title={grouped.vendors.label}
                  accounts={grouped.vendors.accounts}
                  totalBalance={groupTotalBalance(grouped.vendors, currency)}
                  currency={currency}
                  onViewAccount={viewAccountLedger}
                />
                {grouped.unposted && (
                  <GroupSection
                    title={grouped.unposted.label}
                    accounts={grouped.unposted.accounts}
                    totalBalance={groupTotalBalance(grouped.unposted, currency)}
                    currency={currency}
                    onViewAccount={viewAccountLedger}
                  />
                )}
                <GroupSection
                  title={grouped.employees.label}
                  accounts={grouped.employees.accounts}
                  totalBalance={groupTotalBalance(grouped.employees, currency)}
                  currency={currency}
                  onViewAccount={viewAccountLedger}
                />
              </div>
            ) : (
              <div>
                {accountGroup === 'company' && grouped && (
                  <CompanyAgencySummary grouped={grouped} currency={currency} />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    acc={acc}
                    currency={currency}
                    onView={() => viewAccountLedger(acc)}
                    showManage={isSuperAdmin(user) && isCompanyCashBank(acc)}
                    onEdit={() => startEditAccount(acc)}
                    onDeactivate={() => handleDeactivateAccount(acc)}
                  />
                ))}
                </div>
              </div>
            )
          )}

          {activeTab === 'journal' && (
            <>
              {canManageJournal && (
                <div className="mb-4 flex flex-wrap gap-2 justify-end">
                  <InternalTransferButton onClick={() => setShowInternalTransfer(true)} />
                  <Button variant="secondary" onClick={() => setShowTransferForm(!showTransferForm)}>
                    <ArrowRightLeft className="w-4 h-4 mr-2" />Ledger Transfer
                  </Button>
                  <Button onClick={() => { resetJournalForm(); setShowJournalForm(true); }}>
                    <Plus className="w-4 h-4 mr-2" />New Journal Entry
                  </Button>
                </div>
              )}
              {showTransferForm && canManageJournal && (
                <Card className="mb-6">
                  <CardBody>
                    <h3 className="font-bold text-slate-900 mb-4">Transfer Between Ledgers</h3>
                    <form onSubmit={handleTransferSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <SearchableSelect label="From Account" value={transferForm.fromAccountId} onChange={(v) => setTransferForm({ ...transferForm, fromAccountId: v })} onSearch={searchLedgerAccounts} options={[{ value: '', label: 'Select source' }]} />
                      <SearchableSelect label="To Account" value={transferForm.toAccountId} onChange={(v) => setTransferForm({ ...transferForm, toAccountId: v })} onSearch={searchLedgerAccounts} options={[{ value: '', label: 'Select destination' }]} />
                      <Select label="Currency" value={transferForm.currency} onChange={(e) => setTransferForm({ ...transferForm, currency: e.target.value as 'PKR' | 'SAR' })} options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]} />
                      <Input label="Amount" type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                      <ExchangeRateInput value={transferForm.exchangeRate} onChange={(v) => setTransferForm({ ...transferForm, exchangeRate: v })} />
                      <Input label="Date" type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} />
                      <Input label="Reference" value={transferForm.reference} onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })} />
                      <div className="md:col-span-2">
                        <Textarea label="Description" value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} rows={2} />
                      </div>
                      <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                        <Button type="submit" loading={transferSaving}>Transfer Balance</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowTransferForm(false)}>Cancel</Button>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              )}
              {showJournalForm && (
                <Card className="mb-6">
                  <CardBody>
                    <h3 className="font-bold text-slate-900 mb-4">Manual Journal Entry</h3>
                    <form onSubmit={handleJournalSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input label="Description" value={journalForm.description} onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })} required />
                        <Input label="Date" type="date" value={journalForm.date} onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })} />
                        <Input label="Reference" value={journalForm.reference} onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })} />
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Attachment (optional)</label>
                          <input type="file" accept="image/*,.pdf" onChange={(e) => setJournalAttachment(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700" />
                        </div>
                      </div>
                      <Textarea label="Notes" value={journalForm.notes} onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })} rows={2} />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-slate-800">Lines</h4>
                          <Button type="button" variant="secondary" onClick={() => setJournalLines([...journalLines, emptyJournalLine()])}>Add Line</Button>
                        </div>
                        {journalLines.map((line, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-xl relative">
                            <button type="button" onClick={() => removeJournalLine(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700" title="Remove line">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <SearchableSelect label="Account" value={line.accountId} onChange={(v) => updateJournalLine(idx, { accountId: v })} onSearch={searchLedgerAccounts} options={[{ value: '', label: 'Select account' }]} />
                            <Input label="Debit" type="number" value={line.debit} onChange={(e) => updateJournalLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })} />
                            <Input label="Credit" type="number" value={line.credit} onChange={(e) => updateJournalLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })} />
                            <Input label="Line note" value={line.description} onChange={(e) => updateJournalLine(idx, { description: e.target.value })} className="md:col-span-2" />
                          </div>
                        ))}
                        <p className={`text-sm ${Math.abs(journalDebitTotal - journalCreditTotal) < 0.01 ? 'text-teal-700' : 'text-red-600'}`}>
                          Debits: {formatCurrency(journalDebitTotal, 'PKR')} · Credits: {formatCurrency(journalCreditTotal, 'PKR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" loading={journalSaving}>Post Entry</Button>
                        <Button type="button" variant="secondary" onClick={resetJournalForm}>Cancel</Button>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              )}
            <Card>
              <CardBody className="p-0 sm:p-0">
                {journalEntries.length === 0 ? (
                  <EmptyState message="No journal entries for the selected period." />
                ) : (
                <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Entry #</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Description</TableHeaderCell>
                      <TableHeaderCell>Transactions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {journalEntries.map((je) => (
                      <TableRow key={je.id}>
                        <TableCell className="font-semibold text-slate-900">{je.entryNumber}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(je.date)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{je.description}</TableCell>
                        <TableCell>
                          {je.transactions?.map((t) => (
                            <div key={t.id} className="text-xs text-slate-500 mb-0.5 last:mb-0">
                              {t.account.name}: Dr {formatCurrency(t.debit, 'PKR')} / Cr {formatCurrency(t.credit, 'PKR')}
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </TableWrapper>
                )}
              </CardBody>
            </Card>
            </>
          )}

          {activeTab === 'ledger' && (
            <Card>
              <CardBody className="p-0 sm:p-0">
                {accountDetail && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold">{formatAccountDisplay(accountDetail.account)}</h3>
                    <p className="text-sm text-slate-500">Account ledger — {currency} view</p>
                  </div>
                )}
                {(accountDetail?.transactions.length || ledgerTransactions.length) === 0 ? (
                  <EmptyState message="No ledger transactions for the selected period." />
                ) : (
                  <LedgerTransactionTable
                    rows={(accountDetail?.transactions || ledgerTransactions) as LedgerTransactionRow[]}
                    currency={currency}
                  />
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === 'trial' && trialBalance && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h3 className="font-bold text-slate-900">Trial Balance</h3>
                  <div className="text-xs sm:text-sm text-slate-500">
                    Debit: <span className="font-semibold text-slate-700">{formatCurrency(trialBalance.totalDebit, currency)}</span>
                    {' · '}
                    Credit: <span className="font-semibold text-slate-700">{formatCurrency(trialBalance.totalCredit, currency)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-8">
                {trialBalance.grouped ? (
                  (['company', 'customers', 'vendors', 'unposted', 'employees'] as const).map((key) => {
                    const group = trialBalance.grouped![key];
                    if (!group?.accounts.length) return null;
                    return (
                      <div key={key}>
                        <h4 className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                          {group.label}
                        </h4>
                        <TrialBalanceTable rows={group.accounts} currency={currency} />
                      </div>
                    );
                  })
                ) : (
                  <TrialBalanceTable rows={trialBalance.accounts} currency={currency} />
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      <InternalTransferModal
        open={showInternalTransfer}
        onClose={() => setShowInternalTransfer(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
