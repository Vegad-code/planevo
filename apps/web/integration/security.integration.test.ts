import { createClient } from '@supabase/supabase-js';
import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '@/lib/crypto';

const RUN = process.env.INTEGRATION_TEST === '1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

describe.skipIf(!RUN)('Supabase integration — RLS and RPCs', () => {
  it('rejects unauthenticated read of another user tasks', async () => {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client.from('tasks').select('id').limit(1);
    expect(error || (data?.length ?? 0) === 0).toBeTruthy();
  });

  it('consume_ip_rate_limit RPC returns allowed boolean', async () => {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bucket = `integration-test:${Date.now()}`;
    const { data, error } = await admin.rpc('consume_ip_rate_limit', {
      p_bucket: bucket,
      p_max_attempts: 2,
      p_window_seconds: 60,
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('allowed');
  });

  it('security_audit_log insert via service RPC', async () => {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc('insert_security_audit_log', {
      p_actor_user_id: null,
      p_action: 'integration.test',
      p_resource_type: 'test',
      p_resource_id: 'integration',
      p_metadata: { source: 'vitest' },
      p_ip_hash: null,
    });

    expect(error).toBeNull();
    expect(typeof data).toBe('string');
  });
});

describe('crypto round-trip', () => {
  it('encrypts and decrypts tokens', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    const plain = 'test-integration-token';
    const encrypted = encryptToken(plain);
    expect(encrypted).toContain(':');
    expect(decryptToken(encrypted)).toBe(plain);
  });
});
