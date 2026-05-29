import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserPrefs() {
  const { data: user } = await supabase.from('users').select('google_calendar_id, scheduling_preferences').eq('id', '215bd6e7-4ed8-44d6-9521-6b8e12ed5117').single();
  console.log(JSON.stringify(user, null, 2));
}
checkUserPrefs();
