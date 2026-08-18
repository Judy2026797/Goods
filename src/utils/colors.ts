const PRESET_COLORS: Record<string, string> = {
  appliance: '#4ba3e8',   // 家电 - 蓝
  furniture: '#9b8fd4',   // 家具 - 紫
  kitchen: '#f5a05f',     // 厨具 - 橙
  digital: '#5fc083',     // 数码 - 绿（归物本截图颜色）
  daily: '#6bc4c9',       // 日用品 - 青
  clothing: '#e88bb1',    // 服饰 - 粉
  sports: '#f97316',      // 运动 - 亮橙
  other: '#9ca3af',       // 其他 - 灰
};

const FALLBACK_PALETTE = [
  '#5fc083', '#f5a05f', '#4ba3e8', '#9b8fd4', '#6bc4c9',
  '#e88bb1', '#d4b86a', '#d4a373', '#7dd3fc', '#fca5a5',
];

export function getCategoryColor(categoryId: string): string {
  if (PRESET_COLORS[categoryId]) return PRESET_COLORS[categoryId];

  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}

export function getCategoryTextColor(categoryId: string): string {
  return '#ffffff';
}
