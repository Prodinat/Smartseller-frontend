import type { Request, Response } from 'express';
import { query, tx } from '../db';
import { HttpError, optionalString } from '../utils/validation';

const parseDate = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
};

export const getDashboardStats = async (_req: Request, res: Response) => {
    try {
        // Revenue (Delivered orders only)
        const revenueRes = await query(
            "SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status = 'delivered'"
        );

        // Total Orders (Delivered only)
        const ordersRes = await query(
            "SELECT COUNT(*) as total_orders FROM orders WHERE status = 'delivered'"
        );

        // Orders by Status
        const statusRes = await query(
            "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY status ASC"
        );

        // Low Stock Items
        const lowStockRes = await query(
            "SELECT * FROM products WHERE stock <= low_stock_threshold ORDER BY stock ASC"
        );

        // Sales & Profit Trend (Last 7 days)
        const salesTrendRes = await query(
            `SELECT 
                TO_CHAR(COALESCE(o.delivered_at, o.updated_at, o.created_at), 'YYYY-MM-DD') as date, 
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COALESCE(SUM((oi.price_at_time - oi.cost_at_time) * oi.quantity), 0) as profit
             FROM orders o
             JOIN order_items oi ON o.id = oi.order_id
             WHERE o.status = 'delivered' AND COALESCE(o.delivered_at, o.updated_at, o.created_at) >= NOW() - INTERVAL '7 days'
             GROUP BY date
             ORDER BY date ASC`
        );

        // Best Sellers (Top 5, includes combos)
        const bestSellersRes = await query(
            `SELECT oi.name_at_time as name, SUM(oi.quantity) as total_sold
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.status = 'delivered'
             GROUP BY oi.name_at_time
             ORDER BY total_sold DESC
             LIMIT 5`
        );

        // Debt & Credit Totals (unsettled)
        const debtRes = await query(
            "SELECT COUNT(*) as debt_count, COALESCE(SUM(amount_paid - total_amount), 0) as total_debt FROM orders WHERE status = 'debt'"
        );
        const creditRes = await query(
            "SELECT COUNT(*) as credit_count, COALESCE(SUM(total_amount - amount_paid), 0) as total_credit FROM orders WHERE status = 'credit'"
        );

        return res.json({
            revenue: Number(revenueRes.rows[0].total_revenue || 0),
            totalOrders: Number(ordersRes.rows[0].total_orders || 0),
            ordersByStatus: statusRes.rows,
            lowStockItems: lowStockRes.rows,
            salesTrend: salesTrendRes.rows,
            bestSellers: bestSellersRes.rows,
            debtCount: Number(debtRes.rows[0].debt_count || 0),
            creditCount: Number(creditRes.rows[0].credit_count || 0),
            totalDebt: Number(debtRes.rows[0].total_debt || 0),
            totalCredit: Number(creditRes.rows[0].total_credit || 0),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const getSalesReport = async (req: Request, res: Response) => {
    try {
        const from = parseDate(optionalString(req.query.from));
        const to = parseDate(optionalString(req.query.to));
        if ((req.query.from && !from) || (req.query.to && !to)) throw new HttpError(400, 'Invalid date range');

        const where: string[] = ["o.status = 'delivered'"];
        const params: any[] = [];
        if (from) {
            params.push(from.toISOString());
            where.push(`o.delivered_at >= $${params.length}`);
        }
        if (to) {
            params.push(to.toISOString());
            where.push(`o.delivered_at <= $${params.length}`);
        }

        const ordersRes = await query(
            `SELECT o.*
             FROM orders o
             WHERE ${where.join(' AND ')}
             ORDER BY COALESCE(o.delivered_at, o.updated_at, o.created_at) DESC`,
            params
        );
        const ids = ordersRes.rows.map((o: any) => Number(o.id));
        const itemsRes = ids.length
            ? await query(
                `SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY order_id DESC, id ASC`,
                [ids]
            )
            : { rows: [] as any[] };

        const itemsByOrder = new Map<number, any[]>();
        for (const row of itemsRes.rows) {
            const list = itemsByOrder.get(Number(row.order_id)) ?? [];
            list.push(row);
            itemsByOrder.set(Number(row.order_id), list);
        }

        // Summary
        const totalRevenue = ordersRes.rows.reduce((acc: number, o: any) => acc + Number(o.total_amount), 0);
        const totalOrders = ordersRes.rows.length;

        const bestSellersRes = await query(
            `SELECT oi.name_at_time as name, SUM(oi.quantity) as total_sold
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
              WHERE ${where.join(' AND ')}
              GROUP BY oi.name_at_time
              ORDER BY total_sold DESC
              LIMIT 20`,
            params
        );

        return res.json({
            summary: { totalRevenue, totalOrders },
            bestSellers: bestSellersRes.rows,
            orders: ordersRes.rows.map((o: any) => ({ ...o, items: itemsByOrder.get(Number(o.id)) ?? [] })),
        });
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const getActiveReportSession = async (_req: Request, res: Response) => {
    try {
        const result = await query(
            'SELECT * FROM report_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1'
        );
        return res.json(result.rows[0] ?? null);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const stopReportSession = async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `UPDATE report_sessions
             SET ended_at = CURRENT_TIMESTAMP
             WHERE id = (
                 SELECT id FROM report_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1
             )
             RETURNING *`
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'No active report session' });
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const startReportSession = async (_req: Request, res: Response) => {
    try {
        const created = await tx(async () => {
            await query(`UPDATE report_sessions SET ended_at = CURRENT_TIMESTAMP WHERE ended_at IS NULL`);
            const inserted = await query(`INSERT INTO report_sessions (started_at) VALUES (CURRENT_TIMESTAMP) RETURNING *`);
            return inserted.rows[0];
        });
        return res.json(created);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const getDailySessionReport = async (req: Request, res: Response) => {
    try {
        const sessionRaw = optionalString(req.query.session) ?? 'current';
        let sessionId: number | null = null;

        if (sessionRaw === 'current') {
            const active = await query('SELECT id, started_at, ended_at FROM report_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
            if (active.rows.length === 0) throw new HttpError(404, 'No active report session');
            sessionId = Number(active.rows[0].id);
        } else {
            const parsed = Number(sessionRaw);
            if (!Number.isFinite(parsed) || parsed <= 0) throw new HttpError(400, 'Invalid session id');
            sessionId = parsed;
        }

        const sessionRes = await query('SELECT * FROM report_sessions WHERE id = $1', [sessionId]);
        if (sessionRes.rows.length === 0) throw new HttpError(404, 'Report session not found');
        const session = sessionRes.rows[0];

        const dailyRes = await query(
            `WITH day_orders AS (
                 SELECT
                     TO_CHAR(delivered_at, 'YYYY-MM-DD') as date,
                     COUNT(*) as delivered_orders,
                     COALESCE(SUM(total_amount), 0) as revenue
                 FROM orders
                 WHERE status = 'delivered'
                   AND report_session_id = $1
                   AND delivered_at IS NOT NULL
                 GROUP BY date
             ),
             day_profit AS (
                 SELECT
                     TO_CHAR(o.delivered_at, 'YYYY-MM-DD') as date,
                     COALESCE(SUM((oi.price_at_time - oi.cost_at_time) * oi.quantity), 0) as profit
                 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 WHERE o.status = 'delivered'
                   AND o.report_session_id = $1
                   AND o.delivered_at IS NOT NULL
                 GROUP BY date
             )
             SELECT d.date,
                    d.delivered_orders,
                    d.revenue,
                    COALESCE(p.profit, 0) as profit
             FROM day_orders d
             LEFT JOIN day_profit p ON p.date = d.date
             ORDER BY d.date DESC`,
            [sessionId]
        );

        const totals = dailyRes.rows.reduce(
            (acc: any, r: any) => {
                acc.totalRevenue += Number(r.revenue || 0);
                acc.totalOrders += Number(r.delivered_orders || 0);
                acc.totalProfit += Number(r.profit || 0);
                return acc;
            },
            { totalRevenue: 0, totalOrders: 0, totalProfit: 0 }
        );

        return res.json({
            session,
            totals,
            days: dailyRes.rows.map((r: any) => ({
                date: r.date,
                delivered_orders: Number(r.delivered_orders || 0),
                revenue: Number(r.revenue || 0),
                profit: Number(r.profit || 0),
            })),
        });
    } catch (err) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
