import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('tasks').insert({
    title: 'test task',
    user_id: '123e4567-e89b-12d3-a456-426614174000', // Dummy UUID
    parent_task_id: null,
    recurrence_pattern: null,
    is_recurring: false
  });
  console.log('Result:', { data, error });
}
test();
