import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to refresh Google token');
  return data.access_token;
}

import crypto from 'crypto';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL!.substring(0, 32);

function decryptToken(encryptedText: string) {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText;
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const { data: users } = await supabase.from('users').select('id, email, google_calendar_connected').eq('google_calendar_connected', true).limit(1);
  if (!users || users.length === 0) return;
  const user = users[0];
  console.log("Checking events for user:", user.id);

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_time, source')
    .eq('user_id', user.id);
    
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Found", events?.length, "events");
    console.log(events);
  }
}

main();
