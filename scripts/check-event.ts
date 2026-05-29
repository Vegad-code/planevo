import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Using service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvent() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, source, metadata')
    .ilike('title', '%Dog walk%');

  if (error) {
    console.error('Error fetching event:', error);
  } else {
    console.log('Events found:', JSON.stringify(data, null, 2));
  }
}

checkEvent();
