import type { LucideIcon } from "lucide-react";
import {
  Landmark,
  CreditCard,
  Mail,
  MessageSquare,
  MessageCircle,
  Bell,
  Calendar,
  Calculator,
  HardDrive,
  Cpu,
} from "lucide-react";

export type IntegrationCategory =
  | "government"
  | "payment"
  | "email"
  | "sms"
  | "whatsapp"
  | "push"
  | "calendar"
  | "accounting"
  | "storage"
  | "hardware";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "pending"
  | "error"
  | "expired";

export type IntegrationHealthStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "unknown";

export type IntegrationAuthType =
  | "oauth2"
  | "api_key"
  | "basic"
  | "credentials"
  | "none"
  | "webhook";

export interface Integration {
  id: string;
  organizationId: string;
  category: IntegrationCategory;
  provider: string;
  name: string;
  authType: IntegrationAuthType;
  status: IntegrationStatus;
  enabled: boolean;
  environment: string;
  config: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  healthStatus: IntegrationHealthStatus;
  lastCheckedAt?: string | null;
  lastSyncAt?: string | null;
  errorMessage?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationCategorySummary {
  category: IntegrationCategory;
  label: string;
  count: number;
  connected: number;
}

export interface MarketplaceEntry {
  id: string;
  category: IntegrationCategory;
  name: string;
  description: string;
  authType: IntegrationAuthType;
  capabilities: string[];
  docsUrl: string;
  website: string;
  configured?: boolean;
  connected: boolean;
  integration?: Integration;
}

export interface IntegrationHealth {
  id: string;
  name: string;
  provider: string;
  category: IntegrationCategory;
  healthStatus: IntegrationHealthStatus;
  status: IntegrationStatus;
  latencyMs?: number | null;
  uptime?: number | null;
  lastSyncAt?: string | null;
  lastCheckedAt?: string | null;
  errorMessage?: string | null;
}

export interface IntegrationActivityLog {
  id: string;
  integrationId: string;
  provider: string;
  action: string;
  status: string;
  message?: string | null;
  latencyMs?: number | null;
  createdAt: string;
}

export interface HubSummary {
  total: number;
  connected: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
}

/** Category → label + icon used across the hub UI. */
export const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; icon: LucideIcon }
> = {
  government: { label: "Government", icon: Landmark },
  payment: { label: "Payments", icon: CreditCard },
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  push: { label: "Push", icon: Bell },
  calendar: { label: "Calendar", icon: Calendar },
  accounting: { label: "Accounting", icon: Calculator },
  storage: { label: "Storage", icon: HardDrive },
  hardware: { label: "Hardware", icon: Cpu },
};

export const CATEGORIES: { value: IntegrationCategory; label: string }[] =
  Object.entries(CATEGORY_META).map(([value, meta]) => ({
    value: value as IntegrationCategory,
    label: meta.label,
  }));

export const HEALTH_COLORS: Record<
  IntegrationHealthStatus,
  { dot: string; badge: string; label: string }
> = {
  healthy: {
    dot: "bg-green-500",
    badge: "border-transparent bg-green-100 text-green-800",
    label: "Healthy",
  },
  degraded: {
    dot: "bg-yellow-500",
    badge: "border-transparent bg-yellow-100 text-yellow-800",
    label: "Degraded",
  },
  down: {
    dot: "bg-red-500",
    badge: "border-transparent bg-red-100 text-red-800",
    label: "Down",
  },
  unknown: {
    dot: "bg-gray-400",
    badge: "border-transparent bg-gray-100 text-gray-700",
    label: "Unknown",
  },
};

export const STATUS_COLORS: Record<IntegrationStatus, string> = {
  connected: "border-transparent bg-green-100 text-green-700",
  disconnected: "border-transparent bg-gray-100 text-gray-700",
  pending: "border-transparent bg-yellow-100 text-yellow-700",
  error: "border-transparent bg-red-100 text-red-700",
  expired: "border-transparent bg-orange-100 text-orange-700",
};
