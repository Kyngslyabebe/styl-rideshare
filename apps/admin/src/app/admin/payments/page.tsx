'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import s from '../dashboard.module.css';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded';

interface DailyPoint {
  label: string;
  total: number;
  platform: number;
  driver: number;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [platformFees, setPlatformFees] = useState(0);
  const [driverPayouts, setDriverPayouts] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);

  // Chart
  const [chartData, setChartData] = useState<DailyPoint[]>([]);

  // Payment list
  const [payments, setPayments] = useState<any[]>([]);

  // Status breakdown
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number; amount: number }[]>([]);

  const getStart = useCallback((p: PeriodFilter) => {
    const now = new Date();
    if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (p === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return null;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, status: statusFilter });
      const res = await adminFetch(`/api/admin/payments?${params}`);
      const data = await res.json();
      const list = data.payments || [];
      const allList = data.allPayments || [];

      setPayments(list);

      // Stats from unfiltered
      const succeeded = allList.filter((p: any) => p.status === 'succeeded');
      const total = succeeded.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const platform = succeeded.reduce((sum: number, p: any) => sum + Number(p.platform_fee || 0), 0);
      const driver = succeeded.reduce((sum: number, p: any) => sum + Number(p.driver_payout || 0), 0);

      setTotalRevenue(total);
      setPlatformFees(platform);
      setDriverPayouts(driver);
      setTotalTransactions(allList.length);
      setSuccessRate(allList.length > 0 ? (succeeded.length / allList.length) * 100 : 0);
      setAvgTransaction(succeeded.length > 0 ? total / succeeded.length : 0);

      // Status breakdown
      const statusMap: Record<string, { count: number; amount: number }> = {};
      allList.forEach((p: any) => {
        const st = p.status || 'unknown';
        if (!statusMap[st]) statusMap[st] = { count: 0, amount: 0 };
        statusMap[st].count++;
        statusMap[st].amount += Number(p.amount || 0);
      });
      setStatusBreakdown(
        Object.entries(statusMap)
          .map(([status, v]) => ({ status, ...v }))
          .sort((a, b) => b.count - a.count)
      );

      // Chart: daily revenue
      const start = getStart(period);
      if (start) {
        const now = new Date();
        const days = Math.min(Math.ceil((now.getTime() - start.getTime()) / 86400000), 14);
        const points: DailyPoint[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
          const dayStr = d.toISOString().split('T')[0];
          const dayPayments = allList.filter((p: any) => p.created_at?.startsWith(dayStr) && p.status === 'succeeded');
          points.push({
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            total: dayPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
            platform: dayPayments.reduce((sum: number, p: any) => sum + Number(p.platform_fee || 0), 0),
            driver: dayPayments.reduce((sum: number, p: any) => sum + Number(p.driver_payout || 0), 0),
          });
        }
        setChartData(points);
      }
    } catch {
      setPayments([]);
    }
    setLoading(false);
  }, [period, statusFilter, getStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxChart = Math.max(...chartData.map((d) => d.total), 1);
  const statusColors: Record<string, string> = {
    succeeded: 'var(--success)', pending: '#FF9800', failed: '#FF1744', refunded: '#4A90E2',
  };

  const periodLabel = period === 'today' ? 'today' : period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';

  return (
    <div>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title} style={{ marginBottom: 4 }}>Payments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Transaction history and revenue analytics
          </p>
        </div>
        <div className={s.filterBar} style={{ marginBottom: 0 }}>
          {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Total Revenue</span>
          <span className={s.statValue}>${totalRevenue.toFixed(2)}</span>
          <span className={s.statSubtext}>{totalTransactions} transactions</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Stripe Fees</span>
          <span className={s.statValue} style={{ color: '#FF1744' }}>${platformFees.toFixed(2)}</span>
          <span className={s.statSubtext}>pass-through costs</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Driver Payouts</span>
          <span className={s.statValue} style={{ color: 'var(--success)' }}>${driverPayouts.toFixed(2)}</span>
          <span className={s.statSubtext}>net to drivers</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Success Rate</span>
          <span className={s.statValue} style={{ color: successRate >= 95 ? 'var(--success)' : 'var(--orange)' }}>
            {successRate.toFixed(1)}%
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Avg Transaction</span>
          <span className={s.statValue}>${avgTransaction.toFixed(2)}</span>
        </div>
      </div>

      <div className={s.twoCol}>
        {/* ─── Revenue Chart ─── */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div>
              <h3 className={s.sectionTitle}>Revenue Trend</h3>
              <p className={s.sectionDesc}>Daily transaction volume {periodLabel}</p>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>${totalRevenue.toFixed(2)}</span>
          </div>
          {chartData.length === 0 ? (
            <p className={s.empty}>No data for this period</p>
          ) : (
            <div className={s.chartContainer}>
              {chartData.map((d, i) => (
                <div key={i} className={s.chartBar}>
                  <span className={s.chartBarValue}>{d.total > 0 ? `$${d.total.toFixed(0)}` : ''}</span>
                  <div
                    className={`${s.chartBarFill} ${s.chartBarFillSuccess}`}
                    style={{ height: `${(d.total / maxChart) * 100}%` }}
                    title={`${d.label}: $${d.total.toFixed(2)}`}
                  />
                  <span className={s.chartBarLabel}>
                    {chartData.length <= 7 ? d.label.split(', ')[0] : d.label.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Status Breakdown ─── */}
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Transaction Status</h3>
          <p className={s.sectionDesc} style={{ marginBottom: 16 }}>Breakdown by payment status</p>
          <div className={s.breakdownList}>
            {statusBreakdown.map((item) => (
              <div key={item.status} className={s.breakdownItem}>
                <span
                  className={s.breakdownDot}
                  style={{ background: statusColors[item.status] || 'var(--text-secondary)' }}
                />
                <span className={s.breakdownLabel} style={{ textTransform: 'capitalize' }}>
                  {item.status}
                </span>
                <span className={s.breakdownValue}>{item.count}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>
                  (${item.amount.toFixed(2)})
                </span>
              </div>
            ))}
            {statusBreakdown.length === 0 && (
              <p className={s.empty} style={{ padding: '20px 0' }}>No transactions</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Transaction List ─── */}
      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <div>
            <span className={s.tableTitle}>Transactions</span>
            <span className={s.tableCount} style={{ marginLeft: 8 }}>{payments.length} results</span>
          </div>
          <div className={s.filterBar} style={{ marginBottom: 0 }}>
            {(['all', 'succeeded', 'pending', 'failed', 'refunded'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                className={`${s.filterBtn} ${statusFilter === f ? s.filterBtnActive : ''}`}
                onClick={() => setStatusFilter(f)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading...</p>
        ) : payments.length === 0 ? (
          <p className={s.empty}>No transactions match this filter</p>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Amount</th>
                <th>Stripe Fee</th>
                <th>Driver Payout</th>
                <th>Currency</th>
                <th>Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <span
                      className={`${s.badge} ${
                        p.status === 'succeeded' ? s.badgeSuccess
                        : p.status === 'failed' ? s.badgeError
                        : p.status === 'refunded' ? s.badgeInfo
                        : s.badgeWarning
                      }`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>${Number(p.amount || 0).toFixed(2)}</td>
                  <td style={{ color: '#FF1744' }}>${Number(p.platform_fee || 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>${Number(p.driver_payout || 0).toFixed(2)}</td>
                  <td>{(p.currency || 'usd').toUpperCase()}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.payment_method || 'card'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(p.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
