/**
 * KaziFlow — OpenAPI 3.0 specification (Public API v1)
 * ------------------------------------------------------------------
 * A hand-maintained but type-checked OpenAPI document describing the versioned
 * public API under `/api/v1/*`. Served at `GET /api/openapi.json` and rendered
 * in the developer portal (`/developer/docs`). Kept as a single source of truth
 * so the spec, the portal, and the live routes stay in sync.
 *
 * Auth: Bearer API key (`Authorization: Bearer <key>`). All endpoints are
 * organization-scoped; the key determines the acting organization.
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "KaziFlow Public API",
    version: "1.0.0",
    description:
      "Versioned REST API for KaziFlow — invoicing, clients, payments, inventory, payroll, procurement, and CRM for Kenyan businesses. All endpoints are organization-scoped and require a Bearer API key.",
    contact: { name: "KaziFlow Support", url: "https://kaziflow.co.ke" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "https://kaziflow.co.ke/api/v1", description: "Production" },
    { url: "https://staging.kaziflow.co.ke/api/v1", description: "Staging" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key issued from Settings → Developer → API Keys.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      PaginatedMeta: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          invoiceNumber: { type: "string" },
          status: {
            type: "string",
            enum: ["draft", "sent", "viewed", "partial", "paid", "overdue", "cancelled"],
          },
          currency: { type: "string" },
          subtotal: { type: "string" },
          taxRate: { type: "string" },
          taxAmount: { type: "string" },
          total: { type: "string" },
          dueDate: { type: "string", format: "date-time" },
          client: { $ref: "#/components/schemas/Client" },
        },
      },
      InvoiceItem: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "string" },
          unitPrice: { type: "string" },
          amount: { type: "string" },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          company: { type: "string", nullable: true },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string" },
          amount: { type: "string" },
          status: { type: "string", enum: ["pending", "completed", "failed", "refunded"] },
          method: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          sellingPrice: { type: "string" },
          costPrice: { type: "string" },
          unit: { type: "string" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid API key",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      Forbidden: {
        description: "Key lacks the required scope/permission",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      BadRequest: {
        description: "Validation error",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Invoices" },
    { name: "Clients" },
    { name: "Payments" },
    { name: "Products" },
    { name: "Customers" },
    { name: "Inventory" },
    { name: "Payroll" },
    { name: "Procurement" },
    { name: "CRM" },
    { name: "Reports" },
    { name: "Compliance" },
    { name: "Organizations" },
    { name: "Users" },
    { name: "System" },
  ],
  paths: {
    "/ping": {
      get: {
        tags: ["System"],
        summary: "Health/liveness ping",
        security: [],
        responses: {
          200: {
            description: "Pong",
            content: { "application/json": { schema: { type: "object", properties: { pong: { type: "boolean" } } } } },
          },
        },
      },
    },
    "/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List invoices (paginated)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Paginated invoices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Invoice" } },
                    meta: { $ref: "#/components/schemas/PaginatedMeta" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create an invoice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["clientId", "items"],
                properties: {
                  clientId: { type: "string" },
                  currency: { type: "string", default: "KES" },
                  taxRate: { type: "string", default: "16" },
                  dueDate: { type: "string", format: "date-time" },
                  items: {
                    type: "array",
                    items: { $ref: "#/components/schemas/InvoiceItem" },
                  },
                  send: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created invoice",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Invoice" } } } } },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/clients": {
      get: {
        tags: ["Clients"],
        summary: "List clients",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Paginated clients",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Client" } },
                    meta: { $ref: "#/components/schemas/PaginatedMeta" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Clients"],
        summary: "Create a client",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  company: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created client",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Client" } } } } },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/payments": {
      get: {
        tags: ["Payments"],
        summary: "List payments",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Paginated payments",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
                    meta: { $ref: "#/components/schemas/PaginatedMeta" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Paginated products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    meta: { $ref: "#/components/schemas/PaginatedMeta" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers",
        responses: {
          200: { description: "Customer list" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/organizations": {
      get: {
        tags: ["Organizations"],
        summary: "Get the acting organization",
        responses: {
          200: { description: "Organization details" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List organization users/members",
        responses: {
          200: { description: "User list" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/reports": {
      get: {
        tags: ["Reports"],
        summary: "Generate a business report",
        parameters: [{ name: "type", in: "query", schema: { type: "string" } }],
        responses: {
          200: { description: "Report payload" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/inventory/products": {
      get: { tags: ["Inventory"], summary: "List inventory products", responses: { 200: { description: "Inventory products" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/stock-movements": {
      get: { tags: ["Inventory"], summary: "List stock movements", responses: { 200: { description: "Stock movements" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/suppliers": {
      get: { tags: ["Inventory"], summary: "List suppliers", responses: { 200: { description: "Suppliers" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/warehouses": {
      get: { tags: ["Inventory"], summary: "List warehouses", responses: { 200: { description: "Warehouses" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/categories": {
      get: { tags: ["Inventory"], summary: "List inventory categories", responses: { 200: { description: "Categories" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/brands": {
      get: { tags: ["Inventory"], summary: "List inventory brands", responses: { 200: { description: "Brands" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/purchase-orders": {
      get: { tags: ["Inventory"], summary: "List purchase orders", responses: { 200: { description: "Purchase orders" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/inventory/stock-adjustments": {
      get: { tags: ["Inventory"], summary: "List stock adjustments", responses: { 200: { description: "Stock adjustments" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/payroll/periods": {
      get: { tags: ["Payroll"], summary: "List payroll periods", responses: { 200: { description: "Payroll periods" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/payroll/runs": {
      get: { tags: ["Payroll"], summary: "List payroll runs", responses: { 200: { description: "Payroll runs" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/payroll/payslips": {
      get: { tags: ["Payroll"], summary: "List payslips", responses: { 200: { description: "Payslips" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/requests": {
      get: { tags: ["Procurement"], summary: "List procurement requests", responses: { 200: { description: "Requests" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/orders": {
      get: { tags: ["Procurement"], summary: "List purchase orders (procurement)", responses: { 200: { description: "Orders" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/suppliers": {
      get: { tags: ["Procurement"], summary: "List procurement suppliers", responses: { 200: { description: "Suppliers" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/quotations": {
      get: { tags: ["Procurement"], summary: "List quotations", responses: { 200: { description: "Quotations" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/rfqs": {
      get: { tags: ["Procurement"], summary: "List RFQs", responses: { 200: { description: "RFQs" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/grns": {
      get: { tags: ["Procurement"], summary: "List GRNs", responses: { 200: { description: "GRNs" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/budgets": {
      get: { tags: ["Procurement"], summary: "List budgets", responses: { 200: { description: "Budgets" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/invoices": {
      get: { tags: ["Procurement"], summary: "List procurement invoices", responses: { 200: { description: "Invoices" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/payments": {
      get: { tags: ["Procurement"], summary: "List procurement payments", responses: { 200: { description: "Payments" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/procurement/returns": {
      get: { tags: ["Procurement"], summary: "List returns", responses: { 200: { description: "Returns" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/companies": {
      get: { tags: ["CRM"], summary: "List CRM companies", responses: { 200: { description: "Companies" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/contacts": {
      get: { tags: ["CRM"], summary: "List CRM contacts", responses: { 200: { description: "Contacts" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/leads": {
      get: { tags: ["CRM"], summary: "List CRM leads", responses: { 200: { description: "Leads" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/deals": {
      get: { tags: ["CRM"], summary: "List CRM deals", responses: { 200: { description: "Deals" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/activities": {
      get: { tags: ["CRM"], summary: "List CRM activities", responses: { 200: { description: "Activities" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/quotations": {
      get: { tags: ["CRM"], summary: "List CRM quotations", responses: { 200: { description: "Quotations" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/crm/pipeline-stages": {
      get: { tags: ["CRM"], summary: "List pipeline stages", responses: { 200: { description: "Stages" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/compliance/reports": {
      get: { tags: ["Compliance"], summary: "List compliance reports", responses: { 200: { description: "Reports" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/compliance/alerts": {
      get: { tags: ["Compliance"], summary: "List compliance alerts", responses: { 200: { description: "Alerts" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/employees": {
      get: { tags: ["HR"], summary: "List employees", responses: { 200: { description: "Employees" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/departments": {
      get: { tags: ["HR"], summary: "List departments", responses: { 200: { description: "Departments" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/attendance": {
      get: { tags: ["HR"], summary: "List attendance", responses: { 200: { description: "Attendance" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/positions": {
      get: { tags: ["HR"], summary: "List positions", responses: { 200: { description: "Positions" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/leave": {
      get: { tags: ["HR"], summary: "List leave requests", responses: { 200: { description: "Leave" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/hr/applicants": {
      get: { tags: ["HR"], summary: "List applicants", responses: { 200: { description: "Applicants" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/pos/orders": {
      get: { tags: ["POS"], summary: "List POS orders", responses: { 200: { description: "Orders" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/pos/sessions": {
      get: { tags: ["POS"], summary: "List POS sessions", responses: { 200: { description: "Sessions" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
    "/pos/returns": {
      get: { tags: ["POS"], summary: "List POS returns", responses: { 200: { description: "Returns" }, 401: { $ref: "#/components/responses/Unauthorized" } } },
    },
  },
} as const;

export type OpenApiSpec = typeof openApiSpec;
