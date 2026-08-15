const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    useApiKey?: boolean;
}

class ApiClient {
    private token: string | null = null;
    private apiKey: string | null = null;

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        if (typeof window !== 'undefined') {
            localStorage.setItem('apiKey', apiKey);
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    getApiKey(): string | null {
        if (this.apiKey) return this.apiKey;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('apiKey');
        }
        return null;
    }

    clearAuth() {
        this.token = null;
        this.apiKey = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('apiKey');
        }
    }

    async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const { method = 'GET', body, headers = {}, useApiKey = false } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (useApiKey) {
            const apiKey = this.getApiKey();
            if (apiKey) {
                requestHeaders['X-API-Key'] = apiKey;
            }
        } else {
            const token = this.getToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }
        }

        let response: Response;
        try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });
        } catch {
            throw new Error('Unable to reach the API. Please try again shortly.');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }

        return response.json();
    }

    // Auth endpoints
    async register(email: string, password: string) {
        return this.request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; apiKey: string; plan: string; planLimit: number; messagesSent: number } }>('/auth/register', {
            method: 'POST',
            body: { email, password },
        });
    }

    async login(email: string, password: string) {
        return this.request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; apiKey: string; plan: string; planLimit: number; messagesSent: number } }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
    }

    // Dashboard endpoints
    async getUsage() {
        return this.request<any>('/dashboard/usage');
    }

    async getProfile() {
        return this.request<any>('/dashboard/profile');
    }

    async regenerateApiKey() {
        return this.request<{ apiKey: string }>('/dashboard/regenerate-api-key', { method: 'POST' });
    }

    // Instance endpoints
    async getInstances() {
        return this.request<any[]>('/instances');
    }

    async createInstance(name: string) {
        return this.request<any>('/instances', {
            method: 'POST',
            body: { name },
        });
    }

    async connectInstance(id: string) {
        return this.request<any>(`/instances/${id}/connect`, { method: 'POST' });
    }

    async disconnectInstance(id: string) {
        return this.request<any>(`/instances/${id}/disconnect`, { method: 'POST' });
    }

    async deleteInstance(id: string) {
        return this.request<any>(`/instances/${id}`, { method: 'DELETE' });
    }

    async getInstanceStatus(id: string) {
        return this.request<any>(`/instances/${id}/status`);
    }

    // Message endpoints (using API key)
    async sendMessage(to: string, message: string, instanceId?: string, mediaType?: string, mediaUrl?: string, scheduledAt?: string) {
        return this.request<any>('/api/v1/send', {
            method: 'POST',
            body: { to, message, instanceId, mediaType, mediaUrl, scheduledAt },
            useApiKey: true,
        });
    }

    async getMessageStatus(id: string) {
        return this.request<any>(`/api/v1/status/${id}`, { useApiKey: true });
    }

    async getMessageHistory(limit?: number) {
        const query = limit ? `?limit=${limit}` : '';
        return this.request<any[]>(`/api/v1/messages${query}`, { useApiKey: true });
    }

    // Contact endpoints
    async getContacts() {
        return this.request<any[]>('/contacts');
    }

    async createContact(data: any) {
        return this.request<any>('/contacts', {
            method: 'POST',
            body: data,
        });
    }

    async updateContact(id: string, data: any) {
        return this.request<any>(`/contacts/${id}`, {
            method: 'PATCH',
            body: data,
        });
    }

    async deleteContact(id: string) {
        return this.request<any>(`/contacts/${id}`, { method: 'DELETE' });
    }

    // Template endpoints
    async getTemplates() {
        return this.request<any[]>('/templates');
    }

    async createTemplate(data: { name: string; content: string }) {
        return this.request<any>('/templates', {
            method: 'POST',
            body: data,
        });
    }

    async updateTemplate(id: string, data: { name?: string; content?: string }) {
        return this.request<any>(`/templates/${id}`, {
            method: 'PATCH',
            body: data,
        });
    }

    async deleteTemplate(id: string) {
        return this.request<any>(`/templates/${id}`, { method: 'DELETE' });
    }

    async previewTemplate(id: string, variables: Record<string, string>) {
        return this.request<any>(`/templates/${id}/preview`, {
            method: 'POST',
            body: variables,
        });
    }

    // Upload endpoint
    async uploadFile(file: File) {
        const token = this.getToken();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    }
}


export const api = new ApiClient();
