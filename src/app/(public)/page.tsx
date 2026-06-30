import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Headphones,
  Globe2,
  Star,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { getPublicPackages, getPublicCompany } from '@/lib/publicApi';
import { PublicPackageCard, PublicPackageGrid } from '@/components/public/PublicPackageCard';
import { generatePublicMetadata } from '@/components/public/PublicShell';
import { BRAND_NAME } from '@/lib/brand';

export async function generateMetadata() {
  return generatePublicMetadata(
    'Premium Travel & Umrah Packages',
    'Explore handpicked tours, Umrah packages, and cultural journeys with transparent pricing.'
  );
}

const WHY_US = [
  { icon: Shield, title: 'Trusted & Licensed', desc: 'Registered travel agency with verified partners worldwide.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Dedicated team before, during, and after your journey.' },
  { icon: Globe2, title: 'Global Destinations', desc: 'From Makkah & Madinah to Dubai, Istanbul, and beyond.' },
  { icon: Star, title: 'Best Value', desc: 'Competitive packages with no hidden fees — price per person shown clearly.' },
];

const STEPS = [
  { step: '01', title: 'Choose Your Package', desc: 'Browse tours and pick the itinerary that fits your plans.' },
  { step: '02', title: 'Send an Inquiry', desc: 'Contact us via WhatsApp, phone, or email — we respond quickly.' },
  { step: '03', title: 'Travel with Confidence', desc: 'We handle bookings, documents guidance, and on-trip support.' },
];

export default async function PublicHomePage() {
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

  const featured = packages.slice(0, 3);
  const destinations = [
    ...new Set(
      packages.flatMap((p) =>
        (p.destinations || []).map((d) => (d.country ? `${d.destination}, ${d.country}` : d.destination))
      )
    ),
  ].slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-600/40 via-slate-950 to-slate-950" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-6">
              <Globe2 className="w-3.5 h-3.5" />
              Curated Journeys · Umrah · Leisure
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              Discover the world with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
                {company.companyName}
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              Handpicked travel packages, spiritual Umrah journeys, and unforgettable cultural tours —
              backed by a professional team you can trust.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/tours"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-500 shadow-xl shadow-teal-600/25 transition-all"
              >
                Browse All Tours
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#featured"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/15 backdrop-blur transition-all"
              >
                View Featured Packages
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 max-w-md">
              {[
                { value: `${packages.length}+`, label: 'Active Tours' },
                { value: '10+', label: 'Years Experience' },
                { value: '5k+', label: 'Happy Travelers' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section id="featured" className="py-16 lg:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 lg:mb-14">
            <div>
              <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">Featured</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Popular Packages</h2>
              <p className="text-slate-500 mt-2 max-w-lg">Our most requested tours — updated live from our catalog.</p>
            </div>
            <Link href="/tours" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
              View all tours <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {featured.map((pkg, i) => (
                <PublicPackageCard key={pkg.id} pkg={pkg} company={company} index={i} />
              ))}
            </div>
          ) : (
            <PublicPackageGrid packages={[]} company={company} />
          )}
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">Why Choose Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Travel the smart way</h2>
            <p className="text-slate-500 mt-3">Inspired by leading agencies — personal service, clear pricing, professional execution.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_US.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-teal-200 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      {destinations.length > 0 && (
        <section id="destinations" className="py-16 lg:py-24 bg-slate-950 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">Destinations</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Where we take you</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {destinations.map((dest) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-teal-600/20 hover:border-teal-500/30 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {dest}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How booking works</h2>
            <p className="text-slate-500 mt-3">Simple, transparent, and human — just like the best travel agencies.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center md:text-left">
                <span className="text-5xl font-black text-teal-100">{step}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 px-8 py-12 lg:px-16 lg:py-16 text-center lg:text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to plan your next trip?</h2>
                <p className="text-teal-100 mt-2 max-w-lg">
                  Browse our packages or reach out — our team will craft the perfect itinerary for you.
                </p>
                <ul className="mt-6 space-y-2">
                  {['Free consultation', 'Flexible payment plans', 'Group & family discounts'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-teal-50">
                      <CheckCircle2 className="w-4 h-4 text-teal-200 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/tours"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-white text-teal-800 font-semibold hover:bg-teal-50 transition-colors"
                >
                  Explore Tours
                </Link>
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-teal-800/50 text-white font-semibold border border-white/20 hover:bg-teal-800/70 transition-colors"
                  >
                    Call {company.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
