import dotenv from 'dotenv';
import { SCHEMA_SQL } from '../db/schema';
import { createPoolFromEnv } from '../db/pool';

dotenv.config();

const createTables = async () => {
    // Connect to the database defined in .env
    const appPool = createPoolFromEnv();

    const schemaQuery = SCHEMA_SQL;

    try {
        const client = await appPool.connect();
        console.log('Creating tables...');
        await client.query(schemaQuery);
        console.log('Tables created successfully.');
        client.release();
    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await appPool.end();
    }
};

const init = async () => {
    await createTables();
};

init();
