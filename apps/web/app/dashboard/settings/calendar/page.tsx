import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserAIMemory } from '@/lib/ai/memory';
import { CalendarViewForm } from '@/components/settings/CalendarViewForm';
import { PlanningStyleForm } from '@/components/settings/PlanningStyleForm';
import { BreakPreferencesForm } from '@/components/settings/BreakPreferencesForm';
import { FocusWindowsForm } from '@/components/settings/FocusWindowsForm';

export const metadata = {
  title: 'Calendar & Planning - Planevo Settings',
};

export default async function CalendarSettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Fetch memory (this auto-initializes if missing)
  const memory = await getUserAIMemory(supabase, user.id);

  // Fetch calendar preferences
  let { data: calPrefs } = await supabase
    .from('calendar_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // If no calendar preferences, initialize it
  if (!calPrefs) {
    // try to get from users table
    const { data: userData } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyPrefs = userData?.scheduling_preferences as Record<string, any>;
    
    // Default values
    const defaultView = 'day';
    let startHour = 8;
    let endHour = 20;

    if (legacyPrefs) {
       // Graceful fallback for legacy fields if they exist
       if (legacyPrefs.preferred_focus_time === 'morning') {
         startHour = 6;
         endHour = 18;
       } else if (legacyPrefs.preferred_focus_time === 'evening') {
         startHour = 10;
         endHour = 22;
       }
    }

    const { data: newCalPrefs } = await supabase
      .from('calendar_preferences')
      .upsert({
         user_id: user.id,
         default_view: defaultView,
         start_hour: startHour,
         end_hour: endHour,
         show_completed: true,
      })
      .select()
      .maybeSingle();
    
    calPrefs = newCalPrefs || {
         id: 'temp',
         user_id: user.id,
         default_view: defaultView,
         start_hour: startHour,
         end_hour: endHour,
         show_completed: true,
         show_gaps: true,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
    };
  }

  // Ensure it's never null when passed to the form
  const safeCalPrefs = calPrefs || {};

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-settings-text">Calendar & Planning</h1>
        <p className="text-sm text-settings-text-muted mt-1">
          Configure how your calendar looks and set the rules Bruno uses to schedule your day.
        </p>
      </div>

      <div className="space-y-6">
        <CalendarViewForm initialData={safeCalPrefs} />
        <PlanningStyleForm initialData={memory.planning_style} />
        <BreakPreferencesForm initialData={memory.break_preference} />
        <FocusWindowsForm 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialPreferred={memory.preferred_focus_windows as any} 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialAvoided={memory.avoided_focus_windows as any} 
        />
      </div>
    </div>
  );
}
