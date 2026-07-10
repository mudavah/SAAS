import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, organizationMembers } from "@/db/schema";
import { loginSchema } from "@/lib/validations";
import { getActiveOrganization, ensureUserHasOrganization } from "@/lib/org";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id!),
        });
        if (dbUser) {
          token.plan = dbUser.plan;
          token.onboardingComplete = dbUser.onboardingComplete;
        }
      }

      // Resolve the user's active organization (tenant) + role.
      if (token.id) {
        const active = await getActiveOrganization(token.id as string);
        if (active) {
          token.orgId = active.organization.id;
          token.roleType = active.roleType;
          token.orgName = active.organization.name;
          token.orgSlug = active.organization.slug;
          token.orgPlan = active.organization.plan;
        } else {
          // Lazily create a personal organization for any auth method
          // (e.g. Google sign-in) that didn't go through explicit setup.
          const created = await ensureUserHasOrganization(token.id as string);
          if (created) {
            token.orgId = created.id;
            token.roleType = "owner";
            token.orgName = created.name;
            token.orgSlug = created.slug;
            token.orgPlan = created.plan;
          } else {
            token.orgId = null;
            token.roleType = null;
            token.orgName = null;
            token.orgSlug = null;
            token.orgPlan = null;
          }
        }
      }

      if (trigger === "update" && session) {
        token.onboardingComplete = session.onboardingComplete;
        token.plan = session.plan;
        // Allow forcing a re-resolution of the active org (e.g. org switch).
        if ((session as { orgId?: string }).orgId) {
          const active = await getActiveOrganization(token.id as string);
          if (active) {
            token.orgId = active.organization.id;
            token.roleType = active.roleType;
            token.orgName = active.organization.name;
            token.orgSlug = active.organization.slug;
            token.orgPlan = active.organization.plan;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.orgId = (token.orgId as string | null) ?? null;
        session.user.roleType = (token.roleType as string | null) ?? null;
        session.user.orgName = (token.orgName as string | null) ?? null;
        session.user.orgSlug = (token.orgSlug as string | null) ?? null;
        session.user.orgPlan = (token.orgPlan as string | null) ?? null;
      }
      return session;
    },
  },
});
