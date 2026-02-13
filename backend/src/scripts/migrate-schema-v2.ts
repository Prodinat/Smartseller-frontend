import dotenv from 'dotenv';
import { createPoolFromEnv } from '../db/pool';

dotenv.config();

const pool = createPoolFromEnv();

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Migrating schema to v2...');
        await client.query('BEGIN');

        // Products
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        await client.query(`DO $$ BEGIN
            ALTER TABLE products ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;`);

        // Enums
        await client.query(`DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending','delivered','debt','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await client.query(`DO $$ BEGIN CREATE TYPE payment_type AS ENUM ('cash','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await client.query(`DO $$ BEGIN CREATE TYPE order_item_type AS ENUM ('product','combo'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await client.query(`DO $$ BEGIN CREATE TYPE market_priority AS ENUM ('low','medium','high'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await client.query(`DO $$ BEGIN CREATE TYPE market_status AS ENUM ('open','done'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

        // Orders - add missing columns, then coerce where possible
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type payment_type NOT NULL DEFAULT 'cash'`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS report_session_id INTEGER`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

        // If an old total_amount exists, copy to subtotal/total_amount as needed
        await client.query(`UPDATE orders SET subtotal = COALESCE(subtotal, total_amount, 0) WHERE subtotal = 0 AND total_amount IS NOT NULL`);
        await client.query(`UPDATE orders SET delivery_fee = COALESCE(delivery_fee, 0) WHERE delivery_fee IS NULL`);
        // Backfill delivered_at for existing delivered rows
        await client.query(`UPDATE orders SET delivered_at = COALESCE(delivered_at, updated_at, created_at) WHERE status = 'delivered' AND delivered_at IS NULL`);

        // Report sessions
        await client.query(`CREATE TABLE IF NOT EXISTS report_sessions (
            id SERIAL PRIMARY KEY,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP
        )`);
        await client.query(`DO $$ BEGIN
            ALTER TABLE orders ADD CONSTRAINT orders_report_session_fk FOREIGN KEY (report_session_id) REFERENCES report_sessions(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;`);

        // Ensure order status uses allowed values even if stored as text
        await client.query(`ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status`);

        // Order items: add combo support and cost
        await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_type order_item_type`);
        await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combo_id INTEGER`);
        await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS name_at_time VARCHAR(255)`);
        await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_at_time DECIMAL(10, 2) NOT NULL DEFAULT 0`);

        // Backfill item_type/name for existing product rows
        await client.query(`UPDATE order_items oi
            SET item_type = COALESCE(item_type, 'product'::order_item_type)
            WHERE oi.product_id IS NOT NULL`);
        await client.query(`UPDATE order_items oi
            SET name_at_time = COALESCE(name_at_time, p.name)
            FROM products p
            WHERE oi.product_id = p.id AND oi.name_at_time IS NULL`);

        // Combos
        await client.query(`CREATE TABLE IF NOT EXISTS combos (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await client.query(`ALTER TABLE combos ADD COLUMN IF NOT EXISTS image_url TEXT`);
        await client.query(`CREATE TABLE IF NOT EXISTS combo_items (
            combo_id INTEGER REFERENCES combos(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
            quantity INTEGER NOT NULL,
            PRIMARY KEY (combo_id, product_id),
            CONSTRAINT combo_items_qty_positive CHECK (quantity > 0)
        )`);

        // Market list
        await client.query(`CREATE TABLE IF NOT EXISTS market_items (
            id SERIAL PRIMARY KEY,
            item VARCHAR(255) NOT NULL,
            quantity VARCHAR(100) NOT NULL DEFAULT '1',
            priority market_priority NOT NULL DEFAULT 'medium',
            notes TEXT,
            status market_status NOT NULL DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // WhatsApp integration removed

        // Settings value jsonb
        await client.query(`ALTER TABLE settings ALTER COLUMN value TYPE JSONB USING to_jsonb(value)`);

        await client.query('COMMIT');
        console.log('Schema v2 migration complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Schema v2 migration failed:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
