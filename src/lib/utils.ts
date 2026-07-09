import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency = "KES"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function generateInvoiceNumber(prefix = "INV"): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${year}-${random}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const PLAN_LIMITS = {
  free: {
    invoicesPerMonth: 5,
    clients: 10,
    aiRequestsPerMonth: 10,
    features: ["basic_invoicing", "client_management", "expense_tracking"],
  },
  pro: {
    invoicesPerMonth: Infinity,
    clients: Infinity,
    aiRequestsPerMonth: 100,
    features: [
      "basic_invoicing",
      "client_management",
      "expense_tracking",
      "mpesa_payments",
      "pdf_export",
      "ai_assistant",
      "tax_reports",
    ],
  },
  business: {
    invoicesPerMonth: Infinity,
    clients: Infinity,
    aiRequestsPerMonth: Infinity,
    features: [
      "basic_invoicing",
      "client_management",
      "expense_tracking",
      "mpesa_payments",
      "pdf_export",
      "ai_assistant",
      "tax_reports",
      "multi_user",
      "api_access",
      "priority_support",
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const PRICING = {
  free: { name: "Free", price: 0, currency: "KES" },
  pro: { name: "Pro", price: 999, currency: "KES" },
  business: { name: "Business", price: 2499, currency: "KES" },
} as const;

export const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Travel",
  "Marketing",
  "Software",
  "Utilities",
  "Rent",
  "Salaries",
  "Equipment",
  "Professional Services",
  "Other",
] as const;

export const BUSINESS_TYPES = [
  "Freelancer",
  "Consultant",
  "Retail",
  "Restaurant",
  "Tech Startup",
  "Creative Agency",
  "Professional Services",
  "Other",
] as const;
