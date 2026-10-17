import { createHash } from "crypto";
import { create } from "domain";
import { Types } from "mongoose";
import { parsedType } from "zod/v4/core/util.cjs";
import { no } from "zod/v4/locales";

export interface ComputeEventKeyInput {
    merchantId: string | Types.ObjectId
    carrier: string
    trackingNumber: string
    rawStatus?: string
    rawRemarks?: string
    occurredAt: Date | string | number | null
    carrierEventId?: string
}
function normalize(value?: string): string {
    if (!value) return '';
    return value.trim().replace(/\s+/g, ' ')
}

export const computeEventKey = (input: ComputeEventKeyInput): string => {
    const merchantId = String(input.merchantId ?? '').trim()
    const carrier = normalize(input.carrier).toUpperCase();
    const trackingNumber = normalize(input.trackingNumber).toUpperCase();
    if (!merchantId || !carrier || !trackingNumber) {
        throw new Error('merchantId ,carrier and trackingNumber are required')
    }

    const carrierEventId = normalize(input.carrierEventId)
    if (carrierEventId.length > 0) {
        const idPreImage = JSON.stringify(
            [
                'v1',
                'CARRIER_EVENT_ID',
                merchantId,
                carrier,
                trackingNumber,
                carrierEventId,
            ]
        )
        return createHash('sha256').update(idPreImage, 'utf8').digest('hex')
    }
    // B
    let occurredAt = 'NO_TIMESTAMP'
    if (input.occurredAt !== undefined &&
        input.occurredAt !== null &&
        String(input.occurredAt).trim() !== ''
    ) {

        const parseDate = input.occurredAt instanceof Date ? input.occurredAt : new Date(input.occurredAt);
        if (Number.isNaN(parseDate.getTime())) {
            throw new Error('invalid occurredAt date')
        }
        occurredAt = parseDate.toISOString()
    }
    const rawStatus = normalize(input.rawStatus || 'UNKNOWN').toUpperCase()
    const rawRemarks = normalize(input.rawRemarks).toLowerCase()

    const tuplePreImage = JSON.stringify([
        'v1',
        'CANONICAL_TUPLE',
        merchantId,
        carrier,
        trackingNumber,
        rawStatus,
        rawRemarks,
        occurredAt
    ])
    return createHash('sha256').update(tuplePreImage, 'utf8').digest('hex')
}

export const computeEventHashBinary = (input: ComputeEventKeyInput): Buffer => {
    const hex = computeEventKey(input);
    return Buffer.from(hex, 'hex').subarray(0, 16);
};