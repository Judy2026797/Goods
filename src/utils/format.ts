import { Currency } from '@/types';

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'CNY' ? '¥' : 'HK$';
  const formatted = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

export function formatDays(days: number, mode: 'compact' | 'full' = 'full'): string {
  if (mode === 'compact') {
    return `${days}天`
  }
  if (days === 0) return '今天'
  if (days < 30) return `${days}天`
  if (days < 365) return `${Math.floor(days / 30)}月${days % 30 > 0 ? `${days % 30}天` : ''}`
  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  const months = Math.floor(remainingDays / 30)
  return `${years}年${months > 0 ? `${months}月` : ''}`
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
