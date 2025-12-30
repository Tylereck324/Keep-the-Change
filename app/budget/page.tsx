import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { getMonthlyBudgets, copyBudgetFromPreviousMonth, autoRolloverIfNeeded } from '@/lib/actions/budgets'
import { CategoryForm } from '@/components/category-form'
import { CategoryDeleteButton } from '@/components/category-delete-button'
import { BudgetAmountInput } from '@/components/budget-amount-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function BudgetPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const currentMonth = getCurrentMonth()

  // Auto-rollover budget from previous month if enabled and needed
  await autoRolloverIfNeeded(currentMonth)

  const [categories, budgets] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]))
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)

  async function handleCopyFromPrevious() {
    'use server'
    await copyBudgetFromPreviousMonth(currentMonth)
  }

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Budget Setup</h1>
          <p className="text-muted-foreground">
            {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={handleCopyFromPrevious}>
            <Button variant="outline" type="submit">
              Copy Last Month
            </Button>
          </form>
          <CategoryForm trigger={<Button>+ Category</Button>} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Total Budgeted</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${totalBudgeted.toFixed(2)}</p>
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No categories yet. Create your first one!
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const budget = budgetMap.get(category.id)
            return (
              <Card key={category.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    <CategoryForm
                      category={category}
                      trigger={
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      }
                    />
                    <CategoryDeleteButton
                      categoryId={category.id}
                      categoryName={category.name}
                    />
                  </div>
                  <BudgetAmountInput
                    categoryId={category.id}
                    month={currentMonth}
                    initialAmount={budget?.budgeted_amount ?? 0}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
