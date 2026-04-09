'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from '../driverDetail.module.css';

const TEMPLATES = [
  'Your documents have been reviewed.',
  'Please update your insurance document.',
  'Your account has been suspended pending review.',
  'Congratulations, you\'ve been approved to drive!',
  'Please contact support for further assistance.',
];

interface Props {
  driverId: string;
  driverName: string;
}

export default function CommunicationTab({ driverId, driverName }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${driverId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `driver_id=eq.${driverId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from('support_messages')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');

    await supabase.from('support_messages').insert({
      driver_id: driverId,
      sender_role: 'admin',
      message: text,
    });

    // Also send a notification so driver sees it in their Inbox
    await supabase.from('notifications').insert({
      user_id: driverId,
      title: 'New message from Styl Support',
      body: text.length > 100 ? text.substring(0, 100) + '...' : text,
      type: 'support_message',
      data: { type: 'support_message' },
    });

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h3 className={s.sectionTitle}>Messages with {driverName}</h3>

      <div className={s.chatContainer}>
        {/* Templates */}
        <div className={s.chatTemplates}>
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              type="button"
              className={s.chatTemplate}
              onClick={() => setInput(t)}
            >
              {t.length > 35 ? t.slice(0, 35) + '…' : t}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className={s.chatMessages}>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', marginTop: 80 }}>
              No messages yet. Send the first message to this driver.
            </p>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.sender_role === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`${s.chatBubble} ${isAdmin ? s.chatBubbleAdmin : s.chatBubbleDriver}`}
                >
                  {msg.message}
                  <div className={s.chatTime}>
                    {isAdmin ? 'Admin' : 'Driver'} · {formatTime(msg.created_at)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className={s.chatInputRow}>
          <textarea
            className={s.chatInput}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="button"
            className={s.chatSendBtn}
            onClick={sendMessage}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
