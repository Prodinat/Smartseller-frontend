import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000'),
});

const migrate = async () => {
    try {
        const client = await pool.connect();

        console.log('Adding cost_price to products...');
        await client.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
        `);

        console.log('Adding cost_at_time to order_items...');
        await client.query(`
            ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_at_time DECIMAL(10, 2) DEFAULT 0;
        `);

        console.log('Migration complete.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

migrate();
