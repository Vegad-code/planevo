import { pushEventToGoogle } from '../apps/web/lib/integrations/google-calendar';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

// We have to mock cookies for Next.js if we import a file that uses `next/headers`
// Instead, let's just make the raw fetch call directly here using the user's refresh token.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPush() {
  const { data: users } = await supabase.from('users').select('*').eq('id', '215bd6e7-4ed8-44d6-9521-6b8e12ed5117').limit(1);
  if (!users) return;
  const user = users[0];

  const { data: event } = await supabase.from('calendar_events').select('*').eq('id', '77262bfc-a27a-4ed0-91a8-7a5c0bc77ccf').single();
  if (!event) return;

  console.log("Found event:", event);

  // Decrypt token logic
  const crypto = require('crypto');
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

  const refreshToken = decryptToken(user.google_calendar_refresh_token);

  // Refresh token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || 'missing_id',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || 'missing_secret',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  console.log("Client ID present:", !!process.env.GOOGLE_CLIENT_ID);
  console.log("Client Secret present:", !!process.env.GOOGLE_CLIENT_SECRET);
  console.log("Encryption Key present:", !!process.env.ENCRYPTION_KEY);
  const data = await response.json();
  console.log("Token response:", data);
  const accessToken = data.access_token;
  console.log("Got access token");

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
  const body = {
    summary: event.title || event.description || 'Untitled Event',
    description: event.description,
    location: event.location,
    start: event.is_all_day ? { date: event.start_time.split('T')[0] } : { dateTime: event.start_time },
    end: event.is_all_day ? { date: event.end_time.split('T')[0] } : { dateTime: event.end_time },
  };
  
  console.log("Pushing body:", JSON.stringify(body, null, 2));

  const pushRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!pushRes.ok) {
    console.error("Failed:", await pushRes.text());
  } else {
    const pushData = await pushRes.json();
    console.log("Success! Google ID:", pushData.id);
  }
}

testPush();
