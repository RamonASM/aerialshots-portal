# Comprehensive Codebase Audit & Scrubbing Report
**Date:** January 2, 2026
**Target:** Aerial Shots Portal Codebase
**Status:** CRITICAL ISSUES IDENTIFIED

## Executive Summary
A comprehensive, granular, and deep-dive audit of the `aerialshots-portal` codebase has been completed. While the platform utilizes modern technologies (Next.js 16, React 19, Supabase), significant systemic risks were identified that jeopardize stability, data integrity, and security. 

**The platform currently DOES NOT qualify as "World-Class" due to specific data corruption risks and security gaps.**

---

## 🚨 Tier 1: Critical Risks (Must Fix Immediately)
*These issues can cause data loss, financial discrepancies, or security breaches.*

### 1. Data Integrity: Non-Atomic Order Creation ("Fake Transactions")
*   **Location:** `src/app/api/orders/route.ts`
*   **The Issue:** The creation of an Order and its associated Property Listing happens in separate database calls without a transaction.
    1.  `INSERT INTO orders`
    2.  `INSERT INTO properties` (If this fails, the Order remains!)
*   **Risk:** "Orphaned Orders" that exist without a property, breaking the dashboard and fulfillment workflows.
*   **Fix:** Wrap logic in a **Supabase RPC (PostgreSQL Transaction)** function to ensure all-or-nothing execution.

### 2. Stability: "Zombie" Processes in Skills Engine
*   **Location:** `src/lib/skills/executor.ts` (Lines ~235-245)
*   **The Issue:** The `executeWithTimeout` function uses `Promise.race`. If a task times out, the original promise **continues running** in the background.
*   **Risk:** Double-writes to the database, race conditions, and inexplicable state mutations occurring long after a job was marked "Failed."
*   **Fix:** Implement `AbortController` to genuinely cancel the underlying task upon timeout.

### 3. Security: Privilege Escalation (RLS Bypass)
*   **Location:** `supabase/migrations/` (e.g., `20241229_003_auth_user_id_fix.sql`) & `src/lib/supabase/admin.ts`
*   **The Issue:** 
    *   Widespread use of `createAdminClient` which bypasses Row Level Security.
    *   `SECURITY DEFINER` SQL functions that do not explicitly validate the caller's permissions.
*   **Risk:** A malicious user or a bug in the code could allow modification of *any* user's credits or data.
*   **Fix:** strict audit of all `SECURITY DEFINER` functions; enforce RLS by default; restrict `admin` client usage to background workers only.

### 4. Financial Integrity: Webhook "Double-Spend"
*   **Location:** `src/app/api/webhooks/stripe-connect/route.ts`
*   **The Issue:** Lack of idempotency checks. Payment providers guarantee "at least once" delivery, meaning webhooks can fire twice for the same event.
*   **Risk:** Double-crediting user accounts or triggering duplicate fulfillment workflows.
*   **Fix:** Implement a `processed_events` table to track and ignore duplicate Event IDs.

---

## ⚠️ Tier 2: Major Architectural Issues
*These issues affect scalability, maintainability, and long-term reliability.*

### 1. State Management: "Split-Brain" Store
*   **Location:** `src/stores/useBookingStore.ts`
*   **The Issue:** Zustand persistence saves booking data to `localStorage` but never validates it against the server upon reload.
*   **Risk:** Users submitting orders with stale pricing or invalid configurations from days ago.
*   **Fix:** Add a `version` key and a hydration handshake that validates the cart against current server rules.

### 2. Database Performance: Missing Indexes
*   **Location:** `supabase/CONSOLIDATED_SCHEMA.sql`
*   **The Issue:** Heavy reliance on `jsonb` columns (`metadata`, `services`) without GIN indexes.
*   **Risk:** Queries will degrade to **Full Table Scans** as data grows, causing API timeouts.
*   **Fix:** Add `CREATE INDEX ON table USING gin (column)` for all queried JSONB fields.

### 3. Type Safety: Widespread `as any`
*   **Location:** 500+ instances (e.g., `src/lib/credits/service.ts`, `src/lib/supabase/`)
*   **The Issue:** Developers are manually casting responses `as any` instead of using generated types.
*   **Risk:** Runtime crashes when DB schema changes; defeats the purpose of TypeScript.
*   **Fix:** Run `supabase gen types` and replace `as any` with strict interfaces.

### 4. Security: API Authentication Gaps
*   **Location:** `src/middleware.ts`
*   **The Issue:** Global middleware explicitly *excludes* `/api` routes.
*   **Risk:** New API routes are public by default. If a developer forgets `requireAuth()`, data is exposed.
*   **Fix:** Update middleware to include `/api` or implement a global API guard.

### 5. Observability: Logging Blind Spots
*   **Location:** Global
*   **The Issue:** 1,100+ raw `console.log` calls bypassing the structured `src/lib/logger.ts`.
*   **Risk:** Impossible to debug production issues effectively; logs won't aggregate correctly in monitoring tools.
*   **Fix:** ESLint rule to ban `console.log`; mass-refactor to use `logger.info()`.

---

## 🧹 Tier 3: Polish & Maintenance (The "World-Class" Gap)

### 1. PWA & Assets
*   **Issue:** `src/app/manifest.ts` references icons (`/icons/icon-192x192.png`) that **do not exist** in `public/`.
*   **Impact:** Broken PWA installation; 404 errors in console.

### 2. Code Hygiene
*   **Issue:** 61+ "TODO" comments in production code (e.g., `src/lib/analytics/reports/revenue.ts`).
*   **Impact:** Hidden technical debt and potential unfinished features.

### 3. Input Validation
*   **Issue:** Regex for phone numbers (`src/lib/validations`) and `Number()` parsing in `quote/route.ts` are fragile.
*   **Impact:** Potential ReDoS attacks or `NaN` pricing errors.

### 4. Mobile Responsiveness
*   **Issue:** Complex data grids in Dashboard/Booking likely break on 320px screens.
*   **Impact:** Poor user experience on mobile devices.

---

## 🛠 Recommended Action Plan

1.  **Stop the Bleeding:** Implement **Supabase RPC for Orders** and **Stripe Idempotency**. (Protect Data/Money)
2.  **Stabilize:** Fix **Skills "Zombie" processes** and **Store Hydration**. (Protect Logic)
3.  **Harden:** Audit **RLS/Security** and **add DB Indexes**. (Protect System)
4.  **Polish:** Generate **PWA Assets**, remove **TODOs**, and enforce **Strict Linting**. (World-Class Standard)
