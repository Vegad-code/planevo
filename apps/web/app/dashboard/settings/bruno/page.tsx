import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserAIMemory } from '@/lib/ai/memory';
import { BrunoPreferencesForm } from '@/components/settings/BrunoPreferencesForm';
import { LLMImportForm } from '@/components/settings/LLMImportForm';
import { MemoryControls } from '@/components/settings/MemoryControls';

export const metadata = {
  title: 'Bruno Preferences | Planevo Settings',
};

export default async function BrunoSettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const memory = await getUserAIMemory(supabase, user.id);

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Bruno preferences</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Tune what Bruno knows about your week and how loud he should be.
        </p>
      </div>

      <BrunoPreferencesForm initialData={memory} />
      <LLMImportForm initialData={memory} />
      <MemoryControls initialData={memory} />
    </div>
  );
}
