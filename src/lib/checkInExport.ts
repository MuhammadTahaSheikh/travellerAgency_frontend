import { CheckInRecord } from '@/types';
import { formatDate } from '@/components/ui/Common';
import { downloadTextFile, escapeHtml, rowsToCsv, wrapExportHtml } from '@/lib/exportDownload';
import { downloadHtmlAsPdf } from '@/lib/pdfDownload';

function checkInRows(checkIns: CheckInRecord[]) {
  return checkIns.map((record) => {
    const customer = record.booking?.customer;
    const customerLabel = customer?.customerType === 'B2B' && customer.companyName
      ? customer.companyName
      : customer ? `${customer.firstName} ${customer.lastName}` : '';
    const vendors = record.booking?.serviceItems
      ?.map((item) => item.vendor?.name)
      .filter(Boolean)
      .join(', ') || '';
    const eventDate = record.scheduleType === 'TRANSPORT'
      ? record.transportDate
      : record.checkInDate;

    return {
      type: record.scheduleType || 'HOTEL',
      guest: record.guestName || customerLabel,
      customer: customerLabel,
      b2b: customer?.customerType === 'B2B' ? 'Yes' : 'No',
      hotel: record.hotelName || '',
      pickup: record.pickupLocation || '',
      dropoff: record.dropoffLocation || '',
      room: record.roomDetails || '',
      date: eventDate ? formatDate(eventDate) : '',
      vendors,
      vendorPosted: record.vendorPosted ? 'Yes' : 'No',
      booking: record.booking?.bookingNumber || '',
      details: record.scheduleType === 'TRANSPORT'
        ? `${record.pickupLocation || ''} → ${record.dropoffLocation || ''}`
        : record.hotelName || '',
    };
  });
}

function assertRows(rows: ReturnType<typeof checkInRows>) {
  if (!rows.length) throw new Error('No schedules to export. Adjust filters or add schedules first.');
}

export function exportCheckInsCsv(checkIns: CheckInRecord[], filename: string) {
  const rows = checkInRows(checkIns);
  assertRows(rows);
  const headers = ['Type', 'Guest', 'Customer', 'B2B', 'Hotel', 'Pickup', 'Dropoff', 'Room', 'Date', 'Vendors', 'Vendor Posted', 'Booking'];
  const data = rows.map((row) => [
    row.type, row.guest, row.customer, row.b2b, row.hotel, row.pickup, row.dropoff, row.room, row.date, row.vendors, row.vendorPosted, row.booking,
  ]);
  const csvName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  downloadTextFile(rowsToCsv(headers, data), csvName, 'text/csv;charset=utf-8');
}

export async function exportCheckInsPdf(checkIns: CheckInRecord[], filename: string) {
  const rows = checkInRows(checkIns);
  assertRows(rows);
  const tableRows = rows
    .map((row) => `<tr>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.guest)}</td>
      <td>${escapeHtml(row.customer)}</td>
      <td>${escapeHtml(row.b2b)}</td>
      <td>${escapeHtml(row.details)}</td>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.vendors)}</td>
      <td>${escapeHtml(row.vendorPosted)}</td>
      <td>${escapeHtml(row.booking)}</td>
    </tr>`)
    .join('');

  const html = wrapExportHtml(
    'Arrival Sheet',
    `<h1>Arrival Sheet</h1>
     <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())} · ${rows.length} record(s)</p>
     <table>
       <thead><tr><th>Type</th><th>Guest</th><th>Customer</th><th>B2B</th><th>Details</th><th>Date</th><th>Vendors</th><th>Vendor Posted</th><th>Booking</th></tr></thead>
       <tbody>${tableRows}</tbody>
     </table>`
  );

  await downloadHtmlAsPdf(html, { filename, orientation: 'landscape' });
}
