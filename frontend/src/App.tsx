import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Combos from './pages/Combos';
import MarketList from './pages/MarketList';
import Login from './pages/Login';
import './App.css';
import { useSettings } from './components/SettingsProvider';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const token = localStorage.getItem('ssa_token');
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

// Layout component to wrap content with Sidebar + Header
const Layout = () => {
  const location = useLocation();
  const { settings, t } = useSettings();
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return t('nav.dashboard');
      case '/inventory': return t('nav.inventory');
      case '/combos': return t('nav.combos');
      case '/orders': return t('nav.orders');
      case '/market': return t('nav.market');
      case '/reports': return t('nav.reports');
      case '/settings': return t('nav.settings');
      default: return settings.businessName ?? 'Chicken Nation';
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <header className="app-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{settings.businessName ?? 'Chicken Nation'}</div>
              <span className="branch-badge">{settings.branchName ?? 'Main Branch'}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{getPageTitle()}</div>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const LoginRoute = () => {
  const navigate = useNavigate();
  return <Login onSuccess={() => { navigate('/'); window.location.reload(); }} />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="combos" element={<Combos />} />
          <Route path="orders" element={<Orders />} />
          <Route path="market" element={<MarketList />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
