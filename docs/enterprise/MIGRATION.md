# Enterprise & Multi-Branch Management — Migration Summary

## Migration File: `drizzle/0016_enterprise_multi_branch.sql`

This migration is the **incremental schema extension** for Epic 10 — Enterprise & Multi-Branch Management. It is safe to apply on top of `0015_enterprise_analytics.sql`.

## 1. New Enums Created

| Enum Name | Values | Purpose |
|---|---|---|
| `branch_type` | `head_office`, `retail`, `warehouse`, `office`, `factory`, `other` | Classify branch operating model |
| `branch_status` | `active`, `inactive`, `suspended`, `closing` | Lifecycle state of a branch |
| `transfer_status` | `draft`, `pending`, `in_transit`, `received`, `completed`, `cancelled`, `rejected` | State machine for inter-branch transfers |
| `inter_branch_sale_status` | `draft`, `pending`, `approved`, `completed`, `cancelled` | State machine for inter-branch sales |

**Timeline enum extension**: The migration adds 13 new values to the existing `timeline_event_type` enum to cover enterprise events.

## 2. Tables Created

### 2.1 `enterprise_branches`
The core branch registry.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `user_id`, `organization_id`, `name`, `code`
- **Business Columns**: `type`, `status`, `address`, `city`, `country`, `phone`, `email`, `manager_id`, `timezone`, `currency`, `tax_id`, `settings` (JSONB), `is_default`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `enterprise_branches_org_idx` on `organization_id`
  - `enterprise_branches_user_idx` on `user_id`
  - `unique_org_branch_code` (unique) on `(organization_id, code)`
  - `enterprise_branches_manager_idx` on `manager_id`

### 2.2 `branch_members`
Assigns users to branches with roles.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `branch_id`, `user_id`
- **Business Columns**: `role_type` (references `role_type` enum), `custom_role_id` (references `roles.id`), `permissions` (JSONB array), `is_primary`
- **Timestamps**: `joined_at`, `created_at`
- **Indexes**:
  - `branch_members_org_idx` on `organization_id`
  - `branch_members_branch_idx` on `branch_id`
  - `branch_members_user_idx` on `user_id`
  - `unique_branch_user` (unique) on `(branch_id, user_id)`

### 2.3 `branch_pricing`
Branch-specific price adjustments for products/categories.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `branch_id`
- **Business Columns**: `product_id`, `category_id`, `price_adjustment_type` (default `percentage`), `price_adjustment_value` (numeric), `min_price`, `max_price`, `effective_from`, `effective_to`, `is_active`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `branch_pricing_org_idx` on `organization_id`
  - `branch_pricing_branch_idx` on `branch_id`
  - `branch_pricing_product_idx` on `product_id`
  - `unique_branch_product_pricing` (unique) on `(branch_id, product_id)`

### 2.4 `branch_tax_settings`
Branch-specific tax configuration.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `branch_id`, `tax_name`, `tax_type`, `rate`
- **Business Columns**: `is_compound`, `applies_to` (default `all`), `effective_from`, `effective_to`, `is_active`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `branch_tax_settings_org_idx` on `organization_id`
  - `branch_tax_settings_branch_idx` on `branch_id`

### 2.5 `inter_branch_transfers`
Header record for inventory transfers between branches.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `user_id`, `organization_id`, `transfer_number`, `from_branch_id`, `to_branch_id`
- **Business Columns**: `status` (enum), `notes`, `approved_by`, `approved_at`, `received_by`, `received_at`, `completed_at`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `inter_branch_transfers_org_idx` on `organization_id`
  - `inter_branch_transfers_user_idx` on `user_id`
  - `inter_branch_transfers_from_idx` on `from_branch_id`
  - `inter_branch_transfers_to_idx` on `to_branch_id`
  - `unique_org_transfer_number` (unique) on `(organization_id, transfer_number)`
  - `inter_branch_transfers_status_idx` on `status`

### 2.6 `inter_branch_transfer_items`
Line items for a transfer (product, quantity, cost).
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `transfer_id`, `product_id`, `quantity`, `unit_cost`
- **Business Columns**: `received_quantity` (default `0`), `notes`
- **Timestamps**: `created_at`
- **Indexes**:
  - `inter_branch_transfer_items_org_idx` on `organization_id`
  - `inter_branch_transfer_items_transfer_idx` on `transfer_id`
  - `inter_branch_transfer_items_product_idx` on `product_id`

### 2.7 `inter_branch_sales`
Header record for inter-branch sales transactions.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `user_id`, `organization_id`, `sale_number`, `from_branch_id`, `to_branch_id`, `currency`
- **Business Columns**: `status` (enum), `subtotal`, `tax_rate` (default 16%), `tax_amount`, `total`, `notes`, `approved_by`, `approved_at`, `completed_at`, `cancelled_at`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `inter_branch_sales_org_idx` on `organization_id`
  - `inter_branch_sales_user_idx` on `user_id`
  - `inter_branch_sales_from_idx` on `from_branch_id`
  - `inter_branch_sales_to_idx` on `to_branch_id`
  - `unique_org_inter_branch_sale_number` (unique) on `(organization_id, sale_number)`
  - `inter_branch_sales_status_idx` on `status`

### 2.8 `inter_branch_sale_items`
Line items for inter-branch sales.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `sale_id`, `product_id`, `description`, `quantity`, `unit_price`, `line_total`
- **Business Columns**: `discount` (default `0`), `tax_rate` (default 16%), `sort_order` (default `0`)
- **Timestamps**: `created_at`
- **Indexes**:
  - `inter_branch_sale_items_org_idx` on `organization_id`
  - `inter_branch_sale_items_sale_idx` on `sale_id`
  - `inter_branch_sale_items_product_idx` on `product_id`

### 2.9 `branch_approval_workflows`
Configurable approval chains per branch/resource type.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `user_id`, `organization_id`, `branch_id`, `name`, `resource_type`
- **Business Columns**: `description`, `steps` (JSONB array), `is_default`, `active`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `branch_approval_workflows_org_idx` on `organization_id`
  - `branch_approval_workflows_branch_idx` on `branch_id`
  - `branch_approval_workflows_resource_idx` on `resource_type`

### 2.10 `branch_approval_requests`
Instance of an approval workflow execution.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `branch_id`, `resource_type`, `title`, `status`
- **Business Columns**: `workflow_id`, `resource_id`, `current_step` (default `0`), `payload` (JSONB), `decided_by`, `decided_at`
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `branch_approval_requests_org_idx` on `organization_id`
  - `branch_approval_requests_branch_idx` on `branch_id`
  - `branch_approval_requests_resource_idx` on `(resource_type, resource_id)`
  - `branch_approval_requests_status_idx` on `status`

### 2.11 `enterprise_settings`
Organization-level enterprise configuration (singleton per org).
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`
- **Business Columns**: `consolidated_reporting`, `cross_branch_inventory_visibility`, `centralized_procurement`, `branch_approval_required`, `default_transfer_method`, `auto_approve_transfers_below` (numeric), `settings` (JSONB)
- **Timestamps**: `created_at`, `updated_at`
- **Indexes**:
  - `unique_org_enterprise_settings` (unique) on `organization_id`

### 2.12 `branch_performance_snapshots`
Pre-computed time-series aggregates for branch KPIs.
- **Primary Key**: `id` (text, UUID)
- **Required Columns**: `organization_id`, `branch_id`, `period_start`, `period_end`
- **Business Columns**: `revenue`, `expenses`, `profit`, `inventory_value`, `sales_count`, `transfer_count`, `employee_count`, `data` (JSONB), `computed_at`
- **Indexes**:
  - `branch_performance_snapshots_org_idx` on `organization_id`
  - `branch_performance_snapshots_branch_idx` on `branch_id`
  - `branch_performance_snapshots_period_idx` on `(period_start, period_end)`
  - `unique_branch_period` (unique) on `(branch_id, period_start, period_end)`

## 3. Foreign Key & Deletion Policy Summary

| Table | References | On Delete |
|---|---|---|
| `enterprise_branches` | `users(user_id)`, `organizations(organization_id)` | CASCADE |
| `branch_members` | `enterprise_branches(branch_id)`, `users(user_id)`, `organizations(organization_id)` | CASCADE |
| `branch_pricing` | `enterprise_branches(branch_id)`, `organizations(organization_id)` | CASCADE |
| `branch_tax_settings` | `enterprise_branches(branch_id)`, `organizations(organization_id)` | CASCADE |
| `inter_branch_transfers` | `enterprise_branches(from/to)`, `users(user_id)`, `organizations(organization_id)` | RESTRICT on branches |
| `inter_branch_transfer_items` | `inter_branch_transfers(transfer_id)`, `organizations(organization_id)` | CASCADE |
| `inter_branch_sales` | `enterprise_branches(from/to)`, `users(user_id)`, `organizations(organization_id)` | RESTRICT on branches |
| `inter_branch_sale_items` | `inter_branch_sales(sale_id)`, `organizations(organization_id)` | CASCADE |
| `branch_approval_workflows` | `enterprise_branches(branch_id)`, `organizations(organization_id)` | CASCADE |
| `branch_approval_requests` | `enterprise_branches(branch_id)`, `organizations(organization_id)` | CASCADE |
| `enterprise_settings` | `organizations(organization_id)` | CASCADE |
| `branch_performance_snapshots` | `enterprise_branches(branch_id)`, `organizations(organization_id)` | CASCADE |

## 4. Index Strategy

- **Organization-scoped queries** are optimized by `org_idx` on every table.
- **Unique business rules** are enforced via unique indexes on `(organization_id, code)`, `(organization_id, transfer_number)`, `(organization_id, sale_number)`, `(branch_id, user_id)`, `(branch_id, product_id)`, and `(branch_id, period_start, period_end)`.
- **Status filtering** is optimized by `status_idx` on transfers and sales.
- **Relationship traversal** uses `from_idx`, `to_idx`, `branch_idx`, `transfer_idx`, `sale_idx`, and `product_idx` for fast joins.

## 5. Backward Compatibility Notes

1. **No breaking changes**: This migration only creates new tables, enums, and indexes. Existing tables and columns are untouched.
2. **Enum extension is safe**: Adding values to `timeline_event_type` via `ALTER TYPE ... ADD VALUE` is a non-breaking operation in PostgreSQL.
3. **Nullable `organization_id` on existing tables**: Earlier migrations made `organization_id` nullable on legacy tables for non-destructive `db:push`. The enterprise tables require `organization_id` (NOT NULL). The backfill script handles legacy rows.
4. **Down migration**: If rollback is required, drop the tables in reverse dependency order (items before headers, requests before workflows, settings last) and drop the new enums.
5. **Drizzle ORM compatibility**: The schema uses `pgTable`, `pgEnum`, and `jsonb` types that are fully supported by drizzle-orm v0.38+.
