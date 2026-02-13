export interface Product {
    id: number;
    name: string;
    price: number;
    cost_price: number;
    stock: number;
    low_stock_threshold: number;
}

export type PaymentType = 'cash' | 'credit';
export type OrderStatus = 'pending' | 'delivered' | 'debt' | 'credit';

export interface Order {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    status: OrderStatus;
    payment_type: PaymentType;
    subtotal: number;
    discount: number;
    delivery_fee: number;
    total_amount: number;
    amount_paid: number;
    created_at: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    item_type: 'product' | 'combo';
    product_id: number | null;
    combo_id: number | null;
    quantity: number;
    name_at_time: string;
    price_at_time: number;
    cost_at_time: number;
}

export interface ComboItem {
    combo_id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    stock: number;
    price: number;
    cost_price: number;
}

export interface Combo {
    id: number;
    name: string;
    items: ComboItem[];
    available_units: number;
    unit_price: number;
    unit_cost: number;
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
    created_at: string;
    updated_at: string;
}

// (WhatsApp integration removed)
