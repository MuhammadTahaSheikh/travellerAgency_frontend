import type { Metadata } from 'next';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { getPublicCompany } from '@/lib/publicApi';

export async function generatePublicMetadata(title: string, description?: string): Promise<Metadata> {
  try {
    const company = await getPublicCompany();
    return {
      title: `${title} | ${company.companyName}`,
      description: description || `Discover curated travel packages with ${company.companyName}.`,
    };
  } catch {
    return { title: `${title} | Moazin Travel` };
  }
}

export async function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  let company = {
    companyName: 'Moazin Travel Agency',
    email: '',
    phone: '',
    address: '',
    currency: 'PKR',
    currencyLocale: 'en-PK',
  };

  try {
    company = await getPublicCompany();
  } catch {
    // use defaults
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar companyName={company.companyName} />
      <main className="flex-1 pt-16 lg:pt-[4.25rem]">{children}</main>
      <PublicFooter company={company} />
    </div>
  );
}
