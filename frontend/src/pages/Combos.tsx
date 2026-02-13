import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import type { Combo, Product } from '../types';
import { Plus, Trash2, X } from 'lucide-react';
import './Combos.css';
import { useSettings } from '../components/SettingsProvider';

type ComboDraftItem = { product_id: number; quantity: number };

const Combos = () => {
  const { t, settings } = useSettings();
  const currency = settings.currency ?? 'XAF';
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [draftItems, setDraftItems] = useState<ComboDraftItem[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.get('/combos'), api.get('/products')]);
      setCombos(c);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const draftPrice = useMemo(() => {
    return draftItems.reduce((acc, i) => {
      const p = products.find((x) => x.id === i.product_id);
      return acc + (p ? p.price * i.quantity : 0);
    }, 0);
  }, [draftItems, products]);

  const addIngredient = (product_id: number) => {
    if (!product_id) return;
    if (draftItems.some((i) => i.product_id === product_id)) return;
    setDraftItems([...draftItems, { product_id, quantity: 1 }]);
  };

  const createCombo = async () => {
    if (!name.trim()) return alert(t('combos.name_required'));
    if (draftItems.length === 0) return alert(t('combos.add_ingredient'));
    await api.post('/combos', { name: name.trim(), items: draftItems });
    setShowModal(false);
    setName('');
    setDraftItems([]);
    fetchAll();
  };

  const deleteCombo = async (id: number) => {
    if (!confirm(t('combos.delete_confirm'))) return;
    try {
      await api.delete(`/combos/${id}`);
      fetchAll();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete combo');
    }
  };

  if (loading) return <div className="loading-state">{t('combos.loading')}</div>;

  return (
    <div className="combos-page">
      <div className="page-header">
        <div>
          <h2>{t('nav.combos')}</h2>
          <p className="subtitle">{t('combos.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> {t('combos.new_combo')}
        </button>
      </div>

      <div className="combos-grid">
        {combos.map((combo) => (
          <Card key={combo.id} className="combo-card">
            <div className="combo-head">
              <div>
                <div className="combo-name">{combo.name}</div>
                <div className="combo-meta">
                  <span className={`pill ${combo.available_units > 0 ? 'ok' : 'bad'}`}>
                    {combo.available_units} {t('combos.available')}
                  </span>
                  <span className="pill neutral">{t('combos.auto_price')} {currency} {Math.round(combo.unit_price).toLocaleString()}</span>
                </div>
              </div>
              <button className="btn-icon danger" onClick={() => deleteCombo(combo.id)} title="Delete">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="combo-items">
              {combo.items.map((i) => (
                <div key={i.product_id} className="combo-item-row">
                  <span>{i.product_name}</span>
                  <span className="muted">x{i.quantity}</span>
                  <span className={`stock ${i.stock <= 0 ? 'bad' : ''}`}>{t('combos.stock')} {i.stock}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal fade-in" style={{ width: 620, maxWidth: '95vw' }}>
            <div className="modal-header">
              <h3>{t('combos.new_combo')}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label>Combo Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken + Rice + Soda" />
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr 180px', gap: 12 }}>
              <div className="form-group">
                <label>Add Ingredient</label>
                <select onChange={(e) => addIngredient(Number(e.target.value))} value="">
                  <option value="" disabled>
                    Select product...
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <Card className="combo-price-box">
                <div className="muted" style={{ fontSize: 12 }}>Auto Price</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>XAF {draftPrice.toLocaleString()}</div>
              </Card>
            </div>

            <div className="draft-items">
              {draftItems.length === 0 ? (
                <div className="muted">No ingredients added yet.</div>
              ) : (
                draftItems.map((i) => {
                  const p = products.find((x) => x.id === i.product_id);
                  return (
                    <div key={i.product_id} className="draft-row">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 700 }}>{p?.name ?? `Product #${i.product_id}`}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Unit price: XAF {p?.price.toLocaleString?.() ?? ''}</div>
                      </div>
                      <div className="draft-right">
                        <input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => setDraftItems(draftItems.map((x) => (x.product_id === i.product_id ? { ...x, quantity: Number(e.target.value) } : x)))}
                          style={{ width: 90 }}
                        />
                        <button className="btn-icon danger micro" onClick={() => setDraftItems(draftItems.filter((x) => x.product_id !== i.product_id))}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createCombo}>Create Combo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Combos;
