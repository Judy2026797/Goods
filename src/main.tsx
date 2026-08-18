import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { initDB } from './db/database'

function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initDB()
      .then(() => setReady(true))
      .catch(err => {
        console.error('DB init failed:', err)
        setError(err instanceof Error ? err.message : String(err))
      })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-red-100 dark:border-red-900/30 shadow-sm max-w-md w-full">
          <div className="text-red-500 dark:text-red-400 font-medium mb-2">初始化失败</div>
          <div className="text-sm text-gray-600 dark:text-gray-300 break-all">{error}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            可能是浏览器禁用了 IndexedDB，请关闭无痕模式或隐私模式后重试。
          </div>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm bg-gray-50 dark:bg-[#0a0a0a]">
        初始化中...
      </div>
    )
  }

  return (
    <HashRouter>
      <App />
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
