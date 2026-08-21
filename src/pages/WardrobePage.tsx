import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Shirt, AlertTriangle, Tag } from 'lucide-react'
import { db } from '@/db/database'
import { Item, CLOTHING_SEASON_LABELS } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

// 仅统计「服饰」分类、且非报销的物品（报销=公司承担，不计入个人衣物资产/花费）
function isClothing(item: Item): boolean {
  return item.categoryId === 'clothing' && !item.reimbursed
}

export default function WardrobePage() {
  const items = useLiveQuery(() => db.items.toArray(), [], null)
  const settings = useLiveQuery(() => db.settings.get(1), [], undefined)

  const hkdRate = settings?.hkdToCnyRate ?? 0.92

  // 单件衣物折算为人民币（含数量）
  const valueCNY = (it: Item) => {
    const tc = (it.purchasePrice || 0) + (it.additionalCost || 0)
    const cny = it.currency === 'HKD' ? tc * hkdRate : tc
    return cny * (it.quantity || 1)
  }

  const clothing = useMemo<Item[]>(() => {
    if (!items) return []
    return items.filter(isClothing)
  }, [items])

  const stats = useMemo(() => {
    const pieceCount = clothing.reduce((s, it) => s + (it.quantity || 1), 0)
    const styleCount = clothing.length
    const totalCNY = clothing.reduce((s, it) => s + valueCNY(it), 0)
    const hkdRaw = clothing
      .filter(it => it.currency === 'HKD')
      .reduce((s, it) => s + ((it.purchasePrice || 0) + (it.additionalCost || 0)) * (it.quantity || 1), 0)

    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const year = now.getFullYear()
    const monthSpend = clothing
      .filter(it => it.purchaseDate && it.purchaseDate.startsWith(ym))
      .reduce((s, it) => s + valueCNY(it), 0)
    const yearSpend = clothing
      .filter(it => it.purchaseDate && it.purchaseDate.startsWith(String(year)))
      .reduce((s, it) => s + valueCNY(it), 0)

    return { pieceCount, styleCount, totalCNY, hkdRaw, monthSpend, yearSpend }
  }, [clothing, hkdRate])

  // 近 12 个月花费趋势（CNY）
  const monthly = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; label: string; value: number; isCurrent: boolean }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.push({
        key,
        label: `${d.getMonth() + 1}月`,
        value: 0,
        isCurrent: i === 0,
      })
    }
    const map = new Map(buckets.map(b => [b.key, b]))
    clothing.forEach(it => {
      if (!it.purchaseDate) return
      const b = map.get(it.purchaseDate.slice(0, 7))
      if (b) b.value += valueCNY(it)
    })
    return buckets
  }, [clothing, hkdRate])

  // 按季节分布
  const bySeason = useMemo(() => {
    const order: (keyof typeof CLOTHING_SEASON_LABELS)[] = ['all', 'spring', 'summer', 'autumn', 'winter']
    const map = new Map<string, { count: number; value: number }>()
    clothing.forEach(it => {
      const key = it.season || 'all'
      const cur = map.get(key) || { count: 0, value: 0 }
      cur.count += it.quantity || 1
      cur.value += valueCNY(it)
      map.set(key, cur)
    })
    return order
      .map(s => ({ season: s, label: CLOTHING_SEASON_LABELS[s], ...(map.get(s) || { count: 0, value: 0 }) }))
      .filter(s => s.count > 0)
  }, [clothing, hkdRate])

  // 按品牌分布
  const byBrand = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    clothing.forEach(it => {
      const brand = (it.brand || '').trim()
      if (!brand) return
      const cur = map.get(brand) || { count: 0, value: 0 }
      cur.count += it.quantity || 1
      cur.value += valueCNY(it)
      map.set(brand, cur)
    })
    return Array.from(map.entries())
      .map(([brand, v]) => ({ brand, ...v }))
      .sort((a, b) => b.value - a.value)
  }, [clothing, hkdRate])

  // 疑似重复款式：同品牌 + 同颜色 + 同季节
  const dupGroups = useMemo(() => {
    const map = new Map<string, Item[]>()
    clothing.forEach(it => {
      const brand = (it.brand || '').trim()
      if (!brand) return
      const key = `${brand}|${(it.color || '').trim()}|${it.season || 'all'}`
      const arr = map.get(key) || []
      arr.push(it)
      map.set(key, arr)
    })
    return Array.from(map.values())
      .filter(g => g.length > 1)
      .map(g => ({
        brand: (g[0].brand || '').trim(),
        color: (g[0].color || '').trim(),
        season: g[0].season || 'all',
        items: g,
        count: g.reduce((s, it) => s + (it.quantity || 1), 0),
        value: g.reduce((s, it) => s + valueCNY(it), 0),
      }))
      .sort((a, b) => b.value - a.value)
  }, [clothing, hkdRate])

  const dupPieceCount = dupGroups.reduce((s, g) => s + g.count, 0)
  const dupValue = dupGroups.reduce((s, g) => s + g.value, 0)

  const sortedList = useMemo(
    () => [...clothing].sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || '')),
    [clothing],
  )

  if (items === null) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }

  if (clothing.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shirt className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-200">衣橱分析</span>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center mb-4">
            <Shirt className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <div className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">还没有服饰记录</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            去添加衣物，分类选「服饰 👕」即可开始统计
          </div>
          <Link
            to="/add"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-brand-500 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-gray-100 transition-colors shadow-sm"
          >
            添加衣物
          </Link>
        </div>
      </div>
    )
  }

  const maxMonth = Math.max(1, ...monthly.map(m => m.value))
  const maxSeason = Math.max(1, ...bySeason.map(s => s.value))
  const maxBrand = Math.max(1, ...byBrand.map(b => b.value))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#ec4899] to-[#be185d] rounded-2xl p-5 text-white shadow-lg shadow-pink-900/20">
        <div className="flex items-center gap-2 mb-1">
          <Shirt className="w-5 h-5" />
          <span className="font-semibold">衣橱分析</span>
          <span className="text-white/80 text-sm">共 {stats.pieceCount} 件 · {stats.styleCount} 种款式</span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalCNY, 'CNY')}</div>
        <div className="text-[11px] text-white/70 mt-0.5">
          衣物总价值{stats.hkdRaw > 0 ? `（含 ${formatCurrency(stats.hkdRaw, 'HKD')}）` : ''}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="衣物件数" value={`${stats.pieceCount}`} sub={`${stats.styleCount} 种款式`} />
        <KpiCard label="本月新购" value={formatCurrency(stats.monthSpend, 'CNY')} sub={`今年累计 ${formatCurrency(stats.yearSpend, 'CNY')}`} />
        <KpiCard
          label="疑似重复"
          value={`${dupGroups.length} 组`}
          sub={`${dupPieceCount} 件 · 占用 ${formatCurrency(dupValue, 'CNY')}`}
          warn={dupGroups.length > 0}
        />
        <KpiCard label="闲置衣物" value={`${clothing.filter(i => i.status === 'idle').length} 件`} sub="可清理/转卖" />
      </div>

      {/* 月度花费趋势 */}
      <Section title="近 12 个月花费" subtitle="看哪个月花超了">
        <div className="flex items-end justify-between gap-1 h-40 px-1">
          {monthly.map(m => (
            <div key={m.key} className="flex flex-col items-center flex-1 h-full justify-end group" title={`${m.label}：${formatCurrency(m.value, 'CNY')}`}>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                {m.value > 0 ? `¥${Math.round(m.value)}` : ''}
              </span>
              <div
                className={`w-full rounded-t ${m.isCurrent ? 'bg-pink-500 dark:bg-pink-400' : 'bg-pink-200 dark:bg-pink-900/50'} transition-all`}
                style={{ height: `${(m.value / maxMonth) * 100}%`, minHeight: m.value > 0 ? 4 : 0 }}
              />
              <span className={`text-[10px] mt-1 ${m.isCurrent ? 'text-pink-600 dark:text-pink-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 按季节分布 */}
      {bySeason.length > 0 && (
        <Section title="按季节分布" subtitle="衣橱结构是否失衡">
          <div className="space-y-2.5">
            {bySeason.map(s => (
              <div key={s.season} className="flex items-center gap-3">
                <div className="w-10 text-sm text-gray-600 dark:text-gray-300 shrink-0">{s.label}</div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-pink-500 dark:from-pink-500 dark:to-pink-600 rounded-lg"
                    style={{ width: `${(s.value / maxSeason) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                  {s.count}件 · {formatCurrency(s.value, 'CNY')}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 按品牌分布 */}
      {byBrand.length > 0 && (
        <Section title="按品牌分布" subtitle="钱主要花在哪些牌子">
          <div className="space-y-2.5">
            {byBrand.map(b => (
              <div key={b.brand} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600 dark:text-gray-300 shrink-0 truncate" title={b.brand}>
                  {b.brand}
                </div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 rounded-lg"
                    style={{ width: `${(b.value / maxBrand) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                  {b.count}件 · {formatCurrency(b.value, 'CNY')}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 疑似重复款式 */}
      {dupGroups.length > 0 && (
        <Section title="疑似重复款式" subtitle="同品牌 + 同颜色 + 同季节" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
          <div className="space-y-3">
            {dupGroups.map((g, idx) => (
              <div key={idx} className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {g.brand}
                    {g.color && <span className="text-gray-400 dark:text-gray-500"> · {g.color}</span>}
                    <span className="text-gray-400 dark:text-gray-500"> · {CLOTHING_SEASON_LABELS[g.season]}</span>
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 tabular-nums">
                    {g.count} 件 · {formatCurrency(g.value, 'CNY')}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map(it => (
                    <Link
                      key={it.id}
                      to={`/item/${it.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] text-xs text-gray-600 dark:text-gray-300 hover:border-pink-300 dark:hover:border-pink-700 transition-colors"
                    >
                      <span>{it.emoji}</span>
                      <span className="max-w-[120px] truncate">{it.name}</span>
                      <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                        {formatCurrency((it.purchasePrice || 0) + (it.additionalCost || 0), it.currency)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 全部衣物清单 */}
      <Section title="全部衣物" subtitle={`${clothing.length} 条记录 · 按购买时间倒序`}>
        <div className="space-y-1.5">
          {sortedList.map(it => (
            <Link
              key={it.id}
              to={`/item/${it.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] hover:border-pink-300 dark:hover:border-pink-700 transition-colors"
            >
              <span className="text-xl shrink-0">{it.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{it.name}</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                  {(it.brand || '—')}
                  {it.season && it.season !== 'all' && ` · ${CLOTHING_SEASON_LABELS[it.season]}`}
                  {it.size && ` · ${it.size}`}
                  {it.color && ` · ${it.color}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                  {formatCurrency((it.purchasePrice || 0) + (it.additionalCost || 0), it.currency)}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                  {formatDate(it.purchaseDate)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── small components ───
function KpiCard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {value}
      </div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">{sub}</div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-400 dark:text-gray-500">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}
