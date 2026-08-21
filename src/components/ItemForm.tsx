import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addItem, updateItem } from '@/db/database'
import { Item, Currency, ItemStatus, ItemSource, ClothingSeason, CLOTHING_SEASON_LABELS } from '@/types'
import { todayISO } from '@/utils/format'
import EmojiPicker from './EmojiPicker'
import { ChevronDown, ChevronUp, Save, X } from 'lucide-react'

interface Props {
  item?: Item
  editId?: number
}

const inputClass = "w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

export default function ItemForm({ item, editId }: Props) {
  const navigate = useNavigate()
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])

  const [showAdvanced, setShowAdvanced] = useState(!!item?.notes || !!item?.warrantyExpiry || !!item?.depreciationRate)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: item?.name || '',
    emoji: item?.emoji || '📦',
    categoryId: item?.categoryId || '',
    status: item?.status || 'active' as ItemStatus,
    source: item?.source || 'purchased' as ItemSource,
    quantity: item?.quantity ?? 1,
    purchasePrice: item?.purchasePrice ?? 0,
    additionalCost: item?.additionalCost ?? 0,
    purchaseDate: item?.purchaseDate || todayISO(),
    currency: item?.currency || 'CNY' as Currency,
    reimbursed: item?.reimbursed ?? false,
    warrantyExpiry: item?.warrantyExpiry || '',
    retiredDate: item?.retiredDate || '',
    depreciationRate: item?.depreciationRate,
    notes: item?.notes || '',
    size: item?.size || '',
    color: item?.color || '',
    season: (item?.season || 'all') as ClothingSeason,
    brand: item?.brand || '',
  })

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const isClothing = form.categoryId === 'clothing'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (!form.categoryId && categories?.length) {
      set('categoryId', categories[0].id!)
      return
    }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        emoji: form.emoji,
        categoryId: form.categoryId || categories?.[0]?.id || '',
        status: form.status,
        source: form.source,
        quantity: Number(form.quantity) || 1,
        purchasePrice: Number(form.purchasePrice) || 0,
        additionalCost: Number(form.additionalCost) || 0,
        purchaseDate: form.purchaseDate,
        currency: form.currency,
        reimbursed: form.reimbursed,
        warrantyExpiry: form.warrantyExpiry || undefined,
        retiredDate: form.status === 'retired' ? (form.retiredDate || todayISO()) : undefined,
        depreciationRate: form.depreciationRate,
        notes: form.notes.trim() || undefined,
        size: isClothing ? (form.size.trim() || undefined) : undefined,
        color: isClothing ? (form.color.trim() || undefined) : undefined,
        season: isClothing ? (form.season === 'all' ? undefined : form.season) : undefined,
        brand: isClothing ? (form.brand.trim() || undefined) : undefined,
      }

      if (editId) {
        await updateItem(editId, data)
      } else {
        await addItem(data)
      }
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quick fields */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <EmojiPicker value={form.emoji} onChange={v => set('emoji', v)} />
          <div className="flex-1">
            <label className={labelClass}>物品名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="如：微波炉"
              required
              autoFocus
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>分类</label>
            <select
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              className={inputClass}
            >
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>数量</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => set('quantity', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>来源</label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value as ItemSource)}
              className={inputClass}
            >
              <option value="purchased">购入</option>
              <option value="gifted">赠送</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>购买价格</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice || ''}
                onChange={e => set('purchasePrice', Number(e.target.value))}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>附加费用</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.additionalCost || ''}
              onChange={e => set('additionalCost', Number(e.target.value))}
              placeholder="运费/安装费等"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>购买日期</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={e => set('purchaseDate', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>币种</label>
            <select
              value={form.currency}
              onChange={e => set('currency', e.target.value as Currency)}
              className={inputClass}
            >
              <option value="CNY">¥ 人民币 (CNY)</option>
              <option value="HKD">HK$ 港币 (HKD)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reimbursed"
            checked={form.reimbursed}
            onChange={e => set('reimbursed', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-[#444] text-brand-500 focus:ring-brand-400 bg-white dark:bg-[#1e1e1e]"
          />
          <label htmlFor="reimbursed" className="text-sm text-gray-600 dark:text-gray-300 select-none cursor-pointer">
            公司报销（不计入总资产，但计算日均成本）
          </label>
        </div>
      </div>

      {/* Clothing fields (only for 服饰 category) */}
      {isClothing && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">服装信息</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>尺码</label>
              <input
                type="text"
                value={form.size}
                onChange={e => set('size', e.target.value)}
                placeholder="如：L / 38码"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>颜色</label>
              <input
                type="text"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                placeholder="如：黑色"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>季节</label>
              <select
                value={form.season}
                onChange={e => set('season', e.target.value as ClothingSeason)}
                className={inputClass}
              >
                {(Object.keys(CLOTHING_SEASON_LABELS) as ClothingSeason[]).map(s => (
                  <option key={s} value={s}>{CLOTHING_SEASON_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>品牌</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                placeholder="如：优衣库"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        更多选项
      </button>

      {showAdvanced && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {!isClothing && (
              <div>
                <label className={labelClass}>过保日期</label>
                <input
                  type="date"
                  value={form.warrantyExpiry || ''}
                  onChange={e => set('warrantyExpiry', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>状态</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as ItemStatus)}
                className={inputClass}
              >
                <option value="active">在用</option>
                <option value="idle">闲置</option>
                <option value="retired">已退役</option>
              </select>
            </div>
          </div>

          {form.status === 'retired' && (
            <div>
              <label className={labelClass}>退役日期</label>
              <input
                type="date"
                value={form.retiredDate || ''}
                onChange={e => set('retiredDate', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {!isClothing && (
            <div>
              <label className={labelClass}>
                年折旧率 (默认 {(settings?.defaultDepreciationRate ?? 0.1) * 100}%)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.depreciationRate ?? ''}
                onChange={e => set('depreciationRate', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.1 = 10%"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>备注</label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="任意备注信息"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : editId ? '更新' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          取消
        </button>
      </div>
    </form>
  )
}
