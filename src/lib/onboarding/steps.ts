/**
 * KaziFlow — guided onboarding step definitions
 * ------------------------------------------------------------------
 * The canonical list of onboarding steps. These are seeded into the
 * `onboarding_steps` table (see scripts/seed-onboarding.mjs) and surfaced by
 * GET /api/onboarding/steps. The wizard pages and the stepper both derive
 * their ordering and routing from this single source of truth.
 */
export const ONBOARDING_STEPS = [
  {
    key: "welcome",
    title: "Welcome",
    description: "Get a quick tour of KaziFlow and what to set up first.",
    route: "/onboarding/welcome",
    required: true,
  },
  {
    key: "organization",
    title: "Your Organization",
    description: "Name the workspace your team will work from.",
    route: "/onboarding/organization",
    required: true,
  },
  {
    key: "business-details",
    title: "Business Details",
    description: "Tell us about your business so we can personalize KaziFlow.",
    route: "/onboarding/business-details",
    required: true,
  },
  {
    key: "tax-config",
    title: "Tax Configuration",
    description: "Add your KRA PIN, VAT status and tax regime.",
    route: "/onboarding/tax-config",
    required: false,
  },
  {
    key: "etims",
    title: "eTIMS Setup",
    description: "Connect KaziFlow to eTIMS for compliant invoicing.",
    route: "/onboarding/etims",
    required: false,
  },
  {
    key: "payments",
    title: "Payments",
    description: "Set up M-Pesa and other payment methods.",
    route: "/onboarding/payments",
    required: false,
  },
  {
    key: "customers",
    title: "Customers",
    description: "Import your customers or add your first one.",
    route: "/onboarding/customers",
    required: false,
  },
  {
    key: "products",
    title: "Products",
    description: "Import your products or add your first one.",
    route: "/onboarding/products",
    required: false,
  },
  {
    key: "invoice",
    title: "First Invoice",
    description: "Create your first invoice in under a minute.",
    route: "/onboarding/invoice",
    required: false,
  },
  {
    key: "team",
    title: "Invite Team",
    description: "Bring your team on board and assign roles.",
    route: "/onboarding/team",
    required: false,
  },
  {
    key: "complete",
    title: "Finish",
    description: "You're all set — dive into your dashboard.",
    route: "/onboarding/complete",
    required: true,
  },
] as const;

export type OnboardingStepKey =
  (typeof ONBOARDING_STEPS)[number]["key"];

export function getStepIndex(key: string): number {
  return ONBOARDING_STEPS.findIndex((s) => s.key === key);
}

export function getNextStep(key: string) {
  const i = getStepIndex(key);
  return i >= 0 ? ONBOARDING_STEPS[i + 1] : undefined;
}

export function getPrevStep(key: string) {
  const i = getStepIndex(key);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : undefined;
}
