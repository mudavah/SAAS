/**
 * KaziFlow — Integration Hub API serializer
 * ------------------------------------------------------------------
 * Strips encrypted credentials from integration rows before they are returned
 * to clients. Config (non-secret) is retained so forms can prefill.
 */
import type { Integration } from "@/db/schema";

export type PublicIntegration = Omit<Integration, "credentials"> & {
  credentials?: Record<string, unknown>;
};

export function publicIntegration(row: Integration): PublicIntegration {
  // Never return decrypted secrets to the client. We omit the field entirely.
  const { credentials, ...rest } = row as Integration & { credentials: unknown };
  void credentials;
  return rest as PublicIntegration;
}
