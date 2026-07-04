import { LedgerTransactionRow } from '@/types';
import { formatCurrency, formatDate } from '@/components/ui/Common';
import { downloadTextFile, escapeHtml, rowsToCsv, wrapExportHtml } from '@/lib/exportDownload';
import { downloadHtmlAsPdf } from '@/lib/pdfDownload';

function balanceForRow(row: LedgerTransactionRow, currency: 'PKR' | 'SAR') {
  return currency === 'SAR' ? row.runningBalanceSar ?? row.runningBalance : row.runningBalancePkr ?? row.runningBalance;
}

function assertRows(rows: LedgerTransactionRow[]) {
  if (!rows.length) throw new Error('No transactions to export. Open the ledger and make sure transactions are visible first.');
}

export function exportLedgerCsv(
  rows: LedgerTransactionRow[],
  currency: 'PKR' | 'SAR',
  filename: string,
  includeAccount = false,
  includeBalance = true,
) {
  assertRows(rows);
  const headers = [
    'Date',
    'Entry',
    ...(includeAccount ? ['Account', 'Other Side'] : []),
    'Description',
    'Debit',
    'Credit',
    ...(includeBalance ? ['Balance'] : []),
    'Currency',
  ];

  const data = rows.map((row) => {
    const balance = balanceForRow(row, currency);
    const cells: unknown[] = [
      formatDate(row.journalEntry.date),
      row.journalEntry.entryNumber,
    ];
    if (includeAccount) {
      cells.push(row.account?.name || '', row.counterAccount?.name || '');
    }
    cells.push(
      row.description || row.journalEntry.description || '',
      Number(row.debit) > 0 ? Number(row.debit) : '',
      Number(row.credit) > 0 ? Number(row.credit) : '',
    );
    if (includeBalance) cells.push(balance != null ? Number(balance) : '');
    cells.push(currency);
    return cells;
  });

  const csvName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  downloadTextFile(rowsToCsv(headers, data), csvName, 'text/csv;charset=utf-8');
}

export async function exportLedgerPdf(
  title: string,
  subtitle: string,
  rows: LedgerTransactionRow[],
  currency: 'PKR' | 'SAR',
  filename: string,
  includeAccount = false,
  includeBalance = true,
) {
  assertRows(rows);
  const accountHeaders = includeAccount ? '<th>Account</th><th>Other Side</th>' : '';
  const balanceHeader = includeBalance ? '<th class="num">Balance</th>' : '';
  const tableRows = rows
    .map((row) => {
      const balance = balanceForRow(row, currency);
      const accountCells = includeAccount
        ? `<td>${escapeHtml(row.account?.name)}</td><td>${escapeHtml(row.counterAccount?.name || '')}</td>`
        : '';
      const balanceCell = includeBalance
        ? `<td class="num">${balance != null ? escapeHtml(formatCurrency(balance, currency)) : ''}</td>`
        : '';
      return `<tr>
        <td>${escapeHtml(formatDate(row.journalEntry.date))}</td>
        <td>${escapeHtml(row.journalEntry.entryNumber)}</td>
        ${accountCells}
        <td>${escapeHtml(row.description || row.journalEntry.description)}</td>
        <td class="num">${Number(row.debit) > 0 ? escapeHtml(formatCurrency(row.debit, currency)) : ''}</td>
        <td class="num">${Number(row.credit) > 0 ? escapeHtml(formatCurrency(row.credit, currency)) : ''}</td>
        ${balanceCell}
      </tr>`;
    })
    .join('');

  const html = wrapExportHtml(
    title,
    `<h1>${escapeHtml(title)}</h1>
     <p class="meta">${escapeHtml(subtitle)} · ${currency} view · ${rows.length} transaction(s)</p>
     <table>
       <thead><tr><th>Date</th><th>Entry</th>${accountHeaders}<th>Description</th><th class="num">Debit</th><th class="num">Credit</th>${balanceHeader}</tr></thead>
       <tbody>${tableRows}</tbody>
     </table>`
  );

  await downloadHtmlAsPdf(html, { filename, orientation: 'landscape' });
}
