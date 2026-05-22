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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Send, Bot, UserIcon } from 'lucide-react-native';
import { Alert } from 'react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'bruno';
  content: string;
  timestamp: Date;
}

export default function BrunoChatScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bruno',
      content: "Hey! I'm Bruno, your planning co-pilot. Ask me to reschedule a task, break down an assignment, or just chat about your day.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('bruno_messages')
      .select('id, content, message_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const loaded: ChatMessage[] = data.map((m: any) => ({
            id: m.id,
            role: m.message_type === 'user' ? 'user' : 'bruno',
            content: m.content,
            timestamp: new Date(m.created_at),
          }));
          setMessages([messages[0], ...loaded]);
        }
      });
  }, [user]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    try {
      // Save user message
      if (user) {
        await supabase.from('bruno_messages').insert({
          user_id: user.id,
          content: userMsg.content,
          message_type: 'user',
        });
      }

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Map to expected API format
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role === 'bruno' ? 'assistant' : 'user',
        content: m.content
      }));

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `API error: ${response.status}`);
      }

      const data = await response.json();

      const brunoReply: ChatMessage = {
        id: `bruno-${Date.now()}`,
        role: 'bruno',
        content: data.text || "I'm having trouble thinking right now.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, brunoReply]);

      if (user) {
        await supabase.from('bruno_messages').insert({
          user_id: user.id,
          content: brunoReply.content,
          message_type: 'assistant',
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      Alert.alert('Bruno Error', err.message || 'Failed to connect to Bruno.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, user]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.brunoBubble,
          {
            backgroundColor: isUser ? Colors.brand[600] : isDark ? Colors.surface[700] : Colors.surface[100],
          },
        ]}
        testID={`chat-message-${item.id}`}
      >
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
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <View style={[styles.brunoBadge, { backgroundColor: Colors.brand[500] }]}>
          <Bot size={18} color="#fff" strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bruno</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>YOUR PLANNING CO-PILOT</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.separator }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: isDark ? Colors.surface[700] : Colors.surface[100] }]}
            placeholder="Ask Bruno anything..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            testID="chat-input"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? Colors.brand[600] : colors.separator }]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            testID="chat-send-button"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brunoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  brunoBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
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
});
