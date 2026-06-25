import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

export type SecurityAuditAction =
  | 'auth.sign_in_failed'
  | 'auth.password_reset'
  | 'auth.password_changed'
  | 'account.delete'
  | 'integration.connect'
  | 'integration.disconnect'
  | 'settings.update'
  | 'stripe.portal_open';

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function logSecurityAudit(params: {
  actorUserId: string | null;
  action: SecurityAuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  const ipHash = hashIp(params.ip ?? null);

  try {
    const { data, error } = await supabaseAdmin.rpc('insert_security_audit_log', {
      p_actor_user_id: params.actorUserId,
      p_action: params.action,
      p_resource_type: params.resourceType ?? null,
      p_resource_id: params.resourceId ?? null,
      p_metadata: (params.metadata ?? {}) as Json,
      p_ip_hash: ipHash,
    });

    if (error) {
      logger.warn('security_audit_log insert failed', {
        action: params.action,
        error: error.message,
      });
      return null;
    }

    return data as string;
  } catch (err) {
    logger.warn('security_audit_log insert threw', {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
