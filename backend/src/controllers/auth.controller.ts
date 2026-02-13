import type { Request, Response } from 'express';
import { signVendorToken } from '../middleware/auth';
import { requireString } from '../utils/validation';

export const login = async (req: Request, res: Response) => {
    const password = requireString(req.body?.password, 'password');

    const expected = process.env.VENDOR_PASSWORD || 'admin123';
    if (password !== expected) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ttlSeconds = 60 * 60 * 12; // 12h
    const token = signVendorToken(ttlSeconds);
    return res.json({ token, expiresIn: ttlSeconds });
};

