/**
 * KaziFlow RBAC — runtime permission resolution
 * ------------------------------------------------------------------
 * Pure functions for resolving and checking permissions. The session layer
 * (src/lib/session.ts) loads a member's effective permission set and stores it
 * on the JWT; these helpers operate on that set and on raw role definitions.
 */
import {
  ALL_PERMISSION_KEYS,
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  type PermissionKey,
  type SystemRole,
} from "./permissions";

/** Permission set is just a Set of keys for O(1) lookup. */
export type PermissionSet = Set<PermissionKey>;

/** Resolve the static permission set for a system role. */
export function systemRolePermissions(role: SystemRole): PermissionSet {
  return new Set(SYSTEM_ROLE_PERMISSIONS[role] ?? []);
}

/**
 * Compute a member's effective permissions. A custom role (when present)
 * completely overrides the system role's grants — its permissions are the
 * source of truth — unless it is empty, in which case the system role applies.
 */
export function getEffectivePermissions(
  roleType: SystemRole,
  customPermissions?: PermissionKey[] | null
): PermissionSet {
  if (customPermissions && customPermissions.length > 0) {
    return new Set(customPermissions);
  }
  return systemRolePermissions(roleType);
}

export function hasPermission(
  permissions: PermissionSet,
  key: PermissionKey
): boolean {
  return permissions.has(key);
}

export function hasAnyPermission(
  permissions: PermissionSet,
  keys: PermissionKey[]
): boolean {
  return keys.some((k) => permissions.has(k));
}

export function hasAllPermissions(
  permissions: PermissionSet,
  keys: PermissionKey[]
): boolean {
  return keys.every((k) => permissions.has(k));
}

/**
 * Validate a list of permission keys against the catalog. Returns the invalid
 * keys so callers can reject privilege-escalation attempts.
 */
export function validatePermissionKeys(
  keys: string[]
): { valid: PermissionKey[]; invalid: string[] } {
  const valid: PermissionKey[] = [];
  const invalid: string[] = [];
  for (const k of keys) {
    if (k in PERMISSIONS) valid.push(k as PermissionKey);
    else invalid.push(k);
  }
  return { valid, invalid };
}

export function isPermissionKey(value: string): value is PermissionKey {
  return value in PERMISSIONS;
}

export { ALL_PERMISSION_KEYS, PERMISSIONS, SYSTEM_ROLES };
export type { PermissionKey, SystemRole };
