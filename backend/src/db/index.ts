import { Pool } from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient, QueryResult } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const host = process.env.DB_HOST || 'localhost';
const shouldUseSsl = process.env.DB_SSL === 'true' || Boolean(connectionString) || host.includes('supabase.co');

const pool = new Pool(
    connectionString
        ? {
            connectionString,
            ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000'),
        }
        : {
            user: process.env.DB_USER || 'postgres',
            host,
            database: process.env.DB_NAME || 'smartseller',
            password: process.env.DB_PASSWORD || 'password',
            port: parseInt(process.env.DB_PORT || '5432'),
            ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000'),
        }
);

const txStorage = new AsyncLocalStorage<{ client: PoolClient }>();

export const query = (text: string, params?: any[]): Promise<QueryResult<any>> => {
    const store = txStorage.getStore();
    if (store?.client) return store.client.query(text, params);
    return pool.query(text, params);
};

export const tx = async <T>(fn: () => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        return await txStorage.run({ client }, async () => {
            await client.query('BEGIN');
            try {
                const result = await fn();
                await client.query('COMMIT');
                return result;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        });
    } finally {
        client.release();
    }
};
