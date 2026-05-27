import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/settings/ProfileForm';
import { redirect } from 'next/navigation';

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('users')
    .select('name, energy_preference')
    .eq('id', user.id)
    .single();

  const initialData = {
    ...data,
    email: user.email
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#2A2118]">
      <div>
        <h2 className="text-3xl font-serif italic text-[#2A2118] mb-3">Profile</h2>
        <p className="text-sm font-medium text-[#8a7b66] max-w-2xl leading-relaxed">
          Manage your personal details and how Planevo identifies you.
        </p>
      </div>
      
      <ProfileForm initialData={initialData} />
    </div>
  );
}
