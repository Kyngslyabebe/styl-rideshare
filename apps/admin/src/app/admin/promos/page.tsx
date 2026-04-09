'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/admin/DataTable';
import styles from '../dashboard.module.css';

export default function PromosPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');

  useEffect(() => { fetchPromos(); }, []);

  const fetchPromos = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    await supabase.from('promo_codes').insert({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      is_active: true,
    });
    setCode(''); setDiscountValue(''); setMaxUses('');
    setShowForm(false);
    fetchPromos();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
    fetchPromos();
  };

  const columns = [
    { key: 'code', label: 'Code', render: (v: string) => <strong>{v}</strong> },
    { key: 'discount_type', label: 'Type', render: (v: string) => v === 'percent' ? '%' : '$' },
    { key: 'discount_value', label: 'Value', render: (v: any, row: any) =>
      row.discount_type === 'percent' ? `${v}%` : `$${Number(v).toFixed(2)}`
    },
    { key: 'used_count', label: 'Used' },
    { key: 'max_uses', label: 'Max', render: (v: any) => v ?? '∞' },
    { key: 'is_active', label: 'Active', render: (v: boolean, row: any) => (
      <button
        onClick={(e) => { e.stopPropagation(); toggleActive(row.id, v); }}
        style={{
          background: v ? 'var(--success)' : 'var(--error)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
        }}
      >{v ? 'Active' : 'Inactive'}</button>
    )},
  ];

  const inputStyle: React.CSSProperties = {
    height: 44, borderRadius: 8, border: '1px solid var(--input-border)',
    background: 'var(--input-bg)', color: 'var(--text)', padding: '0 14px', fontSize: 14, width: '100%',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className={styles.title} style={{ margin: 0 }}>Promo Codes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
        >{showForm ? 'Cancel' : '+ New Promo'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12,
          padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          <input style={inputStyle} placeholder="Code (e.g. RIDE20)" value={code} onChange={(e) => setCode(e.target.value)} required />
          <select style={inputStyle} value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed ($)</option>
          </select>
          <input style={inputStyle} type="number" placeholder="Discount value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required />
          <input style={inputStyle} type="number" placeholder="Max uses (empty = unlimited)" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          <button type="submit" style={{
            gridColumn: '1 / -1', height: 44, borderRadius: 8, border: 'none',
            background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>Create Promo</button>
        </form>
      )}

      <DataTable columns={columns} data={promos} />
    </div>
  );
}
