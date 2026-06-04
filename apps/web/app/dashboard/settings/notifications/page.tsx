import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm';
import { getNotificationPreferences } from './actions';

export default async function NotificationsSettingsPage() {
  const preferences = await getNotificationPreferences();

  return (
    <div className="space-y-8 animate-fade-in text-[#2A2118]">
      <div>
        <h2 className="text-3xl font-serif italic text-[#2A2118] mb-3">Notifications</h2>
        <p className="text-sm font-medium text-[#8a7b66] max-w-2xl leading-relaxed">
          Control when and how Planevo reaches out to you.
        </p>
      </div>

      <NotificationPreferencesForm initialPreferences={preferences} />
    </div>
  );
}
