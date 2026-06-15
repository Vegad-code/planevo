import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkState } from '@/hooks/useNetworkState';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Send, Bot, UserIcon, History, Plus, Square, Edit2, X, Trash } from 'lucide-react-native';
import PlanDraftCard, { PlanDraftItemData } from '../../components/bruno/PlanDraftCard';
import PlanPreviewModal from '../../components/bruno/PlanPreviewModal';
import BrunoEntitlementNotice, {
  type MobileBrunoMetadata,
} from '../../components/bruno/BrunoEntitlementNotice';
import { useRouter } from 'expo-router';

interface ChatMessage {
  id: string;
  role: 'user' | 'bruno';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
  metadata?: MobileBrunoMetadata;
}

export default function BrunoChatScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetworkState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<{id: string, title: string} | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);

  const [mentionState, setMentionState] = useState<{ active: boolean, text: string }>({ active: false, text: '' });
  const [suggestions, setSuggestions] = useState<{id: string, title: string, type: 'task'|'event', subtitle?: string}[]>([]);

  const [previewPlanData, setPreviewPlanData] = useState<any>(null);
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);

  useEffect(() => {
    async function fetchMentions() {
      if (!mentionState.active || !user) {
        setSuggestions([]);
        return;
      }
      const [{ data: tasks }, { data: events }] = await Promise.all([
        supabase.from('tasks').select('id, title, status').eq('user_id', user.id).neq('status', 'done').is('deleted_at', null).ilike('title', `%${mentionState.text}%`).limit(5),
        supabase.from('calendar_events').select('id, title, start_time').eq('user_id', user.id).gte('start_time', new Date().toISOString()).is('deleted_at', null).ilike('title', `%${mentionState.text}%`).limit(5)
      ]);

      const formatted = [
        ...(tasks || []).map(t => ({ id: t.id, title: t.title, type: 'task' as const, subtitle: `Task • ${t.status}` })),
        ...(events || []).map(e => ({ id: e.id, title: e.title, type: 'event' as const, subtitle: `Event • ${new Date(e.start_time).toLocaleDateString()}` }))
      ];
      setSuggestions(formatted);
    }
    const timeout = setTimeout(fetchMentions, 300);
    return () => clearTimeout(timeout);
  }, [mentionState, user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase.from('chat_conversations').delete().eq('user_id', user.id).lt('last_active', thirtyDaysAgo.toISOString());

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (data) setConversations(data);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user || initialMessagesLoaded) return;
    
    if (currentConversationId) {
      supabase
        .from('bruno_messages')
        .select('id, content, message_type, created_at')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true })
        .limit(100)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const loaded: ChatMessage[] = data.map((m: any) => ({
              id: m.id,
              role: m.message_type === 'user' ? 'user' : 'bruno',
              content: m.content,
              timestamp: new Date(m.created_at),
            }));
            setMessages(loaded);
          } else {
             setMessages([{
                id: 'welcome',
                role: 'bruno',
                content: "Hey! I'm Bruno, your planning co-pilot. Ask me to reschedule a task, break down an assignment, or just chat about your day.",
                timestamp: new Date(),
              }]);
          }
          setInitialMessagesLoaded(true);
        });
    } else {
      supabase.from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false })
        .limit(1)
        .then(({ data }) => {
           if (data && data.length > 0) {
             setCurrentConversationId(data[0].id);
           } else {
             setMessages([{
                id: 'welcome',
                role: 'bruno',
                content: "Hey! I'm Bruno, your planning co-pilot. Ask me to reschedule a task, break down an assignment, or just chat about your day.",
                timestamp: new Date(),
              }]);
             setInitialMessagesLoaded(true);
           }
        });
    }
  }, [user, initialMessagesLoaded, currentConversationId]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{
      id: 'welcome',
      role: 'bruno',
      content: "Hey! I'm Bruno, your planning co-pilot. Ask me to reschedule a task, break down an assignment, or just chat about your day.",
      timestamp: new Date(),
    }]);
    setShowHistory(false);
    setInitialMessagesLoaded(true);
  };

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
    setInitialMessagesLoaded(false);
  };

  const promptDeleteConversation = (id: string, title: string) => {
    setChatToDelete({ id, title });
  };

  const confirmDeleteConversation = async () => {
    if (!chatToDelete) return;
    const { id } = chatToDelete;
    const { error } = await supabase.from('chat_conversations').delete().eq('id', id);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        startNewConversation();
      }
    } else {
      Alert.alert("Error", "Failed to delete conversation.");
    }
    setChatToDelete(null);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSending(false);
  };

  const sendMessage = useCallback(async () => {
    if (isOffline) {
      Alert.alert('Offline', 'Cannot send messages while offline.');
      return;
    }
    if (!inputText.trim() || sending) return;

    if (mentionState.active && suggestions.length > 0) {
      // User is actively picking a mention, so don't submit chat
      return;
    }

    const userMessageContent = inputText.trim();
    setInputText('');
    setMentionState({ active: false, text: '' });
    setSending(true);

    let convId = currentConversationId;
    if (!convId && user) {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title: inputText.slice(0, 30) + '...' })
        .select()
        .single();
      if (newConv) {
        convId = newConv.id;
        setCurrentConversationId(convId);
        fetchConversations();
        
        // Background AI Title Generation
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          if (token) {
            fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/generate-title`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ message: inputText.trim(), conversationId: convId })
            })
            .then(res => res.json())
            .then(data => {
              if (data.title) fetchConversations();
            })
            .catch(err => console.log('Failed to generate title', err));
          }
        });
      }
    }

    let currentMessages = messages;
    if (editingMessageId && convId) {
      const editIndex = messages.findIndex(m => m.id === editingMessageId);
      if (editIndex !== -1) {
        const editedMsg = messages[editIndex];
        const timestampStr = editedMsg.timestamp.toISOString();
           
        await supabase.from('bruno_messages').delete()
          .eq('conversation_id', convId)
          .gte('created_at', timestampStr);
          
        currentMessages = messages.slice(0, editIndex);
      }
      setEditingMessageId(null);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };
    currentMessages = [...currentMessages, userMsg];
    setMessages(currentMessages);

    try {
      if (user && convId) {
        await supabase.from('bruno_messages').insert({
          conversation_id: convId,
          user_id: user.id,
          content: userMsg.content,
          message_type: 'user',
        });
        await supabase.from('chat_conversations').update({ last_active: new Date().toISOString() }).eq('id', convId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Your session has expired. Please log out and log back in.');
      }

      const apiMessages = currentMessages.map(m => ({
        role: m.role === 'bruno' ? 'assistant' : 'user',
        content: m.content
      }));

      let apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        if (__DEV__) {
          apiUrl = 'http://localhost:3000';
        } else {
          throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
        }
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          conversationId: convId, 
          isMobile: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: new Date().toLocaleString()
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat error:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const brunoReply: ChatMessage = {
        id: `bruno-${Date.now()}`,
        role: 'bruno',
        content: data.text || "I'm having trouble thinking right now.",
        timestamp: new Date(),
        toolCalls: data.toolCalls || [],
        metadata: data.metadata,
      };
      setMessages((prev) => [...prev, brunoReply]);

      if (user && convId) {
        await supabase.from('bruno_messages').insert({
          conversation_id: convId,
          user_id: user.id,
          content: brunoReply.content,
          message_type: 'assistant',
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error('Chat error:', err);
        Alert.alert('Bruno Error', err.message || 'Failed to connect to Bruno.');
      }
    } finally {
      abortControllerRef.current = null;
      setSending(false);
    }
  }, [inputText, sending, user, messages, currentConversationId, editingMessageId, fetchConversations]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isEditing = editingMessageId === item.id;
    return (
      <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.brunoWrapper]}>
        <View style={{ flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.brunoBubble,
              {
                backgroundColor: isUser ? Colors.brand[600] : isDark ? Colors.surface[700] : Colors.surface[100],
                opacity: isEditing ? 0.5 : 1,
              },
            ]}
            testID={`chat-message-${item.id}`}
          >
            {!isUser && (
              <BrunoEntitlementNotice
                metadata={item.metadata}
                onUpgrade={() => router.push('/settings')}
              />
            )}
            <View style={styles.messageHeader}>
              {isUser ? (
                <UserIcon size={12} color={isUser ? '#fff' : colors.textMuted} strokeWidth={2.5} />
              ) : (
                <Bot size={12} color={Colors.brand[500]} strokeWidth={2.5} />
              )}
              <Text style={[styles.messageRole, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                {isUser ? 'YOU' : 'BRUNO'}
              </Text>
            </View>
            <Text style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>
              {item.content}
            </Text>
            
            {/* Render Tool Calls */}
            {!isUser && item.toolCalls && item.toolCalls.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {item.toolCalls.map((tc, idx) => {
                  if (tc.toolName === 'propose_plan_draft' && tc.args) {
                     return (
                       <PlanDraftCard 
                         key={idx}
                         planTitle={tc.args.plan_title}
                         planObjective={tc.args.plan_objective}
                         items={tc.args.items}
                         isCommitting={isCommittingPlan}
                         onReviewPress={() => {
                           setPreviewPlanData(tc.args);
                         }}
                       />
                     );
                  }
                  // Render generic tool call chip
                  return (
                    <View key={idx} style={[styles.toolCallChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                      <Bot size={12} color={colors.textMuted} />
                      <Text style={[styles.toolCallText, { color: colors.textMuted }]}>
                        {tc.toolName === 'create_task' ? `Created Task: ${tc.args.title}` :
                         tc.toolName === 'reschedule_task' ? `Rescheduled Task` :
                         tc.toolName === 'break_down_task' ? `Broken down into ${tc.args.subtasks?.length || 0} subtasks` :
                         tc.toolName === 'create_calendar_block' ? `Created Calendar Block: ${tc.args.title}` :
                         `Ran ${tc.toolName}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {isUser && !sending && !isEditing && (
            <TouchableOpacity 
              onPress={() => {
                setInputText(item.content);
                setEditingMessageId(item.id);
              }}
              style={{ padding: 6, alignSelf: 'center' }}
            >
              <Edit2 size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.brunoBadge, { backgroundColor: Colors.brand[500] }]}>
            <Bot size={18} color="#fff" strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Bruno</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>YOUR PLANNING CO-PILOT</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={{ marginLeft: 'auto', padding: 8 }}>
          <History size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.headerBar, { justifyContent: 'space-between' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Past Chats</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={{ padding: 8 }}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={startNewConversation} style={[styles.newChatBtn, { backgroundColor: Colors.brand[500] }]}>
            <Plus size={16} color="#fff" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
                  {messages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            {['Plan my day', 'Break down my project', 'Reschedule my week'].map((action, idx) => (
              <TouchableOpacity key={idx} style={[styles.quickActionBtn, { borderColor: colors.separator }]} onPress={() => setInputText(action)}>
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.convItemWrapper, { borderBottomColor: colors.separator }]}>
                <TouchableOpacity onPress={() => loadConversation(item.id)} style={styles.convItem}>
                  <Text style={[styles.convTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.convDate, { color: colors.textMuted }]}>{new Date(item.last_active).toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.historyDeleteButton}
                    onPress={() => promptDeleteConversation(item.id, item.title)}
                  >
                  <Trash size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ padding: 20 }}
          />
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!chatToDelete}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Chat?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete the chat <Text style={{fontWeight: 'bold', color: colors.text}}>"{chatToDelete?.title}"</Text>? This will be gone forever and recovery is NOT an option.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setChatToDelete(null)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteConversation}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: Colors.error }]}>
          <Text style={styles.offlineText}>You're offline. Chat is unavailable.</Text>
        </View>
      )}

      {/* Plan Preview Modal */}
      {previewPlanData && (
        <PlanPreviewModal
          isOpen={!!previewPlanData}
          onClose={() => setPreviewPlanData(null)}
          planTitle={previewPlanData.plan_title}
          planObjective={previewPlanData.plan_objective}
          items={previewPlanData.items}
          isCommitting={isCommittingPlan}
          hasGoogleCalendar={false}
          onApprove={(options) => {
            setIsCommittingPlan(true);
            const commitType = (options.createTasks && options.blockCalendar) ? 'both' 
              : options.createTasks ? 'tasks_only' 
              : 'calendar_only';
            
            // We inject the approved items JSON into the message so the backend AI knows exactly what to commit
            // without needing the full tool-call history from previous messages.
            const approvalMessage = `Looks good! Approve the plan and execute as: ${commitType}${options.syncToGoogle ? ' (sync to Google)' : ''}.\n\nApproved items to commit:\n${JSON.stringify(previewPlanData.items, null, 2)}`;
            
            setInputText(approvalMessage);
            setPreviewPlanData(null);
            setTimeout(() => {
              setIsCommittingPlan(false);
              sendMessage(); // automatically send the message
            }, 500);
          }}
          onRequestEdit={(feedback) => {
            setInputText(feedback);
          }}
        />
      )}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length > 20 && (
          <View style={[styles.warningBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Text style={{ color: '#f59e0b', fontSize: 12, textAlign: 'center', fontWeight: '500' }}>
              This conversation is getting long. Start a new chat for better memory.
            </Text>
          </View>
        )}
                {messages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            {['Plan my day', 'Break down my project', 'Reschedule my week'].map((action, idx) => (
              <TouchableOpacity key={idx} style={[styles.quickActionBtn, { borderColor: colors.separator }]} onPress={() => setInputText(action)}>
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {mentionState.active && suggestions.length > 0 && (
          <View style={[styles.mentionsContainer, { backgroundColor: isDark ? Colors.surface[800] : '#fff', borderColor: colors.separator }]}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={`${s.type}-${s.id}`}
                style={[styles.mentionItem, { borderBottomColor: colors.separator }]}
                onPress={() => {
                  const words = inputText.split(' ');
                  words.pop();
                  const mentionLabel = `"${s.title}"`;
                  setInputText(words.length > 0 ? `${words.join(' ')} ${mentionLabel} ` : `${mentionLabel} `);
                  setMentionState({ active: false, text: '' });
                  setSuggestions([]);
                }}
              >
                <Text style={[styles.mentionTitle, { color: colors.text }]} numberOfLines={1}>{s.title}</Text>
                <Text style={[styles.mentionSubtitle, { color: colors.textMuted }]}>{s.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.separator }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: isDark ? Colors.surface[700] : Colors.surface[100] }]}
            placeholder={editingMessageId ? "Edit your message..." : "Ask Bruno anything..."}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={(val) => {
              setInputText(val);
              const lastWord = val.split(' ').pop();
              if (lastWord?.startsWith('@') || lastWord?.startsWith('/')) {
                setMentionState({ active: true, text: lastWord.slice(1).toLowerCase() });
              } else {
                setMentionState({ active: false, text: '' });
              }
            }}
            multiline
            maxLength={500}
            testID="chat-input"
          />
          {sending ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: Colors.error }]}
              onPress={stopGeneration}
              testID="chat-stop-button"
            >
              <Square size={16} color="#fff" fill="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? Colors.brand[600] : colors.separator }]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
              testID="chat-send-button"
            >
              <Send size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  warningBanner: {
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  brunoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: { padding: 8, marginHorizontal: 20, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  messageWrapper: { maxWidth: '85%', gap: 4 },
  userWrapper: { alignSelf: 'flex-end' },
  brunoWrapper: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: 16,
    padding: 14,
  },
  userBubble: { borderBottomRightRadius: 4 },
  brunoBubble: { borderBottomLeftRadius: 4 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  messageRole: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  messageText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  newChatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  convItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  convItem: {
    flex: 1,
    paddingVertical: 12,
  },
  historyDeleteButton: {
    padding: 8,
  },
  deleteBtn: {
    padding: 12,
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  convDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: '#2c221a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#3e3227',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fdfbf7',
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: 'rgba(253, 251, 247, 0.7)',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: 'rgba(253, 251, 247, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toolCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolCallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mentionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  mentionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mentionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mentionSubtitle: {
    fontSize: 12,
  },
  contextWarning: {
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  }
});
