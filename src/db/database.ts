import Dexie, { Table } from 'dexie';
import { Item, MovingItem, Category, Settings, PRESET_CATEGORIES, DEFAULT_SETTINGS } from '@/types';

class InventoryDB extends Dexie {
  items!: Table<Item, number>;
  movingItems!: Table<MovingItem, number>;
  categories!: Table<Category, string>;
  settings!: Table<Settings, number>;

  constructor() {
    super('HomeInventoryDBv2');
    this.version(1).stores({
      items: '++id, name, categoryId, status, purchaseDate, currency, warrantyExpiry',
      categories: 'id, name, sortOrder, isPreset',
      settings: 'id',
    });
    this.version(2).stores({
      items: '++id, name, categoryId, status, purchaseDate, currency, warrantyExpiry',
      movingItems: '++id, name, categoryId, status, source',
      categories: 'id, name, sortOrder, isPreset',
      settings: 'id',
    });
    this.version(3).stores({
      items: '++id, name, categoryId, status, purchaseDate, currency, warrantyExpiry, size, color, season, brand',
      movingItems: '++id, name, categoryId, status, source',
      categories: 'id, name, sortOrder, isPreset',
      settings: 'id',
    });
  }
}

export const db = new InventoryDB();

let initPromise: Promise<void> | null = null;

export async function initDB() {
  if (!initPromise) {
    initPromise = doInitDB();
  }
  return initPromise;
}

async function doInitDB() {
  await syncPresetCategories();
  await migrateItemSource();
  await migrateMovingItems();

  const setCount = await db.settings.count();
  if (setCount === 0) {
    await db.settings.add({ ...DEFAULT_SETTINGS, id: 1 } as Settings);
  }
}

async function migrateItemSource() {
  // 旧数据没有 source 字段，统一补为 purchased
  await db.items.filter(item => !item.source).modify({ source: 'purchased' });
}

async function migrateMovingItems() {
  // 把以前误存到 items 里的搬家物品迁移到独立的 movingItems 表
  // 判断标准：非购入来源，或购入但价格为 0（说明是从旧版搬家页快速添加的）
  const allItems = await db.items.toArray();
  const toMigrate = allItems.filter(item => {
    if (item.source === 'gifted' || item.source === 'other') return true;
    if (item.source === 'purchased' && item.purchasePrice === 0 && item.additionalCost === 0) return true;
    return false;
  });
  if (toMigrate.length === 0) return;

  await db.transaction('rw', db.items, db.movingItems, async () => {
    for (const item of toMigrate) {
      const { id, purchasePrice, additionalCost, purchaseDate, currency, warrantyExpiry, retiredDate, depreciationRate, createdAt, updatedAt, ...rest } = item;
      const now = new Date().toISOString();
      await db.movingItems.add({
        ...rest,
        notes: item.notes || undefined,
        createdAt: createdAt || now,
        updatedAt: now,
      } as MovingItem);
    }
    await db.items.bulkDelete(toMigrate.map(i => i.id!));
  });
}

async function syncPresetCategories() {
  const presetIds = new Set(PRESET_CATEGORIES.map(c => c.id!));

  await db.transaction('rw', db.categories, db.items, db.movingItems, async () => {
    const allCategories = await db.categories.toArray();
    const existingPreset = allCategories.filter(c => c.isPreset);

    // 1. 删除已废弃的预设分类，并把关联物品迁移到"其他"
    for (const cat of existingPreset) {
      if (!presetIds.has(cat.id!)) {
        const itemCount = await db.items.where('categoryId').equals(cat.id!).count();
        if (itemCount > 0) {
          await db.items.where('categoryId').equals(cat.id!).modify({ categoryId: 'other' });
        }
        const movingCount = await db.movingItems.where('categoryId').equals(cat.id!).count();
        if (movingCount > 0) {
          await db.movingItems.where('categoryId').equals(cat.id!).modify({ categoryId: 'other' });
        }
        await db.categories.delete(cat.id!);
      }
    }

    // 2. 用 bulkPut 同步所有预设分类（幂等，避免主键冲突）
    await db.categories.bulkPut(PRESET_CATEGORIES as Category[]);
  });
}

// Item CRUD
export async function addItem(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return db.items.add({ ...data, createdAt: now, updatedAt: now } as Item);
}

export async function updateItem(id: number, data: Partial<Item>) {
  return db.items.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteItem(id: number) {
  return db.items.delete(id);
}

// Moving Item CRUD
export async function addMovingItem(data: Omit<MovingItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return db.movingItems.add({ ...data, createdAt: now, updatedAt: now } as MovingItem);
}

export async function updateMovingItem(id: number, data: Partial<MovingItem>) {
  return db.movingItems.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteMovingItem(id: number) {
  return db.movingItems.delete(id);
}

// Category CRUD
export async function addCategory(data: Omit<Category, 'id'>) {
  return db.categories.add(data as Category);
}

export async function updateCategory(id: string, data: Partial<Category>) {
  return db.categories.update(id, data);
}

export async function deleteCategory(id: string) {
  const itemCount = await db.items.where('categoryId').equals(id).count();
  const movingCount = await db.movingItems.where('categoryId').equals(id).count();
  const total = itemCount + movingCount;
  if (total > 0) {
    throw new Error(`该分类下还有 ${total} 件物品，无法删除`);
  }
  return db.categories.delete(id);
}

// Settings
export async function updateSettings(data: Partial<Settings>) {
  return db.settings.update(1, data);
}

// Export / Import
export async function exportData() {
  const [items, movingItems, categories, settings] = await Promise.all([
    db.items.toArray(),
    db.movingItems.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ]);
  return { items, movingItems, categories, settings, exportDate: new Date().toISOString() };
}

export async function importData(data: { items: Item[]; movingItems?: MovingItem[]; categories: Category[] }) {
  await db.transaction('rw', db.items, db.movingItems, db.categories, async () => {
    await db.items.clear();
    await db.movingItems.clear();
    await db.categories.clear();
    if (data.categories?.length) await db.categories.bulkAdd(data.categories);
    if (data.items?.length) await db.items.bulkAdd(data.items);
    if (data.movingItems?.length) await db.movingItems.bulkAdd(data.movingItems);
  });
}
