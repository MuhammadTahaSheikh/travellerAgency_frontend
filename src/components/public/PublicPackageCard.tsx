import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Users } from 'lucide-react';
import { PublicPackage, PublicCompany, formatPublicCurrency } from '@/lib/publicApi';

const CARD_GRADIENTS = [
  'from-teal-600 to-cyan-700',
  'from-indigo-600 to-violet-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-emerald-600 to-teal-700',
  'from-sky-600 to-blue-700',
];

function getGradient(index: number) {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

function getPrimaryDestination(pkg: PublicPackage) {
  const dest = pkg.destinations?.[0];
  if (!dest) return 'Worldwide';
  return dest.country ? `${dest.destination}, ${dest.country}` : dest.destination;
}

interface PublicPackageCardProps {
  pkg: PublicPackage;
  company: PublicCompany;
  index?: number;
  featured?: boolean;
}

export function PublicPackageCard({ pkg, company, index = 0, featured }: PublicPackageCardProps) {
  const price = formatPublicCurrency(pkg.price, company.currency, company.currencyLocale);

  return (
    <article className={`group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-200/60 transition-all duration-300 ${featured ? 'lg:flex-row lg:min-h-[280px]' : ''}`}>
      <div className={`relative overflow-hidden ${featured ? 'lg:w-2/5 min-h-[200px] lg:min-h-0' : 'h-48'}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(index)}`} />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
          <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium mb-1">
            <MapPin className="w-3.5 h-3.5" />
            {getPrimaryDestination(pkg)}
          </div>
          <h3 className="font-bold text-lg leading-snug">{pkg.name}</h3>
        </div>
        <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur text-white text-xs font-bold">
          {pkg.duration} Days
        </span>
      </div>

      <div className={`flex flex-col flex-1 p-5 sm:p-6 ${featured ? 'lg:justify-center' : ''}`}>
        <p className="text-sm text-slate-500 line-clamp-2 flex-1">{pkg.description || 'Curated travel experience with full support.'}</p>

        {pkg.destinations && pkg.destinations.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {pkg.destinations.slice(0, 3).map((d) => (
              <span key={d.id} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                {d.destination}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between gap-3 mt-5 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">From</p>
            <p className="text-xl font-bold text-teal-700">{price}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> per person
            </p>
          </div>
          <Link
            href={`/tours/${pkg.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-teal-700 transition-colors shrink-0"
          >
            View Details
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PublicPackageGrid({
  packages,
  company,
}: {
  packages: PublicPackage[];
  company: PublicCompany;
}) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-2xl bg-slate-50 border border-slate-200">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">New tours coming soon</p>
        <p className="text-sm text-slate-400 mt-1">Check back shortly or contact us for custom itineraries.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
      {packages.map((pkg, i) => (
        <PublicPackageCard key={pkg.id} pkg={pkg} company={company} index={i} />
      ))}
    </div>
  );
}
