# Push Notification Release Checklist

Planevo uses Expo Notifications and the Expo Push API.

## Required Credentials

1. Create or select the Firebase project for `com.planevo.mobile`.
2. Download `google-services.json` and place it at `apps/mobile/google-services.json`.
3. Upload the Android FCM V1 service account credentials to EAS.
4. Configure Apple Push Notification credentials for the `com.planevo.mobile` bundle identifier in EAS.
5. Build a physical-device preview or production build. Push notifications do not work on simulators.

Do not commit Firebase service account keys or Play Store service account keys.

## Verification

1. Sign in on a physical device and allow notifications.
2. Confirm `users.expo_push_token` is populated.
3. Open web settings and use **Test Push Notification**.
4. Use **Test Email Notification** to verify Resend delivery.
5. Confirm the hourly Vercel cron jobs have `CRON_SECRET` configured.
6. Apply notification migrations through `migration_v19_notification_deliveries.sql`.
