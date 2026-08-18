import { Stats } from '@/utils/calculations'
import { Settings } from '@/types'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Package } from 'lucide-react'

interface Props {
  stats: Stats
  settings: Settings | undefined
}

export default function StatsBar({ stats, settings }: Props) {
  const hkdRate = settings?.hkdToCnyRate ?? 0.92
  const combinedCNY = stats.cnyTotalCost + stats.hkdTotalCost * hkdRate
  const combinedDailyAvg = stats.cnyDailyAvg + stats.hkdDailyAvg * hkdRate
  const reimbursedCNY = stats.reimbursedCny + stats.reimbursedHkd * hkdRate

  return (
    <div className="bg-gradient-to-br from-[#4ba3e8] to-[#2b8bd9] rounded-2xl p-5 text-white shadow-lg shadow-blue-900/20">
      <div className="flex items-center justify-between text-sm text-white/90 mb-4">
        <span>共 {formatNumber(stats.totalCount)} 件物品</span>
        <span>{stats.activeCount} 在用 · {stats.idleCount} 闲置</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-white/70 mb-1">总资产</div>
          <div className="text-2xl md:text-3xl font-bold tabular-nums">
            {formatCurrency(combinedCNY, 'CNY')}
          </div>
          {stats.hkdTotalCost > 0 && (
            <div className="text-[10px] text-white/60 mt-0.5">
              含 {formatCurrency(stats.hkdTotalCost, 'HKD')}
            </div>
          )}
        </div>
        <div className="text-center border-l border-white/20">
          <div className="text-xs text-white/70 mb-1">日均成本</div>
          <div className="text-2xl md:text-3xl font-bold tabular-nums">
            {formatCurrency(combinedDailyAvg, 'CNY')}
          </div>
          <div className="text-[10px] text-white/60 mt-0.5">/天</div>
        </div>
      </div>

      {stats.reimbursedCount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
          <span className="text-white/70">
            其中 {stats.reimbursedCount} 件公司报销
          </span>
          <span className="text-white/50 tabular-nums">
            报销额 {formatCurrency(reimbursedCNY, 'CNY')}（不计入总资产）
          </span>
        </div>
      )}
    </div>
  )
}
