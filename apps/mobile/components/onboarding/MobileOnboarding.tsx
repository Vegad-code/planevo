import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Check, ChevronRight, GraduationCap, LockKeyhole, Play, Sparkles } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { captureEvent } from '@/lib/observability';

type Preferences = Record<string, unknown>;

const steps = [
  'welcome',
  'identity',
  'name',
  'profile',
  'energy',
  'canvas-value',
  'canvas-guide',
  'calendar',
  'first-plan',
  'reminders',
  'finish',
] as const;

const identityOptions = [
  'My planner falls apart when the week changes.',
  'I lose time deciding what to do first.',
  'Canvas, calendar, and tasks are never in one place.',
  'I want less guilt and more next actions.',
];

const profileOptions = [
  { id: 'student', label: 'Student', detail: 'Classes, Canvas, exams, labs.' },
  { id: 'builder', label: 'Builder', detail: 'Projects, meetings, focus blocks.' },
  { id: 'both', label: 'Both', detail: 'School, work, and life together.' },
];

const energyOptions = [
  { id: 'morning', label: 'Morning', detail: 'Hard work before noon.' },
  { id: 'afternoon', label: 'Afternoon', detail: 'Best after lunch.' },
  { id: 'night', label: 'Night', detail: 'Brain wakes up late.' },
  { id: 'chaos', label: 'Varies', detail: 'Let Bruno adapt.' },
];

function compactName(value: string, fallback = 'Pilot') {
  return value.trim().split(' ')[0] || fallback;
}

function PillButton({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
      {!secondary && <ChevronRight size={18} color={Colors.surface[900]} strokeWidth={3} />}
    </Pressable>
  );
}

function OptionRow({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        { backgroundColor: colors.card, borderColor: selected ? Colors.brand[400] : colors.cardBorder },
      ]}
    >
      <View style={[styles.check, { backgroundColor: selected ? Colors.brand[400] : 'transparent', borderColor: selected ? Colors.brand[400] : colors.cardBorder }]}>
        {selected && <Check size={14} color={Colors.surface[900]} strokeWidth={3} />}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.text }]} selectable>{title}</Text>
        {detail ? <Text style={[styles.optionDetail, { color: colors.textMuted }]} selectable>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

function CanvasVideoCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.videoCard, { backgroundColor: Colors.surface[900] }]}>
      <View style={styles.videoTop}>
        <Text style={styles.videoLabel} selectable>CANVAS TOKEN VIDEO</Text>
        <Text style={styles.videoDuration} selectable>45 SEC</Text>
      </View>
      <View style={styles.playCircle}>
        <Play size={26} color={Colors.surface[900]} fill={Colors.surface[900]} />
      </View>
      <View style={styles.videoSteps}>
        {['Account', 'Settings', 'New token'].map((label, index) => (
          <View key={label} style={styles.videoStep}>
            <Text style={styles.videoStepNumber} selectable>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={styles.videoStepText} selectable>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.videoHint, { color: colors.card }]} selectable>
        The full walkthrough can be swapped with a real hosted video URL when the asset is ready.
      </Text>
    </View>
  );
}

export default function MobileOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [identity, setIdentity] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [name, setName] = useState(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
  const [profileType, setProfileType] = useState('student');
  const [energy, setEnergy] = useState('morning');
  const [canvasSkipped, setCanvasSkipped] = useState(false);
  const [calendarSkipped, setCalendarSkipped] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [saving, setSaving] = useState(false);

  const step = steps[stepIndex];
  const firstName = compactName(name);
  const selectedIdentityCount = useMemo(() => Object.values(identity).filter(Boolean).length, [identity]);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  function next() {
    captureEvent('mobile_onboarding_step_completed', {
      step,
      step_index: stepIndex + 1,
      version: 'mobile-v2',
    });
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function back() {
    if (stepIndex === 0) {
      router.replace('/login');
      return;
    }
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  async function openWebCanvasGuide() {
    const baseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://planevo.co').replace(/\/$/, '');
    await Linking.openURL(`${baseUrl}/onboarding`);
  }

  async function finish() {
    if (!user) {
      router.replace('/login');
      return;
    }

    setSaving(true);
    try {
      const activeIdentity = Object.keys(identity)
        .filter((key) => identity[Number(key)])
        .map((key) => Number(key));

      const { data: existingProfile } = await supabase
        .from('users')
        .select('scheduling_preferences')
        .eq('id', user.id)
        .maybeSingle();

      const existingPreferences =
        existingProfile?.scheduling_preferences &&
        typeof existingProfile.scheduling_preferences === 'object' &&
        !Array.isArray(existingProfile.scheduling_preferences)
          ? existingProfile.scheduling_preferences as Preferences
          : {};

      const profilePayload = {
        id: user.id,
        email: user.email ?? '',
        onboarding_complete: true,
        name: name.trim() || firstName,
        energy_preference: energy,
        scheduling_preferences: {
          ...existingPreferences,
          preferred_focus_time: energy,
          profile_type: profileType,
          identity_checks: activeIdentity,
          mobile_onboarding: {
            version: 'mobile-v2',
            completed_at: new Date().toISOString(),
            canvas_skipped: canvasSkipped,
            calendar_skipped: calendarSkipped,
            reminders_enabled: reminders,
          },
        },
      };

      const { error } = await supabase
        .from('users')
        .upsert(profilePayload as any, { onConflict: 'id' });

      if (error) throw error;

      captureEvent('mobile_onboarding_completed', {
        version: 'mobile-v2',
        profile_type: profileType,
        energy_preference: energy,
        canvas_skipped: canvasSkipped,
        calendar_skipped: calendarSkipped,
        reminders_enabled: reminders,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Could not save setup', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <Pressable onPress={back} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.textSecondary }]} selectable>Back</Text>
        </Pressable>
        <Text style={[styles.stepText, { color: colors.textMuted }]} selectable>
          {String(stepIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.body}>
        {step === 'welcome' && (
          <>
            <View style={[styles.bearBadge, { backgroundColor: Colors.brand[100] }]}>
              <Text style={styles.bearText} selectable>B</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Bruno can plan this without making it a whole thing.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Mobile setup is split into small steps. You can connect the heavier school source on web later.
            </Text>
            <PillButton label="Start setup" onPress={next} />
          </>
        )}

        {step === 'identity' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Which ones sound familiar?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Pick at least one. Bruno uses this to avoid planner shame.
            </Text>
            <View style={styles.stack}>
              {identityOptions.map((option, index) => (
                <OptionRow
                  key={option}
                  title={option}
                  selected={!!identity[index]}
                  onPress={() => setIdentity((current) => ({ ...current, [index]: !current[index] }))}
                />
              ))}
            </View>
            <PillButton label={`Continue (${selectedIdentityCount} selected)`} onPress={next} disabled={selectedIdentityCount === 0} />
          </>
        )}

        {step === 'name' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              What should Bruno call you?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Keep it casual. This is how check-ins will feel.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: Colors.brand[400] }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={[styles.bubble, { backgroundColor: colors.card, color: colors.text }]} selectable>
              Hey {name.trim() || 'Pilot'} - nice to meet you.
            </Text>
            <PillButton label="Continue" onPress={next} disabled={!name.trim()} />
          </>
        )}

        {step === 'profile' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              What kind of week are we planning?
            </Text>
            <View style={styles.stack}>
              {profileOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  title={option.label}
                  detail={option.detail}
                  selected={profileType === option.id}
                  onPress={() => setProfileType(option.id)}
                />
              ))}
            </View>
            <PillButton label="Continue" onPress={next} />
          </>
        )}

        {step === 'energy' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              When does your brain actually work?
            </Text>
            <View style={styles.stack}>
              {energyOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  title={option.label}
                  detail={option.detail}
                  selected={energy === option.id}
                  onPress={() => setEnergy(option.id)}
                />
              ))}
            </View>
            <PillButton label="Continue" onPress={next} />
          </>
        )}

        {step === 'canvas-value' && (
          <>
            <View style={styles.iconRow}>
              <GraduationCap size={28} color={Colors.brand[500]} />
              <LockKeyhole size={28} color={Colors.success} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Canvas is optional, but it makes Planevo much smarter.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Bruno reads course names, assignment titles, and due dates. Not grades, submissions, essays, or messages.
            </Text>
            <PillButton label="Show token guide" onPress={next} />
            <PillButton
              label="Use sample school plan"
              onPress={() => {
                setCanvasSkipped(true);
                next();
              }}
              secondary
            />
          </>
        )}

        {step === 'canvas-guide' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Watch where to find the Canvas access token.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              The token step is easier on a laptop, so mobile can continue now and leave Canvas for web setup.
            </Text>
            <CanvasVideoCard />
            <PillButton label="Open web setup" onPress={openWebCanvasGuide} />
            <PillButton
              label="I will connect later"
              onPress={() => {
                setCanvasSkipped(true);
                next();
              }}
              secondary
            />
          </>
        )}

        {step === 'calendar' && (
          <>
            <View style={styles.iconRow}>
              <CalendarDays size={30} color={Colors.info} />
              <Sparkles size={30} color={Colors.brand[500]} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Calendar tells Bruno where not to put work.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              For now, connect Google Calendar on web. Mobile will still show your plan and let you chat with Bruno.
            </Text>
            <PillButton label="Continue" onPress={next} />
            <PillButton
              label="Mark calendar for later"
              onPress={() => {
                setCalendarSkipped(true);
                next();
              }}
              secondary
            />
          </>
        )}

        {step === 'first-plan' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Your first plan, {firstName}.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              This is the shape of a Bruno-built day. Real connected data replaces the sample blocks.
            </Text>
            <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {[
                ['9:00', 'Deep work first'],
                ['10:30', 'Recovery break'],
                ['11:00', 'Calendar-safe block'],
                ['2:00', 'Light task batch'],
              ].map(([time, title]) => (
                <View key={time} style={styles.planRow}>
                  <Text style={[styles.planTime, { color: colors.textMuted }]} selectable>{time}</Text>
                  <View style={styles.planRail} />
                  <Text style={[styles.planTitle, { color: colors.text }]} selectable>{title}</Text>
                </View>
              ))}
            </View>
            <PillButton label="Looks good" onPress={next} />
          </>
        )}

        {step === 'reminders' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Want a tiny morning nudge?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Planevo can remind you when the plan is ready. You can change this later in Settings.
            </Text>
            <View style={styles.stack}>
              <OptionRow title="Yes, remind me" detail="Best for daily retention." selected={reminders} onPress={() => setReminders(true)} />
              <OptionRow title="Not right now" detail="No pressure." selected={!reminders} onPress={() => setReminders(false)} />
            </View>
            <PillButton label="Continue" onPress={next} />
          </>
        )}

        {step === 'finish' && (
          <>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              Ready. Bruno will meet you in Today.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
              Finish now, then connect Canvas and Calendar from web when you want the full automatic plan.
            </Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.summaryText, { color: colors.text }]} selectable>{profileType} setup</Text>
              <Text style={[styles.summaryText, { color: colors.text }]} selectable>{energy} energy</Text>
              <Text style={[styles.summaryText, { color: colors.text }]} selectable>{canvasSkipped ? 'Canvas later' : 'Canvas guide viewed'}</Text>
            </View>
            <Pressable
              onPress={finish}
              disabled={saving}
              style={({ pressed }) => [styles.button, styles.primaryButton, saving && styles.disabled, pressed && !saving && styles.pressed]}
            >
              {saving ? <ActivityIndicator color={Colors.surface[900]} /> : <Text style={styles.buttonText}>Finish setup</Text>}
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand[400],
    borderRadius: 99,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    minHeight: 580,
  },
  bearBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  bearText: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.brand[700],
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  stack: {
    gap: 12,
  },
  option: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  optionDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  input: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
    fontSize: 20,
    fontWeight: '800',
  },
  bubble: {
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  button: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: Colors.brand[400],
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.surface[300],
  },
  buttonText: {
    color: Colors.surface[900],
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: Colors.brand[600],
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  videoCard: {
    borderRadius: 24,
    padding: 18,
    gap: 18,
  },
  videoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoLabel: {
    color: Colors.brand[300],
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  videoDuration: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  playCircle: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.brand[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSteps: {
    flexDirection: 'row',
    gap: 8,
  },
  videoStep: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 10,
  },
  videoStepNumber: {
    color: Colors.brand[300],
    fontSize: 10,
    fontWeight: '900',
  },
  videoStepText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  videoHint: {
    opacity: 0.7,
    fontSize: 12,
    lineHeight: 18,
  },
  planCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  planRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planTime: {
    width: 42,
    fontSize: 12,
    fontWeight: '900',
  },
  planRail: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 99,
    backgroundColor: Colors.brand[400],
  },
  planTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
