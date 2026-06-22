'use client';

import { Calendar, Filter, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card, CardBody } from './Card';
import { formatCurrency } from './Common';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  summary?: { count?: number; total?: number; label?: string };
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClear,
  summary,
}: DateRangeFilterProps) {
  const hasFilter = startDate || endDate;

  return (
    <Card className="mb-6">
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Filter className="w-4 h-4" />
            </div>
            Filter by date range
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Input
              label="From"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <Button type="button" onClick={onApply} className="flex-1 sm:flex-none">
                <Calendar className="w-4 h-4" />
                Apply
              </Button>
              {hasFilter && (
                <Button type="button" variant="secondary" onClick={onClear}>
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {summary && (summary.count !== undefined || summary.total !== undefined) && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              {summary.label && (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{summary.label}</span>
              )}
              {summary.count !== undefined && (
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-sm font-medium text-slate-700">
                  {summary.count} records
                </span>
              )}
              {summary.total !== undefined && (
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
                  {formatCurrency(summary.total)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
