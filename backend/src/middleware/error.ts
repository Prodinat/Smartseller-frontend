import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/validation';

export const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
};

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, details: err.details });
    }
    // Avoid leaking internals, but log server-side
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
};

