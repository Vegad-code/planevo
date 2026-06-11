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
  Keyboard,
  Switch,
  Animated as RNAnimated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Clock, MoreHorizontal, Calendar, ArrowRight, Plus, Trash } from 'lucide-react-native';
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
import { buildFallbackGroups, Task } from '@/lib/taskGrouping';
import QuickCaptureModal from '@/components/tasks/QuickCaptureModal';

const { width } = Dimensions.get('window');

const FILTER_TABS = ['All', 'Canvas', 'Calendar', 'Notion', 'Linear', 'Slack', 'Personal'];

export default function TasksScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Horizontal Paging State
  const [activeTab, setActiveTab] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Quick Capture State
  const [isQuickCaptureOpen, setQuickCaptureOpen] = useState(false);

  // Bottom Sheet State
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [sheetMode, setSheetMode] = useState<'edit' | 'reschedule'>('edit');
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editDuration, setEditDuration] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleEditPriorityCycle = () => {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(editPriority);
    setEditPriority(levels[(currentIndex + 1) % levels.length]);
  };
  const fetchTasks = async () => {
    if (!user) return;
    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data: sourceData } = await supabase
        .from('source_items')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      let allTasks: Task[] = [];
      if (tasksData) allTasks = [...(tasksData as Task[])];

      if (sourceData) {
        const mappedSources = sourceData.map(item => ({
          id: item.external_id,
          user_id: item.user_id,
          title: item.title || 'Untitled',
          description: item.description,
          due_date: item.due_date,
          priority: 'medium',
          estimated_minutes: 30,
          completed: false,
          completed_at: null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          deleted_at: null,
          external_id: item.external_id,
          external_url: item.url,
          provider: item.provider
        } as Task));
        allTasks = [...allTasks, ...mappedSources];
      }

      setTasks(allTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    if (!user) return;

    const channelTasks = supabase
      .channel('tasks_changes_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => fetchTasks())
      .subscribe();

    const channelSources = supabase
      .channel('sources_changes_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'source_items', filter: `user_id=eq.${user.id}` }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(channelTasks);
      supabase.removeChannel(channelSources);
    };
  }, [user]);

  const handleCreateTask = async (title: string, explicitDate: string, explicitDuration: string, explicitPriority: string) => {
    if (!title.trim() || !user) return;

    try {
      const parsed = parseTaskInput(title);
      
      const parsedDuration = explicitDuration ? parseInt(explicitDuration, 10) : 0;
      const finalDuration = parsedDuration > 0 ? parsedDuration : (parsed.estimatedMinutes || 30);
      const finalPriority = explicitPriority !== 'Auto/Parse' ? explicitPriority.toLowerCase() : (parsed.priority || 'medium');
      const finalDate = explicitDate.trim() ? explicitDate : (parsed.dueDate || null);

      const { data, error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: parsed.title,
        priority: finalPriority,
        estimated_minutes: finalDuration,
        due_date: finalDate,
        energy_level_required: 'medium',
      }).select().single();

      if (!error && data) {
        setTasks(prev => [data as Task, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    if (!task.provider) {
      await supabase.from('tasks').update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null
      }).eq('id', task.id);
    }
  };

  const deleteTask = async (task: Task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    if (!task.provider) {
      await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', task.id);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editTitle.trim()) return;

    let updatedDuration: number | null = null;
    if (editDuration.trim() !== '') {
      updatedDuration = parseInt(editDuration, 10);
      if (isNaN(updatedDuration)) updatedDuration = null;
    }
    
    let updatedDate: string | null = null;
    if (editDate.trim() !== '') {
      updatedDate = editDate;
    }

    setTasks(prev => prev.map(t => t.id === editingTask.id ? { 
      ...t, 
      title: editTitle,
      priority: editPriority as any,
      estimated_minutes: updatedDuration,
      due_date: updatedDate
    } : t));
    
    bottomSheetRef.current?.close();
    Keyboard.dismiss();

    if (!editingTask.provider) {
      await supabase.from('tasks').update({ 
        title: editTitle,
        priority: editPriority,
        estimated_minutes: updatedDuration,
        due_date: updatedDate
      }).eq('id', editingTask.id);
    }
  };

  const handleReschedule = async (isoDateStr: string | null) => {
    if (!editingTask) return;

    setTasks(prev => prev.map(t => t.id === editingTask.id ? { 
      ...t, 
      due_date: isoDateStr
    } : t));
    
    bottomSheetRef.current?.close();
    Keyboard.dismiss();

    if (!editingTask.provider) {
      await supabase.from('tasks').update({ 
        due_date: isoDateStr
      }).eq('id', editingTask.id);
    }
  };

  const handleCustomReschedule = () => {
    if (customDate.trim()) {
      handleReschedule(customDate);
    }
  };



  const getFilteredGroups = (tabIndex: number) => {
    const tabName = FILTER_TABS[tabIndex].toLowerCase();
    
    let filtered = tasks;
    if (tabName !== 'all') {
      if (tabName === 'personal') {
        filtered = tasks.filter(t => !t.provider && !t.external_url?.includes('canvas') && !t.external_url?.includes('calendar') && !t.external_url?.includes('instructure'));
      } else {
        filtered = tasks.filter(t => t.provider === tabName || t.external_url?.includes(tabName) || (tabName === 'canvas' && t.external_url?.includes('instructure')));
      }
    }

    if (hideCompleted) {
      filtered = filtered.filter(t => !t.completed);
    }

    return buildFallbackGroups(filtered);
  };

  const generateBrunoMessage = (task: Task) => {
    const title = task.title;
    const lower = title.toLowerCase().trim();
    
    // Deterministic seed based on task ID to prevent message from changing on re-renders
    const seed = task.id.charCodeAt(0) + task.id.charCodeAt(task.id.length - 1);

    const prefixes = [
      "I've bumped this up for you.",
      "This looks important.",
      "Let's tackle this next.",
      "I've prioritized this for you.",
    ];
    const prefix = prefixes[seed % prefixes.length];

    const extractSubject = (verb: string) => {
      const idx = lower.indexOf(verb);
      if (idx !== -1) {
        let subject = title.slice(idx + verb.length).trim();
        subject = subject.replace(/[.!?,]+$/, '');
        
        const abbreviations: Record<string, string> = {
          'bio': 'biology',
          'calc': 'calculus',
          'chem': 'chemistry',
          'cs': 'computer science',
          'hist': 'history',
          'lit': 'literature',
          'phys': 'physics',
          'psych': 'psychology',
          'econ': 'economics',
          'gov': 'government',
          'eng': 'English',
          'hw': 'homework'
        };

        const words = subject.split(' ').map(word => {
          const wLower = word.toLowerCase();
          return abbreviations[wLower] ? abbreviations[wLower] : word;
        });

        return words.join(' ');
      }
      return '';
    };
    
    if (lower.startsWith('study for ')) {
      const subject = extractSubject('study for ');
      return `${prefix} Time to focus up and master ${subject}. You'll do great!`;
    }
    if (lower.startsWith('study ')) {
      const subject = extractSubject('study ');
      return `${prefix} Time to focus up and study ${subject}. You'll do great!`;
    }
    if (lower.startsWith('read ')) {
      const subject = extractSubject('read ');
      return `${prefix} Let's find a quiet spot and read ${subject}.`;
    }
    if (lower.startsWith('buy ') || lower.startsWith('get ') || lower.startsWith('pick up ')) {
      const verb = lower.startsWith('buy ') ? 'buy ' : (lower.startsWith('get ') ? 'get ' : 'pick up ');
      const subject = extractSubject(verb);
      return `${prefix} Make sure to grab ${subject} when you have a moment.`;
    }
    const commMatch = lower.match(/^(call|email|text|message)\s/);
    if (commMatch) {
      const subject = extractSubject(commMatch[0]);
      return `${prefix} Let's make sure to ${commMatch[1]} ${subject} today.`;
    }
    const finishMatch = lower.match(/^(finish|complete|write)\s/);
    if (finishMatch) {
      const subject = extractSubject(finishMatch[0]);
      return `${prefix} Let's push through and ${finishMatch[1]} ${subject}. You're almost there!`;
    }
    if (lower.includes('workout') || lower.includes('gym') || lower.includes('run') || lower.includes('exercise')) {
      return `${prefix} Time to get moving! A good session will make you feel great.`;
    }
    const cleanMatch = lower.match(/^(clean|wash)\s/);
    if (cleanMatch) {
      const subject = extractSubject(cleanMatch[0]);
      return `${prefix} Getting ${subject} cleaned up will make everything feel better.`;
    }

    const fallbacks = [
      `I'd recommend focusing on "${title}" right now. You've got this.`,
      `Let's knock out "${title}" next. I know you can do it.`,
      `Looks like "${title}" is top priority today. Let's get it done!`,
      `I've lined up "${title}" for you. Taking action is the first step.`
    ];
    return fallbacks[seed % fallbacks.length];
  };

  const renderTask = (task: Task) => {
    const renderRightActions = (progress: any, dragX: any) => {
      const scale = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <View style={{ flexDirection: 'row', width: 140, justifyContent: 'flex-end' }}>
          <RNAnimated.View style={{ transform: [{ scale }], flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.brand[500] }]}
              onPress={() => {
                if (task.provider) return;
                setEditingTask(task);
                setSheetMode('reschedule');
                setCustomDate('');
                bottomSheetRef.current?.expand();
              }}
            >
              <Calendar size={24} color="#fff" />
              <Text style={styles.actionTextSm}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.error }]}
              onPress={() => deleteTask(task)}
            >
              <Trash size={24} color="#fff" />
              <Text style={styles.actionTextSm}>Delete</Text>
            </TouchableOpacity>
          </RNAnimated.View>
        </View>
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      const scale = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <View style={[styles.actionButton, { backgroundColor: Colors.success, alignItems: 'flex-start', paddingLeft: 20, width: '100%' }]}>
          <RNAnimated.View style={{ transform: [{ scale }] }}>
            <CheckCircle2 size={28} color="#fff" />
          </RNAnimated.View>
        </View>
      );
    };

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
            if (task.provider) return;
            setEditingTask(task);
            setSheetMode('edit');
            setEditTitle(task.title);
            setEditPriority(task.priority || 'medium');
            setEditDuration(task.estimated_minutes ? task.estimated_minutes.toString() : '');
            
            let dateStr = '';
            if (task.due_date) {
              const d = new Date(task.due_date);
              dateStr = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
            }
            setEditDate(dateStr);
            
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
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tasks</Text>
          <View style={styles.hideCompletedContainer}>
            <Text style={[styles.hideCompletedText, { color: colors.textMuted }]}>Hide Completed</Text>
            <Switch
              value={hideCompleted}
              onValueChange={setHideCompleted}
              trackColor={{ false: colors.separator, true: Colors.brand[500] }}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
        
        <View>
          <FlatList
            data={FILTER_TABS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
            keyExtractor={item => item}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => {
                  setActiveTab(index);
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }}
                style={styles.tabButton}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === index ? colors.text : colors.textMuted, fontWeight: activeTab === index ? '800' : '600' }
                ]}>
                  {item}
                </Text>
                {activeTab === index && (
                  <View style={[styles.activeIndicator, { backgroundColor: Colors.brand[500] }]} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        isVisible={isQuickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onSubmit={handleCreateTask}
      />

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
          const groups = getFilteredGroups(index);
          const topHighPriorityTask = tasks.find(t => !t.completed && t.priority === 'high') || tasks.find(t => !t.completed);

          return (
            <View style={{ width }}>
              <Animated.ScrollView
                scrollEventThrottle={16}
                style={styles.list}
              >
                {loading ? (
                  <ActivityIndicator style={{ marginTop: 40 }} color={Colors.brand[500]} />
                ) : (
                  <View style={styles.tasksContainer}>
                    {/* Bruno Banner */}
                    {topHighPriorityTask && activeTab === 0 && (
                      <View style={[styles.bannerContainer, { backgroundColor: colors.card, borderColor: colors.separator }]}>
                        <View style={styles.bannerRow}>
                          <View style={[styles.brunoAvatar, { backgroundColor: colors.background, borderColor: colors.separator }]}>
                            <Text style={{fontSize: 18}}>🐻</Text>
                          </View>
                          <View style={styles.bannerTextContainer}>
                            <Text style={[styles.bannerLabel, { color: Colors.brand[600] }]}>BRUNO · AUTO-SORTED</Text>
                            <Text style={[styles.bannerMessage, { color: colors.text }]}>
                              {generateBrunoMessage(topHighPriorityTask)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {groups.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks here.</Text>
                    ) : (
                      groups.map(group => (
                        <View key={group.id} style={styles.groupContainer}>
                          <View style={styles.groupHeader}>
                            <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                            <View style={[styles.groupBadge, { backgroundColor: colors.separator }]}>
                              <Text style={[styles.groupBadgeText, { color: colors.textMuted }]}>{group.tasks.length}</Text>
                            </View>
                          </View>
                          <View style={[styles.groupList, { backgroundColor: colors.background }]}>
                            {group.tasks.length === 0 ? (
                              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 10, marginBottom: 10 }]}>Nothing here</Text>
                            ) : (
                              group.tasks.map(renderTask)
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </Animated.ScrollView>
            </View>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: Colors.brand[500], shadowColor: colors.text }]}
        onPress={() => { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setQuickCaptureOpen(true); 
        }}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

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
          {sheetMode === 'reschedule' ? (
            <>
              <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif', fontSize: 28 }]}>
                When would work better?
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                Flexibility is a strength! Let's pick a new time.
              </Text>

              <View style={[styles.readOnlyTaskRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.separator }]}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Task: </Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                  {editingTask?.title}
                </Text>
              </View>

              <View style={styles.quickPickContainer}>
                <TouchableOpacity 
                  style={[styles.quickPickButton, { borderColor: colors.separator }]}
                  onPress={() => handleReschedule(new Date(Date.now() + 86400000).toISOString())}
                >
                  <Text style={[styles.quickPickText, { color: colors.text }]}>Tomorrow — {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.quickPickButton, { borderColor: colors.separator }]}
                  onPress={() => handleReschedule(new Date(Date.now() + 86400000 * 2).toISOString())}
                >
                  <Text style={[styles.quickPickText, { color: colors.text }]}>Day after — {new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.quickPickButton, { borderColor: colors.separator }]}
                  onPress={() => handleReschedule(new Date(Date.now() + 86400000 * 7).toISOString())}
                >
                  <Text style={[styles.quickPickText, { color: colors.text }]}>Next week — {new Date(Date.now() + 86400000 * 7).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.customDateLabel}>PICK A CUSTOM DATE</Text>
              <View style={styles.customDateRow}>
                <View style={[styles.customDateInputContainer, { borderColor: colors.separator }]}>
                  <BottomSheetTextInput
                    style={[styles.customDateInput, { color: colors.text }]}
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor={colors.textMuted}
                    value={customDate}
                    onChangeText={setCustomDate}
                  />
                  <Calendar size={18} color={colors.textMuted} />
                </View>
                <TouchableOpacity 
                  style={[styles.setButton, { backgroundColor: colors.separator }]}
                  onPress={handleCustomReschedule}
                >
                  <Text style={[styles.setButtonText, { color: colors.text }]}>Set</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.neverMindButton}
                onPress={() => bottomSheetRef.current?.close()}
              >
                <Text style={[styles.neverMindText, { color: colors.textMuted }]}>Never mind</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.sheetTitle, { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 24 }]}>Edit Task</Text>

              <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
              <BottomSheetTextInput
                style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.separator }]}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <View style={styles.optionsSection}>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.fieldLabel}>PRIORITY</Text>
                    <TouchableOpacity style={[styles.formInput, { borderColor: colors.separator, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]} onPress={handleEditPriorityCycle}>
                      <Text style={[styles.formInputText, { color: colors.text }]}>{editPriority}</Text>
                      <Clock size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.fieldLabel}>EST. TIME (MIN)</Text>
                    <View style={[styles.formInput, { borderColor: colors.separator, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                      <BottomSheetTextInput 
                        style={[styles.formInputText, { color: colors.text, flex: 1, padding: 0 }]} 
                        placeholder="Duration" 
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={editDuration}
                        onChangeText={setEditDuration}
                      />
                      <Clock size={16} color={colors.textMuted} />
                    </View>
                  </View>
                </View>
                
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.fieldLabel}>EXPLICIT DUE DATE</Text>
                    <View style={[styles.formInput, { borderColor: colors.separator, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                      <BottomSheetTextInput 
                        style={[styles.formInputText, { color: colors.text, flex: 1, padding: 0 }]} 
                        placeholder="mm/dd/yyyy" 
                        placeholderTextColor={colors.textMuted}
                        value={editDate}
                        onChangeText={setEditDate}
                      />
                      <Calendar size={16} color={colors.textMuted} />
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: Colors.brand[600] }]}
                onPress={handleUpdateTask}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 10, borderBottomWidth: 1 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  hideCompletedContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hideCompletedText: { fontSize: 12, fontWeight: '600' },
  tabContainer: { paddingHorizontal: 20, gap: 20, paddingBottom: 0 },
  tabButton: { paddingBottom: 12, position: 'relative' },
  tabText: { fontSize: 14 },
  activeIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  list: { flex: 1 },
  tasksContainer: { paddingBottom: 120 },
  
  // Bruno Banner Styles
  bannerContainer: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 16, borderWidth: 1, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brunoAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bannerTextContainer: { flex: 1 },
  bannerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  bannerMessage: { fontSize: 13, fontWeight: '500' },

  // Group Styles
  groupContainer: { marginTop: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  groupBadgeText: { fontSize: 10, fontWeight: '700' },
  groupList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'transparent' },

  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  taskContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  taskTitleCompleted: { textDecorationLine: 'line-through' },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  actionButton: { justifyContent: 'center', alignItems: 'center', width: 70, gap: 4 },
  actionTextSm: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, fontStyle: 'italic' },
  sheetContent: { padding: 24, paddingBottom: 60 },
  sheetTitle: { marginBottom: 4 },
  sheetSubtitle: { fontSize: 16, marginBottom: 24 },
  readOnlyTaskRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 24 },
  quickPickContainer: { gap: 12 },
  quickPickButton: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  quickPickText: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 24 },
  customDateLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 12 },
  customDateRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  customDateInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
  customDateInput: { flex: 1, fontSize: 16, padding: 0 },
  setButton: { height: 50, paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  setButtonText: { fontSize: 16, fontWeight: '700' },
  neverMindButton: { marginTop: 32, alignItems: 'center' },
  neverMindText: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sheetInput: { height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16, marginBottom: 24 },
  optionsSection: { marginTop: 0, marginBottom: 24, padding: 0, borderRadius: 16 },
  fieldRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  fieldCol: { flex: 1, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: '#888' },
  formInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  formInputText: { fontSize: 14, fontWeight: '600' },
  saveButton: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
