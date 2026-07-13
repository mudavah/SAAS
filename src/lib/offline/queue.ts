import { v4 as uuidv4 } from "uuid";
import { openDB, put, getAll, del } from "./db";
import type {
  OfflineStoreName,
  OperationPriority,
  OperationStatus,
  OperationType,
  PendingOperation,
} from "./schema";

function simpleChecksum(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `cs:${Math.abs(hash)}:${str.length}`;
}

export async function enqueueOperation(
  operation: OperationType,
  entity: OfflineStoreName,
  entityId: string,
  organizationId: string,
  payload: Record<string, unknown>,
  priority: OperationPriority = "medium"
): Promise<PendingOperation> {
  const db = await openDB();
  const op: PendingOperation = {
    id: uuidv4(),
    operation,
    entity,
    entityId,
    organizationId,
    payload,
    status: "pending",
    priority,
    createdAt: Date.now(),
    attempts: 0,
    checksum: simpleChecksum(payload),
  };

  await put(db, "pendingOperations", op);
  return op;
}

export async function getPendingOperations(
  status?: OperationStatus
): Promise<PendingOperation[]> {
  const db = await openDB();
  const ops = await getAll<PendingOperation>(db, "pendingOperations");

  if (status) {
    return ops.filter((op) => op.status === status);
  }

  return ops.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt - b.createdAt;
  });
}

export async function getOperationsByOrganization(
  organizationId: string
): Promise<PendingOperation[]> {
  const db = await openDB();
  const all = await getAll<PendingOperation>(db, "pendingOperations");
  return all
    .filter((op) => op.organizationId === organizationId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOperationStatus(
  id: string,
  status: OperationStatus,
  error?: string
): Promise<void> {
  const db = await openDB();
  const op = await get<PendingOperation>(db, "pendingOperations", id);
  if (!op) return;

  op.status = status;
  op.attempts += 1;
  op.lastAttemptAt = Date.now();
  if (error) op.error = error;

  await put(db, "pendingOperations", op);
}

export async function removeOperation(id: string): Promise<void> {
  const db = await openDB();
  await del(db, "pendingOperations", id);
}

export async function getPendingCount(): Promise<number> {
  const ops = await getPendingOperations("pending");
  return ops.length;
}
