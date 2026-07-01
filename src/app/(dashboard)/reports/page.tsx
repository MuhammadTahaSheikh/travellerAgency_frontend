'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { searchCustomers } from '@/lib/searchableOptions';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { ApiResponse, Customer } from '@/types';
import { LedgerTransactionTable, LedgerTransactionRow } from '@/components/ledger/LedgerTransactionTable';
import { Select, SearchableSelect } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, TabGroup, EmptyState } from '@/components/ui/Common';
import { Button } from '@/components/ui/Button';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const reportTypes = [
  { id: 'income-statement', label: 'Income Statement', endpoint: '/reports/income-statement' },
  { id: 'profit-loss', label: 'Profit & Loss', endpoint: '/reports/profit-loss' },
  { id: 'cash-flow', label: 'Cash Flow', endpoint: '/reports/cash-flow' },
  { id: 'expenses', label: 'Expense Report', endpoint: '/reports/expenses' },
  { id: 'customer-outstanding', label: 'Outstanding', endpoint: '/reports/customer-outstanding' },
  { id: 'customer-statement', label: 'Customer Statement', endpoint: '/reports/customer-statement', needsCustomer: true },
  { id: 'b2b-partners', label: 'B2B Partners', endpoint: '/reports/b2b-partners' },
];

const categoryLabels: Record<string, string> = {
  PAYMENTS: 'Customer payments',
  PACKAGE_BOOKING: 'Package bookings',
  AIRLINE: 'Airline',
  HOTEL: 'Hotel',
  VISA: 'Visa',
  TICKET: 'Ticketing',
  OFFICE: 'Office',
  SALARY: 'Salary',
  MARKETING: 'Marketing',
  OTHER: 'Other',
};

function labelFor(key: string) {
  return categoryLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({ label, value, variant }: { label: string; value: string; variant: 'green' | 'red' | 'blue' | 'teal' | 'amber' }) {
  const styles = {
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-sky-50 border-sky-100 text-sky-700',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
  };
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${styles[variant]}`}>
      <p className="text-xs sm:text-sm font-medium opacity-80">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function sumRecord(values: Record<string, number>) {
  return Object.values(values).reduce((s, v) => s + v, 0);
}

function BreakdownList({
  title,
  items,
  emptyMessage,
  valueClassName = 'text-red-600',
}: {
  title: string;
  items: Record<string, number>;
  emptyMessage: string;
  valueClassName?: string;
}) {
  const entries = Object.entries(items).filter(([, val]) => val > 0);
  return (
    <div>
      <h4 className="font-semibold text-slate-900 mb-3">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between gap-4 py-2 text-sm border-b border-slate-100">
              <span className="text-slate-600">{labelFor(key)}</span>
              <span className={`font-medium shrink-0 ${valueClassName}`}>{formatCurrency(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState(reportTypes[0].id);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statementCustomerId, setStatementCustomerId] = useState('');
  const [statementCurrency, setStatementCurrency] = useState<'PKR' | 'SAR'>('PKR');

  useEffect(() => {
    api.get<ApiResponse<Customer[]>>('/customers?limit=200').then((res) => setCustomers(res.data || [])).catch(console.error);
  }, []);

  const loadReport = (reportId: string, dates = appliedDates) => {
    const report = reportTypes.find((r) => r.id === reportId);
    if (!report) return;
    if (reportId === 'customer-statement' && !statementCustomerId) {
      setActiveReport(reportId);
      setData(null);
      return;
    }

    setActiveReport(reportId);
    setLoading(true);
    const query = buildQueryString({
      startDate: dates.startDate,
      endDate: dates.endDate,
      date: dates.startDate || dates.endDate ? dates.startDate || dates.endDate : undefined,
      customerId: reportId === 'customer-statement' ? statementCustomerId : undefined,
      currency: reportId === 'customer-statement' ? statementCurrency : undefined,
    });
    api.get<ApiResponse<Record<string, unknown>>>(`${report.endpoint}${query}`)
      .then((res) => setData(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReport(activeReport); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadReport(activeReport, dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadReport(activeReport, { startDate: '', endDate: '' });
  };

  const downloadStatement = async () => {
    if (!statementCustomerId) {
      alert('Please select a customer first.');
      return;
    }
    try {
      const query = buildQueryString({ customerId: statementCustomerId, currency: statementCurrency });
      await api.downloadPdfFromEndpoint(
        `/reports/customer-statement/html${query}`,
        'customer-statement.pdf',
        'portrait'
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle="Income statement, P&L, cash flow, expenses, and customer outstanding" />

      <TabGroup
        tabs={reportTypes}
        active={activeReport}
        onChange={(id) => loadReport(id, appliedDates)}
      />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
      />

      {activeReport === 'customer-statement' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 max-w-2xl">
          <SearchableSelect
            label="Customer"
            value={statementCustomerId}
            onChange={setStatementCustomerId}
            onSearch={searchCustomers}
            options={[{ value: '', label: 'Select customer' }]}
          />
          <Select
            label="Currency"
            value={statementCurrency}
            onChange={(e) => setStatementCurrency(e.target.value as 'PKR' | 'SAR')}
            options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]}
          />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={() => loadReport('customer-statement')}>Generate Statement</Button>
            <Button variant="secondary" onClick={downloadStatement} disabled={!statementCustomerId}>
              <Download className="w-4 h-4 mr-2" />Download Statement
            </Button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner label="Generating report..." /> : data ? (
        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900">{reportTypes.find((r) => r.id === activeReport)?.label}</h3>
          </CardHeader>
          <CardBody>
            {activeReport === 'income-statement' || activeReport === 'profit-loss' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard label="Total Income" value={formatCurrency((data.totalIncome as number) || 0)} variant="green" />
                  <StatCard label="Cost of Sales" value={formatCurrency((data.totalCostOfSales as number) || 0)} variant="amber" />
                  <StatCard label="Operating Expenses" value={formatCurrency((data.totalOperatingExpenses as number) || 0)} variant="red" />
                  <StatCard label="Net Income" value={formatCurrency((data.netIncome as number) || 0)} variant="teal" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BreakdownList
                    title="Income"
                    items={(data.income as Record<string, number>) || {}}
                    emptyMessage="No income recorded in this period."
                    valueClassName="text-emerald-700"
                  />
                  <BreakdownList
                    title="Cost of Sales (vendor costs on bookings)"
                    items={(data.costOfSales as Record<string, number>) || {}}
                    emptyMessage="No booking vendor costs in this period."
                    valueClassName="text-amber-700"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BreakdownList
                    title="Operating Expenses"
                    items={(data.operatingExpenses as Record<string, number>) || {}}
                    emptyMessage="No office, salary, or other operating expenses in this period."
                  />
                  <BreakdownList
                    title="Vendor Payments (cash paid — not in P&L)"
                    items={(data.vendorPayments as Record<string, number>) || {}}
                    emptyMessage="No vendor payments recorded in this period."
                    valueClassName="text-slate-600"
                  />
                </div>

                <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
                  Net income = income − cost of sales − operating expenses. Vendor payments reduce what you owe suppliers and appear in Cash Flow, not profit again.
                </p>
              </div>
            ) : activeReport === 'cash-flow' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Cash Inflows" value={formatCurrency(((data.inflows as { total: number })?.total) || 0)} variant="green" />
                  <StatCard label="Cash Outflows" value={formatCurrency(((data.outflows as { total: number })?.total) || 0)} variant="red" />
                  <StatCard label="Net Cash Flow" value={formatCurrency((data.netCashFlow as number) || 0)} variant="teal" />
                </div>
                <BreakdownList
                  title="Cash outflows by category"
                  items={((data.outflows as { byCategory?: Record<string, number> })?.byCategory) || {}}
                  emptyMessage="No cash outflows in this period."
                />
              </div>
            ) : activeReport === 'customer-outstanding' ? (
              <div>
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-sm text-amber-700 font-medium">Total Outstanding</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-800 mt-1">{formatCurrency((data.totalOutstanding as number) || 0)}</p>
                </div>
                {((data.customers as { invoiceNumber: string; customer: { firstName: string; lastName: string }; outstanding: number }[]) || []).length === 0 ? (
                  <EmptyState message="No outstanding customer balances." />
                ) : (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Invoice</TableHeaderCell>
                          <TableHeaderCell>Customer</TableHeaderCell>
                          <TableHeaderCell align="right">Outstanding</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {((data.customers as { invoiceNumber: string; customer: { firstName: string; lastName: string }; outstanding: number }[]) || []).map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{item.invoiceNumber}</TableCell>
                            <TableCell>{item.customer?.firstName} {item.customer?.lastName}</TableCell>
                            <TableCell align="right" className="font-medium text-amber-700">{formatCurrency(item.outstanding)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                )}
              </div>
            ) : activeReport === 'b2b-partners' ? (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Trade Partner ID</TableHeaderCell>
                      <TableHeaderCell>Company</TableHeaderCell>
                      <TableHeaderCell>Contact</TableHeaderCell>
                      <TableHeaderCell align="right">Billed</TableHeaderCell>
                      <TableHeaderCell align="right">Paid</TableHeaderCell>
                      <TableHeaderCell align="right">Outstanding</TableHeaderCell>
                      <TableHeaderCell align="right">Balance PKR</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {(Array.isArray(data) ? data : []).map((p: { tradePartnerId?: string; companyName?: string; contactPerson?: string; phone?: string; totalBilled: number; totalPaid: number; outstanding: number; balancePkr: number }) => (
                      <TableRow key={p.tradePartnerId || p.companyName}>
                        <TableCell className="font-mono font-semibold">{p.tradePartnerId || '—'}</TableCell>
                        <TableCell>{p.companyName}</TableCell>
                        <TableCell>{p.contactPerson || p.phone || '—'}</TableCell>
                        <TableCell align="right">{formatCurrency(p.totalBilled)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.totalPaid)}</TableCell>
                        <TableCell align="right" className="text-amber-700">{formatCurrency(p.outstanding)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.balancePkr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            ) : activeReport === 'customer-statement' ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-bold text-lg">
                    {(data.customer as { companyName?: string; customerType?: string; firstName: string; lastName: string })?.customerType === 'B2B'
                      ? (data.customer as { companyName?: string }).companyName
                      : `${(data.customer as { firstName: string }).firstName} ${(data.customer as { lastName: string }).lastName}`}
                  </p>
                  {(data.customer as { tradePartnerId?: string })?.tradePartnerId && (
                    <p className="text-sm text-slate-500">{(data.customer as { tradePartnerId: string }).tradePartnerId}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Billed" value={formatCurrency(((data.summary as { totalBilled: number })?.totalBilled) || 0)} variant="blue" />
                  <StatCard label="Total Paid" value={formatCurrency(((data.summary as { totalPaid: number })?.totalPaid) || 0)} variant="green" />
                  <StatCard label="Outstanding" value={formatCurrency(((data.summary as { outstanding: number })?.outstanding) || 0)} variant="amber" />
                  <StatCard label={`Balance (${statementCurrency})`} value={formatCurrency(statementCurrency === 'SAR' ? ((data.summary as { balanceSar: number })?.balanceSar || 0) : ((data.summary as { balancePkr: number })?.balancePkr || 0), statementCurrency)} variant="teal" />
                </div>
                <LedgerTransactionTable rows={((data.transactions as LedgerTransactionRow[]) || [])} currency={statementCurrency} />
              </div>
            ) : activeReport === 'daily-collection' ? (
              <div className="space-y-6">
                <StatCard label="Total Collection" value={formatCurrency((data.total as number) || 0)} variant="teal" />
                {((data.payments as { paymentNumber: string; amount: number; method: string; invoice?: { customer?: { firstName: string; lastName: string } } }[]) || []).length > 0 && (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Payment #</TableHeaderCell>
                          <TableHeaderCell>Customer</TableHeaderCell>
                          <TableHeaderCell>Method</TableHeaderCell>
                          <TableHeaderCell align="right">Amount</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {((data.payments as { paymentNumber: string; amount: number; method: string; invoice?: { customer?: { firstName: string; lastName: string } } }[]) || []).map((p) => (
                          <TableRow key={p.paymentNumber}>
                            <TableCell className="font-semibold">{p.paymentNumber}</TableCell>
                            <TableCell>
                              {p.invoice?.customer ? `${p.invoice.customer.firstName} ${p.invoice.customer.lastName}` : '—'}
                            </TableCell>
                            <TableCell>{p.method}</TableCell>
                            <TableCell align="right" className="font-medium text-emerald-700">{formatCurrency(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Total Cash Out" value={formatCurrency((data.total as number) || 0)} variant="red" />
                  <StatCard
                    label="Vendor Payments"
                    value={formatCurrency(sumRecord((data.vendorPayments as Record<string, number>) || {}))}
                    variant="amber"
                  />
                  <StatCard
                    label="Operating Expenses"
                    value={formatCurrency(sumRecord((data.operatingExpenses as Record<string, number>) || {}))}
                    variant="blue"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BreakdownList
                    title="By category"
                    items={(data.byCategory as Record<string, number>) || {}}
                    emptyMessage="No expenses in this period."
                  />
                  <BreakdownList
                    title="Vendor payments"
                    items={(data.vendorPayments as Record<string, number>) || {}}
                    emptyMessage="No vendor payments in this period."
                    valueClassName="text-amber-700"
                  />
                </div>
                {((data.expenses as { id: string; expenseNumber: string; category: string; description: string; amount: number; expenseDate: string; vendorRef?: { name: string } }[]) || []).length === 0 ? (
                  <EmptyState message="No expense transactions in this period." />
                ) : (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Expense #</TableHeaderCell>
                          <TableHeaderCell>Category</TableHeaderCell>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell className="hidden md:table-cell">Vendor</TableHeaderCell>
                          <TableHeaderCell className="hidden sm:table-cell">Date</TableHeaderCell>
                          <TableHeaderCell align="right">Amount</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {((data.expenses as { id: string; expenseNumber: string; category: string; description: string; amount: number; expenseDate: string; vendorRef?: { name: string } }[]) || []).map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-semibold">{e.expenseNumber}</TableCell>
                            <TableCell>{labelFor(e.category)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{e.description}</TableCell>
                            <TableCell className="hidden md:table-cell">{e.vendorRef?.name || '—'}</TableCell>
                            <TableCell className="hidden sm:table-cell text-slate-500">{formatDate(e.expenseDate)}</TableCell>
                            <TableCell align="right" className="font-medium text-red-600">{formatCurrency(e.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <EmptyState message="No report data available for the selected period." />
      )}
    </div>
  );
}
