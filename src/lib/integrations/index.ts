/**
 * KaziFlow — Integration Hub
 * ------------------------------------------------------------------
 * Public entry point for the Integration Hub service layer. Re-exports every
 * domain function and the adapter resolver. All functions are organization
 * scoped, RBAC-gated, audited, and emit Business Timeline events where relevant.
 */
export * from "./catalog";
export * from "./core";
export * from "./connections";
export * from "./oauth";
export * from "./health";
export * from "./activity";
export * from "./dispatch";
export * from "./marketplace";
export * from "./ai";
export { getAdapter } from "./adapters";
export type {
  IntegrationAdapter,
  ConnectionView,
  TestResult,
  SendResult,
  SyncResult,
  WebhookResult,
  SendPayload,
} from "./adapters/types";
