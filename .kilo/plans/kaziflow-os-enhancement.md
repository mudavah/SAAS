# KaziFlow OS — Implementation Plan

## ROLE
Principal Software Engineer / Staff Architect evolving an existing production SaaS platform.

## GOAL
Transform KaziFlow into an AI-powered Business Operating System for Kenyan SMEs.

## NON-NEGOTIABLE RULES
- Never rebuild, replace, or duplicate existing code
- Always extend existing functionality
- Preserve backwards compatibility
- Follow existing coding conventions
- Production-ready code only

---

## PHASE 1: Database Schema Extensions
**Priority: HIGH**
**Files Modified:**
- `src/db/schema.ts` — Add new enums and tables

### New Enums
- `inventoryCategoryEnum` — "product", "service"
- `stockMovementTypeEnum` — "purchase", "sale", "adjustment", "transfer", "return", "damage"
- `purchaseOrderStatusEnum` — "draft", "ordered", "received", "cancelled"
- `accountTypeEnum` — "asset", "liability", "equity", "income", "expense"
- `journalEntryStatusEnum` — "draft", "posted", "reversed"
- `etimsInvoiceStatusEnum` — "pending", "submitted", "validated", "failed", "cancelled"

### New Tables
- `inventoryCategories` — id, userId, name, description, type (product/service)
- `inventoryBrands` — id, userId, name, description
- `inventorySuppliers` — id, userId, name, email, phone, address, notes
- `inventoryWarehouses` — id, userId, name, location, isDefault
- `inventoryProducts` — id, userId, categoryId, brandId, name, sku, barcode, description, costPrice, sellingPrice, unit, minStockLevel, maxStockLevel, reorderPoint, isActive
- `inventoryStock` — id, userId, productId, warehouseId, quantity, reservedQuantity, avgCost
- `inventoryStockMovements` — id, userId, productId, warehouseId, type, quantity, referenceId, referenceType, notes, createdAt
- `inventoryPurchaseOrders` — id, userId, supplierId, status, orderDate, expectedDate, notes, createdAt
- `inventoryPurchaseOrderItems` — id, purchaseOrderId, productId, quantity, unitCost, receivedQuantity
- `inventoryStockAdjustments` — id, userId, productId, warehouseId, quantity, reason, createdAt

### Bookkeeping Tables
- `chartOfAccounts` — id, userId, code, name, type, parentId, isActive
- `journalEntries` — id, userId, date, description, status, createdAt
- `journalEntryLines` — id, journalEntryId, accountId, debit, credit, description

### eTIMS Tables
- `etimsConfig` — id, userId, tin, pin, deviceId, apiKey, environment, isActive
- `etimsInvoices` — id, userId, invoiceId, etimsInvoiceNumber, status, submissionResponse, submittedAt, createdAt
- `etimsComplianceLogs` — id, userId, action, details, createdAt

### Migration Strategy
1. Add enums first
2. Add all new tables
3. Preserve all existing relationships
4. No changes to existing tables

---

## PHASE 2: Inventory Module Core
**Priority: HIGH**
**Files Created:**
- `src/app/api/inventory/...` — CRUD endpoints
- `src/app/dashboard/inventory/...` — UI pages
- `src/components/inventory/...` — Reusable components

### API Routes
- `GET/POST /api/inventory/categories`
- `GET/POST /api/inventory/brands`
- `GET/POST /api/inventory/suppliers`
- `GET/POST /api/inventory/warehouses`
- `GET/POST /api/inventory/products`
- `GET/PATCH /api/inventory/products/[id]`
- `GET/POST /api/inventory/stock-movements`
- `GET/POST /api/inventory/purchase-orders`
- `POST /api/inventory/purchase-orders/[id]/receive`
- `POST /api/inventory/stock-adjustments`

### UI Pages
- `/dashboard/inventory` — Overview with low stock alerts
- `/dashboard/inventory/products` — Product list
- `/dashboard/inventory/products/new` — Add product
- `/dashboard/inventory/products/[id]` — Product detail
- `/dashboard/inventory/categories` — Category management
- `/dashboard/inventory/suppliers` — Supplier management
- `/dashboard/inventory/purchase-orders` — Purchase orders
- `/dashboard/inventory/stock` — Stock overview

---

## PHASE 3: Bookkeeping Module
**Priority: HIGH**
**Files Created:**
- `src/app/api/bookkeeping/...` — CRUD endpoints
- `src/app/dashboard/bookkeeping/...` — UI pages

### API Routes
- `GET/POST /api/bookkeeping/accounts`
- `GET/POST /api/bookkeeping/journal-entries`
- `GET/PATCH /api/bookkeeping/journal-entries/[id]`

### UI Pages
- `/dashboard/bookkeeping` — Overview
- `/dashboard/bookkeeping/chart-of-accounts`
- `/dashboard/bookkeeping/journal-entries`
- `/dashboard/bookkeeping/reports` — P&L, Balance Sheet

---

## PHASE 4: KRA eTIMS Compliance
**Priority: MEDIUM**
**Files Created:**
- `src/app/api/etims/...` — eTIMS endpoints
- `src/app/dashboard/compliance/...` — UI pages
- `src/lib/etims.ts` — eTIMS service

### API Routes
- `GET/POST /api/etims/config`
- `POST /api/etims/invoices/submit`
- `GET /api/etims/invoices`
- `GET /api/etims/status`

### UI Pages
- `/dashboard/compliance` — Compliance dashboard
- `/dashboard/compliance/config` — eTIMS setup
- `/dashboard/compliance/invoices` — eTIMS invoice status

---

## PHASE 5: M-Pesa Automation Enhancements
**Priority: MEDIUM**
**Files Modified:**
- `src/lib/mpesa.ts` — Add reconciliation utilities
- `src/app/api/payments/route.ts` — Enhanced matching

### Enhancements
- Auto-match M-Pesa payments to invoices by amount + phone
- Payment status auto-updates via webhook/callback
- Customer SMS/email notifications on payment
- Business analytics dashboard integration

---

## PHASE 6: Dashboard Enhancements
**Priority: MEDIUM**
**Files Modified:**
- `src/app/dashboard/page.tsx` — Enhanced stats
- `src/components/dashboard/sidebar.tsx` — New nav items
- `src/components/dashboard/overview.tsx` — New widgets

### New Stats
- Inventory value
- Low stock count
- Pending purchase orders
- eTIMS compliance status
- AI insights summary
- Business health score

---

## PHASE 7: AI Integration Across Modules
**Priority: MEDIUM**
**Files Modified:**
- `src/lib/ai.ts` — New AI types and prompts
- `src/app/api/ai/route.ts` — Extended AI types

### New AI Features
- `stock_shortage_prediction` — Predict stock shortages
- `purchase_recommendation` — Recommend reorder quantities
- `expense_anomaly` — Identify unusual spending
- `revenue_forecast` — Forecast monthly revenue
- `invoice_summary` — Summarize overdue invoices
- `business_insights` — Generate business insights

---

## IMPLEMENTATION ORDER
1. Phase 1: Schema extensions
2. Phase 2: Inventory module
3. Phase 3: Bookkeeping module
4. Phase 4: eTIMS compliance
5. Phase 5: M-Pesa automation
6. Phase 6: Dashboard enhancements
7. Phase 7: AI integration

Each phase preserves backwards compatibility. Existing APIs, pages, and database tables remain untouched.
