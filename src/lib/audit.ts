import { db } from '@/lib/db';

interface AuditLogOptions {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}

export async function logAuditAction(options: AuditLogOptions) {
  try {
    const { userId, action, entity, entityId, details } = options;

    await db.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        details: details || null
      }
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
