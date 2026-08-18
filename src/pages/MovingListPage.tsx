import { useState, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, addMovingItem } from '@/db/database'
import { ItemSource, Category, ItemStatus } from '@/types'
import { getCategoryColor } from '@/utils/colors'
import { Truck, Plus, Check, X } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  active: '在用',
  idle: '闲置',
  retired: '已退役',
}

const SOURCE_LABELS: Record<string, string> = {
  purchased: '购入',
  gifted: '赠送',
  other: '其他',
}

const SOURCE_OPTIONS: { value: ItemSource; label: string }[] = [
  { value: 'purchased', label: '购入' },
  { value: 'gifted', label: '赠送' },
  { value: 'other', label: '其他' },
]

// 搬家清单聚合视图：主物品(items) + 搬家专用物品(movingItems)
interface UnifiedItem {
  key: string
  id: number
  fromMain: boolean // true=主物品表, false=搬家专用表
  name: string
  emoji: string
  categoryId: string
  status: ItemStatus
  origin: ItemSource
  quantity: number
  reimbursed?: boolean
}

interface CategoryGroup {
  category: Category
  items: UnifiedItem[]
  count: number
}

export default function MovingListPage() {
  const mainItems = useLiveQuery(() => db.items.toArray(), [], null)
  const movingItems = useLiveQuery(() => db.movingItems.toArray(), [], null)
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<ItemSource | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // 合并两个表
  const allItems = useMemo<UnifiedItem[]>(() => {
    const main = (mainItems || []).map(i => ({
      key: `main-${i.id}`,
      id: i.id!,
      fromMain: true,
      name: i.name,
      emoji: i.emoji,
      categoryId: i.categoryId,
      status: i.status,
      origin: i.source || 'purchased',
      quantity: i.quantity || 1,
      reimbursed: i.reimbursed,
    }))
    const moving = (movingItems || []).map(i => ({
      key: `moving-${i.id}`,
      id: i.id!,
      fromMain: false,
      name: i.name,
      emoji: i.emoji,
      categoryId: i.categoryId,
      status: i.status,
      origin: i.source || 'purchased',
      quantity: i.quantity || 1,
    }))
    return [...main, ...moving]
  }, [mainItems, movingItems])

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return allItems
    return allItems.filter(i => i.origin === sourceFilter)
  }, [allItems, sourceFilter])

  const stats = useMemo(() => {
    const total = allItems.reduce((sum, i) => sum + i.quantity, 0)
    const purchased = allItems.filter(i => i.origin === 'purchased').reduce((s, i) => s + i.quantity, 0)
    const gifted = allItems.filter(i => i.origin === 'gifted').reduce((s, i) => s + i.quantity, 0)
    const other = allItems.filter(i => i.origin === 'other').reduce((s, i) => s + i.quantity, 0)
    return { total, purchased, gifted, other }
  }, [allItems])

  const groups: CategoryGroup[] = useMemo(() => {
    if (!categories) return []
    const catMap = new Map(categories.map(c => [c.id!, c]))
    const groupMap = new Map<string, CategoryGroup>()

    for (const item of filtered) {
      let group = groupMap.get(item.categoryId)
      if (!group) {
        const cat = catMap.get(item.categoryId) || { id: 'unknown', name: '未分类', emoji: '📦', isPreset: false, sortOrder: 99 }
        group = { category: cat, items: [], count: 0 }
        groupMap.set(item.categoryId, group)
      }
      group.items.push(item)
      group.count += item.quantity
    }

    return Array.from(groupMap.values()).sort((a, b) => b.count - a.count)
  }, [filtered, categories])

  const [addForm, setAddForm] = useState({
    name: '',
    emoji: '📦',
    categoryId: '',
    quantity: 1,
    source: 'gifted' as ItemSource,
  })
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.categoryId) return

    setSaving(true)
    try {
      await addMovingItem({
        name: addForm.name.trim(),
        emoji: addForm.emoji,
        categoryId: addForm.categoryId,
        status: 'active',
        source: addForm.source,
        quantity: Number(addForm.quantity) || 1,
      })
      setAddForm({ name: '', emoji: '📦', categoryId: addForm.categoryId, quantity: 1, source: 'gifted' })
      nameRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  if (mainItems === null || movingItems === null || categories === null) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }

  if (allItems.length === 0 && !showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">搬家清单</span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-brand-500 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-gray-100 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
        <InlineAddForm
          show={showAddForm}
          setShow={setShowAddForm}
          addForm={addForm}
          setAddForm={setAddForm}
          handleAdd={handleAdd}
          saving={saving}
          categories={categories}
          nameRef={nameRef}
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <div className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">搬家清单还是空的</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">点击「添加」记录手边的物品</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4ba3e8] to-[#2b8bd9] rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <span className="font-semibold">搬家清单</span>
            <span className="text-white/80 text-sm">共 {stats.total} 件</span>
          </div>
          <button
            onClick={() => { setShowAddForm(!showAddForm); if (!showAddForm) setTimeout(() => nameRef.current?.focus(), 100) }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm bg-white/20 hover:bg-white/30 transition-colors"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? '收起' : '添加'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3">
            <div className="text-xs text-white/80 mb-1">购入</div>
            <div className="text-xl font-bold tabular-nums">{stats.purchased}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <div className="text-xs text-white/80 mb-1">赠送</div>
            <div className="text-xl font-bold tabular-nums">{stats.gifted}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <div className="text-xs text-white/80 mb-1">其他</div>
            <div className="text-xl font-bold tabular-nums">{stats.other}</div>
          </div>
        </div>
      </div>

      {/* Inline add form */}
      <InlineAddForm
        show={showAddForm}
        setShow={setShowAddForm}
        addForm={addForm}
        setAddForm={setAddForm}
        handleAdd={handleAdd}
        saving={saving}
        categories={categories}
        nameRef={nameRef}
      />

      {/* Source filter */}
      <div className="flex flex-wrap gap-2">
        {([
          { value: 'all', label: '全部' },
          ...SOURCE_OPTIONS,
        ] as const).map(opt => (
          <button
            key={opt.value}
            onClick={() => setSourceFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sourceFilter === opt.value
                ? 'bg-brand-500 dark:bg-white text-white dark:text-gray-900'
                : 'bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-[#2a2a2a]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category sections */}
      <div className="space-y-5">
        {groups.map(group => {
          const color = getCategoryColor(group.category.id!)
          const isExpanded = expandedCategory === group.category.id
          return (
            <div key={group.category.id}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : group.category.id!)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isExpanded
                    ? 'text-white'
                    : 'bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-[#2a2a2a]'
                }`}
                style={isExpanded ? { backgroundColor: color } : undefined}
              >
                <span>{group.category.emoji}</span>
                <span className="font-medium">{group.category.name}</span>
                <span className="opacity-80">{group.count}件</span>
              </button>

              {isExpanded && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {group.items.map(item => (
                    item.fromMain ? (
                      <Link
                        key={item.key}
                        to={`/item/${item.id}`}
                        className="flex flex-col items-center justify-center rounded-xl p-3 text-center bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                      >
                        <span className="text-2xl mb-1.5">{item.emoji}</span>
                        <span className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2 break-words w-full">
                          {item.name}
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">×{item.quantity}</span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {STATUS_LABELS[item.status]} · {SOURCE_LABELS[item.origin]}
                          {item.reimbursed && ' · 报销'}
                        </span>
                      </Link>
                    ) : (
                      <div
                        key={item.key}
                        className="flex flex-col items-center justify-center rounded-xl p-3 text-center bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a]"
                      >
                        <span className="text-2xl mb-1.5">{item.emoji}</span>
                        <span className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2 break-words w-full">
                          {item.name}
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">×{item.quantity}</span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {STATUS_LABELS[item.status]} · {SOURCE_LABELS[item.origin]}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-center text-xs text-gray-400 dark:text-gray-600 py-1">
        {groups.length} 个分类 · {filtered.reduce((s, i) => s + i.quantity, 0)} 件物品
      </div>
    </div>
  )
}

// ─── Inline simplified add form ───
interface AddFormProps {
  show: boolean
  setShow: (v: boolean) => void
  addForm: { name: string; emoji: string; categoryId: string; quantity: number; source: ItemSource }
  setAddForm: React.Dispatch<React.SetStateAction<{ name: string; emoji: string; categoryId: string; quantity: number; source: ItemSource }>>
  handleAdd: (e: React.FormEvent) => void
  saving: boolean
  categories: Category[]
  nameRef: React.RefObject<HTMLInputElement>
}

function InlineAddForm({ show, setShow, addForm, setAddForm, handleAdd, saving, categories, nameRef }: AddFormProps) {
  if (!show) return null

  const set = <K extends keyof typeof addForm>(key: K, value: typeof addForm[K]) => {
    setAddForm(prev => ({ ...prev, [key]: value }))
  }

  const inputClass = "w-full bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <form
      onSubmit={handleAdd}
      className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-4 h-4 text-brand-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">快速添加</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={addForm.emoji}
          onChange={e => set('emoji', e.target.value)}
          className="w-12 text-center text-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          maxLength={2}
        />
        <input
          ref={nameRef}
          type="text"
          value={addForm.name}
          onChange={e => set('name', e.target.value)}
          placeholder="物品名称"
          required
          className={`${inputClass} flex-1`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>分类</label>
          <select
            value={addForm.categoryId}
            onChange={e => set('categoryId', e.target.value)}
            required
            className={inputClass}
          >
            <option value="">选择</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>数量</label>
          <input
            type="number"
            min="1"
            value={addForm.quantity}
            onChange={e => set('quantity', Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>来源</label>
          <select
            value={addForm.source}
            onChange={e => set('source', e.target.value as ItemSource)}
            className={inputClass}
          >
            {SOURCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !addForm.name.trim() || !addForm.categoryId}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? '保存中...' : '添加并继续'}
        </button>
        <button
          type="button"
          onClick={() => { setShow(false); setAddForm({ name: '', emoji: '📦', categoryId: '', quantity: 1, source: 'gifted' }) }}
          className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors"
        >
          完成
        </button>
      </div>
    </form>
  )
}
