import api from './api';
import { ApiResponse } from '@/types';

export async function uploadAttachment(file: File): Promise<string> {
  const res = await api.uploadFile<ApiResponse<{ attachmentPath: string }>>('/upload', file);
  return res.data?.attachmentPath || '';
}

export function attachmentUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api$/, '');
  return `${base}${path}`;
}
