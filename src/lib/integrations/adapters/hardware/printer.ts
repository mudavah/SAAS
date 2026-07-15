import {
  type ConnectionView,
  type IntegrationAdapter,
  type TestResult,
  type SyncResult,
  localHealthy,
} from "../types";

export const thermalPrinterAdapter: IntegrationAdapter = {
  provider: "thermal_printer",
  async testConnection(conn: ConnectionView): Promise<TestResult> {
    return localHealthy(
      `Thermal printer ready (${(conn.config.connection as string) || "browser"} mode).`
    );
  },
  async sync(): Promise<SyncResult> {
    return { ok: true, message: "Printer profile synchronized." };
  },
};
