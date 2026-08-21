import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shirt, AlertTriangle, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { db, addClothingItem, updateClothingItem, deleteClothingItem } from '@/db/database'
import { ClothingItem, ClothingSeason, CLOTHING_SEASON_LABELS, Currency, ItemStatus, ItemSource } from '@/types'
import { formatCurrency, formatDate, todayISO } from '@/utils/format'
import EmojiPicker from '@/components/EmojiPicker'

interface ClothingForm {
  name: string
  emoji: string
  brand: string
  season: ClothingSeason
  size: string
  color: string
  quantity: number
  purchasePrice: number
  additionalCost: number
  purchaseDate: string
  currency: Currency
  status: ItemStatus
  source: ItemSource
  notes: string
}

function initialForm(): ClothingForm {
  return {
    name: '',
    emoji: '👚',
    brand: '',
    season: 'all',
    size: '',
    color: '',
    quantity: 1,
    purchasePrice: 0,
    additionalCost: 0,
    purchaseDate: todayISO(),
    currency: 'CNY',
    status: 'active',
    source: 'purchased',
    notes: '',
  }
}

const inputClass = "w-full bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

export default function WardrobePage() {
  const clothing = useLiveQuery(() => db.clothingItems.toArray(), [], null)
  const settings = useLiveQuery(() => db.settings.get(1), [], undefined)

  const hkdRate = settings?.hkdToCnyRate ?? 0.92

  // 正常需求线（年目标，默认 4500，可在页面内修改并自动保存）
  const budget = settings?.annualClothingBudget ?? 4500
  const [budgetInput, setBudgetInput] = useState<number>(budget)
  useEffect(() => { setBudgetInput(settings?.annualClothingBudget ?? 4500) }, [settings])
  const saveBudget = async (v: number) => {
    const val = Math.max(0, Math.round(Number(v) || 0))
    setBudgetInput(val)
    await db.settings.update(1, { annualClothingBudget: val })
  }
  const curYear = new Date().getFullYear()

  // 年度状态：绿=正常够用 / 灰=明显低于正常需求(该补点) / 红=超支浪费
  type YearStatus = 'green' | 'gray' | 'red'
  const statusOf = (spend: number, target: number): YearStatus => {
    if (target <= 0) return 'green'
    const r = spend / target
    if (r > 1.5) return 'red'
    if (r < 0.6) return 'gray'
    return 'green'
  }
  const barColorOf = (s: YearStatus) =>
    s === 'red' ? 'from-red-400 to-red-500 dark:from-red-500 dark:to-red-600'
    : s === 'gray' ? 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
    : 'from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600'
  const statusTextOf = (s: YearStatus) =>
    s === 'red' ? '超支·注意' : s === 'gray' ? '低于正常·该补点' : '正常够用'

  // 单件衣物折算为人民币（含数量）
  const valueCNY = (it: ClothingItem) => {
    const tc = (it.purchasePrice || 0) + (it.additionalCost || 0)
    const cny = it.currency === 'HKD' ? tc * hkdRate : tc
    return cny * (it.quantity || 1)
  }

  const list = useMemo<ClothingItem[]>(() => (clothing || []), [clothing])

  const stats = useMemo(() => {
    const pieceCount = list.reduce((s, it) => s + (it.quantity || 1), 0)
    const styleCount = list.length
    const totalCNY = list.reduce((s, it) => s + valueCNY(it), 0)
    const hkdRaw = list
      .filter(it => it.currency === 'HKD')
      .reduce((s, it) => s + ((it.purchasePrice || 0) + (it.additionalCost || 0)) * (it.quantity || 1), 0)
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const year = now.getFullYear()
    const monthSpend = list.filter(it => it.purchaseDate && it.purchaseDate.startsWith(ym)).reduce((s, it) => s + valueCNY(it), 0)
    const yearSpend = list.filter(it => it.purchaseDate && it.purchaseDate.startsWith(String(year))).reduce((s, it) => s + valueCNY(it), 0)
    return { pieceCount, styleCount, totalCNY, hkdRaw, monthSpend, yearSpend }
  }, [list, hkdRate])

  // 近 12 个月花费趋势（CNY）
  const monthly = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; label: string; value: number; isCurrent: boolean }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.push({ key, label: `${d.getMonth() + 1}月`, value: 0, isCurrent: i === 0 })
    }
    const map = new Map(buckets.map(b => [b.key, b]))
    list.forEach(it => {
      if (!it.purchaseDate) return
      const b = map.get(it.purchaseDate.slice(0, 7))
      if (b) b.value += valueCNY(it)
    })
    return buckets
  }, [list, hkdRate])

  // 按年份支出分布（当年按已过月份折算目标）
  const byYear = useMemo(() => {
    const n = new Date()
    const cy = n.getFullYear()
    const em = n.getMonth() + 1
    const map = new Map<number, { count: number; value: number }>()
    list.forEach(it => {
      if (!it.purchaseDate) return
      const year = new Date(it.purchaseDate).getFullYear()
      if (Number.isNaN(year)) return
      const cur = map.get(year) || { count: 0, value: 0 }
      cur.count += it.quantity || 1
      cur.value += valueCNY(it)
      map.set(year, cur)
    })
    return Array.from(map.entries())
      .map(([year, v]) => ({ year, ...v, target: year === cy ? budget * (em / 12) : budget }))
      .sort((a, b) => b.year - a.year)
  }, [list, hkdRate, budget])

  // 按品牌分布
  const byBrand = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    list.forEach(it => {
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
  }, [list, hkdRate])

  // 疑似重复款式：同品牌 + 同颜色 + 同季节 + 同尺码
  const dupGroups = useMemo(() => {
    const map = new Map<string, ClothingItem[]>()
    list.forEach(it => {
      const brand = (it.brand || '').trim()
      if (!brand) return
      const key = `${brand}|${(it.color || '').trim()}|${it.season || 'all'}|${(it.size || '').trim()}`
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
  }, [list, hkdRate])

  const dupPieceCount = dupGroups.reduce((s, g) => s + g.count, 0)
  const dupValue = dupGroups.reduce((s, g) => s + g.value, 0)
  const idleCount = list.filter(i => i.status === 'idle').length

  const sortedList = useMemo(
    () => [...list].sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || '')),
    [list],
  )

  // ─── 内联增/改表单 ───
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ClothingForm>(initialForm())
  const set = <K extends keyof ClothingForm>(key: K, value: ClothingForm[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const openAdd = () => {
    setForm(initialForm())
    setEditingId(null)
    setShowForm(true)
  }
  const openEdit = (it: ClothingItem) => {
    setForm({
      name: it.name,
      emoji: it.emoji || '👚',
      brand: it.brand || '',
      season: it.season || 'all',
      size: it.size || '',
      color: it.color || '',
      quantity: it.quantity ?? 1,
      purchasePrice: it.purchasePrice || 0,
      additionalCost: it.additionalCost || 0,
      purchaseDate: it.purchaseDate || todayISO(),
      currency: it.currency || 'CNY',
      status: it.status || 'active',
      source: it.source || 'purchased',
      notes: it.notes || '',
    })
    setEditingId(it.id ?? null)
    setShowForm(true)
  }
  const handleDelete = async (id?: number) => {
    if (id == null) return
    await deleteClothingItem(id)
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        emoji: form.emoji || '👚',
        brand: form.brand.trim() || undefined,
        season: form.season === 'all' ? undefined : form.season,
        size: form.size.trim() || undefined,
        color: form.color.trim() || undefined,
        quantity: Number(form.quantity) || 1,
        purchasePrice: Number(form.purchasePrice) || 0,
        additionalCost: Number(form.additionalCost) || 0,
        purchaseDate: form.purchaseDate,
        currency: form.currency,
        status: form.status,
        source: form.source,
        notes: form.notes.trim() || undefined,
      }
      if (editingId != null) {
        await updateClothingItem(editingId, data)
      } else {
        await addClothingItem(data)
      }
      setForm(initialForm())
      setEditingId(null)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  if (clothing === null) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }

  const maxMonth = Math.max(1, ...monthly.map(m => m.value))
  const maxBrand = Math.max(1, ...byBrand.map(b => b.value))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0e8be7] to-[#006fc5] rounded-2xl p-5 text-white shadow-lg shadow-blue-900/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5" />
            <span className="font-semibold">衣橱分析</span>
            <span className="text-white/80 text-sm">共 {stats.pieceCount} 件 · {stats.styleCount} 种款式</span>
          </div>
          <button
            onClick={() => (showForm ? setShowForm(false) : openAdd())}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm bg-white/20 hover:bg-white/30 transition-colors"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? '收起' : '添加'}
          </button>
        </div>
        <div className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalCNY, 'CNY')}</div>
        <div className="text-[11px] text-white/70 mt-0.5">
          衣物总价值{stats.hkdRaw > 0 ? `（含 ${formatCurrency(stats.hkdRaw, 'HKD')}）` : ''}
        </div>
      </div>

      {/* Inline add/edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <EmojiPicker value={form.emoji} onChange={v => set('emoji', v)} />
            <div className="flex-1">
              <label className={labelClass}>衣物名称 *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如：羽绒服" required autoFocus className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>品牌</label>
              <input type="text" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="如：优衣库" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>季节</label>
              <select value={form.season} onChange={e => set('season', e.target.value as ClothingSeason)} className={inputClass}>
                {(Object.keys(CLOTHING_SEASON_LABELS) as ClothingSeason[]).map(s => (
                  <option key={s} value={s}>{CLOTHING_SEASON_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>尺码</label>
              <input type="text" value={form.size} onChange={e => set('size', e.target.value)} placeholder="如：L / 38码" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>颜色</label>
              <input type="text" value={form.color} onChange={e => set('color', e.target.value)} placeholder="如：黑色" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>数量</label>
              <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>币种</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value as Currency)} className={inputClass}>
                <option value="CNY">¥ 人民币</option>
                <option value="HKD">HK$ 港币</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>购买价格</label>
              <input type="number" min="0" step="0.01" value={form.purchasePrice || ''} onChange={e => set('purchasePrice', Number(e.target.value))} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>附加费用</label>
              <input type="number" min="0" step="0.01" value={form.additionalCost || ''} onChange={e => set('additionalCost', Number(e.target.value))} placeholder="运费等" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>购买日期</label>
              <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>状态</label>
              <select value={form.status} onChange={e => set('status', e.target.value as ItemStatus)} className={inputClass}>
                <option value="active">在用</option>
                <option value="idle">闲置</option>
                <option value="retired">已退役</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>来源</label>
              <select value={form.source} onChange={e => set('source', e.target.value as ItemSource)} className={inputClass}>
                <option value="purchased">购入</option>
                <option value="gifted">赠送</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>备注</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="任意备注" className={`${inputClass} resize-none`} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {saving ? '保存中...' : editingId != null ? '更新' : '保存'}
            </button>
            {editingId != null && (
              <button type="button" onClick={() => handleDelete(editingId)} className="flex items-center gap-1.5 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> 删除
              </button>
            )}
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(initialForm()) }} className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors">
              <X className="w-4 h-4" /> 取消
            </button>
          </div>
        </form>
      )}

      {list.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center mb-4">
            <Shirt className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <div className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">衣橱还是空的</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mb-4">点右上角「添加」开始记录你的衣物</div>
        </div>
      )}

      {list.length > 0 && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="衣物件数" value={`${stats.pieceCount}`} sub={`${stats.styleCount} 种款式`} />
            <KpiCard label="本月新购" value={formatCurrency(stats.monthSpend, 'CNY')} sub={`今年累计 ${formatCurrency(stats.yearSpend, 'CNY')}`} />
            <KpiCard label="疑似重复" value={`${dupGroups.length} 组`} sub={`${dupPieceCount} 件 · 占用 ${formatCurrency(dupValue, 'CNY')}`} warn={dupGroups.length > 0} />
            <KpiCard label="闲置衣物" value={`${idleCount} 件`} sub="可清理/转卖" />
          </div>

          {/* 月度花费趋势 */}
          <Section title="近 12 个月花费" subtitle="看哪个月花超了">
            <div className="flex items-end justify-between gap-1 h-40 px-1">
              {monthly.map(m => (
                <div key={m.key} className="flex flex-col items-center flex-1 h-full justify-end group" title={`${m.label}：${formatCurrency(m.value, 'CNY')}`}>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.value > 0 ? `¥${Math.round(m.value)}` : ''}
                  </span>
                  <div className={`w-full rounded-t ${m.isCurrent ? 'bg-blue-500 dark:bg-blue-400' : 'bg-blue-200 dark:bg-blue-900/50'} transition-all`} style={{ height: `${(m.value / maxMonth) * 100}%`, minHeight: m.value > 0 ? 4 : 0 }} />
                  <span className={`text-[10px] mt-1 ${m.isCurrent ? 'text-blue-600 dark:text-blue-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>{m.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 按年份支出 + 正常需求线 */}
          {byYear.length > 0 && (
            <Section title="按年份支出" subtitle="对照「正常需求线」看是否够用">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <label className="text-xs text-gray-500 dark:text-gray-400">正常需求线（年）</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">¥</span>
                  <input
                    type="number" min="0" step="100"
                    value={budgetInput}
                    onChange={e => setBudgetInput(Number(e.target.value) || 0)}
                    onBlur={e => saveBudget(Number(e.target.value))}
                    className="w-28 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-6 pr-2 py-1 text-sm text-gray-700 dark:text-gray-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">改完自动保存 · 当年按已过月份折算目标</span>
              </div>
              <div className="space-y-4">
                {byYear.map(y => {
                  const st = statusOf(y.value, y.target)
                  const ratio = y.target > 0 ? Math.min(y.value / y.target, 1) : 0
                  const isCur = y.year === curYear
                  const colorCls = st === 'red' ? 'text-red-500 dark:text-red-400' : st === 'gray' ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-300'
                  return (
                    <div key={y.year}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm text-gray-600 dark:text-gray-300 tabular-nums">
                          {y.year}年{isCur && <span className="text-[11px] text-gray-400 dark:text-gray-500"> · 今年(按已过月份折算)</span>}
                        </div>
                        <div className="text-xs tabular-nums">
                          <span className={colorCls}>{formatCurrency(y.value, 'CNY')}</span>
                          <span className="text-gray-400 dark:text-gray-500"> / 目标 {formatCurrency(y.target, 'CNY')}</span>
                          <span className={`ml-2 ${colorCls}`}>· {statusTextOf(st)}</span>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${barColorOf(st)} rounded-lg transition-all`} style={{ width: `${ratio * 100}%`, minHeight: y.value > 0 ? 4 : 0 }} />
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums">{y.count} 件</div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* 按品牌分布 */}
          {byBrand.length > 0 && (
            <Section title="按品牌分布" subtitle="钱主要花在哪些牌子">
              <div className="space-y-2.5">
                {byBrand.map(b => (
                  <div key={b.brand} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600 dark:text-gray-300 shrink-0 truncate" title={b.brand}>{b.brand}</div>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-[#1e1e1e] rounded-lg overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 rounded-lg" style={{ width: `${(b.value / maxBrand) * 100}%` }} />
                    </div>
                    <div className="w-28 text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">{b.count}件 · {formatCurrency(b.value, 'CNY')}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 疑似重复款式 */}
          {dupGroups.length > 0 && (
            <Section title="疑似重复款式" subtitle="同品牌 + 同颜色 + 同季节 + 同尺码" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
              <div className="space-y-3">
                {dupGroups.map((g, idx) => (
                  <div key={idx} className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {g.brand}
                        {g.color && <span className="text-gray-400 dark:text-gray-500"> · {g.color}</span>}
                        <span className="text-gray-400 dark:text-gray-500"> · {CLOTHING_SEASON_LABELS[g.season]}</span>
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 tabular-nums">{g.count} 件 · {formatCurrency(g.value, 'CNY')}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map(it => (
                        <button
                          key={it.id}
                          onClick={() => openEdit(it)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] text-xs text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                          <span>{it.emoji}</span>
                          <span className="max-w-[120px] truncate">{it.name}</span>
                          <span className="text-gray-400 dark:text-gray-500 tabular-nums">{formatCurrency((it.purchasePrice || 0) + (it.additionalCost || 0), it.currency)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 全部衣物清单 */}
          <Section title="全部衣物" subtitle={`${list.length} 条记录 · 按购买时间倒序`}>
            <div className="space-y-1.5">
              {sortedList.map(it => (
                <div key={it.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a]">
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
                  <div className="text-right shrink-0 mr-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrency((it.purchasePrice || 0) + (it.additionalCost || 0), it.currency)}</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{formatDate(it.purchaseDate)}</div>
                  </div>
                  <button onClick={() => openEdit(it)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" title="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(it.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

// ─── small components ───
function KpiCard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>{value}</div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">{sub}</div>
    </div>
  )
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
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
