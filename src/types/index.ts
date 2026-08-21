export type Currency = 'CNY' | 'HKD';
export type ItemStatus = 'active' | 'idle' | 'retired';
export type ItemSource = 'purchased' | 'gifted' | 'other';
export type ClothingSeason = 'all' | 'spring' | 'summer' | 'autumn' | 'winter';

export const CLOTHING_SEASON_LABELS: Record<ClothingSeason, string> = {
  all: '不限',
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export interface Item {
  id?: number;
  name: string;
  emoji: string;
  categoryId: string;
  status: ItemStatus;
  source: ItemSource;
  quantity: number;
  purchasePrice: number;
  additionalCost: number;
  purchaseDate: string;
  currency: Currency;
  reimbursed?: boolean;
  warrantyExpiry?: string;
  retiredDate?: string;
  depreciationRate?: number;
  notes?: string;
  // 服装专属字段（仅服饰分类 clothing 使用）
  size?: string;
  color?: string;
  season?: ClothingSeason;
  brand?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: string;
  name: string;
  emoji: string;
  isPreset: boolean;
  sortOrder: number;
}

export interface Settings {
  id?: number;
  defaultDepreciationRate: number;
  hkdToCnyRate: number;
  warrantyWarningDays: number;
  warrantyCriticalDays: number;
  annualClothingBudget?: number;
}

export interface MovingItem {
  id?: number;
  name: string;
  emoji: string;
  categoryId: string;
  status: ItemStatus;
  source: ItemSource;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 衣橱模块：服饰作为独立表，不与通用物品(items)混合
export interface ClothingItem {
  id?: number;
  name: string;
  emoji: string;
  status: ItemStatus;
  source: ItemSource;
  quantity: number;
  purchasePrice: number;
  additionalCost: number;
  purchaseDate: string;
  currency: Currency;
  reimbursed?: boolean;
  notes?: string;
  size?: string;
  color?: string;
  season?: ClothingSeason;
  brand?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComputedItem extends Item {
  totalCost: number;
  holdingDays: number;
  dailyAvgCost: number;
  yearsUsed: number;
  warrantyStatus: 'ok' | 'warning' | 'critical' | 'expired' | 'none';
}

export const PRESET_CATEGORIES: Category[] = [
  { id: 'appliance', name: '家电', emoji: '📺', isPreset: true, sortOrder: 1 },
  { id: 'furniture', name: '家具', emoji: '🪑', isPreset: true, sortOrder: 2 },
  { id: 'kitchen', name: '厨具', emoji: '🍳', isPreset: true, sortOrder: 3 },
  { id: 'digital', name: '数码', emoji: '💻', isPreset: true, sortOrder: 4 },
  { id: 'daily', name: '日用品', emoji: '🧴', isPreset: true, sortOrder: 5 },
  { id: 'clothing', name: '服饰', emoji: '👚', isPreset: true, sortOrder: 6 },
  { id: 'sports', name: '运动', emoji: '⚽', isPreset: true, sortOrder: 7 },
  { id: 'other', name: '其他', emoji: '📦', isPreset: true, sortOrder: 8 },
];

export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  defaultDepreciationRate: 0.1,
  hkdToCnyRate: 0.92,
  warrantyWarningDays: 30,
  warrantyCriticalDays: 7,
  annualClothingBudget: 4500,
};

export const COMMON_EMOJIS = [
  '📺','🪑','🍳','💻','🧴','👕','🖼️','🍜','📦','📱','💡','🔌','🛏️','🚪','🪞','🧹',
  '☕','🍽️','🔪','🥄','🍲','🧊','🚿','🧻','🧼','🪥','🔑','🧯','🔥','❄️','🌡️','🕰️',
  '📷','🎧','⌨️','🖱️','🎮','📚','✏️','🖊️','📎','📐','🧮','💡','🔦','🔨','🛠️','🔩',
  '🪟','🛋️','🚪','🧳','🌂','🧣','🧤','👟','👜','🎒','🥾','🌂','👗','🧥','👖','🧦',
  '🌱','🪴','💐','🌻','🪻','🍃','🎍','🪷','🌷','🌹','🍀','🌴','🌵','🪵','🍂','🍁',
  '⚽','🏀','🏋️','🚲','🎯','♟️','🎸','🎹','🥁','🎤','🎬','🎨','🎭','🎲','🧩','♟️',
];
