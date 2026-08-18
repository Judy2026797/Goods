import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { ItemStatus } from '@/types'
import { computeItems, computeStats, Stats } from '@/utils/calculations'
import { matchSearch } from '@/utils/pinyin'
import StatsBar from '@/components/StatsBar'
import CategoryChart from '@/components/CategoryChart'
import SearchBar from '@/components/SearchBar'
import ItemRow from '@/components/ItemRow'
import { Package } from 'lucide-react'

export default function HomePage() {
  const rawItems = useLiveQuery(() => db.items.toArray(), [])
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState('date-desc')

  const computed = useMemo(() => {
    if (!rawItems) return []
    return computeItems(rawItems, settings)
  }, [rawItems, settings])

  const filtered = useMemo(() => {
    let result = computed

    if (search.trim()) {
      result = result.filter(i => matchSearch(i.name, search))
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.categoryId === categoryFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter)
    }

    const sorted = [...result]
    switch (sortBy) {
      case 'date-desc': sorted.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)); break
      case 'date-asc': sorted.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)); break
      case 'price-desc': sorted.sort((a, b) => b.totalCost - a.totalCost); break
      case 'price-asc': sorted.sort((a, b) => a.totalCost - b.totalCost); break
      case 'daily-desc': sorted.sort((a, b) => b.dailyAvgCost - a.dailyAvgCost); break
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')); break
    }
    return sorted
  }, [computed, search, categoryFilter, statusFilter, sortBy])

  const stats: Stats = useMemo(() => computeStats(computed), [computed])

  if (!rawItems || !categories) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }

  if (rawItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1e1e1e] flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <div className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">还没有物品</div>
        <div className="text-sm text-gray-400 dark:text-gray-500 mb-6">点击右上角"添加"开始记录</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <StatsBar stats={stats} settings={settings} />

      {/* Chart */}
      {stats.categoryStats.length > 0 && (
        <CategoryChart stats={stats} categories={categories} items={computed} />
      )}

      {/* Search + filters */}
      <SearchBar
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        categories={categories}
      />

      {/* Item list */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
          没有匹配的物品
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <ItemRow key={item.id} item={item} />
          ))}
          <div className="text-center text-xs text-gray-400 dark:text-gray-600 py-1">
            共 {filtered.length} 件
          </div>
        </div>
      )}
    </div>
  )
}
