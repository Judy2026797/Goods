import ItemForm from '@/components/ItemForm'

export default function AddItemPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">添加物品</h1>
      <ItemForm />
    </div>
  )
}
