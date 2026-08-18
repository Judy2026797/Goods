import { useParams, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import ItemForm from '@/components/ItemForm'

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  // null = still loading, undefined = not found, object = found
  const item = useLiveQuery(() => db.items.get(numericId), [numericId], null)

  if (item === null) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-20">加载中...</div>
  }
  if (!item) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">编辑物品</h1>
      <ItemForm item={item} editId={item.id} />
    </div>
  )
}
