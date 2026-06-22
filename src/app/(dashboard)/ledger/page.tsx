'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { Account, ApiResponse } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, TabGroup, EmptyState } from '@/components/ui/Common';
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

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ accounts: { accountName: string; accountCode: string; debit: number; credit: number; balance: number }[]; totalDebit: number; totalCredit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'ledger' | 'trial'>('accounts');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });

  const loadData = (dates = appliedDates) => {
    setLoading(true);
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    Promise.all([
      api.get<ApiResponse<Account[]>>('/ledger/accounts'),
      api.get<ApiResponse<JournalEntry[]>>(`/ledger/journal-entries${query}`),
      api.get<ApiResponse<LedgerTransaction[]>>(`/ledger/general-ledger${query}`),
      api.get<ApiResponse<{ accounts: { accountName: string; accountCode: string; debit: number; credit: number; balance: number }[]; totalDebit: number; totalCredit: number }>>('/ledger/trial-balance'),
    ])
      .then(([accRes, jeRes, glRes, tbRes]) => {
        setAccounts(accRes.data || []);
        setJournalEntries(jeRes.data || []);
        setLedgerTransactions(glRes.data || []);
        setTrialBalance(tbRes.data || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadData(dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadData({ startDate: '', endDate: '' });
  };

  const tabs = [
    { id: 'accounts' as const, label: 'Accounts' },
    { id: 'journal' as const, label: 'Journal Entries' },
    { id: 'ledger' as const, label: 'General Ledger' },
    { id: 'trial' as const, label: 'Trial Balance' },
  ];

  return (
    <div>
      <PageHeader title="Internal Ledger System" subtitle="Accounts, journal entries, debit/credit, and running balances" />

      {(activeTab === 'journal' || activeTab === 'ledger') && (
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
      )}

      <TabGroup tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as typeof activeTab)} />

      {loading ? <LoadingSpinner /> : (
        <>
          {activeTab === 'accounts' && (
            accounts.length === 0 ? (
              <EmptyState message="No ledger accounts configured yet." />
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <Card key={acc.id} className="hover:shadow-md transition-shadow">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {acc.type}
                        </span>
                        <h3 className="font-bold text-slate-900 mt-2 truncate">{acc.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{acc.code}</p>
                      </div>
                      <p className={`text-lg sm:text-xl font-bold shrink-0 ${Number(acc.balance) >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        {formatCurrency(acc.balance)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
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
              <CardBody className="p-0 sm:p-0">
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
                    {trialBalance.accounts.map((acc, i) => (
                      <TableRow key={i}>
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
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
