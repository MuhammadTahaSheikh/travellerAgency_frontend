import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  MessageCircle,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import {
  getPublicPackage,
  getPublicCompany,
  formatPublicCurrency,
  buildInquiryWhatsApp,
  buildInquiryEmail,
} from '@/lib/publicApi';
import { generatePublicMetadata } from '@/components/public/PublicShell';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const pkg = await getPublicPackage(id);
    return generatePublicMetadata(pkg.name, pkg.description || undefined);
  } catch {
    return generatePublicMetadata('Tour Details');
  }
}

const GRADIENT = 'from-teal-600 via-teal-700 to-cyan-800';

export default async function TourDetailPage({ params }: PageProps) {
  const { id } = await params;

  let pkg;
  let company;

  try {
    [pkg, company] = await Promise.all([getPublicPackage(id), getPublicCompany()]);
  } catch {
    notFound();
  }

  const price = formatPublicCurrency(pkg.price, company.currency, company.currencyLocale);
  const inquiryMsg = `Hello ${company.companyName}, I am interested in the "${pkg.name}" package (${price} per person, ${pkg.duration} days). Please share availability and booking details.`;
  const whatsappUrl = company.phone ? buildInquiryWhatsApp(company.phone, inquiryMsg) : null;
  const emailUrl = company.email
    ? buildInquiryEmail(company.email, `Inquiry: ${pkg.name}`, inquiryMsg)
    : null;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero banner */}
      <div className={`relative bg-gradient-to-br ${GRADIENT} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <Link href="/tours" className="inline-flex items-center gap-2 text-sm text-teal-100 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All tours
          </Link>
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 text-sm font-medium">
              <Calendar className="w-4 h-4" /> {pkg.duration} Days
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 text-sm font-medium">
              <Users className="w-4 h-4" /> Up to {pkg.maxCapacity} travelers
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">{pkg.name}</h1>
          {pkg.destinations && pkg.destinations.length > 0 && (
            <p className="mt-3 flex items-center gap-2 text-teal-100">
              <MapPin className="w-4 h-4 shrink-0" />
              {pkg.destinations.map((d) => d.destination + (d.country ? `, ${d.country}` : '')).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">About this tour</h2>
              <p className="text-slate-600 leading-relaxed">
                {pkg.description || 'A carefully curated travel experience designed for comfort, value, and unforgettable memories. Contact us for a detailed day-by-day itinerary.'}
              </p>
            </section>

            {pkg.destinations && pkg.destinations.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Itinerary highlights</h2>
                <div className="space-y-3">
                  {pkg.destinations.map((d, i) => (
                    <div key={d.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 text-teal-700 text-sm font-bold shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{d.destination}{d.country ? `, ${d.country}` : ''}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5" /> {d.nights} night{d.nights !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">What&apos;s included</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Dedicated travel consultant',
                  'Visa & document guidance',
                  'Hotel arrangements',
                  'Airport transfers',
                  'Group support on ground',
                  'Flexible payment options',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sidebar booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 lg:p-8">
              <p className="text-sm text-slate-500">Starting from</p>
              <p className="text-3xl font-bold text-teal-700 mt-1">{price}</p>
              <p className="text-xs text-slate-400 mt-1">per person · {company.currency}</p>

              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-sm text-slate-600">
                <p className="flex justify-between"><span>Duration</span><span className="font-medium text-slate-900">{pkg.duration} days</span></p>
                <p className="flex justify-between"><span>Group size</span><span className="font-medium text-slate-900">Up to {pkg.maxCapacity}</span></p>
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Send an inquiry</p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Us
                  </a>
                )}
                {emailUrl && (
                  <a
                    href={emailUrl}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Email Inquiry
                  </a>
                )}
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {company.phone}
                  </a>
                )}
              </div>

              <p className="mt-6 text-xs text-slate-400 text-center leading-relaxed">
                Our team will confirm availability, dates, and final pricing. No online payment on this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
