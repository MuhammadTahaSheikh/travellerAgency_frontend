import { buildServicePostingPreviews, resolvePostingServiceMeta } from '../src/lib/postingServiceMeta';
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
check('Hotel posting shows sector/label', hotelMeta.sector === 'VOCO / QUAD' && !!hotelMeta.label);

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

const zeroCostHotel: BookingServiceItem[] = [{
  serviceType: 'HOTEL',
  description: 'Accommodation - Voco, Makkah',
  amount: 184525,
  costAmount: 0,
  details: {
    currency: 'SAR',
    rows: [{
      hotelName: 'Voco, Makkah',
      roomType: 'Quad',
      checkInDate: '2026-07-28',
      checkOutDate: '2026-08-08',
      costPerNight: '0',
      costTotal: '0',
      vendorResNo: '',
    }],
  },
}];

const previews = buildServicePostingPreviews(zeroCostHotel);
check('Zero-cost hotel still appears in previews', previews.length === 1);
check('Zero-cost hotel shows sector', previews[0]?.sector === 'Voco, Makkah / Quad');
check('Zero-cost hotel cost is 0', previews[0]?.cost === 0);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
