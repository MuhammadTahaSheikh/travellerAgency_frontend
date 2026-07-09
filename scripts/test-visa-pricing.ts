import { serviceCostNative, serviceSaleNative } from '../src/lib/bookingPricingUtils';
import type { BookingServiceItem } from '../src/types';

const counts = { adults: 2, children: 1, infants: 1 };

const visaItem: BookingServiceItem = {
  serviceType: 'VISA',
  description: 'Visa - Saudi Arabia',
  amount: 0,
  costAmount: 0,
  details: {
    costAdult: '100',
    costChild: '80',
    costInfant: '50',
    saleAdult: '120',
    saleChild: '90',
    saleInfant: '60',
  },
};

const cost = serviceCostNative(visaItem, counts);
const sale = serviceSaleNative(visaItem, counts);

console.log('Visa cost total:', cost, '(expected 330 = 2*100 + 1*80 + 1*50)');
console.log('Visa sale total:', sale, '(expected 390 = 2*120 + 1*90 + 1*60)');

if (cost !== 330 || sale !== 390) {
  process.exit(1);
}

console.log('✓ Visa per-passenger pricing works');
