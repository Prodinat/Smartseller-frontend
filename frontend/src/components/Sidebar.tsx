import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, ChefHat, Boxes, ListChecks, ChevronLeft } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { useState } from 'react';
import { useSettings } from './SettingsProvider';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ssa_sidebar') === 'collapsed');
    const { t } = useSettings();

    const toggle = () => {
        setCollapsed((v) => {
            const next = !v;
            localStorage.setItem('ssa_sidebar', next ? 'collapsed' : 'expanded');
            return next;
        });
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <ChefHat className="logo-icon" size={32} />
                </div>
                {!collapsed && <h3>{t('app.name')}</h3>}
                <button className="sidebar-collapse" onClick={toggle} title={collapsed ? t('nav.expand') : t('nav.collapse')}>
                    <ChevronLeft size={18} style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
                </button>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                    <LayoutDashboard size={20} />
                    {!collapsed && <span>{t('nav.dashboard')}</span>}
                </NavLink>
                <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Package size={20} />
                    {!collapsed && <span>{t('nav.inventory')}</span>}
                </NavLink>
                <NavLink to="/combos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Boxes size={20} />
                    {!collapsed && <span>{t('nav.combos')}</span>}
                </NavLink>
                <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ShoppingCart size={20} />
                    {!collapsed && <span>{t('nav.orders')}</span>}
                </NavLink>
                <NavLink to="/market" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ListChecks size={20} />
                    {!collapsed && <span>{t('nav.market')}</span>}
                </NavLink>
                <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <BarChart3 size={20} />
                    {!collapsed && <span>{t('nav.reports')}</span>}
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Settings size={20} />
                    {!collapsed && <span>{t('nav.settings')}</span>}
                </NavLink>
            </nav>
        </aside>
    );
};

export default Sidebar;
