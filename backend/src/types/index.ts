export interface Product {
    id: number;
    name: string;
    price: number;
    cost_price: number;
    stock: number;
    low_stock_threshold: number;
    created_at?: Date;
}

export type PaymentType = 'cash' | 'credit';
export type OrderStatus = 'pending' | 'delivered' | 'debt' | 'credit';

export interface Order {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    report_session_id: number | null;
    status: OrderStatus;
    payment_type: PaymentType;
    subtotal: number;
    discount: number;
    delivery_fee: number;
    total_amount: number;
    amount_paid: number;
    delivered_at?: Date | null;
    created_at?: Date;
    items?: OrderItem[];
}

export interface OrderItem {
    id: number;
    order_id: number;
    item_type: 'product' | 'combo';
    product_id: number | null;
    combo_id: number | null;
    quantity: number;
    price_at_time: number;
    cost_at_time: number;
    product_name?: string; // For display convenience
}

export interface Combo {
    id: number;
    name: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface ComboItem {
    combo_id: number;
    product_id: number;
    quantity: number;
    product_name?: string;
}

export type MarketPriority = 'low' | 'medium' | 'high';
export type MarketStatus = 'open' | 'done';

export interface MarketItem {
    id: number;
    item: string;
    quantity: string;
    priority: MarketPriority;
    notes: string | null;
    status: MarketStatus;
    created_at?: Date;
    updated_at?: Date;
}

// (WhatsApp integration removed)
