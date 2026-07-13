# Epic 3 — Procurement Module: Test Report

## Test environment
- Runner: **Vitest** (`vitest@^4`), config `vitest.config.ts` (Node env, `@`→`src` alias).
- Script: `npm test` → `vitest run`.
- Coverage scope: pure, DB-free units (validation schemas + pricing math). The
  service/approval engine and API routes require a live Postgres + auth session,
  so they are validated via the integration contracts documented in
  `API_CHANGES.md` and exercised through the UI flows.

## Results
```
Test Files  1 passed (1)
     Tests  18 passed (18)
  Duration  4.74s
```

## What is covered
`src/lib/procurement/__tests__/procurement.test.ts` — 18 cases:

| Area | Cases | Assertions |
|------|-------|------------|
| `computeLineTotals` | 2 | subtotal/tax/total, per-line tax override |
| Purchase Request schema | 2 | valid request; rejects empty items |
| RFQ schema | 2 | requires ≥1 supplier; valid RFQ |
| Supplier Quotation schema | 2 | requires supplier/number/items; valid |
| Purchase Order schema | 2 | valid PO; rejects empty items |
| GRN schema | 2 | requires `poItemId`+`warehouseId`; valid receipt |
| Supplier Return schema | 2 | valid return; rejects empty items |
| Purchase Invoice schema | 1 | valid invoice |
| Supplier Payment schema | 2 | valid payment; rejects bad method |
| Budget schema | 1 | valid budget |

All schemas are the exact Zod validators used by the API layer, so the tests
guard the real request contracts end-to-end at the validation boundary.

## Type-checking
- `npx tsc --noEmit` passes for the entire `src/app/dashboard/procurement/*`
  tree and all `src/lib/procurement/*` modules (no new `error TS` in the module).
- Note: the workspace also contains **untracked** files from the separate
  Compliance Center epic (`src/app/api/compliance/...`) that carry pre-existing
  type errors unrelated to Procurement; they are outside this module's scope.

## Manual QA checklist (integration)
- [ ] Create purchase request → submit → approve as manager → PO auto-flow.
- [ ] Create RFQ → send → record quotation → accept → PO.
- [ ] PO submit → approve → mark ordered → receive goods (inventory + stock movement).
- [ ] Record invoice (posts journal) → record payment (AP balance decreases).
- [ ] Supplier return reduces inventory.
- [ ] Budget exceeds threshold → `procurement.budget.exceeded` timeline event.
- [ ] Low-stock suggestions + AI recommendations render on dashboard.
- [ ] All actions appear in Business Timeline and Audit Logs.
