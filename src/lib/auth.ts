import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, organizationMembers } from "@/db/schema";
import { loginSchema } from "@/lib/validations";

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

        const membership = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.userId, user.id),
          with: { organization: true },
        });

        const org = membership?.organization as { id: string; name: string; slug: string; plan: string } | undefined;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan,
          onboardingComplete: user.onboardingComplete,
          orgId: org?.id ?? null,
          roleType: membership?.roleType ?? null,
          orgName: org?.name ?? null,
          orgSlug: org?.slug ?? null,
          orgPlan: org?.plan ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.plan = (user as any).plan;
        token.onboardingComplete = (user as any).onboardingComplete;
        token.orgId = (user as any).orgId;
        token.roleType = (user as any).roleType;
        token.orgName = (user as any).orgName;
        token.orgSlug = (user as any).orgSlug;
        token.orgPlan = (user as any).orgPlan;
      }

      if (trigger === "update" && session) {
        token.onboardingComplete = session.onboardingComplete;
        token.plan = session.plan;
        if ((session as { orgId?: string }).orgId) {
          token.orgId = (session as { orgId?: string }).orgId;
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
