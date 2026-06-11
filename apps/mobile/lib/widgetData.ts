import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { format } from 'date-fns';

const APP_GROUP = 'group.com.planevo.mobile';

export interface NextActionData {
  title: string;
  startTime: Date | null;
  endTime: Date | null;
  status: 'NOW' | 'UP NEXT' | '';
}

/**
 * Write the current "next action" into the shared App Group container
 * so the iOS Home Screen Widget can display it.
 * No-ops on Android (widgets handled differently there).
 */
export async function writeWidgetData(action: NextActionData | null): Promise<void> {
  if (Platform.OS !== 'ios' || Constants.appOwnership === 'expo') return;

  try {
    const SharedGroupPreferences =
      require('react-native-shared-group-preferences').default;

    if (!action) {
      await SharedGroupPreferences.setItem('nextActionTitle', 'No plan yet', APP_GROUP);
      await SharedGroupPreferences.setItem('nextActionTime', '', APP_GROUP);
      await SharedGroupPreferences.setItem('nextActionStatus', '', APP_GROUP);
      return;
    }

    const timeStr =
      action.startTime && action.endTime
        ? `${format(action.startTime, 'h:mm a')} → ${format(action.endTime, 'h:mm a')}`
        : action.startTime
        ? format(action.startTime, 'h:mm a')
        : '';

    await SharedGroupPreferences.setItem('nextActionTitle', action.title, APP_GROUP);
    await SharedGroupPreferences.setItem('nextActionTime', timeStr, APP_GROUP);
    await SharedGroupPreferences.setItem('nextActionStatus', action.status, APP_GROUP);
  } catch (err) {
    // Widget data is non-critical — log and continue
    console.warn('[widgetData] Failed to write widget data:', err);
  }
}
