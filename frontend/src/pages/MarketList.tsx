import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import type { MarketItem, MarketPriority, MarketStatus } from '../types';
import { Plus, Trash2, Edit2, FileDown, X, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../components/SettingsProvider';
import './MarketList.css';

const priorities: MarketPriority[] = ['low', 'medium', 'high'];
const statuses: MarketStatus[] = ['open', 'done'];

const MarketList = () => {
  const { settings, t } = useSettings();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MarketItem | null>(null);
  const [draft, setDraft] = useState<Partial<MarketItem>>({ priority: 'medium', status: 'open', quantity: '1' });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.get('/market');
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft({ priority: 'medium', status: 'open', quantity: '1' });
    setShowModal(true);
  };

  const openEdit = (i: MarketItem) => {
    setEditing(i);
    setDraft({ ...i });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.item?.trim()) return alert(t('market.item_required'));
    const payload = {
      item: draft.item.trim(),
      quantity: (draft.quantity ?? '1').toString(),
      priority: (draft.priority ?? 'medium') as MarketPriority,
      notes: draft.notes ?? null,
      status: (draft.status ?? 'open') as MarketStatus,
    };
    if (editing) await api.put(`/market/${editing.id}`, payload);
    else await api.post('/market', payload);
    setShowModal(false);
    fetchItems();
  };

  const remove = async (id: number) => {
    if (!confirm(t('market.delete_confirm'))) return;
    await api.delete(`/market/${id}`);
    fetchItems();
  };

  const toggleDone = async (i: MarketItem) => {
    await api.put(`/market/${i.id}`, { status: i.status === 'done' ? 'open' : 'done' });
    fetchItems();
  };

  const exportPdf = () => {
    // PDF export logic (placeholder): uses print-to-PDF via the browser for now.
    // If you want strict jsPDF, tell me and I’ll wire it in once deps are available.
    window.print();
  };

  const openCount = useMemo(() => items.filter((i) => i.status === 'open').length, [items]);

  if (loading) return <div className="loading-state">{t('market.loading')}</div>;

  return (
    <div className="market-page">
      <div className="page-header">
        <div>
          <h2>{t('nav.market')}</h2>
          <p className="subtitle">{t('market.subtitle')} • {openCount} {t('market.open')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={exportPdf}>
            <FileDown size={18} /> {t('market.export_pdf')}
          </button>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={18} /> {t('market.add_item')}
          </button>
        </div>
      </div>

      <Card className="print-card" style={{ padding: 18 }}>
        <div className="print-header">
          <div>
            <div className="print-title">{settings.businessName ?? 'Chicken Nation'}</div>
            <div className="print-subtitle">{t('nav.market')} • {new Date().toLocaleDateString()}</div>
          </div>
          <div className="print-badge">{settings.branchName ?? 'Main Branch'}</div>
        </div>

        <div className="market-grid">
          {items.map((i) => (
            <div key={i.id} className={`market-row ${i.status === 'done' ? 'done' : ''}`}>
              <button className={`check ${i.status === 'done' ? 'checked' : ''}`} onClick={() => toggleDone(i)} title="Toggle done">
                <CheckCircle2 size={18} />
              </button>
              <div className="market-main">
                <div className="market-name">{i.item}</div>
                <div className="market-meta">
                  <span className={`badge pri-${i.priority}`}>{i.priority}</span>
                  <span className="badge neutral">qty: {i.quantity}</span>
                  {i.notes && <span className="badge neutral">{i.notes}</span>}
                </div>
              </div>
              <div className="row-actions">
                <button className="btn-icon" onClick={() => openEdit(i)} title="Edit"><Edit2 size={18} /></button>
                <button className="btn-icon danger" onClick={() => remove(i.id)} title="Delete"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal fade-in" style={{ width: 560, maxWidth: '95vw' }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Market Item' : 'New Market Item'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label>Item</label>
                <input value={draft.item ?? ''} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder="e.g. Cooking oil" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input value={draft.quantity ?? '1'} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={(draft.priority ?? 'medium') as any} onChange={(e) => setDraft({ ...draft, priority: e.target.value as MarketPriority })}>
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={(draft.status ?? 'open') as any} onChange={(e) => setDraft({ ...draft, status: e.target.value as MarketStatus })}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketList;
