// src/conversation/conversation.utils.ts
// Utility functions for Meta signature validation, date scheduling, and payload parsing.
import crypto from 'crypto';

export interface ParsedInboundTurn {
  wamid: string;
  from: string; // E.164 digits without leading '+' or with '+'
  timestamp: Date;
  type: 'BUTTON' | 'LIST' | 'LOCATION' | 'TEXT' | 'UNKNOWN';
  rawAction?: string; // e.g. ACTION_RESCHEDULE, ACTION_CORRECTION, ACTION_CANCEL
  targetShipmentId?: string; // extracted from payload if bound
  text?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Validates Meta's X-Hub-Signature-256 header using constant-time comparison on raw bytes (B3-RC-06).
 */
export function verifyMetaSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret || !rawBody) {
    return false;
  }

  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const providedHash = signatureHeader.slice(prefix.length).trim();
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');

  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(bodyBuffer)
    .digest('hex');

  const providedBuf = Buffer.from(providedHash, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Returns the next N available delivery dates in Asia/Karachi (PKT, UTC+5).
 * Skips Sundays as standard Pakistani couriers do not deliver on Sundays.
 */
export function getNextAvailablePktDates(
  fromDate: Date = new Date(),
  count = 3,
): Array<{ id: string; dateKey: string; label: string; date: Date }> {
  const dates: Array<{ id: string; dateKey: string; label: string; date: Date }> = [];
  const current = new Date(fromDate);

  // Start with tomorrow in PKT
  let daysForward = 1;

  while (dates.length < count) {
    const candidate = new Date(current.getTime() + daysForward * 24 * 60 * 60 * 1000);
    // Format in Asia/Karachi
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const keyFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      weekday: 'long',
    }).format(candidate);

    // Skip Sundays
    if (dayName.toLowerCase() !== 'sunday') {
      const dateKey = keyFormatter.format(candidate); // YYYY-MM-DD
      const friendlyDate = formatter.format(candidate);
      const label =
        daysForward === 1
          ? `Tomorrow (${friendlyDate})`
          : daysForward === 2
            ? `In 2 Days (${friendlyDate})`
            : friendlyDate;

      dates.push({
        id: `DATE_${dateKey}`,
        dateKey,
        label,
        date: new Date(`${dateKey}T12:00:00.000+05:00`),
      });
    }

    daysForward++;
    if (daysForward > 14) break; // sanity limit
  }

  return dates;
}

/**
 * Parses raw Meta WhatsApp inbound webhook message structure into a normalized turn.
 */
export function parseInboundCustomerMessage(body: any): ParsedInboundTurn | null {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return null;
  }

  const wamid: string = message.id || `wamid_${Date.now()}`;
  const from: string = String(message.from || '').trim();
  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000)
    : new Date();

  const msgType = message.type;

  // 1. Quick-reply button click from template
  if (msgType === 'button') {
    const rawPayload = String(message.button?.payload || '').trim();
    const [action, shipmentId] = rawPayload.split(':');
    return {
      wamid,
      from,
      timestamp,
      type: 'BUTTON',
      rawAction: action,
      targetShipmentId: shipmentId || undefined,
      text: message.button?.text || action,
    };
  }

  // 2. Interactive quick-reply button response
  if (msgType === 'interactive' && message.interactive?.type === 'button_reply') {
    const rawId = String(message.interactive.button_reply?.id || '').trim();
    const [action, shipmentId] = rawId.split(':');
    return {
      wamid,
      from,
      timestamp,
      type: 'BUTTON',
      rawAction: action,
      targetShipmentId: shipmentId || undefined,
      text: message.interactive.button_reply?.title || action,
    };
  }

  // 3. Interactive list item selection (e.g. date picker)
  if (msgType === 'interactive' && message.interactive?.type === 'list_reply') {
    const rawId = String(message.interactive.list_reply?.id || '').trim();
    const [action, shipmentId] = rawId.split(':');
    return {
      wamid,
      from,
      timestamp,
      type: 'LIST',
      rawAction: action,
      targetShipmentId: shipmentId || undefined,
      text: message.interactive.list_reply?.title || action,
    };
  }

  // 4. WhatsApp Location Pin
  if (msgType === 'location') {
    const lat = Number(message.location?.latitude);
    const lng = Number(message.location?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        wamid,
        from,
        timestamp,
        type: 'LOCATION',
        coordinates: { lat, lng },
        text: `Shared Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };
    }
  }

  // 5. Free-form text message
  if (msgType === 'text') {
    const text = String(message.text?.body || '').trim();
    return {
      wamid,
      from,
      timestamp,
      type: 'TEXT',
      text,
    };
  }

  return {
    wamid,
    from,
    timestamp,
    type: 'UNKNOWN',
    text: 'Unsupported message format',
  };
}
