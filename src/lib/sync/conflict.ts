export type ConflictAction =
  | { strategy: "keep-local"; reason: string }
  | { strategy: "keep-remote"; reason: string }
  | { strategy: "keep-both"; localRecord: Record<string, unknown>; remoteRecord: Record<string, unknown>; reason: string }
  | { strategy: "manual"; localRecord: Record<string, unknown>; remoteRecord: Record<string, unknown>; reason: string };

export interface ConflictRecord {
  id: string;
  entity: string;
  entityId: string;
  organizationId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  baseVersion: Record<string, unknown> | null;
  detectedAt: number;
  resolved: boolean;
  resolution?: ConflictAction;
}

export interface ConflictContext {
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  base?: Record<string, unknown> | null;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export function detectConflict(ctx: ConflictContext): boolean {
  if (!ctx.base) {
    return ctx.localUpdatedAt > ctx.remoteUpdatedAt && ctx.remoteUpdatedAt > 0;
  }

  const localChanged = JSON.stringify(ctx.local) !== JSON.stringify(ctx.base);
  const remoteChanged = JSON.stringify(ctx.remote) !== JSON.stringify(ctx.base);

  return localChanged && remoteChanged;
}

export function resolveConflictStrategy(
  ctx: ConflictContext,
  strategy: "last-write-wins" | "manual"
): ConflictAction {
  if (strategy === "manual") {
    return {
      strategy: "manual",
      localRecord: ctx.local,
      remoteRecord: ctx.remote,
      reason: "Conflict requires manual resolution",
    };
  }

  if (ctx.localUpdatedAt >= ctx.remoteUpdatedAt) {
    return {
      strategy: "keep-local",
      reason: "Local version is newer or same timestamp",
    };
  }

  return {
    strategy: "keep-remote",
    reason: "Remote version is newer",
  };
}

export function lastWriteWins(
  ctx: ConflictContext
): Record<string, unknown> {
  if (ctx.localUpdatedAt >= ctx.remoteUpdatedAt) {
    return ctx.local;
  }
  return ctx.remote;
}

export function mergeConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...remote };
  for (const [key, localValue] of Object.entries(local)) {
    const hasLocal = (localValue as { __local?: boolean } | undefined)?.__local === true;
    const hasRemote = (remote[key] as { __remote?: boolean } | undefined )?.__remote === true;
    if (hasLocal && hasRemote) {
      merged[key] = localValue;
    }
  }
  return merged;
}
