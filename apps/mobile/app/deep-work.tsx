import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Clock, Pause, Play, Square } from 'lucide-react-native';

export default function DeepWorkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [secondsLeft, setSecondsLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const saveFocusTime = useCallback(async (timeToSave: number) => {
    if (!user || timeToSave === 0) return;
    try {
      const targetDate = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_user_metrics')
        .select('id, focus_time_seconds')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('daily_user_metrics')
          .update({ 
            focus_time_seconds: existing.focus_time_seconds + timeToSave, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_user_metrics')
          .insert({
            user_id: user.id,
            date: targetDate,
            focus_time_seconds: timeToSave,
            tasks_completed: 0,
            tasks_planned: 0,
          });
      }
    } catch (err) {
      console.error('Failed to save focus time:', err);
    }
  }, [user]);

  const handleSessionEnd = useCallback(async () => {
    await saveFocusTime(elapsedSeconds);
    Alert.alert(
      "Session Complete",
      `You focused for ${Math.round(elapsedSeconds / 60)} minutes!`,
      [{ text: "Awesome", onPress: () => router.back() }]
    );
  }, [elapsedSeconds, saveFocusTime, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
        setElapsedSeconds((e) => e + 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      handleSessionEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, handleSessionEnd]);

  const handleStop = () => {
    setIsActive(false);
    Alert.alert(
      "End Session?",
      "Are you sure you want to end your deep work session early?",
      [
        { text: "Cancel", style: "cancel", onPress: () => setIsActive(true) },
        { 
          text: "End Session", 
          style: "destructive", 
          onPress: async () => {
            await saveFocusTime(elapsedSeconds);
            router.back();
          } 
        }
      ]
    );
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Clock size={24} color={Colors.brand[500]} />
        <Text style={[styles.title, { color: colors.text }]}>Deep Work</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: colors.text }]}>
          {formatTime(secondsLeft)}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Stay focused. Minimize distractions.
        </Text>
      </View>

      <View style={styles.controlsRow}>
        {!isActive ? (
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: Colors.brand[500] }]} 
            onPress={() => setIsActive(true)}
          >
            <Play size={32} color="#fff" fill="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: Colors.accent[500] }]} 
            onPress={() => setIsActive(false)}
          >
            <Pause size={32} color="#fff" fill="#fff" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.stopButton, { borderColor: Colors.error }]} 
          onPress={handleStop}
        >
          <Square size={24} color={Colors.error} fill={Colors.error} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timerText: {
    fontSize: 80,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 40,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
