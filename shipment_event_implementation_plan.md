# Implementation Plan: Completing & Hardening `shipmentEvent` Module

This implementation plan details the exact architectural refactorings, optimizations, and test additions required to bring the [`shipmentEvent`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/src/shipmentEvent) module into 100% compliance with the [AI-DLC Master Implementation Plan (v2)](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/ndr_aidlc_planning_specification.md) (specifically §3.2, §3.4, §3.5, §5.7, §5.8, and Bolt 1 DoD / Gate 2 & Gate 7).

---

## 1. Goal Description

The `shipmentEvent` module acts as the core append-only immutable ledger of all parcel lifecycle events across couriers (PostEx, Trax, Leopards, TCS), customer WhatsApp conversations, and manual file imports.

While the fundamental ingestion flow and state-machine delegation (`applyEventDetailed`) are functional, the current implementation has several architectural gaps and coding hygiene violations:
1. **Unindexed Deduplication Query**: `bulkRecordShipmentEventsService` queries `find({ merchantId, eventKey: { $in: validKeys } })`, but there is no index on `eventKey` or `{ merchantId: 1, eventKey: 1 }`, causing high-volume collection scans.
2. **Missing Spec Audit Index**: The plan specifies `{ merchantId: 1, carrier: 1, trackingNumber: 1, occurredAt: 1 }` for historical ledger audits, which is currently absent.
3. **Inconsistent Error Contracts (§3.5)**: `listShipmentEventsService`, `getShipmentTimelineService`, and `getLedgerMetricsService` return `{ success: false, status: 400, ... }` instead of throwing typed `AppError` instances, breaking the unified error response lifecycle.
4. **Missing Query Projections (§3.4)**: Read queries retrieve complete Mongoose documents without `.select(...)`, loading unneeded fields and binary hashes into memory.
5. **Stray Imports**: `ShipmentEvent.utils.ts` contains accidental imports (`domain`, `zod/v4/...`).
6. **Zero Dedicated Test Coverage (Gate 2)**: There are no unit or integration tests for `shipmentEvent` single ingest, bulk ingest (up to 500 rows), cursor pagination, timeline, or ledger metrics.

---

## 2. User Review Required

> [!IMPORTANT]
> The following decisions were aligned during the `/grill-me` interview:
> 1. **Error Contract**: `listShipmentEventsService`, `getShipmentTimelineService`, and `getLedgerMetricsService` will be refactored to throw `AppError` instead of returning soft error payloads, ensuring consistent error responses across all endpoints via `errorHandler`.
> 2. **Index Strategy**: We will add compound index `{ merchantId: 1, eventKey: 1 }` to make the upfront deduplication batch query $O(\log N)$ fast, and add the audit index `{ merchantId: 1, carrier: 1, trackingNumber: 1, occurredAt: 1 }`.
> 3. **Query Projections**: All read queries (`listShipmentEventsService` and `getShipmentTimelineService`) will use explicit `.select(...)` projections to exclude binary `eventHash` and Mongoose document overhead.
> 4. **Test Suite**: A comprehensive test suite will be created in `test/shipmentEvent.service.test.ts` running against `MongoMemoryReplSet`.

---

## 3. Proposed Changes

### Component: `backend/src/shipmentEvent`

#### [MODIFY] [`ShipmentEvent.model.ts`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/src/shipmentEvent/ShipmentEvent.model.ts)
- Add compound index `{ merchantId: 1, eventKey: 1 }` with name `idx_merchant_event_key` for upfront batch deduplication checks in `bulkRecordShipmentEventsService`.
- Add compound audit index `{ merchantId: 1, carrier: 1, trackingNumber: 1, occurredAt: 1 }` with name `idx_merchant_carrier_tracking_occurred` as mandated by spec §3.2.

```typescript
// Indexes in ShipmentEvent.model.ts:
// 1. Parcel-localized compound unique index
shipmentEventSchema.index(
  { merchantId: 1, carrier: 1, trackingNumber: 1, eventHash: 1 },
  { unique: true, name: 'uniq_parcel_localized_event_hash' },
);

// 2. Upfront bulk deduplication index
shipmentEventSchema.index(
  { merchantId: 1, eventKey: 1 },
  { name: 'idx_merchant_event_key' },
);

// 3. Historical ledger audits
shipmentEventSchema.index(
  { merchantId: 1, carrier: 1, trackingNumber: 1, occurredAt: 1 },
  { name: 'idx_merchant_carrier_tracking_occurred' },
);

// 4. Ledger telemetry metrics & date-range aggregations
shipmentEventSchema.index(
  { merchantId: 1, occurredAt: -1 },
  { name: 'idx_merchant_occurred' },
);
```

---

#### [MODIFY] [`ShipmentEvent.utils.ts`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/src/shipmentEvent/ShipmentEvent.utils.ts)
- Remove unused stray imports:
  ```diff
  -import { create } from "domain";
  -import { parsedType } from "zod/v4/core/util.cjs";
  -import { no } from "zod/v4/locales";
  ```
- Ensure clean TypeScript typing for `ComputeEventKeyInput` and `computeEventKey`.

---

#### [MODIFY] [`ShipmentEvent.service.ts`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/src/shipmentEvent/ShipmentEvent.service.ts)
- Refactor `listShipmentEventsService`:
  - Throw `AppError` instead of returning `{ success: false, ... }` on invalid merchant ID, invalid carrier, invalid date format, or invalid date range:
    ```typescript
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
      throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    ```
  - Apply explicit field projection `.select('id eventKey carrier trackingNumber source rawStatus rawRemarks occurredAt batchId shipmentId disposition payload createdAt')` before `.lean().exec()`.
- Refactor `getShipmentTimelineService`:
  - Throw `AppError` on invalid merchant ID, missing carrier, missing tracking number, or when shipment/events are not found (`throw new AppError(404, 'Shipment not found', 'shipment_not_found')`).
  - Apply explicit `.select('eventKey source rawStatus rawRemarks occurredAt disposition batchId payload createdAt')` before `.lean().exec()`.
- Refactor `getLedgerMetricsService`:
  - Throw `AppError` on invalid merchant ID, invalid carrier, invalid date format, or invalid date range.
- In `bulkRecordShipmentEventsService`:
  - Pass `eventHash: toEventHashBuffer(row.eventKey)` explicitly in `command.event` to optimize Mongoose insert and avoid redundant hash calculations.

---

#### [MODIFY] [`ShipmentEvent.controller.ts`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/src/shipmentEvent/ShipmentEvent.controller.ts)
- Clean up the controller methods to follow the standard thin delegation pattern:
  Since the service throws `AppError` on failure, the controller only deals with the successful `ServiceResponse<T>` and returns `res.status(result.status).json(response)`. Any uncaught error bubbles via `asyncHandler` directly into the centralized `errorHandler`.

---

### Component: `backend/test`

#### [NEW] [`test/shipmentEvent.service.test.ts`](file:///c:/Users/lenovo/OneDrive/Desktop/NDR/backend/test/shipmentEvent.service.test.ts)
Create a comprehensive test suite covering all operational requirements:
1. **Single Event Ingestion (`recordShipmentEventService`)**:
   - Ingests event for existing shipment, updates projection, records `APPLIED` in ledger.
   - Detects duplicate retry and returns `DUPLICATE` with `200 OK` (v1 counter bug regression test).
   - Records `UNKNOWN_SHIPMENT` if parcel does not exist.
   - Throws `AppError(400)` on missing or invalid required fields (carrier, trackingNumber, merchantId).
2. **Bulk Event Ingestion (`bulkRecordShipmentEventsService`)**:
   - Ingests batch up to 500 rows, preserving 1-based index mapping.
   - Rejects batches exceeding 500 rows with `AppError(400, 'batch_limit_exceeded')`.
   - Soft-validates malformed rows (marking individual rows `STALE_REJECTED`) without aborting the batch.
   - Returns `207 Multi-Status` on partial failure / duplicates / rejections.
   - Performs upfront deduplication using the indexed `eventKey` query.
   - Synchronizes `ImportBatch` summary counters (`$inc: { rowCount, applied, duplicates, rejected }`).
3. **Cursor Pagination & Listing (`listShipmentEventsService`)**:
   - Keysets with `_id: { $lt: cursor }` and configurable limit (1–100).
   - Filters accurately by `carrier`, `source`, `disposition`, and date ranges (`startDate`, `endDate`).
   - Throws `AppError(400)` when `startDate > endDate`.
4. **Shipment Timeline (`getShipmentTimelineService`)**:
   - Returns events in chronological order (`occurredAt` ASC) with current status.
   - Throws `AppError(404)` if shipment does not exist and no ledger events are found.
5. **Ledger Metrics (`getLedgerMetricsService`)**:
   - Correctly aggregates counts by disposition and source using single `$facet` pipeline.
   - Zero-fills missing dispositions and sources.
   - Defaults to 30-day window unless `allTime: true`.

---

## 4. Verification Plan

### Automated Tests
Run the newly created test suite via Jest with in-memory replica set:
```bash
cd backend
npx jest test/shipmentEvent.service.test.ts --runInBand
```

Verify index synchronization:
```bash
cd backend
npm run db:index:sync
```

Run TypeScript compilation check to verify type safety:
```bash
cd backend
npx tsc --noEmit
```

### Manual Verification
1. Inspect MongoDB index definitions to verify:
   - `{ merchantId: 1, eventKey: 1 }`
   - `{ merchantId: 1, carrier: 1, trackingNumber: 1, occurredAt: 1 }`
2. Test sample error responses to verify uniform JSON envelope from `errorHandler`:
   ```json
   {
     "success": false,
     "message": "Shipment not found for tracking number 'XYZ'",
     "data": null,
     "error": "shipment_not_found"
   }
   ```
