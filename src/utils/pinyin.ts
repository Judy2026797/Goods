import { pinyin } from 'pinyin-pro';

export function matchSearch(name: string, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const lowerName = name.toLowerCase();
  if (lowerName.includes(q)) return true;

  const fullPinyin = pinyin(name, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  if (fullPinyin.includes(q)) return true;

  const firstLetters = pinyin(name, { toneType: 'none', type: 'array' })
    .map(s => s[0])
    .join('')
    .toLowerCase();
  if (firstLetters.includes(q)) return true;

  return false;
}
