import { Pool } from 'pg';

type CreatePoolOverrides = {
    database?: string;
};

export const createPoolFromEnv = (overrides: CreatePoolOverrides = {}) => {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.DB_HOST || 'localhost';
    const shouldUseSsl =
        process.env.DB_SSL === 'true' || Boolean(connectionString) || host.includes('supabase.co') || host.includes('supabase.com');

    if (connectionString) {
        // Note: If you need to connect to a different database than the one in DATABASE_URL, set DB_* vars instead.
        return new Pool({
            connectionString,
            ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000'),
        });
    }

    return new Pool({
        user: process.env.DB_USER || 'postgres',
        host,
        database: overrides.database || process.env.DB_NAME || 'smartseller',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000'),
    });
};

