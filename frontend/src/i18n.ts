export type Lang = 'en' | 'fr';

type Dict = Record<string, { en: string; fr: string }>;

export const dict: Dict = {
  // App / Nav
  'app.name': { en: 'Smart Seller', fr: 'Smart Seller' },
  'nav.dashboard': { en: 'Dashboard', fr: 'Tableau de bord' },
  'nav.inventory': { en: 'Inventory', fr: 'Stock' },
  'nav.combos': { en: 'Combos', fr: 'Combos' },
  'nav.orders': { en: 'Orders', fr: 'Commandes' },
  'nav.market': { en: 'Market List', fr: 'Liste du marché' },
  'nav.reports': { en: 'Reports', fr: 'Rapports' },
  'nav.settings': { en: 'Settings', fr: 'Paramètres' },
  'nav.expand': { en: 'Expand', fr: 'Développer' },
  'nav.collapse': { en: 'Collapse', fr: 'Réduire' },

  // Common
  'common.loading': { en: 'Loading…', fr: 'Chargement…' },
  'common.error': { en: 'Something went wrong.', fr: 'Une erreur est survenue.' },
  'common.save': { en: 'Save changes', fr: 'Enregistrer' },
  'common.saving': { en: 'Saving…', fr: 'Enregistrement…' },
  'common.cancel': { en: 'Cancel', fr: 'Annuler' },
  'common.delete': { en: 'Delete', fr: 'Supprimer' },
  'common.edit': { en: 'Edit', fr: 'Modifier' },
  'common.new': { en: 'New', fr: 'Nouveau' },
  'common.add': { en: 'Add', fr: 'Ajouter' },
  'common.logout': { en: 'Log out', fr: 'Se déconnecter' },
  'common.refresh': { en: 'Refresh', fr: 'Rafraîchir' },
  'common.loading_report': { en: 'Loading report…', fr: 'Chargement du rapport…' },
  'common.session_days': { en: 'Session days:', fr: 'Jours de session :' },

  // Settings
  'settings.title': { en: 'Settings', fr: 'Paramètres' },
  'settings.subtitle': { en: 'Business, currency, theme, and language', fr: 'Entreprise, devise, thème et langue' },
  'settings.business': { en: 'Business', fr: 'Entreprise' },
  'settings.business_name': { en: 'Business name', fr: 'Nom de l’entreprise' },
  'settings.branch_name': { en: 'Branch name', fr: 'Nom de la succursale' },
  'settings.address': { en: 'Address', fr: 'Adresse' },
  'settings.logo': { en: 'Business logo', fr: 'Logo' },
  'settings.logo_upload': { en: 'Upload logo', fr: 'Téléverser le logo' },
  'settings.logo_clear': { en: 'Remove logo', fr: 'Supprimer le logo' },
  'settings.currency': { en: 'Currency', fr: 'Devise' },
  'settings.appearance': { en: 'Appearance', fr: 'Apparence' },
  'settings.dark': { en: 'Dark', fr: 'Sombre' },
  'settings.light': { en: 'Light', fr: 'Clair' },
  'settings.language': { en: 'Language', fr: 'Langue' },
  'settings.danger': { en: 'Danger Zone', fr: 'Zone dangereuse' },
  'settings.reset_info': { en: 'Reset will permanently erase all orders, inventory, combos, market items and settings data.', fr: 'La réinitialisation supprimera définitivement toutes les commandes, le stock, les combos, la liste du marché et les paramètres.' },
  'settings.reset': { en: 'Reset system', fr: 'Réinitialiser le système' },
  'settings.reset_title': { en: 'Reset system', fr: 'Réinitialiser le système' },
  'settings.reset_warning': { en: 'Warning:', fr: 'Attention :' },
  'settings.reset_warning_text': { en: 'This deletes everything permanently.', fr: 'Cela supprime tout définitivement.' },
  'settings.vendor_password': { en: 'Vendor password', fr: 'Mot de passe vendeur' },
  'settings.reset_now': { en: 'Reset now', fr: 'Réinitialiser' },
  'settings.resetting': { en: 'Resetting…', fr: 'Réinitialisation…' },
  'settings.optional': { en: 'Optional', fr: 'Optionnel' },

  // Orders
  'orders.title': { en: 'Orders', fr: 'Commandes' },
  'orders.subtitle': { en: 'Pending, delivered, debt, and credit orders', fr: 'Commandes en attente, livrées, dettes et crédits' },
  'orders.new_order': { en: 'New Order', fr: 'Nouvelle commande' },
  'orders.filter_all': { en: 'All', fr: 'Toutes' },
  'orders.filter_pending': { en: 'Pending', fr: 'En attente' },
  'orders.filter_delivered': { en: 'Delivered', fr: 'Livrées' },
  'orders.filter_credits': { en: 'Credits', fr: 'Crédits' },
  'orders.filter_debts': { en: 'Debts', fr: 'Dettes' },
  'orders.receipt': { en: 'Receipt', fr: 'Reçu' },
  'orders.mark_delivered': { en: 'Mark Delivered', fr: 'Marquer comme livrée' },
  'orders.mark_paid': { en: 'Mark Paid', fr: 'Marquer comme payée' },
  'orders.no_orders': { en: 'No orders found.', fr: 'Aucune commande.' },
  'orders.today': { en: 'Today', fr: 'Aujourd’hui' },
  'orders.yesterday': { en: 'Yesterday', fr: 'Hier' },

  // Reports
  'reports.title': { en: 'Reports', fr: 'Rapports' },
  'reports.subtitle': { en: 'Auto-running, delivered-only sales report (rolls daily)', fr: 'Rapport automatique des ventes livrées (par jour)' },
  'reports.export_pdf': { en: 'Export PDF', fr: 'Exporter PDF' },
  'reports.start_new': { en: 'Start new', fr: 'Nouveau rapport' },
  'reports.stop': { en: 'Stop', fr: 'Arrêter' },
  'reports.active_session': { en: 'Active session:', fr: 'Session active :' },
  'reports.no_session': { en: 'No active report session. Create an order or click “Start new”.', fr: 'Aucune session active. Créez une commande ou cliquez sur « Nouveau rapport ».' },
  'reports.no_sales': { en: 'No delivered sales yet in this session.', fr: 'Aucune vente livrée pour cette session.' },
  'reports.total_revenue': { en: 'Total revenue (delivered)', fr: 'Chiffre d’affaires (livré)' },
  'reports.total_profit': { en: 'Total profit (estimated)', fr: 'Profit total (estimé)' },
  'reports.daily_breakdown': { en: 'Daily breakdown', fr: 'Détail par jour' },
  'reports.delivered_orders': { en: 'Delivered orders:', fr: 'Commandes livrées :' },

  // Dashboard
  'dashboard.loading': { en: 'Loading dashboard…', fr: 'Chargement du tableau de bord…' },
  'dashboard.error': { en: 'Error loading dashboard.', fr: 'Erreur lors du chargement.' },
  'dashboard.overview': { en: 'Overview', fr: 'Aperçu' },
  'dashboard.total_revenue': { en: 'Total Revenue', fr: 'Chiffre d’affaires' },
  'dashboard.total_orders': { en: 'Total Orders', fr: 'Total commandes' },
  'dashboard.debt': { en: 'Debt', fr: 'Dette' },
  'dashboard.credit': { en: 'Credit', fr: 'Crédit' },
  'dashboard.order_s': { en: 'order(s)', fr: 'commande(s)' },

  // Inventory
  'inventory.title': { en: 'Inventory Management', fr: 'Gestion du stock' },
  'inventory.subtitle': { en: 'Manage your stock and pricing', fr: 'Gérez votre stock et vos prix' },
  'inventory.add_product': { en: 'Add Product', fr: 'Ajouter un produit' },
  'inventory.search': { en: 'Search products…', fr: 'Rechercher des produits…' },
  'inventory.in_stock': { en: 'In Stock:', fr: 'En stock :' },
  'inventory.edit_product': { en: 'Edit Product', fr: 'Modifier le produit' },
  'inventory.new_product': { en: 'New Product', fr: 'Nouveau produit' },
  'inventory.failed_save': { en: 'Failed to save product', fr: 'Échec de l’enregistrement' },
  'inventory.delete_confirm': { en: 'Are you sure you want to delete this product?', fr: 'Supprimer ce produit ?' },

  // Combos
  'combos.loading': { en: 'Loading combos…', fr: 'Chargement des combos…' },
  'combos.subtitle': { en: 'Create combos from ingredients. Stock is derived from ingredient availability.', fr: 'Créez des combos à partir d’ingrédients. Le stock dépend des ingrédients.' },
  'combos.new_combo': { en: 'New Combo', fr: 'Nouveau combo' },
  'combos.name_required': { en: 'Name is required', fr: 'Le nom est requis' },
  'combos.add_ingredient': { en: 'Add at least 1 ingredient', fr: 'Ajoutez au moins 1 ingrédient' },
  'combos.delete_confirm': { en: 'Delete this combo?', fr: 'Supprimer ce combo ?' },
  'combos.available': { en: 'available', fr: 'disponible' },
  'combos.auto_price': { en: 'Auto price:', fr: 'Prix auto :' },
  'combos.stock': { en: 'stock', fr: 'stock' },

  // Market
  'market.loading': { en: 'Loading market list…', fr: 'Chargement de la liste…' },
  'market.subtitle': { en: 'Shopping checklist', fr: 'Checklist d’achats' },
  'market.open': { en: 'open', fr: 'ouvert' },
  'market.add_item': { en: 'Add Item', fr: 'Ajouter' },
  'market.export_pdf': { en: 'Export PDF', fr: 'Exporter PDF' },
  'market.item_required': { en: 'Item is required', fr: 'L’article est requis' },
  'market.delete_confirm': { en: 'Delete this market item?', fr: 'Supprimer cet élément ?' },

  // Login
  'login.vendor_access': { en: 'Vendor access', fr: 'Accès vendeur' },
  'login.password': { en: 'Password', fr: 'Mot de passe' },
  'login.placeholder': { en: 'Enter vendor password', fr: 'Entrez le mot de passe vendeur' },
  'login.sign_in': { en: 'Sign in', fr: 'Se connecter' },
  'login.signing_in': { en: 'Signing in…', fr: 'Connexion…' },
  'login.invalid_password': { en: 'Invalid password', fr: 'Mot de passe incorrect' },
};

export const createT = (lang: Lang) => {
  const safeLang: Lang = lang === 'fr' ? 'fr' : 'en';
  return (key: string) => dict[key]?.[safeLang] ?? dict[key]?.en ?? key;
};
