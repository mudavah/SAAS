import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      onboardingComplete: boolean;
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
  }
}
