import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { createT, type Lang } from '../i18n';

type Settings = Record<string, any>;

type SettingsContextValue = {
  settings: Settings;
  loading: boolean;
  lang: Lang;
  t: (key: string) => string;
  refresh: () => Promise<void>;
  update: (patch: Settings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('ssa_token');
      if (!token) {
        setSettings({});
        return;
      }
      const data = await api.get('/settings');
      setSettings(data);
    } catch {
      setSettings({});
    }
  }, []);

  const update = useCallback(async (patch: Settings) => {
    await api.post('/settings', patch);
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    const theme = settings.theme;
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme;
    }
  }, [settings.theme]);

  const lang = (settings.language === 'fr' ? 'fr' : 'en') as Lang;
  const t = useMemo(() => createT(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ settings, loading, refresh, update, lang, t }), [settings, loading, refresh, update, lang, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
