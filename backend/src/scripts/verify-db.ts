import dotenv from 'dotenv';
import { Product } from '../types';
import { createPoolFromEnv } from '../db/pool';

dotenv.config();

const pool = createPoolFromEnv();

const seedData = async (client: any) => {
    console.log('Seeding initial data...');

    // Seed Products
    const products: Partial<Product>[] = [
        { name: 'Grilled Chicken (Whole)', price: 5000, stock: 20, low_stock_threshold: 5 },
        { name: 'Grilled Chicken (Half)', price: 2500, stock: 40, low_stock_threshold: 5 },
        { name: 'Fried Rice', price: 1500, stock: 50, low_stock_threshold: 10 },
        { name: 'Plantains (Portion)', price: 500, stock: 100, low_stock_threshold: 20 },
        { name: 'Soda (33cl)', price: 500, stock: 200, low_stock_threshold: 24 },
    ];

    for (const p of products) {
        await client.query(
            'INSERT INTO products (name, price, stock, low_stock_threshold) VALUES ($1, $2, $3, $4)',
            [p.name, p.price, p.stock, p.low_stock_threshold]
        );
    }

    // Seed Settings
    await client.query("INSERT INTO settings (key, value) VALUES ('businessName', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify('Chicken Nation')]);
    await client.query("INSERT INTO settings (key, value) VALUES ('branchName', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify('Main Branch')]);
    await client.query("INSERT INTO settings (key, value) VALUES ('currency', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify('XAF')]);
    await client.query("INSERT INTO settings (key, value) VALUES ('language', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify('en')]);
    await client.query("INSERT INTO settings (key, value) VALUES ('theme', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify('dark')]);

    console.log('Seeding complete.');
};

const verify = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to database successfully.');

        // Check Tables
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables found:', res.rows.map(r => r.table_name).join(', '));

        // Check Product Count
        const productCount = await client.query('SELECT COUNT(*) FROM products');
        console.log(`Products count: ${productCount.rows[0].count}`);

        if (parseInt(productCount.rows[0].count) === 0) {
            await seedData(client);
        }

        const orderCount = await client.query('SELECT COUNT(*) FROM orders');
        console.log(`Orders count: ${orderCount.rows[0].count}`);

        client.release();
    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await pool.end();
    }
};

verify();
