import Link from 'next/link';
import { Plane, Mail, Phone, MapPin } from 'lucide-react';
import { PublicCompany } from '@/lib/publicApi';

export function PublicFooter({ company }: { company: PublicCompany }) {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-600 text-white">
                <Plane className="w-4 h-4" />
              </span>
              <span className="font-bold text-white text-lg">{company.companyName}</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Your trusted partner for Umrah, leisure, and cultural journeys. Curated packages,
              transparent pricing, and dedicated support from inquiry to return.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-teal-400 transition-colors">Home</Link></li>
              <li><Link href="/tours" className="hover:text-teal-400 transition-colors">All Tours</Link></li>
              <li><Link href="/login" className="hover:text-teal-400 transition-colors">Staff Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              {company.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <a href={`tel:${company.phone}`} className="hover:text-white transition-colors">{company.phone}</a>
                </li>
              )}
              {company.email && (
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <a href={`mailto:${company.email}`} className="hover:text-white transition-colors break-all">{company.email}</a>
                </li>
              )}
              {company.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{company.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-4 text-xs text-slate-500">
          <p suppressHydrationWarning>© {new Date().getFullYear()} {company.companyName}. All rights reserved.</p>
          <p>Internal management system for authorized staff only.</p>
        </div>
      </div>
    </footer>
  );
}
