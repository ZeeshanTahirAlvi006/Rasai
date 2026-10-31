// src/manifestBatch/manifest.generator.ts
// Pure TypeScript generators for Courier Station Run-Sheet CSVs, PDF 1.4 documents, and Tier 3 wa.me escalation links.
export interface ManifestMetadata {
  stationCode: string;
  carrier: string;
  dateKey: string;
  totalParcels: number;
  totalCOD: number;
}

export interface ManifestParcelRow {
  trackingNumber: string;
  carrier: string;
  stationCode: string;
  status: string;
  rescheduledDate?: Date | string;
  orderValueCOD: number;
  customerPhoneMasked?: string;
  customerPhonePlain?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Escapes CSV cells to prevent Excel formula injection attacks (B3-BUG-03).
 * Neutralizes leading '=', '+', '-', '@', '\t', '\r'.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '""';
  let str = String(value);

  // If starts with dangerous spreadsheet formula triggers, prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an RFC-4180 CSV buffer with UTF-8 BOM for Pakistani courier stations.
 */
export function generateRunSheetCsvBuffer(
  meta: ManifestMetadata,
  parcels: ManifestParcelRow[],
): Buffer {
  const headers = [
    'Index',
    'Tracking Number',
    'Carrier',
    'Station Code',
    'Status',
    'Rescheduled Date (PKT)',
    'COD Amount (PKR)',
    'Customer Contact',
    'GPS Coordinates',
    'Google Maps Pin',
  ];

  const lines: string[] = [];

  // Summary metadata header
  lines.push(
    `# NDR RUN-SHEET MANIFEST | Station: ${meta.stationCode} | Carrier: ${meta.carrier} | Date: ${meta.dateKey} | Total Parcels: ${meta.totalParcels} | Total COD: PKR ${meta.totalCOD}`,
  );
  lines.push(headers.map(sanitizeCsvCell).join(','));

  parcels.forEach((p, idx) => {
    const reschedStr = p.rescheduledDate
      ? typeof p.rescheduledDate === 'string'
        ? p.rescheduledDate
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(p.rescheduledDate))
      : 'N/A';

    const coordsStr = p.coordinates
      ? `${p.coordinates.lat.toFixed(6)}, ${p.coordinates.lng.toFixed(6)}`
      : 'N/A';

    const mapsUrl = p.coordinates
      ? `https://www.google.com/maps?q=${p.coordinates.lat.toFixed(6)},${p.coordinates.lng.toFixed(6)}`
      : 'N/A';

    const phone = p.customerPhonePlain || p.customerPhoneMasked || 'N/A';

    const row = [
      idx + 1,
      p.trackingNumber,
      p.carrier,
      p.stationCode || meta.stationCode,
      p.status,
      reschedStr,
      p.orderValueCOD,
      phone,
      coordsStr,
      mapsUrl,
    ];

    lines.push(row.map(sanitizeCsvCell).join(','));
  });

  // Prepend UTF-8 BOM (\uFEFF)
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const content = Buffer.from(lines.join('\r\n'), 'utf8');
  return Buffer.concat([bom, content]);
}

/**
 * Generates a valid binary PDF 1.4 Run-Sheet document without external npm dependencies (B3-BUG-03).
 */
export function generateRunSheetPdfBuffer(
  meta: ManifestMetadata,
  parcels: ManifestParcelRow[],
): Buffer {
  const sanitizeText = (txt: string) =>
    txt.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // Build PDF text stream
  const streamLines: string[] = [];
  streamLines.push('BT');
  streamLines.push('/F1 16 Tf');
  streamLines.push('40 750 Td');
  streamLines.push(`(NDR COURIER STATION RUN-SHEET) Tj`);

  streamLines.push('/F1 10 Tf');
  streamLines.push('0 -20 Td');
  streamLines.push(
    `(${sanitizeText(`Carrier: ${meta.carrier}   |   Station: ${meta.stationCode}   |   Date: ${meta.dateKey}`)}) Tj`,
  );

  streamLines.push('0 -15 Td');
  streamLines.push(
    `(${sanitizeText(`Total Parcels: ${meta.totalParcels}   |   Total COD: PKR ${meta.totalCOD}   |   Generated: ${new Date().toISOString()}`)}) Tj`,
  );

  // Table Header
  streamLines.push('0 -25 Td');
  streamLines.push('/F1 9 Tf');
  streamLines.push(
    `(#  Tracking Number       Status                  COD (PKR)    Date (PKT)      Contact) Tj`,
  );

  streamLines.push('0 -8 Td');
  streamLines.push(
    `(------------------------------------------------------------------------------------------) Tj`,
  );

  // Rows (cap display at 40 rows per page in simple viewer)
  const displayParcels = parcels.slice(0, 40);
  displayParcels.forEach((p, idx) => {
    const reschedStr = p.rescheduledDate
      ? typeof p.rescheduledDate === 'string'
        ? p.rescheduledDate
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(p.rescheduledDate))
      : 'Pending';

    const num = String(idx + 1).padEnd(3, ' ');
    const trk = String(p.trackingNumber).slice(0, 20).padEnd(20, ' ');
    const st = String(p.status).slice(0, 22).padEnd(22, ' ');
    const cod = String(p.orderValueCOD).slice(0, 10).padEnd(12, ' ');
    const dt = reschedStr.slice(0, 12).padEnd(14, ' ');
    const ph = (p.customerPhonePlain || p.customerPhoneMasked || 'N/A').slice(0, 14);

    streamLines.push('0 -14 Td');
    streamLines.push(`(${sanitizeText(`${num} ${trk} ${st} ${cod} ${dt} ${ph}`)}) Tj`);
  });

  if (parcels.length > 40) {
    streamLines.push('0 -16 Td');
    streamLines.push(
      `(${sanitizeText(`... and ${parcels.length - 40} additional parcels in accompanying CSV manifest.`)}) Tj`,
    );
  }

  streamLines.push('ET');

  const contentStream = streamLines.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  // PDF Structure
  const objects: string[] = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    // 3: Page
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    // 4: Contents
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    // 5: Font
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let offset = 0;
  const header = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  offset += Buffer.byteLength(header, 'utf8');

  const xrefEntries: string[] = ['0000000000 65535 f \n'];
  for (const obj of objects) {
    const entry = String(offset).padStart(10, '0') + ' 00000 n \n';
    xrefEntries.push(entry);
    offset += Buffer.byteLength(obj, 'utf8');
  }

  const xrefOffset = offset;
  const xref = `xref\n0 ${objects.length + 1}\n` + xrefEntries.join('');
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = header + objects.join('') + xref + trailer;
  return Buffer.from(fullPdf, 'utf8');
}

/**
 * Builds the Tier 3 One-Click WhatsApp Escalation deep link (wa.me) (Spec §8.2, B3-BUG-06).
 */
export function buildWhatsAppEscalationLink(
  parcel: {
    trackingNumber: string;
    carrier: string;
    destinationStationCode?: string;
    orderValueCOD: number;
    rescheduledDate?: Date | string;
    customerPhonePlain?: string;
    customerCoordinates?: { lat: number; lng: number };
  },
  stationWhatsAppPhone?: string,
): string {
  const recipientDigits = stationWhatsAppPhone
    ? stationWhatsAppPhone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
    : '';

  const reschedStr = parcel.rescheduledDate
    ? typeof parcel.rescheduledDate === 'string'
      ? parcel.rescheduledDate
      : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(parcel.rescheduledDate))
    : 'Immediate Rescue';

  const mapsUrl =
    parcel.customerCoordinates && Number.isFinite(parcel.customerCoordinates.lat)
      ? `https://www.google.com/maps?q=${parcel.customerCoordinates.lat.toFixed(6)},${parcel.customerCoordinates.lng.toFixed(6)}`
      : 'Address on parcel label';

  const customerPhone = parcel.customerPhonePlain || 'On shipping label';

  const textLines = [
    `🚨 *NDR DELIVERY RESCUE DISPATCH*`,
    `📦 *Tracking #:* ${parcel.trackingNumber} (${parcel.carrier})`,
    `🏢 *Destination Station:* ${parcel.destinationStationCode || 'UNASSIGNED'}`,
    `📅 *Requested Re-attempt Date:* ${reschedStr}`,
    `💰 *COD Amount:* PKR ${parcel.orderValueCOD}`,
    `📞 *Customer Phone:* ${customerPhone}`,
    `📍 *Doorstep GPS Location:* ${mapsUrl}`,
    `\nPlease prioritize this doorstep delivery with the assigned route rider. Thank you!`,
  ];

  const encodedText = encodeURIComponent(textLines.join('\n'));

  return recipientDigits
    ? `https://wa.me/${recipientDigits}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}
