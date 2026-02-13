import dotenv from 'dotenv';
import { createPoolFromEnv } from '../db/pool';

dotenv.config();

// Local/dev convenience: this script drops/creates a database. This is not intended for Supabase.
const pool = createPoolFromEnv({ database: process.env.DB_ADMIN_DB || 'postgres' });

const targetDbName = process.env.DB_NAME || 'smartseller';

const resetDatabase = async () => {
    try {
        const client = await pool.connect();

        // Terminate existing connections
        await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${targetDbName}'
    `);

        // Drop database
        console.log(`Dropping database ${targetDbName}...`);
        await client.query(`DROP DATABASE IF EXISTS "${targetDbName}"`);

        // Create database
        console.log(`Creating database ${targetDbName}...`);
        const preferredTemplate = process.env.DB_CREATE_TEMPLATE || 'template1';
        try {
            if (preferredTemplate !== 'template1') {
                await client.query(`CREATE DATABASE "${targetDbName}" WITH TEMPLATE ${preferredTemplate}`);
            } else {
                // Default behavior uses template1
                await client.query(`CREATE DATABASE "${targetDbName}"`);
            }
        } catch (err: any) {
            // If template1 is busy, retry with template0
            if (err?.code === '55006' && preferredTemplate === 'template1') {
                console.log('template1 is busy; retrying with template0...');
                await client.query(`CREATE DATABASE "${targetDbName}" WITH TEMPLATE template0`);
            } else {
                throw err;
            }
        }

        console.log(`Database ${targetDbName} reset successfully.`);
        client.release();
    } catch (err) {
        console.error('Error resetting database:', err);
    } finally {
        await pool.end();
    }
};

resetDatabase();
