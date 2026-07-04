'use client';

import { formatCurrency, formatDate } from '@/components/ui/Common';
import { attachmentUrl } from '@/lib/upload';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

export interface LedgerTransactionRow {
  id: string;
  debit: number;
  credit: number;
  currency?: string;
  exchangeRate?: number;
  amountPkr?: number;
  amountSar?: number;
  paymentMethod?: string;
  remarks?: string;
  attachmentPath?: string;
  description?: string;
  runningBalance?: number;
  runningBalancePkr?: number;
  runningBalanceSar?: number;
  displayCurrency?: string;
  journalEntry: { entryNumber: string; date: string; description: string };
  account: { name: string; type?: string };
  bankAccount?: { name: string; type?: string } | null;
  counterAccount?: { name: string } | null;
}

export function LedgerTransactionTable({
  rows,
  currency = 'PKR',
  showAccountColumn = false,
  showCounterAccountColumn = false,
  showBalanceColumn = true,
}: {
  rows: LedgerTransactionRow[];
  currency?: 'PKR' | 'SAR';
  showAccountColumn?: boolean;
  showCounterAccountColumn?: boolean;
  showBalanceColumn?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Entry</TableHeaderCell>
            {showAccountColumn && <TableHeaderCell>Account</TableHeaderCell>}
            <TableHeaderCell>Description</TableHeaderCell>
            {showCounterAccountColumn && (
              <TableHeaderCell className="hidden md:table-cell">Other Side</TableHeaderCell>
            )}
            <TableHeaderCell align="right">Debit</TableHeaderCell>
            <TableHeaderCell align="right">Credit</TableHeaderCell>
            {showBalanceColumn && <TableHeaderCell align="right">Balance</TableHeaderCell>}
            <TableHeaderCell className="hidden lg:table-cell">Currency</TableHeaderCell>
            <TableHeaderCell className="hidden lg:table-cell">Rate</TableHeaderCell>
            <TableHeaderCell className="hidden xl:table-cell">Bank/Cash</TableHeaderCell>
            <TableHeaderCell className="hidden xl:table-cell">Method</TableHeaderCell>
            <TableHeaderCell className="hidden xl:table-cell">Proof</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((t) => {
            const balance = currency === 'SAR' ? t.runningBalanceSar ?? t.runningBalance : t.runningBalancePkr ?? t.runningBalance;
            const url = attachmentUrl(t.attachmentPath);
            return (
              <TableRow key={t.id}>
                <TableCell className="text-slate-500 whitespace-nowrap">{formatDate(t.journalEntry.date)}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{t.journalEntry.entryNumber}</TableCell>
                {showAccountColumn && (
                  <TableCell className="text-sm font-medium text-slate-800 max-w-[10rem] truncate" title={t.account?.name}>
                    {t.account?.name || '—'}
                  </TableCell>
                )}
                <TableCell>{t.description || t.journalEntry.description}</TableCell>
                {showCounterAccountColumn && (
                  <TableCell className="hidden md:table-cell text-sm text-slate-500 max-w-[10rem] truncate" title={t.counterAccount?.name}>
                    {t.counterAccount?.name || '—'}
                  </TableCell>
                )}
                <TableCell align="right">{Number(t.debit) > 0 ? formatCurrency(t.debit, currency) : '—'}</TableCell>
                <TableCell align="right">{Number(t.credit) > 0 ? formatCurrency(t.credit, currency) : '—'}</TableCell>
                {showBalanceColumn && (
                  <TableCell align="right" className="font-semibold">{balance != null ? formatCurrency(balance, currency) : '—'}</TableCell>
                )}
                <TableCell className="hidden lg:table-cell text-xs">{t.displayCurrency || currency}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{t.exchangeRate ? Number(t.exchangeRate).toFixed(2) : '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm">{t.bankAccount?.name || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs capitalize">{(t.paymentMethod || '').replace('_', ' ').toLowerCase() || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-teal-600 text-sm hover:underline">View</a>
                  ) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
