import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { colors as appColors } from '../../theme/colors';

export default function SupportChatScreen() {
  const { t } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`support-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `driver_id=eq.${user.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;
    setSending(true);
    setInput('');

    await supabase.from('support_messages').insert({
      driver_id: user.id,
      sender_role: 'driver',
      message: text,
    });

    setSending(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isDriver = item.sender_role === 'driver';
    return (
      <View style={[
        styles.bubble,
        isDriver ? styles.bubbleDriver : styles.bubbleAdmin,
        {
          backgroundColor: isDriver ? appColors.orange : t.card,
          borderColor: isDriver ? appColors.orange : t.cardBorder,
        },
      ]}>
        <Text style={[
          styles.bubbleText,
          { color: isDriver ? '#FFF' : t.text },
        ]}>
          {item.message}
        </Text>
        <Text style={[
          styles.bubbleTime,
          { color: isDriver ? 'rgba(255,255,255,0.7)' : t.textSecondary },
        ]}>
          {isDriver ? 'You' : 'Support'} · {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: t.text }]}>Support Chat</Text>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>
              {loading ? 'Loading messages...' : 'Send a message to Styl support.\nWe typically respond within a few hours.'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: t.card, borderTopColor: t.cardBorder }]}>
        <TextInput
          style={[styles.input, { backgroundColor: t.background, color: t.text, borderColor: t.cardBorder }]}
          placeholder="Type a message..."
          placeholderTextColor={t.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={sending || !input.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() ? appColors.orange : t.cardBorder },
          ]}
          activeOpacity={0.7}
        >
          <Send size={18} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  bubbleDriver: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
