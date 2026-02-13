
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_stock_nonnegative CHECK (stock >= 0)
);

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'delivered', 'debt', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM ('cash', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_item_type AS ENUM ('product', 'combo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_status AS ENUM ('open', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS combos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS combo_items (
    combo_id INTEGER REFERENCES combos(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (combo_id, product_id),
    CONSTRAINT combo_items_qty_positive CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    report_session_id INTEGER,
    status order_status NOT NULL DEFAULT 'pending',
    payment_type payment_type NOT NULL DEFAULT 'cash',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_amounts_nonnegative CHECK (subtotal >= 0 AND discount >= 0 AND delivery_fee >= 0 AND total_amount >= 0 AND amount_paid >= 0)
);

CREATE TABLE IF NOT EXISTS report_sessions (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

ALTER TABLE orders
    ADD CONSTRAINT orders_report_session_fk
    FOREIGN KEY (report_session_id) REFERENCES report_sessions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    item_type order_item_type NOT NULL,
    product_id INTEGER REFERENCES products(id),
    combo_id INTEGER REFERENCES combos(id),
    quantity INTEGER NOT NULL,
    name_at_time VARCHAR(255) NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL,
    cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT order_items_qty_positive CHECK (quantity > 0),
    CONSTRAINT order_items_one_ref CHECK (
        (item_type = 'product' AND product_id IS NOT NULL AND combo_id IS NULL)
        OR
        (item_type = 'combo' AND combo_id IS NOT NULL AND product_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_items (
    id SERIAL PRIMARY KEY,
    item VARCHAR(255) NOT NULL,
    quantity VARCHAR(100) NOT NULL DEFAULT '1',
    priority market_priority NOT NULL DEFAULT 'medium',
    notes TEXT,
    status market_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
