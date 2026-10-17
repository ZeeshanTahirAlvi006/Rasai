import { z } from 'zod'
import { CARRIERS, Carrier } from '../types/index.js'


// re-useable carrier parameter schema
export const CarrierParamSchema = z.object({
    params: z.object({
        carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
            error: 'Invalid carrier',
        }),
    })
})
// record failure schema POST
export const RecordFailureSchema = z.object({
    params: z.object({
        carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
            error: 'Invalid carrier',
        }),
        threshold: z.number()
            .int()
            .positive()
            .optional(),
        baseBackOffMs: z.number()
            .int()
            .positive()
            .optional(),
        errorCode: z.string()
            .optional()
    })
});
//execute under breaker schema POST
export const ExecuteBreakerSchema = z.object({
    params: z.object({
        carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
            error: "invalid carrier",
        })
    }).strict(),
    body: z.object({
        simulateFailure: z.boolean()
            .default(false)
            .optional(),
        useFallback: z.boolean()
            .default(false)
            .optional()

    }).strict()
        .optional()
})
// track shipment schema POST
export const TrackShipmentSchema = z.object({
    body: z.object({
        carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
            error: "invalid carrier",
        }),
        trackingNumber: z.string()
            .trim()
            .min(1, "tracking number is required"),
        merchantId: z.string().trim().optional()
    }).strict()
})
