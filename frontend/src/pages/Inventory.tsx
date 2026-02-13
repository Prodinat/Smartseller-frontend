import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../services/api';
import type { Product } from '../types';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import './Inventory.css';
import { useSettings } from '../components/SettingsProvider';

const Inventory = () => {
    const { settings, t } = useSettings();
    const currency = settings.currency ?? 'XAF';
    const [products, setProducts] = useState<Product[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProducts = async () => {
        try {
            const data = await api.get('/products');
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await api.put(`/products/${formData.id}`, formData);
            } else {
                await api.post('/products', formData);
            }
            setShowModal(false);
            setFormData({});
            fetchProducts();
        } catch (err) {
            console.error(err);
            alert(t('inventory.failed_save'));
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm(t('inventory.delete_confirm'))) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (err: any) {
                alert(err?.message || 'Failed to delete product');
            }
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div>
                    <h2>{t('inventory.title')}</h2>
                    <p className="subtitle">{t('inventory.subtitle')}</p>
                </div>
                <button className="btn-primary" onClick={() => { setFormData({}); setShowModal(true); }}>
                    <Plus size={18} /> {t('inventory.add_product')}
                </button>
            </div>

            <div className="search-bar-container">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder={t('inventory.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="products-grid">
                {filteredProducts.map((product) => (
                    <Card key={product.id} className="product-card">
                        <div className="card-header">
                            <h3>{product.name}</h3>
                            <span className="price-tag">{currency} {product.price.toLocaleString()}</span>
                        </div>

                        <div className="product-details">
                            <div className="stock-indicator">
                                <span className="label">{t('inventory.in_stock')}</span>
                                <span className={`value ${product.stock <= product.low_stock_threshold ? 'critical' : ''}`}>
                                    {product.stock}
                                </span>
                            </div>
                        </div>

                        <div className="card-actions">
                            <button className="btn-icon" onClick={() => { setFormData(product); setShowModal(true); }}>
                                <Edit2 size={18} />
                            </button>
                            <button className="btn-icon danger" onClick={() => handleDelete(product.id)}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {showModal && (
                    <div className="modal-overlay">
                    <div className="modal fade-in">
                        <div className="modal-header">
                            <h3>{formData.id ? t('inventory.edit_product') : t('inventory.new_product')}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Product Name</label>
                                <input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Grilled Chicken"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price ({currency})</label>
                                    <input
                                        type="number"
                                        value={formData.price || ''}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cost Price ({currency})</label>
                                    <input
                                        type="number"
                                        value={formData.cost_price || ''}
                                        onChange={e => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Stock Qty</label>
                                    <input
                                        type="number"
                                        value={formData.stock || ''}
                                        onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Low Stock Warning Limit</label>
                                <input
                                    type="number"
                                    value={formData.low_stock_threshold || ''}
                                    onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
