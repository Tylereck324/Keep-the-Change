import { getCategories } from '@/lib/actions/categories'
import { getBudgetDataForWarnings } from '@/lib/actions/budgets'
import { getSession } from '@/lib/auth'
import { QuickAddButton } from './quick-add-button'

export async function QuickAddWrapper() {
  const session = await getSession()

  // Only show if authenticated
  if (!session) return null

  const [categories, budgetData] = await Promise.all([
    getCategories(),
    getBudgetDataForWarnings(),
  ])

  // Only show if there are categories
  if (categories.length === 0) return null

  return (
    <QuickAddButton
      categories={categories}
      budgetMap={budgetData.budgetMap}
      spentMap={budgetData.spentMap}
    />
  )
}
