import { Request, Response } from 'express';
import { query } from '../db';
import { Product } from '../types';
import { HttpError, optionalNonNegativeNumber, requireNonNegativeNumber, requireString } from '../utils/validation';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    const name = requireString(req.body?.name, 'name');
    const price = requireNonNegativeNumber(req.body?.price, 'price');
    const costPrice = optionalNonNegativeNumber(req.body?.cost_price) ?? 0;
    const stock = requireNonNegativeNumber(req.body?.stock, 'stock');
    const lowStock = optionalNonNegativeNumber(req.body?.low_stock_threshold) ?? 5;
    try {
        const result = await query(
            'INSERT INTO products (name, price, cost_price, stock, low_stock_threshold) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, price, costPrice, stock, lowStock]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        // Common: missing migration for new columns
        const code = (err as any)?.code;
        if (code === '42703') {
            return res.status(500).json({ error: 'Database schema out of date. Run backend migration.' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const current = existing.rows[0];

        const name = req.body?.name !== undefined ? requireString(req.body.name, 'name') : current.name;
        const price = req.body?.price !== undefined ? requireNonNegativeNumber(req.body.price, 'price') : Number(current.price);
        const costPrice = req.body?.cost_price !== undefined ? requireNonNegativeNumber(req.body.cost_price, 'cost_price') : Number(current.cost_price);
        const stock = req.body?.stock !== undefined ? requireNonNegativeNumber(req.body.stock, 'stock') : Number(current.stock);
        const lowStock = req.body?.low_stock_threshold !== undefined ? requireNonNegativeNumber(req.body.low_stock_threshold, 'low_stock_threshold') : Number(current.low_stock_threshold);

        const result = await query(
            'UPDATE products SET name = $1, price = $2, cost_price = $3, stock = $4, low_stock_threshold = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, price, costPrice, stock, lowStock, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        const code = (err as any)?.code;
        // Foreign key violation (product referenced by combos/orders)
        if (code === '23503') {
            return res.status(409).json({ error: 'Cannot delete this product because it is used in combos or orders.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
