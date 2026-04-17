'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useToast } from '@/components/admin/Toast';
import s from '../dashboard.module.css';

/* ── Types ── */
interface Inquiry {
  id: string; name: string; email: string; phone: string;
  message: string; status: string; created_at: string;
}

/* Section config for the editor — stats and testimonials removed */
const SECTION_CONFIG: { key: string; label: string; fields: { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'json' }[] }[] = [
  {
    key: 'header', label: 'Header / Navigation',
    fields: [
      { key: 'logo_text', label: 'Logo Text', type: 'text' },
      { key: 'cta_text', label: 'CTA Button Text', type: 'text' },
      { key: 'cta_url', label: 'CTA Button URL', type: 'url' },
      { key: 'nav_links', label: 'Nav Links (JSON array)', type: 'json' },
    ],
  },
  {
    key: 'hero', label: 'Hero Section',
    fields: [
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'cta_primary', label: 'Primary Button', type: 'text' },
      { key: 'cta_secondary', label: 'Secondary Button', type: 'text' },
      { key: 'image_url', label: 'Phone Screenshot URL', type: 'url' },
    ],
  },
  {
    key: 'about', label: 'About Section',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'text', label: 'Body Text', type: 'textarea' },
      { key: 'features', label: 'Features (JSON array)', type: 'json' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
    ],
  },
  {
    key: 'how_it_works', label: 'How It Works',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'steps', label: 'Steps (JSON array)', type: 'json' },
    ],
  },
  {
    key: 'riders', label: 'For Riders Section',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'features', label: 'Features (JSON array)', type: 'json' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
    ],
  },
  {
    key: 'drivers', label: 'For Drivers Section',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'features', label: 'Features (JSON array)', type: 'json' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
    ],
  },
  {
    key: 'fare_estimator', label: 'Fare Estimator',
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'surge_rules', label: 'Surge Rules (JSON array — display only)', type: 'json' },
    ],
  },
  {
    key: 'cta', label: 'Download CTA',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'app_store_url', label: 'App Store URL', type: 'url' },
      { key: 'play_store_url', label: 'Play Store URL', type: 'url' },
    ],
  },
  {
    key: 'contact', label: 'Contact Section',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
  },
  {
    key: 'footer', label: 'Footer',
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'copyright', label: 'Copyright', type: 'text' },
      { key: 'social', label: 'Social Links (JSON array)', type: 'json' },
    ],
  },
];

type Tab = 'content' | 'inquiries';
const TABS: { key: Tab; label: string }[] = [
  { key: 'content', label: 'Page Content' },
  { key: 'inquiries', label: 'Inquiries' },
];

export default function MarketingAdminPage() {
  const { toast: showGlobalToast, confirm: confirmAction } = useToast();
  const [tab, setTab] = useState<Tab>('content');
  const [loading, setLoading] = useState(true);

  // Content state
  const [sections, setSections] = useState<Record<string, any>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');
  const [saving, setSaving] = useState<string | null>(null);

  // Inquiries state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryFilter, setInquiryFilter] = useState('all');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [contentRes, inqRes] = await Promise.all([
      adminFetch('/api/marketing-content').then(r => r.json()),
      adminFetch('/api/admin/marketing-inquiries').then(r => r.json()),
    ]);

    const sMap: Record<string, any> = {};
    for (const row of contentRes || []) sMap[row.section] = row.content;
    setSections(sMap);
    setInquiries(inqRes.inquiries || []);
    setLoading(false);
  }

  function showToast(msg: string) {
    showGlobalToast(msg.startsWith('Error') ? 'error' : 'success', msg);
  }

  // ── Content handlers ──
  function updateField(section: string, key: string, value: any) {
    setSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  async function saveSection(sectionKey: string) {
    setSaving(sectionKey);
    try {
      const res = await adminFetch('/api/marketing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionKey, content: sections[sectionKey] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      showToast(`${sectionKey} saved`);
    } catch (err: any) {
      showToast('Error saving: ' + err.message);
    } finally {
      setSaving(null);
    }
  }

  // ── Inquiry handlers ──
  async function updateInquiryStatus(id: string, status: string) {
    await adminFetch('/api/admin/marketing-inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  const filteredInquiries = inquiryFilter === 'all' ? inquiries : inquiries.filter((i) => i.status === inquiryFilter);

  if (loading) {
    return (
      <div>
        <h1 className={s.title}>Marketing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading marketing data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Marketing Page</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Manage all content on the public landing page
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={s.btnOrange}
          style={{ fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}
        >
          View Live Page
        </a>
      </div>

      {/* Tabs */}
      <div className={s.tabBar} style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${s.tab} ${tab === t.key ? s.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'inquiries' && inquiries.filter((i) => i.status === 'new').length > 0 && (
              <span style={{
                background: 'var(--error)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 8,
                marginLeft: 6,
              }}>
                {inquiries.filter((i) => i.status === 'new').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT TAB ── */}
      {tab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTION_CONFIG.map((sec) => {
            const isOpen = expandedSection === sec.key;
            const data = sections[sec.key] || {};
            return (
              <div key={sec.key} className={s.section} style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedSection(isOpen ? null : sec.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{sec.label}</span>
                  <span style={{ fontSize: 18, color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>&#9662;</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {sec.fields.map((field) => {
                      const val = data[field.key];
                      const isJson = field.type === 'json';
                      const displayVal = isJson ? JSON.stringify(val, null, 2) : (val || '');

                      return (
                        <div key={field.key}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>
                            {field.label}
                          </label>
                          {field.type === 'textarea' || isJson ? (
                            <textarea
                              className={s.searchInput}
                              style={{ minHeight: isJson ? 120 : 80, resize: 'vertical', fontFamily: isJson ? 'monospace' : 'inherit', fontSize: isJson ? 12 : 14 }}
                              value={displayVal}
                              onChange={(e) => {
                                if (isJson) {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    updateField(sec.key, field.key, parsed);
                                  } catch {
                                    // Allow typing; don't update until valid JSON
                                  }
                                } else {
                                  updateField(sec.key, field.key, e.target.value);
                                }
                              }}
                            />
                          ) : (
                            <input
                              className={s.searchInput}
                              type={field.type === 'url' ? 'url' : 'text'}
                              value={displayVal}
                              onChange={(e) => updateField(sec.key, field.key, e.target.value)}
                              placeholder={field.type === 'url' ? 'https://...' : ''}
                            />
                          )}
                          {field.type === 'url' && val && (
                            <div style={{ marginTop: 6 }}>
                              <img
                                src={val}
                                alt="Preview"
                                style={{ maxWidth: 200, maxHeight: 120, borderRadius: 6, border: '1px solid var(--card-border)' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        className={s.btnOrange}
                        style={{ fontSize: 13, padding: '8px 20px' }}
                        onClick={() => saveSection(sec.key)}
                        disabled={saving === sec.key}
                      >
                        {saving === sec.key ? 'Saving...' : 'Save Section'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── INQUIRIES TAB ── */}
      {tab === 'inquiries' && (
        <div>
          <div className={s.filterBar} style={{ marginBottom: 16 }}>
            {['all', 'new', 'read', 'replied', 'archived'].map((f) => (
              <button
                key={f}
                className={`${s.filterBtn} ${inquiryFilter === f ? s.filterBtnActive : ''}`}
                onClick={() => setInquiryFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    ({inquiries.filter((i) => i.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className={s.tableCard}>
            <div className={s.tableHeader}>
              <span className={s.tableTitle}>Contact Form Submissions</span>
              <span className={s.tableCount}>{filteredInquiries.length} message{filteredInquiries.length !== 1 ? 's' : ''}</span>
            </div>
            <table className={s.miniTable} style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr><td colSpan={5}><p className={s.empty}>No messages found</p></td></tr>
                ) : (
                  filteredInquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{inq.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{inq.email}</div>
                        {inq.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{inq.phone}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--text)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inq.message}
                        </div>
                      </td>
                      <td>
                        <span className={`${s.badge} ${
                          inq.status === 'new' ? s.badgeWarning :
                          inq.status === 'read' ? s.badgeInfo :
                          inq.status === 'replied' ? s.badgeSuccess :
                          s.badgeNeutral
                        }`}>
                          {inq.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {inq.status === 'new' && (
                            <button className={s.btnOutline} style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateInquiryStatus(inq.id, 'read')}>
                              Mark Read
                            </button>
                          )}
                          {(inq.status === 'new' || inq.status === 'read') && (
                            <button className={s.btnOutline} style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateInquiryStatus(inq.id, 'replied')}>
                              Replied
                            </button>
                          )}
                          {inq.status !== 'archived' && (
                            <button className={s.btnOutline} style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateInquiryStatus(inq.id, 'archived')}>
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
