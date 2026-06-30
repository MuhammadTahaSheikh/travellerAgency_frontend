import Image from 'next/image';
import { clsx } from 'clsx';
import { BRAND_LOGO_SRC, BRAND_NAME } from '@/lib/brand';

interface LogoProps {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { box: 'h-8 w-8', image: 32, text: 'text-sm' },
  md: { box: 'h-10 w-10', image: 40, text: 'text-base' },
  lg: { box: 'h-14 w-14', image: 56, text: 'text-lg' },
};

export function Logo({
  className,
  imageClassName,
  showText = false,
  textClassName,
  subtitle,
  subtitleClassName,
  size = 'md',
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={clsx('flex items-center gap-2.5 min-w-0', className)}>
      <div className={clsx('relative shrink-0 rounded-lg overflow-hidden bg-white', s.box, imageClassName)}>
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_NAME}
          width={s.image}
          height={s.image}
          className="object-contain p-0.5 w-full h-full"
          priority
        />
      </div>
      {showText && (
        <div className="min-w-0">
          <p className={clsx('font-bold truncate', s.text, textClassName)}>{BRAND_NAME}</p>
          {subtitle && (
            <p className={clsx('text-[11px] truncate opacity-80', subtitleClassName)}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
