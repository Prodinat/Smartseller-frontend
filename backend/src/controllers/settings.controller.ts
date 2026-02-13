import { Request, Response } from 'express';
import { query, tx } from '../db';
import { SCHEMA_SQL, seedDefaults } from '../db/schema';
import { requireString } from '../utils/validation';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT key, value FROM settings');
        const settings: Record<string, any> = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    const settings = req.body; // Expect object like { "businessName": "Chicken Nation", "currency": "XAF" }

    try {
        await tx(async () => {
            for (const [key, value] of Object.entries(settings)) {
                await query(
                    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
                    [key, JSON.stringify(value)]
                );
            }
        });
        return res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
};

export const resetSystem = async (req: Request, res: Response) => {
    const password = requireString(req.body?.password, 'password');
    const expected = process.env.VENDOR_PASSWORD || 'admin123';

    if (password !== expected) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    try {
        await tx(async () => {
            // Wipe everything
            await query('DROP SCHEMA public CASCADE');
            await query('CREATE SCHEMA public');

            // Recreate schema
            await query(SCHEMA_SQL);

            // Seed minimal defaults
            await seedDefaults(query);
        });
        return res.json({ message: 'System reset successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to reset system' });
    }
};
