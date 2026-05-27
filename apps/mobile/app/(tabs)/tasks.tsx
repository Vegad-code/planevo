import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Clock, MoreHorizontal, Calendar, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetTextInput, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { parseTaskInput } from '@/lib/taskParser';

const { width } = Dimensions.get('window');

const FILTER_TABS = ['All', 'Focus', 'Up Next', 'Backlog'];

export default function TasksScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Horizontal Paging State
  const [activeTab, setActiveTab] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Pull down to create state
  const scrollY = useSharedValue(0);
  const isCreating = useSharedValue(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef<TextInput>(null);
  
  // Bottom Sheet State
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    
    try {
      const parsed = parseTaskInput(newTaskTitle);

      const { data, error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: parsed.title,
        priority: parsed.priority || 'medium',
        estimated_minutes: parsed.estimatedMinutes || 30,
        due_date: parsed.dueDate || null,
        energy_level_required: 'medium',
      }).select().single();
      
      if (!error && data) {
        setTasks(prev => [data, ...prev]);
        setNewTaskTitle('');
        isCreating.value = false;
        inputRef.current?.blur();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskComplete = async (task: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    await supabase.from('tasks').update({
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null
    }).eq('id', task.id);
  };

  const moveToBacklog = async (task: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Optimistically update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'waiting' } : t));
    await supabase.from('tasks').update({ status: 'waiting' }).eq('id', task.id);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim()) return;
    
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: editTitle } : t));
    bottomSheetRef.current?.close();
    Keyboard.dismiss();

    await supabase.from('tasks').update({ title: editTitle }).eq('id', editingTask.id);
  };

  // Focus the input safely using a JS function called from the worklet
  const triggerFocus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      if (event.contentOffset.y < -70 && !isCreating.value) {
        isCreating.value = true;
        if (Platform.OS === 'ios') {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
        runOnJS(triggerFocus)();
      }
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y > -20 && isCreating.value) {
        // If we didn't type anything, hide it when dragging back up
        runOnJS(triggerFocus)(); // ensure it lost focus if needed, but we probably just want to keep it open unless cancelled
      }
    }
  });

  const createInputStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(isCreating.value ? 60 : 0, { damping: 20, stiffness: 200 }),
      opacity: withTiming(isCreating.value ? 1 : 0),
      overflow: 'hidden'
    };
  });

  const getFilteredTasks = (tabIndex: number) => {
    switch(tabIndex) {
      case 1: // Focus (High Priority or Today)
        return tasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'critical'));
      case 2: // Up Next (Medium/Low Priority, not completed)
        return tasks.filter(t => !t.completed && t.priority !== 'high' && t.priority !== 'critical' && t.status !== 'waiting');
      case 3: // Backlog (waiting or completed)
        return tasks.filter(t => t.status === 'waiting' || t.completed);
      case 0:
      default:
        return tasks;
    }
  };

  const renderTask = (task: any) => {
    const renderRightActions = () => (
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: Colors.warning }]}
          onPress={() => moveToBacklog(task)}
        >
          <Clock size={24} color="#fff" />
          <Text style={styles.actionTextSm}>Backlog</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: Colors.brand[500] }]}
          onPress={() => {
            setEditingTask(task);
            setEditTitle(task.title);
            bottomSheetRef.current?.expand();
          }}
        >
          <Calendar size={24} color="#fff" />
          <Text style={styles.actionTextSm}>Reschedule</Text>
        </TouchableOpacity>
      </View>
    );

    const renderLeftActions = () => (
      <View style={[styles.actionButton, { backgroundColor: Colors.success, alignItems: 'flex-start', paddingLeft: 20, width: '100%' }]}>
        <CheckCircle2 size={28} color="#fff" />
      </View>
    );

    return (
      <Swipeable
        key={task.id}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableLeftOpen={() => toggleTaskComplete(task)}
        overshootLeft={false}
        overshootRight={false}
      >
        <TouchableOpacity 
          style={[styles.taskItem, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}
          onPress={() => {
            setEditingTask(task);
            setEditTitle(task.title);
            bottomSheetRef.current?.expand();
          }}
        >
          <TouchableOpacity onPress={() => toggleTaskComplete(task)}>
            {task.completed ? (
              <CheckCircle2 size={24} color={colors.textMuted} />
            ) : (
              <Circle size={24} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <View style={styles.taskContent}>
            <Text style={[
              styles.taskTitle, 
              { color: task.completed ? colors.textMuted : colors.text },
              task.completed && styles.taskTitleCompleted
            ]}>
              {task.title}
            </Text>
            {task.priority === 'high' || task.priority === 'critical' ? (
              <View style={[styles.priorityBadge, { backgroundColor: Colors.error + '20' }]}>
                <Text style={[styles.priorityText, { color: Colors.error }]}>HIGH</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tasks</Text>
        <View style={styles.tabContainer}>
          {FILTER_TABS.map((tab, idx) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => {
                setActiveTab(idx);
                flatListRef.current?.scrollToIndex({ index: idx, animated: true });
              }}
              style={styles.tabButton}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === idx ? colors.text : colors.textMuted, fontWeight: activeTab === idx ? '800' : '600' }
              ]}>
                {tab}
              </Text>
              {activeTab === idx && (
                <View style={[styles.activeIndicator, { backgroundColor: Colors.brand[500] }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Swiping Area */}
      <FlatList
        ref={flatListRef}
        data={FILTER_TABS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          if (activeTab !== index) setActiveTab(index);
        }}
        keyExtractor={(item) => item}
        renderItem={({ index }) => {
          const currentTasks = getFilteredTasks(index);
          return (
            <View style={{ width }}>
              <Animated.ScrollView
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.list}
              >
                {/* Only render the create input on the active tab so it doesn't duplicate visually if swiping fast, 
                    though it's fine on all tabs. */}
                <Animated.View style={createInputStyle}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.createInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.separator }]}
                    placeholder="Pull down to add task e.g. Finish math #high"
                    placeholderTextColor={colors.textMuted}
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    onSubmitEditing={handleCreateTask}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) {
                        isCreating.value = false;
                      }
                    }}
                  />
                </Animated.View>

                {loading ? (
                  <ActivityIndicator style={{ marginTop: 40 }} color={Colors.brand[500]} />
                ) : (
                  <View style={styles.tasksContainer}>
                    {currentTasks.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks here.</Text>
                    ) : (
                      currentTasks.map(renderTask)
                    )}
                  </View>
                )}
              </Animated.ScrollView>
            </View>
          );
        }}
      />

      {/* Bottom Sheet for Edit/Detail */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%', '90%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit Task</Text>
          
          <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
          <BottomSheetTextInput
            style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.separator }]}
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: Colors.brand[600] }]}
            onPress={handleUpdateTask}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 16 },
  tabContainer: { flexDirection: 'row', gap: 16 },
  tabButton: { paddingBottom: 12, position: 'relative' },
  tabText: { fontSize: 14 },
  activeIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  list: { flex: 1 },
  createInput: { margin: 16, height: 44, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 15 },
  tasksContainer: { paddingBottom: 120 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  taskContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  taskTitleCompleted: { textDecorationLine: 'line-through' },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  actionButton: { justifyContent: 'center', alignItems: 'center', width: 80, gap: 4 },
  actionTextSm: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, fontStyle: 'italic' },
  sheetContent: { padding: 24, paddingBottom: 60 },
  sheetTitle: { fontSize: 22, fontWeight: '900', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sheetInput: { height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16, marginBottom: 24 },
  saveButton: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
