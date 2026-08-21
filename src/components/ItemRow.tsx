import { Link } from 'react-router-dom'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import { ComputedItem } from '@/types'
import { formatCurrency, formatDays } from '@/utils/format'
import { getCategoryColor } from '@/utils/colors'

interface Props {
  item: ComputedItem
}

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

export default function ItemRow({ item }: Props) {
  const bgColor = getCategoryColor(item.categoryId)
  const isRetired = item.status === 'retired'

  const warrantyIcon =
    item.warrantyStatus === 'critical' ? <AlertCircle className="w-3.5 h-3.5 text-white/90" /> :
    item.warrantyStatus === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-white/90" /> :
    null

  return (
    <Link
      to={`/item/${item.id}`}
      className="block rounded-2xl p-4 text-white shadow-sm transition-transform active:scale-[0.99] hover:brightness-110"
      style={{ backgroundColor: bgColor, opacity: isRetired ? 0.55 : 1 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Emoji icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
            {item.emoji}
          </div>

          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-base font-semibold truncate ${isRetired ? 'line-through opacity-80' : ''}`}>
                {item.name}
              </span>
              {item.quantity > 1 && (
                <span className="text-xs text-white/80">×{item.quantity}</span>
              )}
              {warrantyIcon}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-white/90">
              <span className="px-1.5 py-0.5 rounded bg-white/20">
                {STATUS_LABELS[item.status]}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10">
                {SOURCE_LABELS[item.source || 'purchased']}
              </span>
              {item.reimbursed && (
                <span className="px-1.5 py-0.5 rounded bg-white/20 ring-1 ring-white/40">
                  报销
                </span>
              )}
              {item.categoryId === 'clothing' && (item.size || item.color) && (
                <span className="px-1.5 py-0.5 rounded bg-white/10">
                  {[item.size, item.color].filter(Boolean).join('·')}
                </span>
              )}
              <span className="tabular-nums">{formatCurrency(item.totalCost, item.currency)}</span>
              <span className="text-white/60">·</span>
              <span className="tabular-nums">{formatCurrency(item.dailyAvgCost, item.currency)}/天</span>
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold tabular-nums">
            {formatDays(item.holdingDays, 'compact').replace('天', '')}
          </div>
          <div className="text-xs text-white/80">天</div>
        </div>
      </div>
    </Link>
  )
}
