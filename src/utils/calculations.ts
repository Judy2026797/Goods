import { Item, ComputedItem, Settings, DEFAULT_SETTINGS } from '@/types';

function daysBetween(start: string, end: Date): number {
  const startDate = new Date(start);
  const ms = end.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function computeItem(item: Item, settings: Settings | undefined): ComputedItem {
  const s = settings || DEFAULT_SETTINGS;
  const now = new Date();

  const endDate = item.status === 'retired' && item.retiredDate
    ? new Date(item.retiredDate)
    : now;

  const holdingDays = daysBetween(item.purchaseDate, endDate);
  const totalCost = (item.purchasePrice || 0) + (item.additionalCost || 0);
  const dailyAvgCost = holdingDays > 0 ? totalCost / holdingDays : totalCost;
  const yearsUsed = holdingDays / 365;

  let warrantyStatus: ComputedItem['warrantyStatus'] = 'none';
  if (item.warrantyExpiry) {
    const expiry = new Date(item.warrantyExpiry);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      warrantyStatus = 'expired';
    } else if (diffDays <= s.warrantyCriticalDays) {
      warrantyStatus = 'critical';
    } else if (diffDays <= s.warrantyWarningDays) {
      warrantyStatus = 'warning';
    } else {
      warrantyStatus = 'ok';
    }
  }

  return {
    ...item,
    totalCost,
    holdingDays,
    dailyAvgCost,
    yearsUsed,
    warrantyStatus,
  };
}

export function computeItems(items: Item[], settings: Settings | undefined): ComputedItem[] {
  return items.map(item => computeItem(item, settings));
}

export interface Stats {
  totalCount: number;
  activeCount: number;
  idleCount: number;
  retiredCount: number;
  cnyTotalCost: number;
  hkdTotalCost: number;
  cnyDailyAvg: number;
  hkdDailyAvg: number;
  reimbursedCount: number;
  reimbursedCny: number;
  reimbursedHkd: number;
  categoryStats: { categoryId: string; count: number; totalCost: number; currency: 'CNY' | 'HKD' }[];
}

export function computeStats(items: ComputedItem[]): Stats {
  const active = items.filter(i => i.status === 'active');
  const idle = items.filter(i => i.status === 'idle');
  const retired = items.filter(i => i.status === 'retired');
  const nonRetired = [...active, ...idle];

  // Split: self-paid vs reimbursed
  const selfPaid = nonRetired.filter(i => !i.reimbursed);
  const reimbursed = nonRetired.filter(i => i.reimbursed);

  const cnyItems = selfPaid.filter(i => i.currency === 'CNY');
  const hkdItems = selfPaid.filter(i => i.currency === 'HKD');

  const cnyTotalCost = cnyItems.reduce((sum, i) => sum + i.totalCost * i.quantity, 0);
  const hkdTotalCost = hkdItems.reduce((sum, i) => sum + i.totalCost * i.quantity, 0);
  const cnyDailyAvg = cnyItems.reduce((sum, i) => sum + i.dailyAvgCost * i.quantity, 0);
  const hkdDailyAvg = hkdItems.reduce((sum, i) => sum + i.dailyAvgCost * i.quantity, 0);

  const reimbursedCny = reimbursed.filter(i => i.currency === 'CNY').reduce((sum, i) => sum + i.totalCost * i.quantity, 0);
  const reimbursedHkd = reimbursed.filter(i => i.currency === 'HKD').reduce((sum, i) => sum + i.totalCost * i.quantity, 0);

  // Category stats only for self-paid items
  const categoryMap = new Map<string, { count: number; totalCost: number; currency: 'CNY' | 'HKD' }>();
  selfPaid.forEach(i => {
    const existing = categoryMap.get(i.categoryId) || { count: 0, totalCost: 0, currency: i.currency };
    existing.count += i.quantity;
    existing.totalCost += i.totalCost * i.quantity;
    categoryMap.set(i.categoryId, existing);
  });

  return {
    totalCount: items.length,
    activeCount: active.length,
    idleCount: idle.length,
    retiredCount: retired.length,
    cnyTotalCost,
    hkdTotalCost,
    cnyDailyAvg,
    hkdDailyAvg,
    reimbursedCount: reimbursed.length,
    reimbursedCny,
    reimbursedHkd,
    categoryStats: Array.from(categoryMap.entries()).map(([categoryId, v]) => ({ categoryId, ...v })),
  };
}
