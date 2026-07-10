/**
 * KaziFlow — organization helpers
 * ------------------------------------------------------------------
 * Helpers to create organizations and ensure a user belongs to one. A new user
 * gets a personal organization (their tenant) with an Owner membership. This
 * is the foundation of multi-tenant isolation: every business record is scoped
 * to an organization created here.
 */
import { db } from "@/db";
import {
  organizations,
  organizationMembers,
  users,
  businesses,
  type Organization,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { SystemRole } from "@/lib/rbac/permissions";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "org";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      columns: { id: true },
    });
    if (!exists) break;
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

export interface CreateOrganizationInput {
  name: string;
  ownerId: string;
  roleType?: SystemRole;
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<Organization> {
  const slug = await uniqueSlug(input.name);

  // Create the org and its owner membership atomically so a failed member
  // insert can't leave an orphaned (ownerless) organization.
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        slug,
        ownerId: input.ownerId,
        plan: "free",
      })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: org.id,
      userId: input.ownerId,
      email: "",
      roleType: input.roleType ?? "owner",
      status: "active",
      joinedAt: new Date(),
    });

    return org;
  });
}

/** Create a personal organization for a user based on their name/business. */
export async function createPersonalOrganization(
  user: { id: string; name?: string | null; email: string }
): Promise<Organization> {
  // Prefer an existing business name if present, else the user's name.
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.userId, user.id),
    columns: { name: true },
  });
  const name =
    business?.name || user.name || user.email.split("@")[0] || "My Organization";
  return createOrganization({ name, ownerId: user.id, roleType: "owner" });
}

/**
 * Return the user's active membership's organization, or null. Invited
 * memberships (matched by user id) are activated on first login so that an
 * accepted invite immediately grants tenant access.
 */
export async function getActiveOrganization(
  userId: string
): Promise<{ organization: Organization; roleType: SystemRole } | null> {
  let member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.status, "active")
    ),
    with: { organization: true },
    orderBy: (m) => [m.createdAt],
  });

  if (!member) {
    const invited = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "invited")
      ),
      with: { organization: true },
      orderBy: (m) => [m.createdAt],
    });
    if (invited) {
      await db
        .update(organizationMembers)
        .set({ status: "active", joinedAt: new Date() })
        .where(eq(organizationMembers.id, invited.id));
      member = invited;
    }
  }

  if (!member?.organization) return null;
  return {
    organization: member.organization,
    roleType: member.roleType as SystemRole,
  };
}

/** Idempotently ensure the user has a personal organization. */
export async function ensureUserHasOrganization(
  userId: string
): Promise<Organization | null> {
  const existing = await getActiveOrganization(userId);
  if (existing) return existing.organization;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true },
  });
  if (!user) return null;

  return createPersonalOrganization(user);
}
