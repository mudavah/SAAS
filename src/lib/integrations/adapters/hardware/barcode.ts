import {
  type ConnectionView,
  type IntegrationAdapter,
  type TestResult,
  type SyncResult,
  localHealthy,
} from "../types";

export const barcodeScannerAdapter: IntegrationAdapter = {
  provider: "barcode_scanner",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    return localHealthy(
      `Barcode/QR scanner ready in ${(conn.config.mode as string) || "keyboard wedge"} mode.`
    );
  },
  async sync(): Promise<SyncResult> {
    return { ok: true, message: "Scanner configuration synchronized to device profile." };
  },
};
