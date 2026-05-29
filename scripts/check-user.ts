import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const { data: user } = await supabase.from('users').select('id, email, google_calendar_connected, google_calendar_refresh_token, google_calendar_last_synced_at').eq('id', '215bd6e7-4ed8-44d6-9521-6b8e12ed5117').single();
  console.log(user);
}
checkUser();
