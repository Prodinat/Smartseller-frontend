import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import type { Combo, Order, PaymentType, Product } from '../types';
import { CheckCircle, Clock, CreditCard, FileText, Plus, Wallet, X, Trash2 } from 'lucide-react';
import './Orders.css';
import { useSettings } from '../components/SettingsProvider';
import { useSearchParams } from 'react-router-dom';

type CartItem =
  | { key: string; item_type: 'product'; product: Product; qty: number }
  | { key: string; item_type: 'combo'; combo: Combo; qty: number };

type StatusFilter = 'all' | 'pending' | 'delivered' | 'credit' | 'debt';

const Orders = () => {
  const { settings, t } = useSettings();
  const currency = settings.currency ?? 'XAF';
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // New Order Form State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [discount, setDiscount] = useState<number>(0);
  const [includeDeliveryFee, setIncludeDeliveryFee] = useState(false);
  const [debtAmount, setDebtAmount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [o, p, c] = await Promise.all([api.get('/orders'), api.get('/products'), api.get('/combos')]);
        setOrders(o);
        setProducts(p);
        setCombos(c);

        const urlStatus = (searchParams.get('status') || 'all').toLowerCase();
        if (['all', 'pending', 'delivered', 'credit', 'debt'].includes(urlStatus)) {
          setStatusFilter(urlStatus as StatusFilter);
        }

        const draftRaw = localStorage.getItem('ssa_order_draft');
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            if (draft?.customer_name) setCustomerName(String(draft.customer_name));
            if (draft?.customer_phone) setCustomerPhone(String(draft.customer_phone));
            if (draft?.payment_type) setPaymentType(draft.payment_type as PaymentType);
            setShowNewOrder(true);
          } finally {
            localStorage.removeItem('ssa_order_draft');
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    const data = await api.get('/orders');
    setOrders(data);
  };

  const addProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) return;

    const key = `p:${product.id}`;
    const existing = cart.find((c) => c.key === key);
    if (existing) {
      setCart(cart.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } as CartItem : c)));
    } else {
      setCart([...cart, { key, item_type: 'product', product, qty: 1 }]);
    }
  };

  const addCombo = (comboId: number) => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) return;
    if (combo.available_units <= 0) return;

    const key = `c:${combo.id}`;
    const existing = cart.find((c) => c.key === key);
    if (existing) {
      setCart(cart.map((c) => (c.key === key ? { ...c, qty: c.qty + 1 } as CartItem : c)));
    } else {
      setCart([...cart, { key, item_type: 'combo', combo, qty: 1 }]);
    }
  };

  const removeFromCart = (key: string) => setCart(cart.filter((c) => c.key !== key));

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const unit = item.item_type === 'product' ? item.product.price : item.combo.unit_price;
      return sum + unit * item.qty;
    }, 0);
  }, [cart]);

  const maxDiscount = useMemo(() => subtotal * 0.5, [subtotal]);

  const clampedDiscount = useMemo(() => Math.min(discount || 0, maxDiscount), [discount, maxDiscount]);
  useEffect(() => {
    if (discount > maxDiscount) setDiscount(maxDiscount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDiscount]);

  const configuredDeliveryFee = useMemo(() => {
    const configured = Number(settings.deliveryFee ?? 100);
    return Number.isFinite(configured) ? configured : 0;
  }, [settings.deliveryFee]);

  const deliveryFee = useMemo(() => (includeDeliveryFee ? configuredDeliveryFee : 0), [includeDeliveryFee, configuredDeliveryFee]);

  const totalWithFees = useMemo(() => Math.max(0, subtotal - clampedDiscount + deliveryFee), [subtotal, clampedDiscount, deliveryFee]);

  const inferredStatus = useMemo(() => {
    if (paymentType === 'credit') return 'credit';
    if (debtAmount > 0) return 'debt';
    return 'pending';
  }, [paymentType, debtAmount]);

  const resetNewOrder = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentType('cash');
    setDiscount(0);
    setIncludeDeliveryFee(false);
    setDebtAmount(0);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty');

    const status = paymentType === 'credit' ? 'credit' : debtAmount > 0 ? 'debt' : 'pending';

    const orderData: any = {
      customer_name: customerName || 'Guest',
      customer_phone: customerPhone || null,
      payment_type: paymentType,
      discount,
      include_delivery_fee: includeDeliveryFee,
      debt_amount: paymentType === 'cash' ? debtAmount : 0,
      status,
      items: cart.map((c) => {
        if (c.item_type === 'product') return { item_type: 'product', product_id: c.product.id, quantity: c.qty };
        return { item_type: 'combo', combo_id: c.combo.id, quantity: c.qty };
      }),
    };

    try {
      await api.post('/orders', orderData);
      setShowNewOrder(false);
      resetNewOrder();
      await fetchOrders();
      const [p, c] = await Promise.all([api.get('/products'), api.get('/combos')]);
      setProducts(p);
      setCombos(c);
    } catch (err: any) {
      console.error(err);
      alert('Failed to create order (check stock / inputs)');
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || 'Failed to update status (check stock).');
    }
  };

  const markDebtPaid = async (id: number) => {
    try {
      await api.post(`/orders/${id}/debt/paid`, {});
      fetchOrders();
    } catch (err) {
      alert((err as any)?.message || 'Failed to mark debt as paid.');
    }
  };

  const markCreditPaid = async (o: Order) => {
    try {
      await api.post(`/orders/${o.id}/credit/paid`, {});
      fetchOrders();
    } catch (err) {
      alert((err as any)?.message || 'Failed to mark credit as paid.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'debt':
        return <Wallet size={16} />;
      case 'credit':
        return <CreditCard size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const printReceipt = async (o: Order) => {
    const details = await api.get(`/orders/${o.id}`);
    const items = (details.items || []) as Array<{ name_at_time: string; quantity: number; price_at_time: number }>;
    const logoUrl = settings.logoUrl as string | undefined;
    const address = settings.address as string | undefined;
    const footerText = 'Thanks for ordering. Please come again.';

    const printInBrowser = (docHtml: string) => {
      // Use the browser print dialog via a hidden iframe (avoids popup blockers).
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) {
        document.body.removeChild(iframe);
        return;
      }

      doc.open();
      doc.write(docHtml);
      doc.close();

      const cleanup = () => {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch { /* noop */ }
        }, 500);
      };

      // Give the browser a tick to layout images/fonts before printing.
      setTimeout(() => {
        win.focus();
        win.print();
        cleanup();
      }, 300);
    };

    const itemsHtml = items.length
      ? `
        <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:12px;">
          <thead>
            <tr style="text-align:left; border-bottom:1px dashed #bbb;">
              <th style="padding:6px 0;">Item</th>
              <th style="padding:6px 0; text-align:right;">Qty</th>
              <th style="padding:6px 0; text-align:right;">Unit</th>
              <th style="padding:6px 0; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((it) => {
                const lineTotal = Number(it.price_at_time) * Number(it.quantity);
                return `
                  <tr style="border-bottom:1px solid rgba(0,0,0,0.06);">
                    <td style="padding:6px 0;">${it.name_at_time}</td>
                    <td style="padding:6px 0; text-align:right;">${it.quantity}</td>
                    <td style="padding:6px 0; text-align:right;">${currency} ${Math.round(Number(it.price_at_time)).toLocaleString()}</td>
                    <td style="padding:6px 0; text-align:right;">${currency} ${Math.round(lineTotal).toLocaleString()}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      `
      : '<div class="muted">No items found for this order.</div>';

    const html = `
      <html>
        <head>
          <title>Receipt #${o.id}</title>
          <style>
            body{font-family:system-ui,Segoe UI,Arial;padding:18px;}
            h1{font-size:16px;margin:0 0 10px;}
            .muted{color:#666;font-size:12px;}
            .row{display:flex;justify-content:space-between;margin:6px 0;}
            .hr{border-top:1px dashed #bbb;margin:10px 0;}
          </style>
        </head>
        <body>
          <div style="display:flex; gap:12px; align-items:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="logo" style="width:44px;height:44px;object-fit:cover;border-radius:10px;border:1px solid #ddd;" />` : ''}
            <div>
              <h1 style="margin:0;">${settings.businessName ?? 'Chicken Nation'}</h1>
              <div class="muted">${settings.branchName ?? 'Main Branch'}</div>
              ${address ? `<div class="muted">${address}</div>` : ''}
            </div>
          </div>
          <div class="hr"></div>
          <div class="row"><span>Order</span><span>#${o.id}</span></div>
          <div class="row"><span>Customer</span><span>${o.customer_name}${o.customer_phone ? ` (${o.customer_phone})` : ''}</span></div>
          <div class="row"><span>Status</span><span>${o.status}</span></div>
          <div class="row"><span>Payment</span><span>${o.payment_type}</span></div>
          <div class="row"><span>Date</span><span>${new Date(o.created_at).toLocaleString()}</span></div>
          <div class="hr"></div>
          ${itemsHtml}
          <div class="hr"></div>
          <div class="row"><span>Subtotal</span><span>${currency} ${Math.round(o.subtotal).toLocaleString()}</span></div>
          <div class="row"><span>Discount</span><span>${currency} ${Math.round(o.discount).toLocaleString()}</span></div>
          <div class="row"><span>Delivery fee</span><span>${currency} ${Math.round(o.delivery_fee || 0).toLocaleString()}</span></div>
          <div class="row"><strong>Total</strong><strong>${currency} ${Math.round(o.total_amount).toLocaleString()}</strong></div>
          <div class="row"><span>Paid</span><span>${currency} ${Math.round(o.amount_paid).toLocaleString()}</span></div>
          <div class="hr"></div>
          <div class="muted" style="text-align:center;">${footerText}</div>
        </body>
      </html>
    `;

    printInBrowser(html);
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const ordersByDay = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const keyFor = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const labelForKey = (key: string) => {
      const [y, m, d] = key.split('-').map((n) => Number(n));
      const dayDate = new Date(y, m - 1, d);
      dayDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((startOfToday.getTime() - dayDate.getTime()) / 86400000);
      if (diffDays === 0) return t('orders.today');
      if (diffDays === 1) return t('orders.yesterday');
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(dayDate);
    };

    const grouped = new Map<string, Order[]>();
    for (const o of filteredOrders) {
      const k = keyFor(new Date(o.created_at));
      grouped.set(k, [...(grouped.get(k) ?? []), o]);
    }

    const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((k) => ({ key: k, label: labelForKey(k), orders: grouped.get(k) ?? [] }));
  }, [filteredOrders, t]);

  const setFilter = (f: StatusFilter) => {
    setStatusFilter(f);
    if (f === 'all') setSearchParams({});
    else setSearchParams({ status: f });
  };

  if (loading) return <div className="loading-state">{t('common.loading')}</div>;

  const deleteDelivered = async (id: number) => {
    if (!confirm('Delete this delivered order? Stock will be restored.')) return;
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete order');
    }
  };

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h2>{t('orders.title')}</h2>
          <p className="subtitle">{t('orders.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewOrder(true)}>
          <Plus size={18} /> {t('orders.new_order')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className={statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('all')}>{t('orders.filter_all')}</button>
        <button className={statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('pending')}>{t('orders.filter_pending')}</button>
        <button className={statusFilter === 'delivered' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('delivered')}>{t('orders.filter_delivered')}</button>
        <button className={statusFilter === 'credit' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('credit')}>{t('orders.filter_credits')}</button>
        <button className={statusFilter === 'debt' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('debt')}>{t('orders.filter_debts')}</button>
      </div>

      {ordersByDay.length === 0 && <div className="error-state">{t('orders.no_orders')}</div>}

      {ordersByDay.map((group) => (
        <div key={group.key}>
          <h3 style={{ marginTop: 8 }}>{group.label}</h3>
          <div className="orders-grid">
            {group.orders.map((order) => {
          const creditOwed = Math.max(0, order.total_amount - order.amount_paid);
          const debtOwed = Math.max(0, order.amount_paid - order.total_amount);
          return (
            <Card key={order.id} className={`order-card status-border-${order.status}`}>
              <div className="order-header">
                <div className="order-id">#{order.id}</div>
                <div className={`status-badge ${order.status}`}>
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </div>
              </div>

              <h3 className="customer-name">{order.customer_name}</h3>
              {order.customer_phone && <div style={{ color: 'var(--text-secondary)', marginTop: -10, marginBottom: 10 }}>{order.customer_phone}</div>}

              <div className="order-details">
                <div className="detail-row">
                  <span className="label">Total</span>
                  <span className="value">{currency} {Math.round(order.total_amount).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Paid</span>
                  <span className="value">{currency} {Math.round(order.amount_paid).toLocaleString()}</span>
                </div>
                {order.status === 'credit' && (
                  <div className="detail-row">
                    <span className="label">Customer owes</span>
                    <span className="value">{currency} {Math.round(creditOwed).toLocaleString()}</span>
                  </div>
                )}
                {order.status === 'debt' && (
                  <div className="detail-row">
                    <span className="label">Business owes</span>
                    <span className="value">{currency} {Math.round(debtOwed).toLocaleString()}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Payment</span>
                  <span className="value">{order.payment_type}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date</span>
                  <span className="value">{new Date(order.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="order-actions" style={{ gap: 10, justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => void printReceipt(order)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} /> {t('orders.receipt')}
                </button>
                {order.status === 'delivered' && (
                  <button className="btn-icon danger" onClick={() => deleteDelivered(order.id)} title="Delete delivered order">
                    <Trash2 size={18} />
                  </button>
                )}
                {order.status === 'pending' && (
                  <button className="btn-action" onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                    <CheckCircle size={16} /> {t('orders.mark_delivered')}
                  </button>
                )}
                {order.status === 'debt' && (
                  <button className="btn-action" onClick={() => markDebtPaid(order.id)}>
                    <CheckCircle size={16} /> {t('orders.mark_paid')}
                  </button>
                )}
                {order.status === 'credit' && (
                  <button className="btn-action" onClick={() => markCreditPaid(order)}>
                    <CheckCircle size={16} /> {t('orders.mark_paid')}
                  </button>
                )}
              </div>
            </Card>
          );
            })}
          </div>
        </div>
      ))}

      {showNewOrder && (
        <div className="modal-overlay">
          <div className="modal order-modal">
            <div className="modal-header">
              <h3>New Order</h3>
              <button className="close-btn" onClick={() => { setShowNewOrder(false); resetNewOrder(); }}>
                <X size={20} />
              </button>
            </div>
            <div className="order-form-grid">
              <div className="product-selection">
                <h4>Select Products</h4>
                <div className="product-list-scroll">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={`product-item-row ${p.stock <= 0 ? 'disabled' : ''}`}
                      onClick={() => p.stock > 0 && addProduct(p.id)}
                    >
                      <div className="prod-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="prod-name">{p.name}</span>
                        </div>
                        <span className="prod-price">{currency} {Math.round(p.price).toLocaleString()}</span>
                      </div>
                      <div className="prod-stock">STOCK: {p.stock}</div>
                    </div>
                  ))}
                </div>

                <h4 style={{ marginTop: 14 }}>Select Combos</h4>
                <div className="product-list-scroll" style={{ maxHeight: 220 }}>
                  {combos.map((c) => (
                    <div
                      key={c.id}
                      className={`product-item-row ${c.available_units <= 0 ? 'disabled' : ''}`}
                      onClick={() => c.available_units > 0 && addCombo(c.id)}
                    >
                      <div className="prod-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="prod-name">{c.name}</span>
                        </div>
                        <span className="prod-price">{currency} {Math.round(c.unit_price).toLocaleString()}</span>
                      </div>
                      <div className="prod-stock">AVAILABLE: {c.available_units}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-summary-panel">
                <h4>Order Summary</h4>
                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div className="empty-cart">Cart is empty</div>
                  ) : (
                    cart.map((item) => {
                      const name = item.item_type === 'product' ? item.product.name : item.combo.name;
                      const unit = item.item_type === 'product' ? item.product.price : item.combo.unit_price;
                      return (
                        <div key={item.key} className="cart-item">
                          <div>
                            <div className="cart-prod-name">{name}</div>
                            <div className="cart-prod-price">{currency} {Math.round(unit).toLocaleString()} x {item.qty}</div>
                          </div>
                          <div className="cart-item-right">
                            <span className="item-total">{Math.round(unit * item.qty).toLocaleString()}</span>
                            <button className="btn-icon danger micro" onClick={() => removeFromCart(item.key)}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="cart-total-section">
                  <div className="total-label">Total</div>
                  <div className="total-amount">{currency} {Math.round(totalWithFees).toLocaleString()}</div>
                  <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                    Status: <span className={`status-badge ${inferredStatus}`}>{inferredStatus}</span>
                  </div>
                </div>

                <div className="order-details-form">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Guest" />
                  </div>
                  <div className="form-group">
                    <label>Customer Phone</label>
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+237..." />
                  </div>
                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label>Payment Type</label>
                      <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                        <option value="cash">Cash</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Home delivery</label>
                      <button
                        type="button"
                        className={includeDeliveryFee ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setIncludeDeliveryFee((v) => !v)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 42 }}
                      >
                        {includeDeliveryFee ? `Added (+${currency} ${deliveryFee})` : `Add fee (+${currency} ${configuredDeliveryFee})`}
                      </button>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label>Discount</label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Math.min(Number(e.target.value), maxDiscount))}
                        min={0}
                        max={maxDiscount}
                      />
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>
                        Max discount: {currency} {Math.round(maxDiscount).toLocaleString()} (50% of items)
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Debt (change owed)</label>
                      <input
                        type="number"
                        value={paymentType === 'cash' ? debtAmount : 0}
                        onChange={(e) => setDebtAmount(Number(e.target.value))}
                        min={0}
                        disabled={paymentType !== 'cash'}
                        placeholder="0"
                      />
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>
                        If customer paid bigger money and you owe change, enter the owed amount.
                      </div>
                    </div>
                  </div>
                </div>

                <button className="btn-primary full-width" onClick={handleSubmitOrder}>Confirm Order</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
