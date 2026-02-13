import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import { FileDown, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { useSettings } from '../components/SettingsProvider';

type ReportSession = {
  id: number;
  started_at: string;
  ended_at: string | null;
};

type DailyRow = {
  date: string; // YYYY-MM-DD
  delivered_orders: number;
  revenue: number;
  profit: number;
};

type DailyReport = {
  session: ReportSession;
  totals: { totalRevenue: number; totalOrders: number; totalProfit: number };
  days: DailyRow[];
};

const Reports = () => {
  const { settings, t } = useSettings();
  const currency = settings.currency ?? 'XAF';

  const [session, setSession] = useState<ReportSession | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndReport = async () => {
    setLoading(true);
    try {
      const active = await api.get('/reports/session');
      setSession(active);
      if (active?.id) {
        const daily = await api.get('/reports/daily?session=current');
        setReport(daily);
      } else {
        setReport(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportPdf = () => {
    // Use browser print-to-PDF.
    window.print();
  };

  const dayLabel = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return (yyyyMmDd: string) => {
      const [y, m, d] = yyyyMmDd.split('-').map((n) => Number(n));
      const dayDate = new Date(y, m - 1, d);
      dayDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((startOfToday.getTime() - dayDate.getTime()) / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(dayDate);
    };
  }, []);

  const stopReport = async () => {
    if (!confirm('Stop the current report session? New sales will start a new session automatically.')) return;
    await api.post('/reports/session/stop', {});
    await fetchSessionAndReport();
  };

  const startNewReport = async () => {
    if (!confirm('Start a new report session? (This ends the current session)')) return;
    await api.post('/reports/session/start', {});
    await fetchSessionAndReport();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h2>{t('reports.title')}</h2>
          <p className="subtitle">{t('reports.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={fetchSessionAndReport}>
            <RefreshCw size={18} /> {t('common.refresh')}
          </button>
          <button className="btn-secondary" onClick={startNewReport}>
            <PlayCircle size={18} /> {t('reports.start_new')}
          </button>
          <button className="btn-secondary" onClick={stopReport}>
            <PauseCircle size={18} /> {t('reports.stop')}
          </button>
          <button className="btn-secondary" onClick={exportPdf}>
            <FileDown size={18} /> {t('reports.export_pdf')}
          </button>
        </div>
      </div>

      <Card className="print-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{settings.businessName ?? 'Chicken Nation'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {t('reports.active_session')} {session?.id ? `#${session.id}` : 'none'} {session?.started_at ? `• started ${new Date(session.started_at).toLocaleString()}` : ''}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">{t('common.loading_report')}</div>
        ) : !session ? (
          <div className="error-state">{t('reports.no_session')}</div>
        ) : !report ? (
          <div className="error-state">{t('reports.no_sales')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            <Card style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('reports.total_revenue')}</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginTop: 6 }}>{currency} {Math.round(report.totals.totalRevenue).toLocaleString()}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t('reports.delivered_orders')} {report.totals.totalOrders}</div>
            </Card>

            <Card style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('reports.total_profit')}</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginTop: 6 }}>{currency} {Math.round(report.totals.totalProfit).toLocaleString()}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t('common.session_days')} {report.days.length}</div>
            </Card>

            <Card style={{ padding: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 10 }}>{t('reports.daily_breakdown')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.days.length === 0 ? (
                  <div className="error-state">No delivered sales yet.</div>
                ) : (
                  report.days.map((d) => (
                    <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800 }}>{dayLabel(d.date)}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.date}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800 }}>{currency} {Math.round(d.revenue).toLocaleString()}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.delivered_orders} delivered</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;
