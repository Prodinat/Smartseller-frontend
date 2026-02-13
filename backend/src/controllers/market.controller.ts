import type { Request, Response } from 'express';
import { query } from '../db';
import type { MarketPriority, MarketStatus } from '../types';
import { HttpError, optionalString, requireInt, requireOneOf, requireString } from '../utils/validation';

const PRIORITIES = ['low', 'medium', 'high'] as const;
const STATUSES = ['open', 'done'] as const;

export const getMarketItems = async (_req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM market_items ORDER BY created_at DESC');
        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const createMarketItem = async (req: Request, res: Response) => {
    const item = requireString(req.body?.item, 'item');
    const quantity = optionalString(req.body?.quantity) ?? '1';
    const priority = req.body?.priority
        ? requireOneOf<MarketPriority>(req.body.priority, 'priority', PRIORITIES)
        : ('medium' as MarketPriority);
    const notes = optionalString(req.body?.notes);
    const status = req.body?.status
        ? requireOneOf<MarketStatus>(req.body.status, 'status', STATUSES)
        : ('open' as MarketStatus);

    try {
        const result = await query(
            `INSERT INTO market_items (item, quantity, priority, notes, status)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING *`,
            [item, quantity, priority, notes, status]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const updateMarketItem = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    const item = req.body?.item ? requireString(req.body.item, 'item') : null;
    const quantity = req.body?.quantity ? requireString(req.body.quantity, 'quantity') : null;
    const priority = req.body?.priority ? requireOneOf<MarketPriority>(req.body.priority, 'priority', PRIORITIES) : null;
    const notes = req.body?.notes !== undefined ? optionalString(req.body.notes) : undefined;
    const status = req.body?.status ? requireOneOf<MarketStatus>(req.body.status, 'status', STATUSES) : null;

    try {
        const existing = await query('SELECT * FROM market_items WHERE id = $1', [id]);
        if (existing.rows.length === 0) throw new HttpError(404, 'Market item not found');
        const current = existing.rows[0];

        const result = await query(
            `UPDATE market_items
             SET item = $1,
                 quantity = $2,
                 priority = $3,
                 notes = $4,
                 status = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                item ?? current.item,
                quantity ?? current.quantity,
                priority ?? current.priority,
                notes === undefined ? current.notes : notes,
                status ?? current.status,
                id,
            ]
        );
        return res.json(result.rows[0]);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const deleteMarketItem = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        const result = await query('DELETE FROM market_items WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Market item not found' });
        return res.json({ message: 'Market item deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

