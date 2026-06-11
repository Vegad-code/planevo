import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error } = await supabase.from('tasks').insert({
    title: 'test task',
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    source: 'manual', // Testing if this column exists
  });
  
  console.log('Error object:', error);
}
test();
