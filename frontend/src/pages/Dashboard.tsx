import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Wallet, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Dashboard.css';
import { useSettings } from '../components/SettingsProvider';

interface DashboardStats {
    revenue: number;
    totalOrders: number;
    ordersByStatus: { status: string; count: string }[];
    lowStockItems: any[];
    salesTrend: { date: string; revenue: string; profit: string }[];
    bestSellers: { name: string; total_sold: string }[];
    debtCount: number;
    creditCount: number;
    totalDebt: number;
    totalCredit: number;
}

const Dashboard = () => {
    const { settings, t } = useSettings();
    const currency = settings.currency ?? 'XAF';
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.get('/reports/dashboard');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="loading-state">{t('dashboard.loading')}</div>;
    if (!stats) return <div className="error-state">{t('dashboard.error')}</div>;

        return (
            <div className="dashboard-container">
            <h2 className="section-title">{t('dashboard.overview')}</h2>

            <div className="stats-grid">
                <Card className="stat-card revenue">
                    <div className="stat-icon-wrapper">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h3>{t('dashboard.total_revenue')}</h3>
                        <p className="stat-value">{currency} {stats.revenue.toLocaleString()}</p>
                    </div>
                </Card>

                <Card className="stat-card orders">
                    <div className="stat-icon-wrapper">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h3>{t('dashboard.total_orders')}</h3>
                        <p className="stat-value">{stats.totalOrders}</p>
                    </div>
                </Card>

                <Card className="stat-card debt-summary">
                    <div className="stat-icon-wrapper">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h3>{t('dashboard.debt')}</h3>
                        <p className="stat-value">{stats.debtCount} {t('dashboard.order_s')}</p>
                        <p className="stat-subvalue">{currency} {stats.totalDebt.toLocaleString()}</p>
                    </div>
                </Card>

                <Card className="stat-card credit-summary">
                    <div className="stat-icon-wrapper">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h3>{t('dashboard.credit')}</h3>
                        <p className="stat-value">{stats.creditCount} {t('dashboard.order_s')}</p>
                        <p className="stat-subvalue">{currency} {stats.totalCredit.toLocaleString()}</p>
                    </div>
                </Card>
            </div>

            <div className="charts-section">
                <Card className="chart-card">
                    <div className="card-header-icon">
                        <TrendingUp size={20} color="var(--accent-primary)" />
                        <h3>Sales & Profit Trend (Last 7 Days)</h3>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={stats.salesTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(tick) => tick.slice(5)} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    formatter={(value: any, name: any) => [`${currency} ${Number(value).toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Profit']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#2ecc71" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                                <Area type="monotone" dataKey="profit" stroke="#3498db" fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="chart-card">
                    <div className="card-header-icon">
                        <ShoppingBag size={20} color="var(--accent-success)" />
                        <h3>Best Selling Items</h3>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.bestSellers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis dataKey="name" type="category" width={100} stroke="var(--text-secondary)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="total_sold" fill="#00b894" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {stats.lowStockItems && stats.lowStockItems.length > 0 && (
                <div className="alerts-section">
                    <h3 className="section-subtitle">
                        <AlertTriangle size={20} className="alert-icon" />
                        Low Stock Alerts
                    </h3>
                    <div className="alerts-grid">
                        {stats.lowStockItems.map((item: any) => (
                            <div key={item.id} className="alert-card">
                                <span>{item.name}</span>
                                <span className="badge-danger">{item.stock} left</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
