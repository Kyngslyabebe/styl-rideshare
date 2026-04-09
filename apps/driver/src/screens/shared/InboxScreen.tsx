import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function InboxScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    })();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.notifTitle, { color: t.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.time, { color: t.textSecondary }]}>
          {timeAgo(item.sent_at)}
        </Text>
      </View>
      <Text style={[styles.body, { color: t.textSecondary }]}>{item.body}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: t.textSecondary }]}>
            {loading ? 'Loading...' : 'No notifications yet'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: { fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
  time: { fontSize: 10, fontWeight: '300' },
  body: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
  empty: { textAlign: 'center', fontSize: 12, fontWeight: '400', marginTop: 40 },
});
