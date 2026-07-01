function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
}

export function getPublicInvoiceUrl(shareToken: string): string {
  return `${apiOrigin()}/api/public/invoices/${shareToken}`;
}

export function getPublicVoucherUrl(shareToken: string): string {
  return `${apiOrigin()}/api/public/vouchers/${shareToken}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
}
