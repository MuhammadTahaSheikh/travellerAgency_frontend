import { resolvePostingServiceMeta } from '../src/lib/postingServiceMeta';
import type { BookingServiceItem } from '../src/types';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const hotelDescription = 'BK#004—Asif—VOCO—QUAD—4N—12/07To16/07—(Vendor Res#)';
const hotelItems: BookingServiceItem[] = [{
  serviceType: 'HOTEL',
  description: 'Accommodation',
  amount: 79040,
  costAmount: 960,
  details: {
    currency: 'SAR',
    rows: [{
      hotelName: 'VOCO',
      roomType: 'QUAD',
      checkInDate: '2026-07-12',
      checkOutDate: '2026-07-16',
      costTotal: '960',
      vendorResNo: 'HTL-7788',
    }],
  },
}];

const hotelMeta = resolvePostingServiceMeta(
  { description: hotelDescription, serviceType: 'HOTEL', expectedCost: 960, currency: 'SAR' },
  hotelItems,
);

check('Hotel posting uses SAR currency', hotelMeta.currency === 'SAR');
check('Hotel posting shows matched res#', hotelMeta.vendorResNo === 'HTL-7788');
check('Hotel posting keeps expected cost', hotelMeta.cost === 960);

const ticketMeta = resolvePostingServiceMeta(
  { description: 'BK#005—Ali—Ticket—LHE-DXB—Saudia—(TKT-991)', serviceType: 'TICKET', expectedCost: 50000, currency: 'PKR' },
  [{
    serviceType: 'TICKET',
    description: 'Ticket',
    amount: 55000,
    costAmount: 50000,
    details: { vendorResNo: 'TKT-991', airline: 'Saudia', sector: 'LHE-DXB' },
  }],
);

check('Ticket posting parses res# from description fallback', ticketMeta.vendorResNo === 'TKT-991');
check('Ticket posting uses PKR', ticketMeta.currency === 'PKR');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
