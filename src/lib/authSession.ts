type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

export function readStoredAuth(): {
  user: import('@/types').User;
  token: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return null;
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}
