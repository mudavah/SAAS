# Epic 7 — Developer Platform & Public API
## API Documentation

## Base URL
```
https://api.kaziflow.com/v1
```

## Authentication

All endpoints require one of:
- `Authorization: Bearer kf_live_...` (API key)
- `Authorization: Bearer kf_oauth_...` (OAuth access token)
- `X-API-Key: kf_live_...` (API key header)

## Rate Limits
- **Organization**: 600 requests/minute
- **Per API Key**: 120 requests/minute

## Response Format
All responses are JSON. Errors follow this shape:
```json
{
  "error": "Description of the error"
}
```

## Standard Headers
- `X-RateLimit-Limit`: Rate limit ceiling
- `X-RateLimit-Remaining`: Requests remaining in window

---

## System Endpoints

### GET /ping
Health check. Returns API status and authenticated org.

**Permission**: None (requires auth)

**Response 200**:
```json
{
  "ok": true,
  "service": "KaziFlow Public API",
  "version": "v1",
  "organization": "org_123"
}
```

---

## Organizations

### GET /organizations
Returns the current organization profile.

**Permission**: `organization.view`

**Response 200**:
```json
{
  "id": "org_123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "pro"
}
```

### PATCH /organizations
Updates organization settings.

**Permission**: `organization.update`

**Request Body**:
```json
{
  "name": "New Name"
}
```

---

## Customers (Clients)

### GET /clients
Lists clients for the organization.

**Permission**: `clients.view`

**Query Parameters**: `limit` (default: 100), `cursor`

**Response 200**:
```json
{
  "clients": [
    {
      "id": "client_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+254700000000",
      "company": "Acme",
      "address": "Nairobi",
      "notes": "",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": null,
  "total": 1
}
```

### POST /clients
Creates a new client.

**Permission**: `clients.create`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254700000000",
  "company": "Acme",
  "address": "Nairobi",
  "notes": "VIP client"
}
```

**Response 201**: Client object

---

## CRM

### GET /crm/companies
Lists CRM companies.

**Permission**: `crm.view`

### POST /crm/companies
Creates a CRM company.

**Permission**: `crm.contacts.manage`

### GET /crm/contacts
Lists contacts.

**Permission**: `crm.view`

### POST /crm/contacts
Creates a contact.

**Permission**: `crm.contacts.manage`

### GET /crm/leads
Lists leads.

**Permission**: `crm.view`

### POST /crm/leads
Creates a lead.

**Permission**: `crm.leads.manage`

### GET /crm/deals
Lists deals.

**Permission**: `crm.view`

### POST /crm/deals
Creates a deal.

**Permission**: `crm.deals.manage`

### GET /crm/activities
Lists activities.

**Permission**: `crm.view`

### POST /crm/activities
Creates an activity.

**Permission**: `crm.activities.manage`

### GET /crm/quotations
Lists quotations.

**Permission**: `crm.view`

### POST /crm/quotations
Creates a quotation.

**Permission**: `crm.quotations.manage`

---

## Products & Inventory

### GET /products
Lists products.

**Permission**: `inventory.products.manage`

### POST /products
Creates a product.

**Permission**: `inventory.products.manage`

### GET /inventory/categories
Lists inventory categories.

**Permission**: `inventory.products.manage`

### GET /inventory/brands
Lists inventory brands.

**Permission**: `inventory.products.manage`

### GET /inventory/suppliers
Lists suppliers.

**Permission**: `inventory.products.manage`

### GET /inventory/warehouses
Lists warehouses.

**Permission**: `inventory.warehouses.manage`

### GET /inventory/stock-movements
Lists stock movements.

**Permission**: `inventory.view`

### POST /inventory/stock-adjustments
Creates stock adjustment.

**Permission**: `inventory.stock.adjust`

### GET /inventory/purchase-orders
Lists purchase orders.

**Permission**: `purchasing.view`

---

## Procurement

### GET /procurement/orders
Lists purchase orders.

**Permission**: `purchasing.po.manage`

### POST /procurement/orders
Creates a purchase order.

**Permission**: `purchasing.po.manage`

### GET /procurement/requests
Lists purchase requests.

**Permission**: `purchasing.requests.manage`

### POST /procurement/requests
Creates a purchase request.

**Permission**: `purchasing.requests.manage`

### GET /procurement/rfqs
Lists RFQs.

**Permission**: `purchasing.rfq.manage`

### POST /procurement/rfqs
Creates an RFQ.

**Permission**: `purchasing.rfq.manage`

### GET /procurement/quotations
Lists supplier quotations.

**Permission**: `purchasing.quotations.manage`

### GET /procurement/grns
Lists GRNs.

**Permission**: `purchasing.grn.manage`

### GET /procurement/returns
Lists supplier returns.

**Permission**: `purchasing.returns.manage`

### GET /procurement/invoices
Lists purchase invoices.

**Permission**: `purchasing.invoices.manage`

### GET /procurement/payments
Lists supplier payments.

**Permission**: `purchasing.payments.manage`

### GET /procurement/suppliers
Lists suppliers.

**Permission**: `purchasing.suppliers.manage`

### GET /procurement/budgets
Lists budgets.

**Permission**: `purchasing.budget.manage`

---

## POS

### GET /pos/orders
Lists POS orders.

**Permission**: `pos.sales.view`

### POST /pos/orders
Creates a POS order.

**Permission**: `pos.sales.create`

### GET /pos/sessions
Lists POS sessions.

**Permission**: `pos.shift.manage`

### GET /pos/returns
Lists POS returns.

**Permission**: `pos.returns`

---

## Invoices

### GET /invoices
Lists invoices with items and client.

**Permission**: `invoices.view`

### POST /invoices
Creates an invoice.

**Permission**: `invoices.create`

**Request Body**:
```json
{
  "clientId": "client_123",
  "issueDate": "2024-01-01",
  "dueDate": "2024-01-31",
  "currency": "KES",
  "taxRate": 16,
  "items": [
    {
      "description": "Consulting",
      "quantity": 1,
      "unitPrice": 5000
    }
  ]
}
```

---

## Payments

### GET /payments
Lists payments.

**Permission**: `payments.view`

### POST /payments
Records a payment.

**Permission**: `payments.create`

**Request Body**:
```json
{
  "invoiceId": "invoice_123",
  "amount": 5000,
  "method": "mpesa",
  "reference": "MPESA-123",
  "notes": "Paid via M-Pesa"
}
```

---

## HR

### GET /hr/employees
Lists employees.

**Permission**: `hr.employees.manage`

### POST /hr/employees
Creates an employee.

**Permission**: `hr.employees.manage`

### GET /hr/departments
Lists departments.

**Permission**: `hr.departments.manage`

### POST /hr/departments
Creates a department.

**Permission**: `hr.departments.manage`

### GET /hr/positions
Lists positions.

**Permission**: `hr.positions.manage`

### GET /hr/leave
Lists leave requests.

**Permission**: `hr.leave.manage`

### POST /hr/leave
Creates a leave request.

**Permission**: `hr.leave.manage`

### GET /hr/attendance
Lists attendance records.

**Permission**: `hr.attendance.manage`

### GET /hr/applicants
Lists applicants.

**Permission**: `hr.recruitment.manage`

---

## Payroll

### GET /payroll/runs
Lists payroll runs.

**Permission**: `payroll.runs.manage`

### POST /payroll/runs
Creates a payroll run.

**Permission**: `payroll.runs.manage`

### GET /payroll/periods
Lists payroll periods.

**Permission**: `payroll.periods.manage`

### GET /payroll/payslips
Lists payslips.

**Permission**: `payroll.payslips.view`

---

## Compliance Center

### GET /compliance/alerts
Lists compliance alerts.

**Permission**: `compliance.view`

### GET /compliance/reports
Lists compliance reports.

**Permission**: `compliance.view`

---

## Reports

### GET /reports
Aggregated financial report.

**Permission**: `reports.view_financial`

**Response 200**:
```json
{
  "summary": {
    "totalClients": 10,
    "totalInvoices": 50,
    "totalPayments": 45,
    "totalRevenue": "250000.00",
    "totalExpenses": "150000.00"
  },
  "recentInvoices": []
}
```

---

## AI Business Copilot

### GET /ai/insights
Lists AI insights.

**Permission**: `ai.access`

### GET /ai/conversations
Lists AI conversations.

**Permission**: `ai.access`

---

## Users (Team)

### GET /users
Lists organization members.

**Permission**: `team.view`

### POST /users
Invites a team member.

**Permission**: `team.invite`

### PATCH /users
Updates a member role.

**Permission**: `team.manage`

---

## Webhooks

### GET /webhooks
Lists webhook subscriptions.

**Permission**: `webhooks.manage`

### POST /webhooks
Creates a webhook subscription.

**Permission**: `webhooks.manage`

**Request Body**:
```json
{
  "name": "My Integration",
  "url": "https://example.com/webhook",
  "events": ["invoice.created", "payment.received"],
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

### GET /webhooks/{id}/deliveries
Lists delivery attempts for a webhook.

**Permission**: `webhooks.manage`

### POST /webhooks/{id}/deliveries/{deliveryId}/retry
Retries a failed delivery.

**Permission**: `webhooks.manage`

---

## Analytics

### GET /analytics/usage
Returns API usage analytics.

**Permission**: `api.analytics.view`

**Query Parameters**: `start` (ISO date), `end` (ISO date), `apiKeyId` (optional)

**Response 200**:
```json
{
  "totalRequests": 1500,
  "successfulRequests": 1450,
  "failedRequests": 50,
  "errorRate": 3.33,
  "avgResponseTimeMs": 120,
  "p95ResponseTimeMs": 250,
  "p99ResponseTimeMs": 500,
  "topEndpoints": [
    { "endpoint": "/clients", "count": 500 }
  ],
  "topStatusCodes": [
    { "statusCode": 200, "count": 1450 }
  ],
  "requestsByDay": [
    { "date": "2024-01-01", "count": 100 }
  ]
}
```

---

## Webhook Payload Format

All webhook payloads include:
```json
{
  "id": "delivery_123",
  "event": "invoice.created",
  "data": { /* resource payload */ },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Webhook Headers

| Header | Value |
|--------|-------|
| `X-KaziFlow-Signature` | HMAC-SHA256 of payload body |
| `X-KaziFlow-Event` | Event type (e.g. `invoice.created`) |
| `X-KaziFlow-Delivery` | Delivery ID for tracing |

## Webhook Signature Verification

```typescript
import crypto from "crypto";

function verify(payload: string, secret: string, signature: string) {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Invalid request body |
| 401 | Missing or invalid API key |
| 403 | Insufficient scope / permission |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
