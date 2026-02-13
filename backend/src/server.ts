import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
app.use(
    cors({
        origin: (origin, cb) => {
            // Allow non-browser clients or same-origin requests with no Origin header
            if (!origin) return cb(null, true);
            // If not configured, allow all (dev-friendly)
            if (corsOrigins.length === 0) return cb(null, true);
            if (corsOrigins.includes(origin)) return cb(null, true);
            return cb(null, false);
        },
        credentials: true,
    })
);
app.use(express.json());

// Routes
import productsRouter from './routes/products.routes';
import ordersRouter from './routes/orders.routes';
import reportsRouter from './routes/reports.routes';
import settingsRouter from './routes/settings.routes';
import combosRouter from './routes/combos.routes';
import marketRouter from './routes/market.routes';
import authRouter from './routes/auth.routes';

app.use('/api/auth', authRouter);

// Protected API (vendor-only)
app.use('/api', requireAuth);
app.use('/api/products', productsRouter);
app.use('/api/combos', combosRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/market', marketRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Smart Seller Assistant Backend is running!' });
});

// DB Test Route
app.get('/db-test', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ message: 'Database connection successful', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
