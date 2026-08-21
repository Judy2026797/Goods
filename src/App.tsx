import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutGrid, Plus, Settings as SettingsIcon, Moon, Sun, Truck, Shirt } from 'lucide-react'
import HomePage from './pages/HomePage'
import AddItemPage from './pages/AddItemPage'
import EditItemPage from './pages/EditItemPage'
import DetailPage from './pages/DetailPage'
import SettingsPage from './pages/SettingsPage'
import MovingListPage from './pages/MovingListPage'
import WardrobePage from './pages/WardrobePage'

export default function App() {
  const location = useLocation()
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('guiwu-theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('guiwu-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-gray-900 dark:text-white font-semibold text-lg tracking-tight">
            归物
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === '/'
                  ? 'bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              物品
            </Link>
            <Link
              to="/add"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-brand-500 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-gray-100 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              添加
            </Link>
            <Link
              to="/moving"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === '/moving'
                  ? 'bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              搬家
            </Link>
            <Link
              to="/wardrobe"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === '/wardrobe'
                  ? 'bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Shirt className="w-4 h-4" />
              衣橱
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              title={dark ? '切换亮色' : '切换暗色'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Routes */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add" element={<AddItemPage />} />
          <Route path="/edit/:id" element={<EditItemPage />} />
          <Route path="/item/:id" element={<DetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/moving" element={<MovingListPage />} />
          <Route path="/wardrobe" element={<WardrobePage />} />
        </Routes>
      </main>
    </div>
  )
}
