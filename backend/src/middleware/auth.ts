import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

type AuthPayload = {
    sub: 'vendor';
    exp: number; // unix seconds
};

const TOKEN_PREFIX = 'ssa_v1';

const getEnv = (key: string, fallback?: string) => {
    const value = process.env[key] ?? fallback;
    if (!value) throw new Error(`Missing required env var: ${key}`);
    return value;
};

const b64url = (input: Buffer | string) => {
    const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
    return buffer
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

const b64urlDecodeToString = (input: string) => {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const full = padded + '='.repeat(padLen);
    return Buffer.from(full, 'base64').toString('utf8');
};

export const signVendorToken = (ttlSeconds: number) => {
    const secret = getEnv('AUTH_SECRET', 'dev-secret-change-me');
    const payload: AuthPayload = {
        sub: 'vendor',
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const payloadB64 = b64url(JSON.stringify(payload));
    const toSign = `${TOKEN_PREFIX}.${payloadB64}`;
    const sig = crypto.createHmac('sha256', secret).update(toSign).digest();
    const sigB64 = b64url(sig);
    return `${TOKEN_PREFIX}.${payloadB64}.${sigB64}`;
};

const verifyToken = (token: string): AuthPayload | null => {
    const secret = getEnv('AUTH_SECRET', 'dev-secret-change-me');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [prefix, payloadB64, sigB64] = parts;
    if (prefix !== TOKEN_PREFIX) return null;
    const toSign = `${prefix}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(toSign).digest();
    let providedSig: Buffer;
    try {
        providedSig = Buffer.from(
            (sigB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (sigB64.length % 4)) % 4)),
            'base64'
        );
    } catch {
        return null;
    }
    if (providedSig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;
    const payloadJson = b64urlDecodeToString(payloadB64);
    const payload = JSON.parse(payloadJson) as AuthPayload;
    if (payload.sub !== 'vendor') return null;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
};

const getBearerToken = (req: Request) => {
    const header = req.header('authorization');
    if (!header) return null;
    const match = /^Bearer\s+(.+)\s*$/i.exec(header);
    return match ? match[1] : null;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const isDisabled = (process.env.AUTH_DISABLED || '').toLowerCase() === 'true';
        if (isDisabled) return next();

        const token = getBearerToken(req);
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = verifyToken(token);
        if (!payload) return res.status(401).json({ error: 'Unauthorized' });

        // Attach minimal identity
        (req as any).user = { role: 'vendor' };
        return next();
    } catch (err) {
        return res.status(500).json({ error: 'Auth error' });
    }
};
