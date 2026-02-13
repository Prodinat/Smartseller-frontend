import type { Request, Response } from 'express';
import { query, tx } from '../db';
import type { OrderStatus, PaymentType } from '../types';
import { HttpError, optionalNonNegativeNumber, optionalString, requireInt, requireOneOf } from '../utils/validation';

type OrderItemInput =
    | { item_type: 'product'; product_id: number; quantity: number }
    | { item_type: 'combo'; combo_id: number; quantity: number };

const ORDER_STATUSES = ['pending', 'delivered', 'debt', 'credit'] as const;
const PAYMENT_TYPES = ['cash', 'credit'] as const;

const isFulfilledStatus = (status: OrderStatus) => status === 'delivered' || status === 'debt' || status === 'credit';

const sumMoney = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

const round2 = (n: number) => Math.round(n * 100) / 100;

const getSettingNumber = async (key: string, fallback: number) => {
    try {
        const res = await query('SELECT value FROM settings WHERE key = $1', [key]);
        if (res.rows.length === 0) return fallback;
        const v = res.rows[0].value;
        const parsed = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : v;
        const num = typeof parsed === 'number' ? parsed : Number(parsed);
        return Number.isFinite(num) ? num : fallback;
    } catch {
        return fallback;
    }
};

const getOrCreateActiveSessionId = async () => {
    const existing = await query('SELECT id FROM report_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
    if (existing.rows.length > 0) return Number(existing.rows[0].id);
    const created = await query('INSERT INTO report_sessions (started_at) VALUES (CURRENT_TIMESTAMP) RETURNING id');
    return Number(created.rows[0].id);
};

const getComboIngredients = async (comboIds: number[]) => {
    if (comboIds.length === 0) return new Map<number, { product_id: number; quantity: number }[]>();
    const res = await query(
        `SELECT combo_id, product_id, quantity
         FROM combo_items
         WHERE combo_id = ANY($1::int[])`,
        [comboIds]
    );
    const map = new Map<number, { product_id: number; quantity: number }[]>();
    for (const row of res.rows) {
        const list = map.get(row.combo_id) ?? [];
        list.push({ product_id: Number(row.product_id), quantity: Number(row.quantity) });
        map.set(row.combo_id, list);
    }
    return map;
};

const lockProducts = async (productIds: number[]) => {
    if (productIds.length === 0) return new Map<number, any>();
    const res = await query(
        `SELECT id, name, price, cost_price, stock, low_stock_threshold
         FROM products
         WHERE id = ANY($1::int[])
         FOR UPDATE`,
        [productIds]
    );
    const map = new Map<number, any>();
    for (const row of res.rows) map.set(Number(row.id), row);
    return map;
};

const mergeRequirements = (reqs: Map<number, number>, productId: number, qty: number) => {
    reqs.set(productId, (reqs.get(productId) ?? 0) + qty);
};

const computeRequirementsFromItems = async (items: OrderItemInput[]) => {
    const reqs = new Map<number, number>();
    const comboIds = items.filter(i => i.item_type === 'combo').map(i => (i as any).combo_id as number);
    const ingredientsByCombo = await getComboIngredients(comboIds);

    for (const item of items) {
        if (item.item_type === 'product') {
            mergeRequirements(reqs, item.product_id, item.quantity);
            continue;
        }
        const ingredients = ingredientsByCombo.get(item.combo_id);
        if (!ingredients || ingredients.length === 0) throw new HttpError(400, `Combo ${item.combo_id} has no ingredients`);
        for (const ing of ingredients) {
            mergeRequirements(reqs, ing.product_id, ing.quantity * item.quantity);
        }
    }
    return { reqs, ingredientsByCombo };
};

export const createOrder = async (req: Request, res: Response) => {
    const customerName = optionalString(req.body?.customer_name) ?? 'Guest';
    const customerPhone = optionalString(req.body?.customer_phone);
    const paymentType = requireOneOf<PaymentType>(req.body?.payment_type, 'payment_type', PAYMENT_TYPES);
    const discount = optionalNonNegativeNumber(req.body?.discount) ?? 0;
    const includeDeliveryFee = Boolean(req.body?.include_delivery_fee);
    const debtAmount = optionalNonNegativeNumber(req.body?.debt_amount) ?? 0; // change owed to customer (cash only)
    const requestedStatus = req.body?.status ? requireOneOf<OrderStatus>(req.body?.status, 'status', ORDER_STATUSES) : null;

    const rawItems = req.body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'Order must include at least 1 item');

    const items: OrderItemInput[] = rawItems.map((row: any, idx: number) => {
        const itemType = requireOneOf<'product' | 'combo'>(row?.item_type, `items[${idx}].item_type`, ['product', 'combo']);
        const quantity = requireInt(row?.quantity, `items[${idx}].quantity`);
        if (quantity <= 0) throw new HttpError(400, `items[${idx}].quantity must be > 0`);
        if (itemType === 'product') {
            const productId = requireInt(row?.product_id, `items[${idx}].product_id`);
            return { item_type: 'product', product_id: productId, quantity };
        }
        const comboId = requireInt(row?.combo_id, `items[${idx}].combo_id`);
        return { item_type: 'combo', combo_id: comboId, quantity };
    });

    try {
        const created = await tx(async () => {
            const sessionId = await getOrCreateActiveSessionId();

            // Preload combos/products for pricing + stock requirements
            const productItemIds = Array.from(new Set(items.filter(i => i.item_type === 'product').map(i => (i as any).product_id as number)));
            const comboIds = Array.from(new Set(items.filter(i => i.item_type === 'combo').map(i => (i as any).combo_id as number)));

            const combosRes = comboIds.length
                ? await query(`SELECT id, name FROM combos WHERE id = ANY($1::int[])`, [comboIds])
                : { rows: [] as any[] };
            const combosById = new Map<number, any>();
            for (const c of combosRes.rows) combosById.set(Number(c.id), c);
            if (comboIds.length !== combosById.size) throw new HttpError(400, 'One or more combos not found');

            const { reqs, ingredientsByCombo } = await computeRequirementsFromItems(items);
            const allProductIds = Array.from(new Set([...productItemIds, ...Array.from(reqs.keys())]));
            const productsById = await lockProducts(allProductIds);
            if (allProductIds.length !== productsById.size) throw new HttpError(400, 'One or more products not found');

            // Stock availability (block order creation if insufficient)
            const insufficient: { product_id: number; name: string; required: number; in_stock: number }[] = [];
            for (const [pid, requiredQty] of reqs.entries()) {
                const p = productsById.get(pid);
                const inStock = Number(p.stock);
                if (inStock < requiredQty) insufficient.push({ product_id: pid, name: p.name, required: requiredQty, in_stock: inStock });
            }
            if (insufficient.length > 0) throw new HttpError(409, 'Insufficient stock', { insufficient });

            // Pricing
            const lines = items.map(item => {
                if (item.item_type === 'product') {
                    const p = productsById.get(item.product_id);
                    return {
                        item_type: 'product' as const,
                        product_id: item.product_id,
                        combo_id: null as number | null,
                        quantity: item.quantity,
                        name_at_time: p.name as string,
                        unit_price: Number(p.price),
                        unit_cost: Number(p.cost_price),
                    };
                }
                const combo = combosById.get(item.combo_id);
                const ingredients = ingredientsByCombo.get(item.combo_id)!;
                const unitCost = sumMoney(
                    ingredients.map(ing => {
                        const p = productsById.get(ing.product_id);
                        return Number(p.cost_price) * Number(ing.quantity);
                    })
                );
                // Auto-calculate combo price: sum ingredient product prices * qty (simple baseline)
                const unitPrice = sumMoney(
                    ingredients.map(ing => {
                        const p = productsById.get(ing.product_id);
                        return Number(p.price) * Number(ing.quantity);
                    })
                );
                return {
                    item_type: 'combo' as const,
                    product_id: null as number | null,
                    combo_id: item.combo_id,
                    quantity: item.quantity,
                    name_at_time: combo.name as string,
                    unit_price: unitPrice,
                    unit_cost: unitCost,
                };
            });

            const itemsSubtotal = round2(sumMoney(lines.map(l => l.unit_price * l.quantity)));
            // Discount cap: max 50% of items subtotal
            const maxDiscount = round2(itemsSubtotal * 0.5);
            if (discount > maxDiscount) throw new HttpError(400, 'Discount cannot exceed 50% of items subtotal', { maxDiscount });

            const configuredDeliveryFee = includeDeliveryFee ? await getSettingNumber('deliveryFee', 100) : 0;
            const deliveryFee = round2(Math.max(0, configuredDeliveryFee));

            const total = round2(Math.max(0, itemsSubtotal - discount + deliveryFee));

            // Determine status
            let status: OrderStatus;
            if (requestedStatus) status = requestedStatus;
            else if (paymentType === 'credit') status = 'credit';
            else if (debtAmount > 0) status = 'debt';
            else status = 'pending'; // cash orders start pending until handed over

            // Determine amount_paid based on scenario:
            // - cash pending: customer already paid (but not delivered) => amount_paid = total
            // - credit: customer pays later => amount_paid = 0
            // - debt: customer paid and vendor owes change => amount_paid = total + debtAmount
            if (paymentType === 'credit' && debtAmount > 0) throw new HttpError(400, 'Debt amount not allowed for credit orders');
            const amountPaid = status === 'credit' ? 0 : status === 'debt' ? round2(total + debtAmount) : total;

            const orderRes = await query(
                `INSERT INTO orders (customer_name, customer_phone, report_session_id, status, payment_type, subtotal, discount, delivery_fee, total_amount, amount_paid, delivered_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 RETURNING *`,
                [
                    customerName,
                    customerPhone,
                    sessionId,
                    status,
                    paymentType,
                    itemsSubtotal,
                    discount,
                    deliveryFee,
                    total,
                    amountPaid,
                    status === 'delivered' ? new Date().toISOString() : null,
                ]
            );
            const orderId = Number(orderRes.rows[0].id);

            for (const line of lines) {
                await query(
                    `INSERT INTO order_items (order_id, item_type, product_id, combo_id, quantity, name_at_time, price_at_time, cost_at_time)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [
                        orderId,
                        line.item_type,
                        line.product_id,
                        line.combo_id,
                        line.quantity,
                        line.name_at_time,
                        line.unit_price,
                        line.unit_cost,
                    ]
                );
            }

            // Reduce stock when goods are handed over:
            // - credit and debt: handed over immediately
            // - delivered: handed over immediately
            // - pending: handed over later
            if (status === 'credit' || status === 'debt' || status === 'delivered') {
                for (const [pid, requiredQty] of reqs.entries()) {
                    const result = await query(
                        `UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2 AND stock >= $1`,
                        [requiredQty, pid]
                    );
                    if (result.rowCount !== 1) throw new HttpError(409, 'Stock changed; please retry');
                }
            }

            return orderRes.rows[0];
        });

        return res.status(201).json({ ...created });
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Failed to create order' });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    const status = req.query.status ? requireOneOf<OrderStatus>(String(req.query.status), 'status', ORDER_STATUSES) : null;
    try {
        const result = status
            ? await query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status])
            : await query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        const orderRes = await query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [id]);
        return res.json({ ...orderRes.rows[0], items: itemsRes.rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    const newStatus = requireOneOf<OrderStatus>(req.body?.status, 'status', ORDER_STATUSES);

    try {
        const updated = await tx(async () => {
            const currentRes = await query('SELECT * FROM orders WHERE id = $1', [id]);
            if (currentRes.rows.length === 0) throw new HttpError(404, 'Order not found');
            const current = currentRes.rows[0] as any;
            const oldStatus = current.status as OrderStatus;

            const needsFulfill = !isFulfilledStatus(oldStatus) && isFulfilledStatus(newStatus);
            if (needsFulfill) {
                const itemsRes = await query('SELECT item_type, product_id, combo_id, quantity FROM order_items WHERE order_id = $1', [id]);
                const items = itemsRes.rows.map((r: any) => {
                    if (r.item_type === 'product') return { item_type: 'product' as const, product_id: Number(r.product_id), quantity: Number(r.quantity) };
                    return { item_type: 'combo' as const, combo_id: Number(r.combo_id), quantity: Number(r.quantity) };
                }) as OrderItemInput[];

                const { reqs } = await computeRequirementsFromItems(items);
                const allProductIds = Array.from(reqs.keys());
                const productsById = await lockProducts(allProductIds);
                const insufficient: any[] = [];
                for (const [pid, requiredQty] of reqs.entries()) {
                    const p = productsById.get(pid);
                    if (!p) throw new HttpError(400, 'One or more products not found');
                    if (Number(p.stock) < requiredQty) insufficient.push({ product_id: pid, name: p.name, required: requiredQty, in_stock: Number(p.stock) });
                }
                if (insufficient.length > 0) throw new HttpError(409, 'Insufficient stock to fulfill order', { insufficient });
                for (const [pid, requiredQty] of reqs.entries()) {
                    const result = await query(
                        `UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND stock >= $1`,
                        [requiredQty, pid]
                    );
                    if (result.rowCount !== 1) throw new HttpError(409, 'Stock changed; please retry');
                }
            }

            const isDelivered = newStatus === 'delivered';
            const sessionId = isDelivered ? await getOrCreateActiveSessionId() : null;
            const updateRes = await query(
                `UPDATE orders
                 SET status = $1::order_status,
                     report_session_id = CASE WHEN $4 THEN $3 ELSE report_session_id END,
                     delivered_at = CASE WHEN $4 THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE delivered_at END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [newStatus, id, sessionId, isDelivered]
            );

            return updateRes.rows[0];
        });

        return res.json(updated);
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        const message =
            process.env.NODE_ENV === 'production'
                ? 'Failed to update order'
                : (err as any)?.message || String(err) || 'Failed to update order';
        return res.status(500).json({ error: message });
    }
};

export const markDebtPaid = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        const sessionId = await getOrCreateActiveSessionId();
        const result = await query(
            `UPDATE orders SET status = 'delivered',
                               report_session_id = $2,
                               delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
                               updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'debt'
             RETURNING *`,
            [id, sessionId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Debt order not found' });
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to mark debt paid' });
    }
};

export const markCreditPaid = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        const sessionId = await getOrCreateActiveSessionId();
        const result = await query(
            `UPDATE orders
             SET status = 'delivered',
                 report_session_id = $2,
                 amount_paid = total_amount,
                 delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'credit'
             RETURNING *`,
            [id, sessionId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Credit order not found' });
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to mark credit paid' });
    }
};

export const deleteDeliveredOrder = async (req: Request, res: Response) => {
    const id = requireInt(req.params.id, 'id');
    try {
        await tx(async () => {
            const orderRes = await query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
            if (orderRes.rows.length === 0) throw new HttpError(404, 'Order not found');
            const order = orderRes.rows[0] as any;
            if (order.status !== 'delivered') throw new HttpError(409, 'Only delivered orders can be deleted');

            const itemsRes = await query('SELECT item_type, product_id, combo_id, quantity FROM order_items WHERE order_id = $1', [id]);
            const items = itemsRes.rows.map((r: any) => {
                if (r.item_type === 'product') return { item_type: 'product' as const, product_id: Number(r.product_id), quantity: Number(r.quantity) };
                return { item_type: 'combo' as const, combo_id: Number(r.combo_id), quantity: Number(r.quantity) };
            }) as any[];

            const { reqs } = await computeRequirementsFromItems(items);
            // Restore stock
            for (const [pid, qty] of reqs.entries()) {
                await query('UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [qty, pid]);
            }

            // Delete order (cascades to order_items)
            await query('DELETE FROM orders WHERE id = $1', [id]);
        });

        return res.json({ message: 'Delivered order deleted successfully' });
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete order' });
    }
};
