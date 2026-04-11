'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import s from '../dashboard.module.css';

type StatusFilter = 'all' | 'open' | 'in_review' | 'resolved' | 'dismissed';
type CategoryFilter = 'all' | 'safety' | 'billing' | 'app_issue' | 'ride_dispute' | 'account' | 'other';

const STATUS_BADGE: Record<string, string> = {
  open: s.badgeWarning,
  in_review: s.badgeInfo,
  resolved: s.badgeSuccess,
  dismissed: s.badgeNeutral,
};

const PRIORITY_BADGE: Record<string, string> = {
  low: s.badgeNeutral,
  normal: s.badgeInfo,
  high: s.badgeWarning,
  urgent: s.badgeError,
};

const CATEGORY_LABELS: Record<string, string> = {
  safety: 'Safety',
  billing: 'Billing',
  app_issue: 'App Issue',
  ride_dispute: 'Ride Dispute',
  account: 'Account',
  other: 'Other',
};

export default function TicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [riderNames, setRiderNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  // Selected ticket for detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Stats
  const [openCount, setOpenCount] = useState(0);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/tickets');
      const data = await res.json();
      const list = data.tickets || [];
      setTickets(list);
      setRiderNames(data.riderNames || {});

      setOpenCount(list.filter((t: any) => t.status === 'open').length);
      setInReviewCount(list.filter((t: any) => t.status === 'in_review').length);
      setResolvedCount(list.filter((t: any) => t.status === 'resolved').length);
      setUrgentCount(list.filter((t: any) => t.priority === 'urgent').length);
    } catch {
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Load responses when a ticket is selected
  useEffect(() => {
    if (!selectedId) { setResponses([]); return; }
    (async () => {
      const res = await adminFetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_responses', ticketId: selectedId }),
      });
      const data = await res.json();
      setResponses(data.responses || []);
    })();
  }, [selectedId]);

  const selectedTicket = tickets.find((t) => t.id === selectedId);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    await adminFetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', ticketId: selectedId, message: replyText.trim() }),
    });
    // Update ticket status to in_review if it was open
    if (selectedTicket?.status === 'open') {
      await adminFetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedId, updates: { status: 'in_review' } }),
      });
    }
    setReplyText('');
    // Refresh responses & tickets
    const resRes = await adminFetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_responses', ticketId: selectedId }),
    });
    const resData = await resRes.json();
    setResponses(resData.responses || []);
    await fetchTickets();
    setSending(false);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    await adminFetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        updates: {
          status: newStatus,
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        },
      }),
    });
    await fetchTickets();
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    await adminFetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, updates: { priority: newPriority } }),
    });
    await fetchTickets();
  };

  // Filtered tickets
  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (riderNames[t.rider_id] || '').toLowerCase();
      return t.subject?.toLowerCase().includes(q) || name.includes(q) || t.id?.includes(q);
    }
    return true;
  });

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  return (
    <div>
      <h1 className={s.title}>Support Tickets</h1>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Open</span>
          <span className={s.statValue}>{openCount}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>In Review</span>
          <span className={s.statValue} style={{ color: '#4A90E2' }}>{inReviewCount}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Resolved</span>
          <span className={s.statValue} style={{ color: '#00C853' }}>{resolvedCount}</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Urgent</span>
          <span className={s.statValue} style={{ color: '#FF1744' }}>{urgentCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        {(['all', 'open', 'in_review', 'resolved', 'dismissed'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            className={`${s.filterBtn} ${statusFilter === f ? s.filterBtnActive : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'in_review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className={s.filterBar} style={{ marginTop: -8 }}>
        {(['all', 'safety', 'billing', 'app_issue', 'ride_dispute', 'account', 'other'] as CategoryFilter[]).map((f) => (
          <button
            key={f}
            className={`${s.filterBtn} ${categoryFilter === f ? s.filterBtnActive : ''}`}
            onClick={() => setCategoryFilter(f)}
          >
            {f === 'all' ? 'All Categories' : CATEGORY_LABELS[f]}
          </button>
        ))}
        <input
          className={s.searchInput}
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {/* Main content: ticket list + detail panel */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Ticket list */}
        <div className={s.tableCard} style={{ flex: selectedId ? 1 : 1 }}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Tickets</span>
            <span className={s.tableCount}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <p className={s.empty}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className={s.empty}>No tickets found</p>
          ) : (
            <table className={s.miniTable}>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={s.miniTableClickable}
                    onClick={() => setSelectedId(ticket.id === selectedId ? null : ticket.id)}
                    style={{
                      background: ticket.id === selectedId ? 'rgba(255,107,0,0.06)' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={s.avatarFallbackSmall}>
                          {(riderNames[ticket.rider_id] || 'R').charAt(0).toUpperCase()}
                        </div>
                        <span>{riderNames[ticket.rider_id] || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ticket.subject}</td>
                    <td>
                      <span className={`${s.badge} ${s.badgeNeutral}`}>
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${PRIORITY_BADGE[ticket.priority] || s.badgeNeutral}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${STATUS_BADGE[ticket.status] || s.badgeNeutral}`}>
                        {ticket.status === 'in_review' ? 'In Review' : ticket.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedTicket && (
          <div className={s.section} style={{ width: 420, flexShrink: 0, position: 'sticky', top: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 className={s.sectionTitle} style={{ marginBottom: 4 }}>{selectedTicket.subject}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  by {riderNames[selectedTicket.rider_id] || 'Unknown'} · {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
              <button
                className={`${s.btn} ${s.btnOutline}`}
                onClick={() => setSelectedId(null)}
                style={{ padding: '0 10px', height: 30, fontSize: 11 }}
              >
                Close
              </button>
            </div>

            {/* Meta badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className={`${s.badge} ${s.badgeNeutral}`}>{CATEGORY_LABELS[selectedTicket.category]}</span>
              <span className={`${s.badge} ${PRIORITY_BADGE[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
              <span className={`${s.badge} ${STATUS_BADGE[selectedTicket.status]}`}>
                {selectedTicket.status === 'in_review' ? 'In Review' : selectedTicket.status}
              </span>
            </div>

            {/* Description */}
            <div style={{
              background: 'var(--input-bg)', borderRadius: 8, padding: 12, marginBottom: 16,
              fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
            }}>
              {selectedTicket.description}
            </div>

            {/* Admin controls */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={selectedTicket.status}
                onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                style={{
                  height: 32, borderRadius: 6, border: '1px solid var(--card-border)',
                  background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, padding: '0 8px',
                }}
              >
                <option value="open">Open</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select
                value={selectedTicket.priority}
                onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                style={{
                  height: 32, borderRadius: 6, border: '1px solid var(--card-border)',
                  background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12, padding: '0 8px',
                }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Conversation thread */}
            <h4 className={s.sectionTitle} style={{ fontSize: 13, marginBottom: 12 }}>Responses</h4>
            <div style={{
              maxHeight: 300, overflowY: 'auto', marginBottom: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {responses.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: 16 }}>
                  No responses yet
                </p>
              ) : (
                responses.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: r.sender_role === 'admin' ? 'rgba(255,107,0,0.08)' : 'var(--input-bg)',
                      borderLeft: `3px solid ${r.sender_role === 'admin' ? 'var(--orange)' : 'var(--card-border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r.sender_role === 'admin' ? 'var(--orange)' : 'var(--text)' }}>
                        {r.sender_role === 'admin' ? 'Admin' : riderNames[selectedTicket.rider_id] || 'Rider'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                      {r.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'dismissed' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response..."
                  style={{
                    flex: 1, minHeight: 60, borderRadius: 8,
                    border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                    color: 'var(--text)', padding: 10, fontSize: 13, resize: 'vertical',
                  }}
                />
                <button
                  className={`${s.btn} ${s.btnOrange}`}
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  style={{ height: 60, alignSelf: 'flex-end' }}
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
