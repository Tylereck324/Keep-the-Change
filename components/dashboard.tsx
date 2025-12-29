import Link from 'next/link'
import { getCategories } from '@/lib/actions/categories'
import { getMonthlyBudgets } from '@/lib/actions/budgets'
import { getTransactionsByMonth } from '@/lib/actions/transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TransactionForm } from './transaction-form'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function Dashboard() {
  const currentMonth = getCurrentMonth()

  const [categories, budgets, transactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
    getTransactionsByMonth(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))

  // Calculate spent per category
  const spentByCategory = new Map<string, number>()
  transactions.forEach((t) => {
    if (t.category_id) {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + t.amount
      )
    }
  })

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const totalRemaining = totalBudgeted - totalSpent

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget Dashboard</h1>
          <p className="text-muted-foreground">{monthName}</p>
        </div>
        <TransactionForm
          categories={categories}
          trigger={<Button>+ Add Transaction</Button>}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalBudgeted.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-500' : ''}`}>
              ${totalRemaining.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Link href="/budget">
            <Button variant="outline" size="sm">Edit Budget</Button>
          </Link>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No categories yet.{' '}
              <Link href="/budget" className="underline">
                Set up your budget
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const budgeted = budgetMap.get(category.id) ?? 0
              const spent = spentByCategory.get(category.id) ?? 0
              const remaining = budgeted - spent
              const percentUsed = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0

              return (
                <Card key={category.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        ${remaining.toFixed(2)} left
                      </span>
                    </div>
                    <Progress
                      value={percentUsed}
                      className="h-2"
                      style={{
                        ['--progress-color' as string]:
                          percentUsed >= 100 ? '#ef4444' :
                          percentUsed >= 75 ? '#eab308' : '#22c55e'
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>${spent.toFixed(2)} spent</span>
                      <span>${budgeted.toFixed(2)} budgeted</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Link href="/reports">
          <Button variant="outline" className="w-full">📊 Reports</Button>
        </Link>
        <Link href="/transactions">
          <Button variant="outline" className="w-full">Transactions</Button>
        </Link>
        <Link href="/settings" className="col-span-2 md:col-span-1">
          <Button variant="outline" className="w-full">Settings</Button>
        </Link>
      </div>
    </main>
  )
}
