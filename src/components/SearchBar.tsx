import { Search, ChevronDown } from 'lucide-react'
import { Category, ItemStatus } from '@/types'

interface Props {
  search: string
  setSearch: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  statusFilter: ItemStatus | 'all'
  setStatusFilter: (v: ItemStatus | 'all') => void
  sortBy: string
  setSortBy: (v: string) => void
  categories: Category[]
}

export default function SearchBar({
  search, setSearch,
  categoryFilter, setCategoryFilter,
  statusFilter, setStatusFilter,
  sortBy, setSortBy,
  categories,
}: Props) {
  const selectClass = "appearance-none bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 cursor-pointer hover:border-gray-300 dark:hover:border-[#3a3a3a] transition-colors pr-8"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索物品名称或拼音首字母..."
          className="w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
        />
      </div>

      <div className="relative">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">全部分类</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>

      <div className="relative">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ItemStatus | 'all')}
          className={selectClass}
        >
          <option value="all">全部状态</option>
          <option value="active">在用</option>
          <option value="idle">闲置</option>
          <option value="retired">已退役</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>

      <div className="relative">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className={selectClass}
        >
          <option value="date-desc">购买日期 ↓</option>
          <option value="date-asc">购买日期 ↑</option>
          <option value="price-desc">价格 ↓</option>
          <option value="price-asc">价格 ↑</option>
          <option value="daily-desc">日均成本 ↓</option>
          <option value="name">名称</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>
    </div>
  )
}
