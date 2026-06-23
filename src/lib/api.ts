const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = options.token || this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(
        `Cannot connect to API at ${API_URL}. Make sure the backend is running (cd backend && npm run dev).`
      );
    }

    let data: { error?: string; message?: string; success?: boolean };
    try {
      data = await response.json();
    } catch {
      throw new Error(`Invalid response from server (${response.status})`);
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getHtml(endpoint: string): Promise<string> {
    const token = this.getToken();
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new Error('Cannot connect to API server. Is the backend running?');
    }
    if (!response.ok) throw new Error('Failed to load document');
    return response.text();
  }
}

export const api = new ApiClient();
export default api;
