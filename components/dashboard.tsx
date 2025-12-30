import Link from 'next/link'
import { getCategories } from '@/lib/actions/categories'
import { getMonthlyBudgets, autoRolloverIfNeeded } from '@/lib/actions/budgets'
import { getTransactionsByMonth } from '@/lib/actions/transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TransactionForm } from './transaction-form'
import { RecentTransactions } from './recent-transactions'
import { CategoryForm } from './category-form'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function Dashboard() {
  const currentMonth = getCurrentMonth()

  // Auto-rollover budget from previous month if enabled and needed
  await autoRolloverIfNeeded(currentMonth)

  const [categories, budgets, transactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
    getTransactionsByMonth(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))

  // Separate income and expenses (check type OR category name)
  // Use optional chaining for type in case migration hasn't run yet
  const isIncome = (t: typeof transactions[0]) =>
    (t as { type?: string }).type === 'income' || t.category?.name?.toLowerCase() === 'income'

  const incomeTransactions = transactions.filter(isIncome)
  const expenseTransactions = transactions.filter((t) => !isIncome(t))

  // Calculate spent per category (expenses only)
  const spentByCategory = new Map<string, number>()
  expenseTransactions.forEach((t) => {
    if (t.category_id) {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + t.amount
      )
    }
  })

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0)
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const netCashFlow = totalIncome - totalExpenses

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
            <CardTitle className="text-sm text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalIncome.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netCashFlow < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
              {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {totalBudgeted > 0 && (
        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Budget Progress</span>
              <span className="text-sm text-muted-foreground">
                ${totalExpenses.toFixed(2)} / ${totalBudgeted.toFixed(2)}
              </span>
            </div>
            <Progress
              value={Math.min((totalExpenses / totalBudgeted) * 100, 100)}
              className="h-2"
              style={{
                ['--progress-color' as string]:
                  totalExpenses > totalBudgeted ? '#ef4444' :
                    totalExpenses > totalBudgeted * 0.75 ? '#eab308' : '#22c55e'
              }}
            />
            <p className={`text-xs mt-1 ${totalBudgeted - totalExpenses < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              ${Math.abs(totalBudgeted - totalExpenses).toFixed(2)} {totalBudgeted - totalExpenses >= 0 ? 'remaining' : 'over budget'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="mb-6">
        <RecentTransactions transactions={transactions.slice(0, 5)} />
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
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{category.name}</span>
                        <CategoryForm
                          category={category}
                          trigger={
                            <button
                              className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                              aria-label={`Edit ${category.name} category`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>
                          }
                        />
                      </div>
                      <span className={`text-sm ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Link href="/reports">
          <Button variant="outline" className="w-full">📊 Reports</Button>
        </Link>
        <Link href="/insights">
          <Button variant="outline" className="w-full">💡 Insights</Button>
        </Link>
        <Link href="/transactions">
          <Button variant="outline" className="w-full">Transactions</Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" className="w-full">Settings</Button>
        </Link>
      </div>
    </main>
  )
}
