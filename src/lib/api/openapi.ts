/**
 * KaziFlow — OpenAPI (Swagger) Documentation Generator
 * ------------------------------------------------------------------
 * Generates an OpenAPI 3.0 specification for the public API.
 * The spec is served at `/api/v1/openapi.json` and is used by the
 * Developer Portal and SDK generators.
 */

import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "KaziFlow Public API",
    version: "1.0.0",
    description:
      "RESTful API for integrating with KaziFlow. All endpoints require authentication via API key (Bearer token) or OAuth 2.0.",
    contact: { name: "KaziFlow Support", email: "api@kaziflow.com" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: `${API_BASE_URL}/api/v1`, description: "Production" },
    { url: `${API_BASE_URL}/api/v1`, description: "Sandbox" },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "kf_live_... or kf_test_...",
      },
      ApiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    schemas: {
      Organization: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          plan: { type: "string", enum: ["free", "pro", "business"] },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          company: { type: "string" },
          address: { type: "string" },
          notes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string" },
          invoiceNumber: { type: "string" },
          status: { type: "string" },
          subtotal: { type: "string" },
          taxRate: { type: "string" },
          taxAmount: { type: "string" },
          total: { type: "string" },
          currency: { type: "string" },
          issueDate: { type: "string", format: "date" },
          dueDate: { type: "string", format: "date" },
          clientId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string" },
          invoiceId: { type: "string" },
          amount: { type: "number" },
          method: { type: "string", enum: ["mpesa", "stripe", "cash", "bank_transfer", "other"] },
          status: { type: "string", enum: ["pending", "completed", "failed", "refunded"] },
          reference: { type: "string" },
          notes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      RateLimit: {
        type: "object",
        properties: {
          "X-RateLimit-Limit": { type: "integer" },
          "X-RateLimit-Remaining": { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/ping": {
      get: {
        summary: "API Health Check",
        description: "Returns the API status and authenticated organization.",
        tags: ["System"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    service: { type: "string" },
                    version: { type: "string" },
                    organization: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/organizations": {
      get: {
        summary: "List Organizations",
        description: "Returns the current organization profile.",
        tags: ["Organizations"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Organization details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Organization" },
              },
            },
          },
        },
      },
    },
    "/clients": {
      get: {
        summary: "List Clients",
        description: "Returns a paginated list of clients for the organization.",
        tags: ["CRM"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Paginated client list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    clients: { type: "array", items: { $ref: "#/components/schemas/Client" } },
                    nextCursor: { type: "string", nullable: true },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Client",
        description: "Creates a new client record.",
        tags: ["CRM"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Client" },
            },
          },
        },
        responses: {
          "201": { description: "Client created", content: { "application/json": { schema: { $ref: "#/components/schemas/Client" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/invoices": {
      get: {
        summary: "List Invoices",
        description: "Returns a paginated list of invoices.",
        tags: ["Invoicing"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        responses: {
          "200": {
            description: "Paginated invoice list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    invoices: { type: "array", items: { $ref: "#/components/schemas/Invoice" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Invoice",
        description: "Creates a new invoice.",
        tags: ["Invoicing"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Invoice" } } } },
        responses: {
          "201": { description: "Invoice created", content: { "application/json": { schema: { $ref: "#/components/schemas/Invoice" } } } },
        },
      },
    },
    "/payments": {
      get: {
        summary: "List Payments",
        description: "Returns a paginated list of payments.",
        tags: ["Payments"],
        security: [{ BearerAuth: [] }, { ApiKey: [] }],
        responses: {
          "200": {
            description: "Paginated payment list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    payments: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/webhooks": {
      get: {
        summary: "List Webhooks",
        description: "Returns webhook subscriptions for the organization.",
        tags: ["Integrations"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Webhook list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    webhooks: { type: "array" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Webhook",
        description: "Creates a new webhook subscription.",
        tags: ["Integrations"],
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "201": { description: "Webhook created" },
        },
      },
    },
    "/analytics/usage": {
      get: {
        summary: "API Usage Analytics",
        description: "Returns aggregated API usage metrics for the organization.",
        tags: ["Analytics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "start", in: "query", schema: { type: "string", format: "date" } },
          { name: "end", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Usage analytics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalRequests: { type: "integer" },
                    successfulRequests: { type: "integer" },
                    failedRequests: { type: "integer" },
                    avgResponseTimeMs: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "System", description: "Health and status endpoints" },
    { name: "Organizations", description: "Organization management" },
    { name: "CRM", description: "Clients, leads, deals, and contacts" },
    { name: "Invoicing", description: "Invoices and payments" },
    { name: "Payments", description: "Payment transactions" },
    { name: "Integrations", description: "Webhooks and OAuth" },
    { name: "Analytics", description: "API usage metrics" },
  ],
};

export function getOpenApiResponse() {
  return NextResponse.json(openApiSpec, {
    headers: { "Content-Type": "application/vnd.oai.openapi+json;version=3.0.3" },
  });
}
