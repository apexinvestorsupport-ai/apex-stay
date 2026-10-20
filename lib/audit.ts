import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Prisma.InputJsonValue,
) {
  await db.auditEvent.create({
    data: { actorId, action, entity, entityId, details },
  });
}
