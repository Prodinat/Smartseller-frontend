import { useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import { ChefHat, Lock, LogIn } from 'lucide-react';
import { useSettings } from '../components/SettingsProvider';

const Login = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useSettings();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { password });
      localStorage.setItem('ssa_token', res.token);
      onSuccess();
    } catch {
      setError(t('login.invalid_password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card className="fade-in" style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(108,92,231,0.12)', color: 'var(--accent-primary)' }}>
            <ChefHat size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Chicken Nation</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('login.vendor_access')}</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>{t('login.password')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={18} color="var(--text-secondary)" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.placeholder')}
                autoFocus
                required
                style={{ flex: 1 }}
              />
            </div>
          </div>
          {error && <div className="error-state" style={{ marginTop: 10 }}>{error}</div>}
          <button className="btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={loading}>
            <LogIn size={18} /> {loading ? t('login.signing_in') : t('login.sign_in')}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
