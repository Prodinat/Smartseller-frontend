const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('ssa_token');

const withAuth = (headers: Record<string, string> = {}) => {
    const token = getToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export const api = {
    _parseError: async (res: Response) => {
        try {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await res.json();
                const message = data?.error || data?.message || res.statusText;
                return { message, details: data?.details };
            }
            const text = await res.text();
            return { message: text || res.statusText, details: null };
        } catch {
            return { message: res.statusText, details: null };
        }
    },
    get: async (endpoint: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, { headers: withAuth() });
        if (res.status === 401) {
            localStorage.removeItem('ssa_token');
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await api._parseError(res);
            throw new Error(err.message);
        }
        return res.json();
    },
    post: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: withAuth({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        if (res.status === 401) {
            localStorage.removeItem('ssa_token');
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await api._parseError(res);
            throw new Error(err.message);
        }
        return res.json();
    },
    put: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: withAuth({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        if (res.status === 401) {
            localStorage.removeItem('ssa_token');
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await api._parseError(res);
            throw new Error(err.message);
        }
        return res.json();
    },
    patch: async (endpoint: string, data: any) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: withAuth({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        if (res.status === 401) {
            localStorage.removeItem('ssa_token');
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await api._parseError(res);
            throw new Error(err.message);
        }
        return res.json();
    },
    delete: async (endpoint: string) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: withAuth(),
        });
        if (res.status === 401) {
            localStorage.removeItem('ssa_token');
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        if (!res.ok) {
            const err = await api._parseError(res);
            throw new Error(err.message);
        }
        return res.json();
    },
};
