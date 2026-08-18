import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addCategory, deleteCategory, updateSettings, exportData, importData } from '@/db/database'
import { Category } from '@/types'
import { Download, Upload, Plus, Trash2, AlertTriangle } from 'lucide-react'

const inputClass = "w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [])

  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('📦')
  const [importError, setImportError] = useState('')

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    const maxOrder = categories?.reduce((max, c) => Math.max(max, c.sortOrder), 0) ?? 0
    await addCategory({
      name: newCatName.trim(),
      emoji: newCatEmoji || '📦',
      isPreset: false,
      sortOrder: maxOrder + 1,
    })
    setNewCatName('')
    setNewCatEmoji('📦')
  }

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await deleteCategory(cat.id!)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `home-inventory-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('文件格式不正确')
      }
      if (!confirm(`将导入 ${data.items.length} 件物品和 ${(data.categories || []).length} 个分类。当前数据将被覆盖。确认导入？`)) {
        return
      }
      await importData(data)
      setImportError('')
      alert('导入成功！')
    } catch (err) {
      setImportError(`导入失败：${(err as Error).message}`)
    }
    e.target.value = ''
  }

  if (!settings) return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">设置</h1>

      {/* Calculation settings */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-4">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">计算参数</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>默认年折旧率</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.defaultDepreciationRate}
                onChange={e => updateSettings({ defaultDepreciationRate: Number(e.target.value) })}
                className={inputClass}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                {(settings.defaultDepreciationRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>HKD → CNY 汇率</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.hkdToCnyRate}
              onChange={e => updateSettings({ hkdToCnyRate: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>过保提醒（天）</label>
            <input
              type="number"
              min="1"
              value={settings.warrantyWarningDays}
              onChange={e => updateSettings({ warrantyWarningDays: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>紧急提醒（天）</label>
            <input
              type="number"
              min="1"
              value={settings.warrantyCriticalDays}
              onChange={e => updateSettings({ warrantyCriticalDays: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Category management */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-3">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">分类管理</div>
        <div className="space-y-1">
          {categories?.map(cat => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222]"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                {cat.isPreset && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 dark:bg-[#2a2a2a] dark:text-gray-500 rounded">预设</span>
                )}
              </div>
              {!cat.isPreset && (
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1 rounded text-gray-300 hover:bg-red-50 hover:text-red-400 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-[#2a2a2a]">
          <input
            type="text"
            value={newCatEmoji}
            onChange={e => setNewCatEmoji(e.target.value)}
            maxLength={2}
            className="w-12 text-center text-lg bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-2 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="新分类名称"
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            className={inputClass}
          />
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-1 px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-[#222] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      {/* Data export / import */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm space-y-3">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">数据备份</div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出 JSON
          </button>
          <label className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            导入 JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>导入会覆盖当前所有数据，请先导出备份。数据仅存储在浏览器本地。</span>
        </div>
        {importError && (
          <div className="text-xs text-red-500 dark:text-red-400">{importError}</div>
        )}
      </div>
    </div>
  )
}
