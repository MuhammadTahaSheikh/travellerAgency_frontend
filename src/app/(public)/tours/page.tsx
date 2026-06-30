import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPublicPackages, getPublicCompany } from '@/lib/publicApi';
import { PublicPackageGrid } from '@/components/public/PublicPackageCard';
import { generatePublicMetadata } from '@/components/public/PublicShell';
import { BRAND_NAME } from '@/lib/brand';

export async function generateMetadata() {
  return generatePublicMetadata('Tours & Packages', 'Browse all available travel and Umrah packages.');
}

export default async function ToursPage() {
  const [packages, company] = await Promise.all([
    getPublicPackages().catch(() => []),
    getPublicCompany().catch(() => ({
      companyName: BRAND_NAME,
      email: '',
      phone: '',
      address: '',
      currency: 'PKR',
      currencyLocale: 'en-PK',
    })),
  ]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-slate-950 text-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Tours & Packages</h1>
          <p className="text-slate-400 mt-3 max-w-2xl text-lg">
            All packages are managed by our team and updated in real time. Prices shown per person in {company.currency}.
          </p>
          <p className="mt-4 text-sm text-teal-400 font-medium">{packages.length} package{packages.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <PublicPackageGrid packages={packages} company={company} />
      </div>
    </div>
  );
}
