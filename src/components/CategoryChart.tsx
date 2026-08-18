import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Category, ComputedItem } from '@/types'
import { Stats } from '@/utils/calculations'
import { formatCurrency } from '@/utils/format'
import { getCategoryColor } from '@/utils/colors'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  stats: Stats
  categories: Category[]
  items: ComputedItem[]
}

const STATUS_LABELS: Record<string, string> = {
  active: '在用',
  idle: '闲置',
  retired: '已退役',
}

export default function CategoryChart({ stats, categories, items }: Props) {
  const [open, setOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const catMap = new Map(categories.map(c => [c.id!, c]))

  const data = stats.categoryStats
    .map(cs => {
      const cat = catMap.get(cs.categoryId)
      return {
        id: cs.categoryId,
        name: cat ? cat.name : '未分类',
        emoji: cat ? cat.emoji : '📦',
        count: cs.count,
        totalCost: cs.totalCost,
        currency: cs.currency,
        color: getCategoryColor(cs.categoryId),
      }
    })
    .sort((a, b) => b.totalCost - a.totalCost)

  const itemsByCategory = (categoryId: string) =>
    items
      .filter(i => i.categoryId === categoryId)
      .sort((a, b) => b.totalCost - a.totalCost)

  if (data.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">分类分布</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                contentStyle={{
                  background: '#1a1a1a',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  fontSize: '12px',
                  color: '#f5f5f5',
                }}
                formatter={(value: number, name: string, props: any) => {
                  const d = props.payload
                  if (name === 'count') return [`${value} 件`, '数量']
                  return [formatCurrency(value, d.currency), '金额']
                }}
              />
              <Bar dataKey="totalCost" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((d, index) => (
                  <Cell key={index} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {data.map(d => {
              const isExpanded = expandedCategory === d.id
              return (
                <div key={d.id} className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : d.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isExpanded
                        ? 'bg-white/10 dark:bg-white/10'
                        : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600 dark:text-gray-300">{d.emoji} {d.name}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{d.count}件</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatCurrency(d.totalCost, d.currency)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-gray-400 dark:text-gray-500 ml-auto" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 ml-auto" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pl-2 space-y-1.5">
                      {itemsByCategory(d.id).map(item => (
                        <Link
                          key={item.id}
                          to={`/item/${item.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#1a1a1a] dark:bg-[#1a1a1a] border border-[#2a2a2a] dark:border-[#2a2a2a] hover:border-[#3a3a3a] dark:hover:border-[#3a3a3a] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{item.emoji}</span>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-200 dark:text-gray-200 truncate">
                                {item.name}
                                {item.quantity > 1 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">×{item.quantity}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                                <span className="px-1 py-0.5 rounded bg-white/5 dark:bg-white/5 text-gray-400 dark:text-gray-400">
                                  {STATUS_LABELS[item.status]}
                                </span>
                                <span className="tabular-nums">{formatCurrency(item.totalCost, item.currency)}</span>
                                <span>·</span>
                                <span className="tabular-nums">{formatCurrency(item.dailyAvgCost, item.currency)}/天</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-600 -rotate-90 flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
