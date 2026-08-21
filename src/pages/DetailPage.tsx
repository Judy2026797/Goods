import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteItem } from '@/db/database'
import { CLOTHING_SEASON_LABELS } from '@/types'
import { computeItem } from '@/utils/calculations'
import { formatCurrency, formatDays, formatDate, formatNumber } from '@/utils/format'
import { Pencil, Trash2, ArrowLeft, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = { active: '在用', idle: '闲置', retired: '已退役' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  idle: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  retired: 'bg-gray-100 text-gray-400 dark:bg-[#2a2a2a] dark:text-gray-500',
}

function DetailRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] last:border-0">
      <span className="text-sm text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
        {value}
      </span>
    </div>
  )
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericId = id ? Number(id) : NaN

  // null = still loading, undefined = not found, object = found
  const item = useLiveQuery(() => db.items.get(numericId), [numericId], null)
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])

  if (item === null || !categories) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }
  if (!item) {
    return <Navigate to="/" replace />
  }

  const computed = computeItem(item, settings)
  const category = categories.find(c => c.id === item.categoryId)
  const warrantyText =
    computed.warrantyStatus === 'expired' ? '已过保' :
    computed.warrantyStatus === 'critical' ? `${formatDate(item.warrantyExpiry)} · 即将过保` :
    computed.warrantyStatus === 'warning' ? `${formatDate(item.warrantyExpiry)} · 即将过保` :
    computed.warrantyStatus === 'ok' ? `${formatDate(item.warrantyExpiry)}` : '无'

  const handleDelete = async () => {
    if (confirm(`确认删除「${item.name}」吗？此操作不可撤销。`)) {
      await deleteItem(numericId)
      navigate('/')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-50 dark:bg-[#2a2a2a] flex items-center justify-center text-3xl border border-gray-100 dark:border-[#333]">
            {item.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${item.status === 'retired' ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>
              {item.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {category && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{category.emoji} {category.name}</span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
              {item.reimbursed && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  公司报销
                </span>
              )}
              {item.quantity > 1 && (
                <span className="text-sm text-gray-400 dark:text-gray-500">×{item.quantity}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to={`/edit/${item.id}`}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:text-gray-500 dark:hover:bg-[#2a2a2a] dark:hover:text-brand-400 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Warranty alert */}
      {(computed.warrantyStatus === 'critical' || computed.warrantyStatus === 'warning' || computed.warrantyStatus === 'expired') && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
          computed.warrantyStatus === 'expired' || computed.warrantyStatus === 'critical'
            ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
            : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30'
        }`}>
          {computed.warrantyStatus === 'expired'
            ? <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />}
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {computed.warrantyStatus === 'expired' ? '已过保' : '即将过保'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              过保日期：{formatDate(item.warrantyExpiry)}
            </div>
          </div>
        </div>
      )}

      {/* Clothing info */}
      {item.categoryId === 'clothing' && (item.size || item.color || item.season || item.brand) && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">服装信息</div>
          {item.size && <DetailRow label="尺码" value={item.size} />}
          {item.color && <DetailRow label="颜色" value={item.color} />}
          {item.season && <DetailRow label="季节" value={CLOTHING_SEASON_LABELS[item.season]} />}
          {item.brand && <DetailRow label="品牌" value={item.brand} />}
        </div>
      )}

      {/* Purchase info */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">购买信息</div>
        <DetailRow label="购买价格" value={formatCurrency(item.purchasePrice, item.currency)} />
        <DetailRow label="附加费用" value={formatCurrency(item.additionalCost, item.currency)} />
        <DetailRow label="购买日期" value={formatDate(item.purchaseDate)} />
        <DetailRow label="币种" value={item.currency === 'CNY' ? '¥ 人民币' : 'HK$ 港币'} />
        <DetailRow label="总成本" value={formatCurrency(computed.totalCost, item.currency)} highlight />
      </div>

      {/* Computed values */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">成本分析</div>
        <DetailRow label="持有天数" value={`${formatDays(computed.holdingDays)} (${formatNumber(computed.holdingDays)}天)`} />
        <DetailRow label="日均成本" value={`${formatCurrency(computed.dailyAvgCost, item.currency)}/天`} highlight />
        <DetailRow label="已用年限" value={`${computed.yearsUsed.toFixed(1)} 年`} />
        <DetailRow
          label="折旧率"
          value={`${((item.depreciationRate ?? settings?.defaultDepreciationRate ?? 0.1) * 100).toFixed(0)}% /年`}
        />
        {item.reimbursed && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-[#2a2a2a]">
            <div className="flex items-center gap-2 text-xs text-blue-500 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>此物品为公司报销，不计入总资产统计</span>
            </div>
          </div>
        )}
      </div>

      {/* Warranty */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">保修信息</div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-gray-400 dark:text-gray-500">过保日期</span>
          <div className="flex items-center gap-2">
            {computed.warrantyStatus === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />}
            <span className={`text-sm ${
              computed.warrantyStatus === 'expired' ? 'text-red-500 dark:text-red-400' :
              computed.warrantyStatus === 'critical' ? 'text-red-500 dark:text-red-400 font-medium' :
              computed.warrantyStatus === 'warning' ? 'text-amber-500 dark:text-amber-400 font-medium' :
              'text-gray-700 dark:text-gray-300'
            }`}>
              {warrantyText}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">备注</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.notes}</div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-300 dark:text-gray-600 text-center pb-4">
        创建于 {formatDate(item.createdAt)} · 更新于 {formatDate(item.updatedAt)}
      </div>
    </div>
  )
}
