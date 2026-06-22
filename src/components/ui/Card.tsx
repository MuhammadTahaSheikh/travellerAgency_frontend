import { clsx } from 'clsx';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-4 sm:px-6 py-4 sm:py-5', className)}>{children}</div>;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'teal',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'teal' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 ring-teal-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    purple: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  return (
    <Card className="hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{title}</p>
            <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {icon && (
            <div className={clsx('p-2.5 sm:p-3 rounded-xl ring-1 shrink-0', colors[color])}>{icon}</div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
