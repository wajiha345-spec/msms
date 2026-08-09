import { Request } from 'express';
import { prisma } from '../../config/db';

// ── Immutable audit trail ─────────────────────────────────────────────────────
// No update/delete route is ever exposed for AuditLog anywhere in this app —
// this is the only writer. metadata stores a small {before, after} diff of
// just the fields that changed, not a full row dump.
export async function logAdminAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  req: Request
) {
  await prisma.auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId,
      action,
      entityType,
      entityId,
      metadata: { before, after } as any,
      // Requires app.set('trust proxy', 1) (see app.ts) to reflect the real
      // client IP rather than Railway's internal proxy address.
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    },
  });
}
