import { getCategories } from '@/lib/actions/categories'
import { getSession } from '@/lib/auth'
import { QuickAddButton } from './quick-add-button'

export async function QuickAddWrapper() {
  const session = await getSession()

  // Only show if authenticated
  if (!session) return null

  const categories = await getCategories()

  // Only show if there are categories
  if (categories.length === 0) return null

  return <QuickAddButton categories={categories} />
}
