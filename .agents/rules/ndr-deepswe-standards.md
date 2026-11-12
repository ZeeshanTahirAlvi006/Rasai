---
trigger: always_on
description: NDR Middleware DeepSWE coding, commenting, Mongoose query hygiene, and concurrency standards.
---

# NDR DeepSWE Coding & Architecture Standards

Across all features and modules in the NDR project, every agent and developer must adhere to these established architectural, concurrency, query hygiene, error-handling, and commenting invariants (as specified in Spec §3.4, §3.5, and codebase audits).

---

## 1. Three-Tier Response & Error Contract (Spec §3.5)

- **Services (`*.service.ts`)**:
  - Always return a standardized `ServiceResponse<T>` envelope:
    ```typescript
    { success: true, status: number, message: string, data: T, error: null }
    ```
  - Never return `{ success: false }` objects, raw `null`, or boolean failure flags.
  - On validation or business logic errors, always throw an `AppError`:
    ```typescript
    throw new AppError(status, message, errorCode, data?);
    ```
  - For idempotent operations (e.g., logging out an already revoked session), return `{ success: true, status: 200, ... }`.
- **Controllers (`*.controller.ts`)**:
  - Keep controllers thin and wrap every route handler in `asyncHandler`.
  - Extract and cast route parameters explicitly (e.g., `String(req.params.id)`) to comply with Express 5 strict typing.
  - Delegate all business logic to service methods and format the HTTP response directly from the service result:
    ```typescript
    res.status(result.status).json(result);
    ```
- **Routes (`*.router.ts`)**:
  - Place authentication (`requireAuth`) and schema validation middleware (`validate(Schema)`) before controller handlers.
  - All state mutation, circuit breaker control-plane, and administration endpoints MUST enforce `requireAuth`.

---

## 2. Mongoose Read Query Hygiene (Spec §3.4)

- **Mandatory Projection & Lean Execution**:
  - Every read-only query MUST append `.select('...').lean().exec()`.
  - Never hydrate full Mongoose documents unless mutating entities via `.save()`.
  - Exclude large nested child arrays (e.g., `errors` in import batches, `messages` in conversation lists) from listing `.select(...)` projections and only fetch them on detail queries.
- **Modern Mongoose 9 Options & Deprecations**:
  - Never use `{ new: true }` on `findOneAndUpdate` or `findOneAndReplace`; always use `{ returnDocument: 'after' }`.
  - Reserved schema pathnames (`errors`, `isNew`) MUST specify `suppressReservedKeysWarning: true` in schema options.
  - Schemas with TTL indexes on `createdAt` MUST enable `{ timestamps: true }` so `createdAt` is populated.
- **TTL Indexes & Maintenance**:
  - Every high-volume collection (events, logs, telemetry, audit trails, idempotent tokens) MUST define an explicit TTL index.
  - Ensure all collection indexes (including `User`, `Session`, and `Otp`) are registered in `backend/src/scripts/syncIndexes.ts`.
  - Register every new Mongoose model in `backend/test/setup.ts` so in-memory replica set tests initialize all indexes.
  - In Jest tests, either query with `.lean()` or assert scalar fields (`doc.coordinates?.lat`) rather than running `toEqual()` directly on hydrated Mongoose subdocument proxies.

---

## 3. Concurrency, Leases & BullMQ Resource Lifecycle

- **Optimistic Concurrency & Worker Leases**:
  - Guard state projections against race conditions using optimistic concurrency counters (`stateVersion`).
  - Guard background worker claims and lease mutations with generation tokens (`leaseVersion` or `claimToken`).
  - Refresh token rotation in authentication services MUST execute atomically via `findOneAndUpdate({ refreshTokenHash, revoked: false }, { $set: { ... } }, { returnDocument: 'after' })` to prevent rotation race conditions.
- **Redis Connection Management**:
  - Explicitly track externally supplied `IORedis` instances (e.g., `queueConnection`, `workerConnection`).
  - Ensure every Redis connection is explicitly closed via `.quit()` during graceful shutdown in `backend/src/server.ts`.
- **Timer & Memory Lifecycle**:
  - Always invoke `.unref?.()` on background `setInterval` timers so they do not block clean process termination during tests or shutdowns.
  - In-memory cache structures (`Map`, `Set`) must prune empty keys when entries expire or are released.
  - Frontend Web Audio and canvas animations must implement lifecycle disposal (`dispose()`) and avoid allocating audio buffers on high-frequency scroll events.

---

## 4. Commenting & Documentation Style

- **File Header Comments**:
  - Begin every implementation file with `// src/<module>/<file>.ts` followed by a concise 1-line statement of module purpose.
- **Intent-Focused Comments**:
  - Write concise, single-line intent comments explaining *why* a concurrency guard, index, or non-obvious branch exists, referencing spec or audit IDs where appropriate:
    ```typescript
    // Fence by leaseVersion to prevent expired worker overwrite (B2-RC-01)
    ```
  - Avoid redundant, verbose JSDoc comments that simply mirror TypeScript parameter and return types.

---

## 5. Frontend Console Integration & Hygiene

- **Typed API Clients & Single-Flight Mutex**:
  - Every backend module must be mirrored by a typed client in `frontend/src/api/*Api.ts`.
  - Axios 401 token refresh interceptors MUST employ a single-flight Promise mutex so concurrent requests coalesce onto one refresh call without session invalidation.
- **Live API Telemetry**:
  - Every client invocation must record latency, HTTP status, and response payload via `recordLog(...)` from `frontend/src/api/telemetry.ts` for the live API Inspector console.
- **Zero Server-Side Dependency Bleed**:
  - Never include Node.js C++ or native server packages (e.g., `sharp`, `fs`, `crypto`) in frontend `package.json`.

---

## 6. External Adapters, Webhooks & Export Security

- **Bounded Outbound HTTP Timeouts**:
  - Every outbound `fetch()` or HTTP call to external APIs (Carriers, Meta, Google Drive) MUST enforce an explicit `AbortSignal.timeout(ms)` (8s–15s) so hung upstream sockets never stall BullMQ workers.
- **Raw-Byte Webhook Signature Verification**:
  - Signed webhooks must verify HMAC signatures against `req.rawBody` buffers using `crypto.timingSafeEqual` (checking buffer byte lengths first), never `JSON.stringify(req.body)`.
- **CSV Formula Injection Neutralization**:
  - All CSV exports must sanitize cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prepending `'` prior to RFC-4180 quoting.

---

## 7. Cinematic Scrollytelling & 3D Vector Rendering Standards

- **Unified Sticky Stage & Zero-Re-Render Scroll Physics**:
  - Orchestrate multi-scene scroll films inside a single unified `sticky top-0 h-dvh` viewport using imperative `forwardRef` scene handles (`setProgress(progress)`, `setActive(active)`) to prevent sticky-handoff seams.
  - Drive scroll progress via delta-time (`dt`) normalized exponential damping (`DAMPING_LAMBDA = 9.5`, `MAX_PROGRESS_SPEED`, `MAX_FLING_LEAD`) inside `requestAnimationFrame`, mutating DOM/SVG refs directly in `applyScrollMutations(progress)` with zero React state updates during scroll.
  - Gate offscreen scenes and pause ambient CSS/canvas loops via `IntersectionObserver` (`visibility: hidden`, paused animation classes), and respect `@media (prefers-reduced-motion: reduce)`.
- **100% Native Vector SVG Scaling & High-DPI Compositor Hygiene**:
  - Never apply large CSS `transform: scale(...)` with `will-change: transform` to zoomed containers (prevents bitmap rasterization blur and QHD+/4K GPU tile eviction rectangles).
  - Execute large camera zooms by mutating `<g transform="translate(...) scale(...)">` attributes inside `<svg viewBox="0 0 1920 1080">`, and render full-bleed volumetric clouds on a single-texture `<canvas>` (`dpr <= 1.5`).
- **3D Perspective Accuracy, Grounding & Visual Restraint**:
  - All 3D SVG characters and props must strictly obey the room's camera horizon and perspective (e.g., rear-facing laptops show only the 16:10 unibody shell, chamfered edges, hinge exhaust vents, and a single centered emblem without text clutter).
  - Lock outer hardware chassis dimensions on 3D devices (smartphones, tablets, laptops) with a fixed-height `overflow-hidden` screen viewport; scroll new chat bubbles or UI states internally via `translate3d(0, -y, 0)` so the physical device size never changes.
  - Ground every surface prop with multi-layer ambient + high-opacity contact shadows.
  - Avoid hanging ceiling clutter that collides with upper framing, strip noisy rotating card halos/developer HUDs from narrative scenes, and keep story captions concise (max 2 lines, legible `>= 11px–13px` typography).

---

## 8. Table Styling & Project Terminology Standards

- **Zero Background Pills for Table Items**:
  - Never add background pills, capsule shapes, or border boxes for table items (such as Carrier badges or Status badges).
  - Table items must always render as clean, unadorned plain text (with semantic text color styling only).
- **Price/Amount Terminology**:
  - Always use "Price" or "Amount" instead of "COD" across the project UI, table column headers, and display labels.



