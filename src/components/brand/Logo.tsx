import Image from 'next/image';
import { clsx } from 'clsx';
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_SRC,
  BRAND_LOGO_WIDTH,
  BRAND_NAME,
} from '@/lib/brand';

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
  sm: { height: 32 },
  md: { height: 48 },
  lg: { height: 96 },
};

export function Logo({
  className,
  imageClassName,
  showText = false,
  subtitle,
  subtitleClassName,
  size = 'md',
}: LogoProps) {
  const s = sizes[size];
  const width = Math.round(s.height * (BRAND_LOGO_WIDTH / BRAND_LOGO_HEIGHT));

  return (
    <div className={clsx('flex items-center gap-2.5 min-w-0', className)}>
      <div
        className={clsx('relative shrink-0', imageClassName)}
        style={{ width, height: s.height }}
      >
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_NAME}
          width={BRAND_LOGO_WIDTH}
          height={BRAND_LOGO_HEIGHT}
          className="object-contain object-center w-full h-full"
          priority
        />
      </div>
      {showText && subtitle && (
        <div className="min-w-0">
          <p className={clsx('text-[11px] truncate opacity-80 leading-tight', subtitleClassName)}>
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
