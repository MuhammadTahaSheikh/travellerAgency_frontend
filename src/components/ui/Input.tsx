'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { ChevronDown, Search, Loader2 } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, readOnly, disabled, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <input
        readOnly={readOnly}
        disabled={disabled}
        className={clsx(
          'w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 hover:border-slate-300',
          (readOnly || disabled) && 'bg-slate-50 text-slate-700 cursor-default focus:ring-0 focus:border-slate-200 hover:border-slate-200',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={clsx(
          'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchThreshold?: number;
  /** Server-side search — when provided, queries the API as the user types */
  onSearch?: (query: string) => Promise<{ value: string; label: string }[]>;
  selectedLabel?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  required,
  disabled,
  className,
  searchThreshold = 8,
  onSearch,
  selectedLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number; openUp: boolean } | null>(null);

  // Position the dropdown via a fixed-position portal so it is never clipped by an
  // ancestor with overflow-hidden (e.g. Card) and can always scroll through every option.
  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, (openUp ? spaceAbove : spaceBelow) - 16));
    setCoords({ top: rect.top, left: rect.left, width: rect.width, maxHeight, openUp });
  }, []);

  const staticSelected = options.find((o) => o.value === value);
  const asyncSelected = asyncOptions.find((o) => o.value === value);
  const selectedLabelText = staticSelected?.label || asyncSelected?.label || selectedLabel;
  const useSearch = Boolean(onSearch) || options.length >= searchThreshold;

  const runSearch = useCallback(async (query: string) => {
    if (!onSearch) return;
    setLoading(true);
    try {
      const results = await onSearch(query);
      setAsyncOptions(results);
    } catch {
      setAsyncOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onSearch]);

  useEffect(() => {
    if (!open || !onSearch) return;
    runSearch('');
  }, [open, onSearch, runSearch]);

  useEffect(() => {
    if (!onSearch || !open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, onSearch, open, runSearch]);

  const displayOptions = useMemo(() => {
    if (onSearch) {
      const merged = [...asyncOptions];
      if (value && selectedLabelText && !merged.some((o) => o.value === value)) {
        merged.unshift({ value, label: selectedLabelText });
      }
      return merged;
    }
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [onSearch, asyncOptions, options, search, value, selectedLabelText]);

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const onReposition = () => updateCoords();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!useSearch) {
    return (
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        required={required}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <div className={clsx('space-y-1.5 relative', className)} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={clsx(
          'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-left flex items-center justify-between gap-2',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className={value ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>
          {selectedLabelText || placeholder}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            ...(coords.openUp
              ? { bottom: Math.max(8, window.innerHeight - coords.top + 4) }
              : { top: coords.top + (triggerRef.current?.offsetHeight ?? 42) + 4 }),
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                autoFocus
              />
            </div>
          </div>
          <ul className="overflow-y-auto py-1" style={{ maxHeight: coords.maxHeight }}>
            {loading ? (
              <li className="px-3 py-3 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching...
              </li>
            ) : displayOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              displayOptions.map((opt) => (
                <li key={opt.value || opt.label}>
                  <button
                    type="button"
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm hover:bg-teal-50 transition-colors',
                      opt.value === value && 'bg-teal-50 text-teal-800 font-medium'
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
      {required && !value && <input tabIndex={-1} className="sr-only" required value={value} onChange={() => {}} />}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        className={clsx(
          'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 resize-y min-h-[80px]',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300',
          className
        )}
        {...props}
      />
    </div>
  );
}
