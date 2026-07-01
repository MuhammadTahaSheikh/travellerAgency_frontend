import { notifyUnauthorized } from '@/lib/authSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface RequestOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
  timeoutMs?: number;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = options.token ?? (options.skipAuth ? null : this.getToken());
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response: Response;
    const timeoutMs = options.timeoutMs ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw new Error(
        `Cannot connect to API at ${API_URL}. Make sure the backend is running (cd backend && npm run dev).`
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let data: { error?: string; message?: string; success?: boolean };
    try {
      data = await response.json();
    } catch {
      throw new Error(`Invalid response from server (${response.status})`);
    }

    if (!response.ok) {
      if (response.status === 401 && token && typeof window !== 'undefined') {
        const onLoginPage = window.location.pathname === '/login';
        if (!onLoginPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          notifyUnauthorized();
        }
      }
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data as T;
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Upload failed');
    return data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown, options: Omit<RequestOptions, 'body' | 'method'> = {}) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
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

  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  openHtmlInNewTab(html: string) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }
}

export const api = new ApiClient();
export default api;
