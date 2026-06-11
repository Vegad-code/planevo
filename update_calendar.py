import os
import re

filepath = "apps/mobile/app/(tabs)/calendar.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Add imports
imports_to_add = """import { Text, TouchableOpacity, Alert } from 'react-native';
import { RefreshCw, ListTodo } from 'lucide-react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';"""
content = content.replace("import { View, StyleSheet, ActivityIndicator } from 'react-native';", "import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';\nimport { RefreshCw, ListTodo } from 'lucide-react-native';\nimport BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';\nimport { useRef } from 'react';")

# Add state and ref
state_old = "const [selectedDate, setSelectedDate] = useState(new Date());"
state_new = """const [selectedDate, setSelectedDate] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState<any[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);"""
content = content.replace(state_old, state_new)

# Add fetchBacklog
fetch_backlog = """
  const fetchBacklog = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (data) setBacklogTasks(data);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);
"""
content = content.replace("useEffect(() => {\n    fetchEvents();\n  }, [fetchEvents]);", "useEffect(() => {\n    fetchEvents();\n  }, [fetchEvents]);\n" + fetch_backlog)

# Add sync logic
sync_logic = """
  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL not configured");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${apiUrl}/api/integrations/google/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });
      if (!response.ok) throw new Error("Sync failed");
      
      await fetchEvents();
      Alert.alert("Success", "Calendar synced successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Sync Error", "Could not sync calendar.");
    } finally {
      setSyncing(false);
    }
  };
"""
content = content.replace("if (loading) {", sync_logic + "\n  if (loading) {")

# Replace return statement
return_old = """  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <MobileCalendar
        events={events}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventPress={(ev) => console.log('Event pressed:', ev.title)}
      />
    </SafeAreaView>
  );"""

return_new = """  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()} style={styles.actionBtn}>
            <ListTodo size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.actionBtn}>
            <RefreshCw size={24} color={syncing ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <MobileCalendar
        events={events}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventPress={(ev) => console.log('Event pressed:', ev.title)}
      />

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
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Task Backlog</Text>
          {backlogTasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No pending tasks.</Text>
          ) : (
            backlogTasks.map(task => (
              <View key={task.id} style={[styles.taskItem, { borderBottomColor: colors.separator }]}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                {task.priority === 'high' && <Text style={styles.highPriority}>HIGH</Text>}
              </View>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );"""

content = content.replace(return_old, return_new)

# Add styles
styles_old = """const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});"""

styles_new = """const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 60,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    fontStyle: 'italic',
  },
  highPriority: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  }
});"""

content = content.replace(styles_old, styles_new)

with open(filepath, "w") as f:
    f.write(content)
print("Updated calendar.tsx")
