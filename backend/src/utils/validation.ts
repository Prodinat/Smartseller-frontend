export class HttpError extends Error {
    status: number;
    details?: any;

    constructor(status: number, message: string, details?: any) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export const asNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    return null;
};

export const requireString = (value: unknown, field: string) => {
    if (typeof value !== 'string' || value.trim() === '') throw new HttpError(400, `Missing or invalid ${field}`);
    return value.trim();
};

export const optionalString = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

export const requireInt = (value: unknown, field: string) => {
    const num = asNumber(value);
    if (num === null || !Number.isInteger(num)) throw new HttpError(400, `Missing or invalid ${field}`);
    return num;
};

export const requireNonNegativeNumber = (value: unknown, field: string) => {
    const num = asNumber(value);
    if (num === null || Number.isNaN(num) || num < 0) throw new HttpError(400, `Missing or invalid ${field}`);
    return num;
};

export const optionalNonNegativeNumber = (value: unknown) => {
    if (value === undefined || value === null) return null;
    const num = asNumber(value);
    if (num === null || Number.isNaN(num) || num < 0) return null;
    return num;
};

export const requireOneOf = <T extends string>(value: unknown, field: string, allowed: readonly T[]) => {
    if (typeof value !== 'string') throw new HttpError(400, `Missing or invalid ${field}`);
    const normalized = value.trim() as T;
    if (!allowed.includes(normalized)) throw new HttpError(400, `Missing or invalid ${field}`);
    return normalized;
};

