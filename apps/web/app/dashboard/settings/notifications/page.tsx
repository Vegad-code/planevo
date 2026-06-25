import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm';
import { getNotificationDeliveryStatus, getNotificationPreferences } from './actions';

export default async function NotificationsSettingsPage() {
  const [preferences, deliveryInsight] = await Promise.all([
    getNotificationPreferences(),
    getNotificationDeliveryStatus(),
  ]);

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Notifications</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Control when and how Planevo reaches out to you.
        </p>
      </div>

      <NotificationPreferencesForm
        initialPreferences={preferences}
        initialDeliveryInsight={deliveryInsight}
      />
    </div>
  );
}
