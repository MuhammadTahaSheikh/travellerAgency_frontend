'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { Account, ApiResponse, LedgerAccountGroup, TrialBalanceRow } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, TabGroup, EmptyState } from '@/components/ui/Common';
import { Select } from '@/components/ui/Input';
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

type AccountGroupKey = 'all' | 'company' | 'customers' | 'vendors' | 'employees';

const groupFilters: { id: AccountGroupKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'company', label: 'Company' },
  { id: 'customers', label: 'Customers' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'employees', label: 'Employees' },
];

function AccountCard({ acc }: { acc: Account }) {
  const subtitle =
    acc.customer ? `${acc.customer.firstName} ${acc.customer.lastName}` :
    acc.vendor ? acc.vendor.category :
    acc.employee ? `${acc.employee.firstName} ${acc.employee.lastName}` :
    acc.code;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {acc.type}
            </span>
            <h3 className="font-bold text-slate-900 mt-2 truncate">{acc.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
          </div>
          <p className={`text-lg sm:text-xl font-bold shrink-0 ${Number(acc.balance) >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {formatCurrency(acc.balance)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function GroupSection({
  title,
  accounts,
  totalBalance,
}: {
  title: string;
  accounts: Account[];
  totalBalance?: number;
}) {
  if (accounts.length === 0) return null;
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-2 border-b border-slate-200">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {totalBalance !== undefined && (
          <p className="text-sm text-slate-600">
            Group total:{' '}
            <span className={`font-bold ${totalBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <AccountCard key={acc.id} acc={acc} />
        ))}
      </div>
    </div>
  );
}

function TrialBalanceTable({ rows }: { rows: TrialBalanceRow[] }) {
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
              <TableCell align="right">{formatCurrency(acc.debit)}</TableCell>
              <TableCell align="right" className="hidden sm:table-cell">{formatCurrency(acc.credit)}</TableCell>
              <TableCell align="right" className="font-semibold">{formatCurrency(acc.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grouped, setGrouped] = useState<Record<string, LedgerAccountGroup> | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
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

  const loadData = (dates = appliedDates, accountId = selectedAccountId) => {
    setLoading(true);
    const query = buildQueryString({
      startDate: dates.startDate,
      endDate: dates.endDate,
      accountId: accountId || undefined,
    });
    Promise.all([
      api.get<ApiResponse<Account[]> & { grouped: Record<string, LedgerAccountGroup> }>('/ledger/accounts'),
      api.get<ApiResponse<JournalEntry[]>>(`/ledger/journal-entries${query}`),
      api.get<ApiResponse<LedgerTransaction[]>>(`/ledger/general-ledger${query}`),
      api.get<ApiResponse<typeof trialBalance>>('/ledger/trial-balance'),
    ])
      .then(([accRes, jeRes, glRes, tbRes]) => {
        setAccounts(accRes.data || []);
        setGrouped(accRes.grouped || null);
        setJournalEntries(jeRes.data || []);
        setLedgerTransactions(glRes.data || []);
        setTrialBalance(tbRes.data || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const accountFilterOptions = useMemo(() => {
    if (!grouped) return [{ value: '', label: 'All accounts' }];
    const options = [{ value: '', label: 'All accounts' }];
    (['company', 'customers', 'vendors', 'employees'] as const).forEach((key) => {
      const group = grouped[key];
      if (!group?.accounts.length) return;
      group.accounts.forEach((acc) => {
        options.push({ value: acc.id, label: `${group.label}: ${acc.name}` });
      });
    });
    return options;
  }, [grouped]);

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
        subtitle="View balances by company, customer, vendor, or employee"
      />

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
            <div className="max-w-md">
              <Select
                label="Filter by account"
                value={selectedAccountId}
                onChange={(e) => handleAccountFilterChange(e.target.value)}
                options={accountFilterOptions}
              />
            </div>
          )}
        </div>
      )}

      <TabGroup tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as typeof activeTab)} />

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
                  totalBalance={grouped.company.totalBalance}
                />
                <GroupSection
                  title={grouped.customers.label}
                  accounts={grouped.customers.accounts}
                  totalBalance={grouped.customers.totalBalance}
                />
                <GroupSection
                  title={grouped.vendors.label}
                  accounts={grouped.vendors.accounts}
                  totalBalance={grouped.vendors.totalBalance}
                />
                <GroupSection
                  title={grouped.employees.label}
                  accounts={grouped.employees.accounts}
                  totalBalance={grouped.employees.totalBalance}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAccounts.map((acc) => (
                  <AccountCard key={acc.id} acc={acc} />
                ))}
              </div>
            )
          )}

          {activeTab === 'journal' && (
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
                              {t.account.name}: Dr {formatCurrency(t.debit)} / Cr {formatCurrency(t.credit)}
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
          )}

          {activeTab === 'ledger' && (
            <Card>
              <CardBody className="p-0 sm:p-0">
                {ledgerTransactions.length === 0 ? (
                  <EmptyState message="No ledger transactions for the selected period." />
                ) : (
                <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Entry #</TableHeaderCell>
                      <TableHeaderCell>Account</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Description</TableHeaderCell>
                      <TableHeaderCell align="right">Debit</TableHeaderCell>
                      <TableHeaderCell align="right">Credit</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {ledgerTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-slate-500">{formatDate(t.journalEntry.date)}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{t.journalEntry.entryNumber}</TableCell>
                        <TableCell>{t.account.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{t.description || t.journalEntry.description}</TableCell>
                        <TableCell align="right">{Number(t.debit) > 0 ? formatCurrency(t.debit) : '—'}</TableCell>
                        <TableCell align="right">{Number(t.credit) > 0 ? formatCurrency(t.credit) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </TableWrapper>
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
                    Debit: <span className="font-semibold text-slate-700">{formatCurrency(trialBalance.totalDebit)}</span>
                    {' · '}
                    Credit: <span className="font-semibold text-slate-700">{formatCurrency(trialBalance.totalCredit)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-8">
                {trialBalance.grouped ? (
                  (['company', 'customers', 'vendors', 'employees'] as const).map((key) => {
                    const group = trialBalance.grouped![key];
                    if (!group?.accounts.length) return null;
                    return (
                      <div key={key}>
                        <h4 className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                          {group.label}
                        </h4>
                        <TrialBalanceTable rows={group.accounts} />
                      </div>
                    );
                  })
                ) : (
                  <TrialBalanceTable rows={trialBalance.accounts} />
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
