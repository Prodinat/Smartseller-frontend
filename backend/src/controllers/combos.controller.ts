import type { Request, Response } from 'express';
import { query, tx } from '../db';
import { HttpError, requireInt, requireString } from '../utils/validation';

type ComboItemInput = { product_id: number; quantity: number };

const computeAvailableUnits = (ingredients: { product_id: number; quantity: number; stock: number }[]) => {
    if (ingredients.length === 0) return 0;
    return Math.min(...ingredients.map(i => Math.floor(i.stock / i.quantity)));
};

export const getCombos = async (_req: Request, res: Response) => {
    try {
        const combosRes = await query('SELECT * FROM combos ORDER BY id ASC');
        const ids = combosRes.rows.map((r: any) => Number(r.id));
        const itemsRes = ids.length
            ? await query(
                `SELECT ci.combo_id, ci.product_id, ci.quantity, p.name as product_name, p.stock, p.price, p.cost_price
                 FROM combo_items ci
                 JOIN products p ON p.id = ci.product_id
                 WHERE ci.combo_id = ANY($1::int[])
                 ORDER BY ci.combo_id ASC`,
                [ids]
            )
            : { rows: [] as any[] };

        const itemsByCombo = new Map<number, any[]>();
        for (const row of itemsRes.rows) {
            const list = itemsByCombo.get(Number(row.combo_id)) ?? [];
            list.push(row);
            itemsByCombo.set(Number(row.combo_id), list);
        }

        const result = combosRes.rows.map((c: any) => {
            const items = itemsByCombo.get(Number(c.id)) ?? [];
            const available_units = computeAvailableUnits(items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity), stock: Number(i.stock) })));
            const unit_price = items.reduce((acc: number, i: any) => acc + Number(i.price) * Number(i.quantity), 0);
            const unit_cost = items.reduce((acc: number, i: any) => acc + Number(i.cost_price) * Number(i.quantity), 0);
            return { ...c, items, available_units, unit_price, unit_cost };
        });

        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const createCombo = async (req: Request, res: Response) => {
    const name = requireString(req.body?.name, 'name');
    const rawItems = req.body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'Combo must include at least 1 ingredient');

    const items: ComboItemInput[] = rawItems.map((row: any, idx: number) => {
        const productId = requireInt(row?.product_id, `items[${idx}].product_id`);
        const quantity = requireInt(row?.quantity, `items[${idx}].quantity`);
        if (quantity <= 0) throw new HttpError(400, `items[${idx}].quantity must be > 0`);
        return { product_id: productId, quantity };
    });

    // prevent duplicate ingredients
    const dupCheck = new Set<number>();
    for (const i of items) {
        if (dupCheck.has(i.product_id)) throw new HttpError(400, 'Duplicate ingredient in combo');
        dupCheck.add(i.product_id);
    }

    try {
        const created = await tx(async () => {
            // Block creation if ingredients insufficient for at least 1 combo
            const productIds = items.map(i => i.product_id);
            const productsRes = await query(
                `SELECT id, name, stock FROM products WHERE id = ANY($1::int[]) FOR UPDATE`,
                [productIds]
            );
            if (productsRes.rows.length !== productIds.length) throw new HttpError(400, 'One or more products not found');
            const byId = new Map<number, any>();
            for (const p of productsRes.rows) byId.set(Number(p.id), p);

            const insufficient = items
                .map(i => {
                    const p = byId.get(i.product_id);
                    return { product_id: i.product_id, name: p.name, required: i.quantity, in_stock: Number(p.stock) };
                })
                .filter(r => r.in_stock < r.required);
            if (insufficient.length > 0) throw new HttpError(409, 'Insufficient ingredients to create combo', { insufficient });

            const comboRes = await query('INSERT INTO combos (name) VALUES ($1) RETURNING *', [name]);
            const comboId = Number(comboRes.rows[0].id);

            for (const i of items) {
                await query('INSERT INTO combo_items (combo_id, product_id, quantity) VALUES ($1,$2,$3)', [comboId, i.product_id, i.quantity]);
            }

            return comboRes.rows[0];
        });

        return res.status(201).json(created);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Failed to create combo' });
    }
};

export const updateCombo = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    const name = req.body?.name ? requireString(req.body.name, 'name') : null;
    const rawItems = req.body?.items;

    const items: ComboItemInput[] | null = rawItems
        ? rawItems.map((row: any, idx: number) => {
            const productId = requireInt(row?.product_id, `items[${idx}].product_id`);
            const quantity = requireInt(row?.quantity, `items[${idx}].quantity`);
            if (quantity <= 0) throw new HttpError(400, `items[${idx}].quantity must be > 0`);
            return { product_id: productId, quantity };
        })
        : null;

    try {
        const updated = await tx(async () => {
            const exists = await query('SELECT id FROM combos WHERE id = $1', [id]);
            if (exists.rows.length === 0) throw new HttpError(404, 'Combo not found');

            if (name) {
                await query('UPDATE combos SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [name, id]);
            }

            if (items) {
                const productIds = items.map(i => i.product_id);
                const productsRes = await query(`SELECT id, name, stock FROM products WHERE id = ANY($1::int[]) FOR UPDATE`, [productIds]);
                if (productsRes.rows.length !== productIds.length) throw new HttpError(400, 'One or more products not found');
                const byId = new Map<number, any>();
                for (const p of productsRes.rows) byId.set(Number(p.id), p);

                const insufficient = items
                    .map(i => {
                        const p = byId.get(i.product_id);
                        return { product_id: i.product_id, name: p.name, required: i.quantity, in_stock: Number(p.stock) };
                    })
                    .filter(r => r.in_stock < r.required);
                if (insufficient.length > 0) throw new HttpError(409, 'Insufficient ingredients to update combo', { insufficient });

                await query('DELETE FROM combo_items WHERE combo_id = $1', [id]);
                for (const i of items) {
                    await query('INSERT INTO combo_items (combo_id, product_id, quantity) VALUES ($1,$2,$3)', [id, i.product_id, i.quantity]);
                }
            }

            const comboRes = await query('SELECT * FROM combos WHERE id = $1', [id]);
            return comboRes.rows[0];
        });

        return res.json(updated);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Failed to update combo' });
    }
};

export const deleteCombo = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        const result = await query('DELETE FROM combos WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Combo not found' });
        return res.json({ message: 'Combo deleted successfully' });
    } catch (err) {
        const code = (err as any)?.code;
        if (code === '23503') {
            return res.status(409).json({ error: 'Cannot delete this combo because it is used in orders.' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
