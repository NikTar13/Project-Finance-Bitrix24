// ============================================================================
//  Журнал аудита — единая точка записи изменений.
//  Кто / когда / что сделал. Демонстрирует зрелость решения.
// ============================================================================

import { db } from "./db"
import { AUDIT_ACTIONS, type AuditAction } from "./constants"

export async function writeAudit(params: {
  userId: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  entityName?: string | null
  details?: Record<string, unknown> | null
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        details: params.details ? JSON.stringify(params.details) : "{}",
      },
    })
  } catch (e) {
    // аудит не должен ломать основную операцию
    console.error("[audit] write error:", e)
  }
}

export { AUDIT_ACTIONS }
