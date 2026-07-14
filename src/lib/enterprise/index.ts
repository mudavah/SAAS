/**
 * KaziFlow — Enterprise & Multi-Branch Management
 * ------------------------------------------------------------------
 * Public entry point for the enterprise service layer. Re-exports every
 * domain function from the submodules. All functions are organization-scoped,
 * RBAC-gated, audited, and emit Business Timeline events where relevant.
 */
export * from "./branches";
export * from "./members";
export * from "./pricing";
export * from "./tax";
export * from "./transfers";
export * from "./sales";
export * from "./approvals";
export * from "./reports";
export * from "./ai";
export * from "./settings";
export { EnterpriseError } from "./core";
