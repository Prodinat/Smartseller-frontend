import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Save, Globe, Moon, Sun, LogOut, Store, AlertTriangle, Shield, UploadCloud, Trash2, X } from 'lucide-react';
import { useSettings } from '../components/SettingsProvider';
import { api } from '../services/api';

const Settings = () => {
  const { settings, loading, update, refresh, t } = useSettings();

  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    setForm({
      businessName: settings.businessName ?? 'Chicken Nation',
      branchName: settings.branchName ?? 'Main Branch',
      address: settings.address ?? '',
      logoUrl: settings.logoUrl ?? '',
      currency: settings.currency ?? 'XAF',
      theme: settings.theme ?? 'dark',
      language: settings.language ?? 'en',
      deliveryFee: settings.deliveryFee ?? 100,
    });
    setLogoPreview(settings.logoUrl ?? '');
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await update(form);
      await refresh();
      alert('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const onPickLogo: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please pick an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      setLogoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    setLogoPreview('');
  };

  const logout = () => {
    localStorage.removeItem('ssa_token');
    window.location.href = '/login';
  };

  const doReset = async () => {
    if (!confirm('This will erase ALL data permanently. Continue?')) return;
    setResetLoading(true);
    try {
      await api.post('/settings/reset', { password: resetPassword });
      alert('System reset complete. Please log in again.');
      localStorage.removeItem('ssa_token');
      window.location.href = '/login';
    } catch (err: any) {
      alert(err?.message || 'Reset failed');
    } finally {
      setResetLoading(false);
      setShowReset(false);
      setResetPassword('');
    }
  };

  if (loading) return <div className="loading-state">Loading settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h2>{t('settings.title')}</h2>
          <p className="subtitle">{t('settings.subtitle')}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>
          <LogOut size={18} /> {t('common.logout')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Store size={20} color="var(--accent-primary)" />
            <h3>{t('settings.business')}</h3>
          </div>

          <div className="form-group">
            <label>{t('settings.business_name')}</label>
            <input value={form.businessName ?? ''} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>{t('settings.branch_name')}</label>
            <input value={form.branchName ?? ''} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label>{t('settings.address')}</label>
            <input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('settings.optional')} />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>{t('settings.logo')}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <UploadCloud size={18} /> {t('settings.logo_upload')}
                <input type="file" accept="image/*" onChange={onPickLogo} style={{ display: 'none' }} />
              </label>
              <button className="btn-secondary" type="button" onClick={clearLogo} disabled={!logoPreview}>
                <Trash2 size={18} /> {t('settings.logo_clear')}
              </button>
            </div>
            {logoPreview && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={logoPreview}
                  alt="logo preview"
                  style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--border-color)' }}
                />
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.4 }}>
                  Logo is stored inside the app settings and will appear on receipts.
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>{t('settings.currency')}</label>
            <select value={form.currency ?? 'XAF'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="XAF">XAF</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Moon size={20} color="var(--accent-success)" />
            <h3>{t('settings.appearance')}</h3>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              className={form.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setForm({ ...form, theme: 'dark' })}
              type="button"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Moon size={18} /> {t('settings.dark')}
            </button>
            <button
              className={form.theme === 'light' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setForm({ ...form, theme: 'light' })}
              type="button"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Sun size={18} /> {t('settings.light')}
            </button>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Shield size={20} color="var(--accent-danger)" />
            <h3>{t('settings.danger')}</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.4 }}>
            {t('settings.reset_info')}
          </div>
          <button className="btn-danger" type="button" onClick={() => setShowReset(true)} style={{ width: '100%' }}>
            <AlertTriangle size={18} /> {t('settings.reset')}
          </button>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Globe size={20} color="var(--accent-warning)" />
            <h3>{t('settings.language')}</h3>
          </div>
          <div className="form-group">
            <label>{t('settings.language')}</label>
            <select value={form.language ?? 'en'} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </Card>
      </div>

      <button className="btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-end' }}>
        <Save size={18} /> {saving ? t('common.saving') : t('common.save')}
      </button>

      {showReset && (
        <div className="modal-overlay">
          <div className="modal fade-in" style={{ width: 520, maxWidth: '95vw' }}>
            <div className="modal-header">
              <h3>{t('settings.reset_title')}</h3>
              <button className="close-btn" onClick={() => setShowReset(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: 18 }}>
              <div className="error-state" style={{ marginBottom: 12 }}>
                <strong>{t('settings.reset_warning')}</strong> {t('settings.reset_warning_text')}
              </div>
              <div className="form-group">
                <label>{t('settings.vendor_password')}</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter vendor password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowReset(false)} disabled={resetLoading}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={doReset} disabled={resetLoading || !resetPassword}>
                {resetLoading ? t('settings.resetting') : t('settings.reset_now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

