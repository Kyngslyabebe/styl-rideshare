'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from '../dashboard.module.css';

type Settings = Record<string, any>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState<Settings>({});
  const [tab, setTab] = useState<'fares' | 'deductions' | 'surge' | 'subscriptions' | 'cancellation' | 'ridetypes' | 'display'>('fares');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('platform_settings').select('key, value');
    const map: Settings = {};
    for (const row of data || []) map[row.key] = row.value;
    setSettings(map);
    setLoading(false);
  };

  const update = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateNested = (key: string, subKey: string, value: number) => {
    const current = typeof settings[key] === 'object' ? { ...settings[key] } : {};
    current[subKey] = value;
    update(key, current);
  };

  const handleSave = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    const supabase = createClient();
    for (const [key, value] of Object.entries(dirty)) {
      await supabase.from('platform_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    setDirty({});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const num = (val: any, fallback: number = 0): number => {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };

  const perMile = typeof settings.fare_per_mile === 'object' ? settings.fare_per_mile : {};
  const cancelTiers: { maxMin: number; fee: number }[] = Array.isArray(settings.cancel_tiers) ? settings.cancel_tiers : [];
  const rideTypes: string[] = Array.isArray(settings.ride_types) ? settings.ride_types : ['standard', 'xl', 'luxury', 'electric'];

  if (loading) {
    return (
      <div>
        <h1 className={s.title}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading settings...</p>
      </div>
    );
  }

  const TABS = [
    { key: 'fares', label: 'Fare Config' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'surge', label: 'Surge' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'cancellation', label: 'Cancellation' },
    { key: 'ridetypes', label: 'Ride Types' },
    { key: 'display', label: 'Display' },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Platform configuration and pricing
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#00C853', fontSize: 13, fontWeight: 600 }}>Saved ✓</span>}
          <button
            type="button"
            className={`${s.btn} ${Object.keys(dirty).length > 0 ? s.btnOrange : s.btnOutline}`}
            onClick={handleSave}
            disabled={Object.keys(dirty).length === 0 || saving}
          >
            {saving ? 'Saving...' : `Save Changes${Object.keys(dirty).length > 0 ? ` (${Object.keys(dirty).length})` : ''}`}
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ─── */}
      <div className={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${s.tab} ${tab === t.key ? s.tabActive : ''}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800 }}>
        {/* ════════ FARE CONFIG ════════ */}
        {tab === 'fares' && (
          <>
            <div className={s.section}>
              <h3 className={s.sectionTitle}>Base Rates</h3>
              <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Core pricing for all rides</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Base Fare ($)" value={num(settings.fare_base, 8)} onChange={(v) => update('fare_base', v)} step="0.50" />
                <Field label="Minimum Fare ($)" value={num(settings.fare_minimum, 8)} onChange={(v) => update('fare_minimum', v)} step="0.50" />
                <Field label="Booking Fee ($)" value={num(settings.booking_fee, 1.5)} onChange={(v) => update('booking_fee', v)} step="0.25" />
                <Field label="Per Minute ($)" value={num(settings.fare_per_minute, 0.25)} onChange={(v) => update('fare_per_minute', v)} step="0.05" />
              </div>
            </div>

            <div className={s.section}>
              <h3 className={s.sectionTitle}>Per-Mile Rates by Ride Type</h3>
              <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Mileage pricing for each ride category</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Standard ($/mi)" value={num(perMile.standard, 1.93)} onChange={(v) => updateNested('fare_per_mile', 'standard', Number(v))} step="0.10" />
                <Field label="XL ($/mi)" value={num(perMile.xl, 2.90)} onChange={(v) => updateNested('fare_per_mile', 'xl', Number(v))} step="0.10" />
                <Field label="Luxury ($/mi)" value={num(perMile.luxury, 4.02)} onChange={(v) => updateNested('fare_per_mile', 'luxury', Number(v))} step="0.10" />
                <Field label="Eco ($/mi)" value={num(perMile.electric, 2.25)} onChange={(v) => updateNested('fare_per_mile', 'electric', Number(v))} step="0.10" />
              </div>
            </div>

            {/* Fare Preview */}
            <div className={s.section}>
              <h3 className={s.sectionTitle}>Fare Preview</h3>
              <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Estimated fare for a sample 5-mile, 12-minute Standard ride</p>
              <FarePreview settings={settings} />
            </div>
          </>
        )}

        {/* ════════ DEDUCTIONS ════════ */}
        {tab === 'deductions' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Driver Deductions</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>
              No commission — drivers keep 100% of fare minus pass-through costs
            </p>

            <div style={{
              marginBottom: 20, padding: '14px 18px', borderRadius: 8,
              background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.25)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#00C853', margin: '0 0 4px' }}>
                Styl Commission: $0.00
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                &quot;Driver gets 100%&quot; — the only deductions are Stripe processing and dispute protection, passed through at cost.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Stripe Fee (%)" value={num(settings.stripe_fee_pct, 0.029) * 100} onChange={(v) => update('stripe_fee_pct', Number(v) / 100)} step="0.1" />
              <Field label="Stripe Fixed ($)" value={num(settings.stripe_fee_fixed, 0.30)} onChange={(v) => update('stripe_fee_fixed', v)} step="0.05" />
              <Field label="Dispute Protection ($)" value={num(settings.dispute_protection_fee, 0.30)} onChange={(v) => update('dispute_protection_fee', v)} step="0.05" />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>
              On a $20 fare: Stripe = ${(20 * num(settings.stripe_fee_pct, 0.029) + num(settings.stripe_fee_fixed, 0.30)).toFixed(2)} + dispute = ${num(settings.dispute_protection_fee, 0.30).toFixed(2)} → driver gets ${(20 - (20 * num(settings.stripe_fee_pct, 0.029) + num(settings.stripe_fee_fixed, 0.30)) - num(settings.dispute_protection_fee, 0.30)).toFixed(2)}
            </p>
          </div>
        )}

        {/* ════════ SURGE ════════ */}
        {tab === 'surge' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Surge Pricing</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Dynamic pricing based on demand</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="Max Surge Multiplier" value={num(settings.surge_max, 10)} onChange={(v) => update('surge_max', v)} step="0.5" />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Surge Enabled
                </label>
                <button
                  type="button"
                  onClick={() => update('surge_enabled', !(settings.surge_enabled !== false && settings.surge_enabled !== 'false'))}
                  className={`${s.btn} ${(settings.surge_enabled !== false && settings.surge_enabled !== 'false') ? s.btnSuccess : s.btnDanger}`}
                  style={{ width: '100%', height: 44 }}
                >
                  {(settings.surge_enabled !== false && settings.surge_enabled !== 'false') ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Surge caps at <strong style={{ color: 'var(--orange)' }}>{num(settings.surge_max, 10)}x</strong>.
                A $20 ride at max surge = <strong>${(20 * num(settings.surge_max, 10)).toFixed(0)}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ════════ SUBSCRIPTIONS ════════ */}
        {tab === 'subscriptions' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Driver Subscriptions</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Subscription pricing — collected from driver earnings</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="Daily ($)" value={num(settings.subscription_daily, 20)} onChange={(v) => update('subscription_daily', v)} step="1" />
              <Field label="Weekly ($)" value={num(settings.subscription_weekly, 100)} onChange={(v) => update('subscription_weekly', v)} step="5" />
              <Field label="Monthly ($)" value={num(settings.subscription_monthly, 360)} onChange={(v) => update('subscription_monthly', v)} step="10" />
            </div>

            <Field
              label="Skim Percentage (% of earnings taken per ride until sub collected)"
              value={num(settings.subscription_skim_pct, 0.60) * 100}
              onChange={(v) => update('subscription_skim_pct', Number(v) / 100)}
              step="5"
            />

            <div style={{
              marginTop: 16, padding: '14px 18px', borderRadius: 8,
              background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.2)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: '#2196F3' }}>Subscription model:</strong> {(num(settings.subscription_skim_pct, 0.60) * 100).toFixed(0)}% of each ride&apos;s net earnings is skimmed until the subscription is fully collected. If the driver earns $0 on subscription day, skimming continues on future rides. Once paid off, driver gets 100% again.
              </p>
            </div>
          </div>
        )}

        {/* ════════ CANCELLATION ════════ */}
        {tab === 'cancellation' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Cancellation Policy</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Fees charged to rider when cancelling after driver accepts</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cancelTiers.map((tier, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                  <Field
                    label="Within (minutes)"
                    value={tier.maxMin >= 999 ? '∞' : tier.maxMin}
                    onChange={(v) => {
                      const newTiers = [...cancelTiers];
                      newTiers[i] = { ...newTiers[i], maxMin: v === '∞' ? 999 : Number(v) };
                      update('cancel_tiers', newTiers);
                    }}
                    type={tier.maxMin >= 999 ? 'text' : 'number'}
                    disabled={tier.maxMin >= 999}
                  />
                  <Field
                    label="Fee ($)"
                    value={tier.fee}
                    onChange={(v) => {
                      const newTiers = [...cancelTiers];
                      newTiers[i] = { ...newTiers[i], fee: Number(v) };
                      update('cancel_tiers', newTiers);
                    }}
                    step="0.50"
                  />
                  {cancelTiers.length > 1 && i < cancelTiers.length - 1 && (
                    <button
                      type="button"
                      onClick={() => update('cancel_tiers', cancelTiers.filter((_, idx) => idx !== i))}
                      className={s.btn}
                      style={{
                        height: 44, width: 44, background: 'rgba(255,23,68,0.08)',
                        border: '1px solid rgba(255,23,68,0.3)', color: '#FF1744', fontSize: 18, padding: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const last = cancelTiers[cancelTiers.length - 1];
                  const insertBefore = cancelTiers.length > 0 ? cancelTiers.length - 1 : 0;
                  const newTiers = [...cancelTiers];
                  newTiers.splice(insertBefore, 0, { maxMin: (last?.maxMin || 3) + 3, fee: (last?.fee || 0) + 2 });
                  update('cancel_tiers', newTiers);
                }}
                className={`${s.btn} ${s.btnOutline}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                + Add Tier
              </button>
            </div>
          </div>
        )}

        {/* ════════ RIDE TYPES ════════ */}
        {tab === 'ridetypes' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Ride Types</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Enable or disable available ride types</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['standard', 'xl', 'luxury', 'electric'].map((type) => {
                const enabled = rideTypes.includes(type);
                const labels: Record<string, string> = { standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco' };
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update('ride_types', enabled ? rideTypes.filter((t) => t !== type) : [...rideTypes, type])}
                    className={`${s.filterBtn} ${enabled ? s.filterBtnActive : ''}`}
                    style={{ height: 44, padding: '0 24px', fontSize: 14 }}
                  >
                    {labels[type] || type}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════ DISPLAY ════════ */}
        {tab === 'display' && (
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Display Settings</h3>
            <p className={s.sectionDesc} style={{ marginBottom: 16 }}>UI-facing configuration</p>

            <div style={{ maxWidth: 300 }}>
              <Field
                label="Compare Markup (multiplier for 'other platforms' price)"
                value={num(settings.compare_markup, 1.3)}
                onChange={(v) => update('compare_markup', v)}
                step="0.05"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function Field({ label, value, onChange, step, type = 'number', disabled }: {
  label: string; value: any; onChange: (v: any) => void;
  type?: string; step?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{
          height: 44, borderRadius: 8, border: '1px solid var(--input-border)',
          background: disabled ? 'var(--card)' : 'var(--input-bg)', color: 'var(--text)',
          padding: '0 14px', fontSize: 15, width: '100%',
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function FarePreview({ settings }: { settings: Settings }) {
  const baseFare = Number(settings.fare_base || 8);
  const bookingFee = Number(settings.booking_fee || 1.5);
  const perMileRate = typeof settings.fare_per_mile === 'object' ? Number(settings.fare_per_mile.standard || 1.93) : 1.93;
  const perMin = Number(settings.fare_per_minute || 0.25);
  const minFare = Number(settings.fare_minimum || 8);
  const stripePct = Number(settings.stripe_fee_pct || 0.029);
  const stripeFixed = Number(settings.stripe_fee_fixed || 0.30);
  const disputeFee = Number(settings.dispute_protection_fee || 0.30);

  const miles = 5;
  const minutes = 12;
  const distCharge = miles * perMileRate;
  const timeCharge = minutes * perMin;
  const subtotal = baseFare + distCharge + timeCharge;
  const total = Math.max(subtotal + bookingFee, minFare);
  const stripeFee = total * stripePct + stripeFixed;
  const driverGets = total - stripeFee - disputeFee;

  const rows = [
    ['Base fare', `$${baseFare.toFixed(2)}`],
    [`${miles} mi × $${perMileRate.toFixed(2)}/mi`, `$${distCharge.toFixed(2)}`],
    [`${minutes} min × $${perMin.toFixed(2)}/min`, `$${timeCharge.toFixed(2)}`],
    ['Booking fee', `$${bookingFee.toFixed(2)}`],
    ['---', '---'],
    ['Rider pays', `$${total.toFixed(2)}`],
    ['Styl commission', '$0.00'],
    [`Stripe fee (${(stripePct * 100).toFixed(1)}% + $${stripeFixed.toFixed(2)})`, `-$${stripeFee.toFixed(2)}`],
    ['Dispute protection', `-$${disputeFee.toFixed(2)}`],
    ['---', '---'],
    ['Driver receives', `$${driverGets.toFixed(2)}`],
  ];

  return (
    <div style={{
      borderRadius: 8, background: 'var(--input-bg)',
      border: '1px solid var(--card-border)', padding: 16,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
        Standard · 5 miles · 12 minutes · No surge
      </p>
      {rows.map(([label, val], i) => {
        if (label === '---') {
          return <div key={i} style={{ borderBottom: '1px solid var(--card-border)', margin: '6px 0' }} />;
        }
        const isTotal = label === 'Rider pays' || label === 'Driver receives';
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ fontSize: 13, color: isTotal ? 'var(--text)' : 'var(--text-secondary)', fontWeight: isTotal ? 700 : 400 }}>
              {label}
            </span>
            <span style={{
              fontSize: 13, fontWeight: isTotal ? 700 : 500,
              color: label === 'Driver receives' ? '#00C853' : label === 'Rider pays' ? 'var(--orange)' : 'var(--text)',
            }}>
              {val}
            </span>
          </div>
        );
      })}
    </div>
  );
}
