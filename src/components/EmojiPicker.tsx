import { useState } from 'react'
import { COMMON_EMOJIS } from '@/types'
import { ChevronDown } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function EmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center text-2xl hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-[#252525] transition-colors"
      >
        {value || '📦'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-72 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-100 dark:border-[#2a2a2a] p-3">
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji)
                    setOpen(false)
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-brand-50 dark:hover:bg-[#2a2a2a] transition-colors ${
                    value === emoji ? 'bg-brand-100 dark:bg-brand-900/30' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center gap-2">
              <input
                type="text"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="输入自定义 emoji"
                maxLength={4}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-[#2a2a2a] rounded-lg bg-white dark:bg-[#151515] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={() => {
                  if (custom.trim()) {
                    onChange(custom.trim())
                    setOpen(false)
                    setCustom('')
                  }
                }}
                className="px-3 py-1 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-[#2a2a2a] rounded-lg"
              >
                确定
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
