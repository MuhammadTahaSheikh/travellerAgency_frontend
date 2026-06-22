import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        {
          'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20 focus:ring-teal-500':
            variant === 'primary',
          'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400':
            variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500': variant === 'danger',
          'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400': variant === 'ghost',
          'border-2 border-teal-600 text-teal-700 hover:bg-teal-50 focus:ring-teal-500': variant === 'outline',
          'px-3 py-2 text-xs sm:text-sm': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? 'Please wait...' : children}
    </button>
  );
}
