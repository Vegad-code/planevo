export type ExpoPushResult =
  | { ok: true }
  | { ok: false; error: string; deviceNotRegistered: boolean };

export async function sendExpoPushNotification(message: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<ExpoPushResult> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        sound: 'default',
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await response.text(),
        deviceNotRegistered: false,
      };
    }

    const result = await response.json();
    if (result.data?.status === 'error') {
      return {
        ok: false,
        error: result.data.message || 'Expo push delivery failed',
        deviceNotRegistered: result.data.details?.error === 'DeviceNotRegistered',
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Expo push request failed',
      deviceNotRegistered: false,
    };
  }
}
