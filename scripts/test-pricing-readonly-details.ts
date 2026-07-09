import {
  getHotelRowReadOnlyFields,
  getTicketReadOnlyFields,
  getTransportRowReadOnlyFields,
  getVisaReadOnlyFields,
} from '../src/lib/pricingReadOnlyDetails';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.log(`✗ ${name}`);
  }
}

const hotel = getHotelRowReadOnlyFields({
  roomType: 'QUAD',
  checkInDate: '2026-07-12',
  checkOutDate: '2026-07-16',
  vendorResNo: 'HTL-99',
});

check('Hotel includes room type', hotel.some((f) => f.label === 'Room Type' && f.value === 'QUAD'));
check('Hotel includes check-in', hotel.some((f) => f.label === 'Check-in' && f.value.includes('2026')));
check('Hotel includes check-out', hotel.some((f) => f.label === 'Check-out' && f.value.includes('2026')));
check('Hotel includes res#', hotel.some((f) => f.label === 'Res #' && f.value === 'HTL-99'));

const transport = getTransportRowReadOnlyFields({
  sector: 'Jeddah - Makkah',
  date: '2026-07-12',
  vehicleType: 'Coaster',
  vendorResNo: 'TR-12',
});

check('Transport includes sector', transport.some((f) => f.label === 'Sector' && f.value.includes('Jeddah')));
check('Transport includes vehicle', transport.some((f) => f.label === 'Vehicle' && f.value === 'Coaster'));

const visa = getVisaReadOnlyFields({
  serviceType: 'VISA',
  description: 'Visa',
  amount: 1000,
  details: { country: 'Saudi Arabia', visaType: 'Umrah', vendorResNo: 'V-1' },
});

check('Visa includes country', visa.some((f) => f.label === 'Country' && f.value === 'Saudi Arabia'));
check('Visa includes type', visa.some((f) => f.label === 'Visa Type' && f.value === 'Umrah'));

const ticket = getTicketReadOnlyFields({
  serviceType: 'TICKET',
  description: 'Ticket',
  amount: 1000,
  details: {
    airline: 'Saudia',
    sector: 'LHE-JED',
    tripType: 'ONE_WAY',
    departureDate: '2026-08-01',
    vendorResNo: 'TK-55',
  },
});

check('Ticket includes airline', ticket.some((f) => f.label === 'Airline' && f.value === 'Saudia'));
check('Ticket includes sector', ticket.some((f) => f.label === 'Sector' && f.value === 'LHE-JED'));
check('Ticket includes res#', ticket.some((f) => f.label === 'Res #' && f.value === 'TK-55'));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
