import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      onboardingComplete: boolean;
      /** Active organization id (tenant). */
      orgId?: string | null;
      /** Member's system role in the active organization. */
      roleType?: string | null;
      /** Active organization display name. */
      orgName?: string | null;
      orgSlug?: string | null;
      orgPlan?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    plan?: string;
    onboardingComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    onboardingComplete?: boolean;
    orgId?: string | null;
    roleType?: string | null;
    orgName?: string | null;
    orgSlug?: string | null;
    orgPlan?: string | null;
  }
}
