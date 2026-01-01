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
import { getCurrentMonth } from '@/lib/utils/date'
import { isIncomeTransaction } from '@/lib/utils/transaction-helpers'
import { formatMoney, dollarsToCents, addCents } from '@/lib/utils/money'

export async function Dashboard() {
  const currentMonth = getCurrentMonth()

  // Auto-rollover budget from previous month if enabled and needed
  await autoRolloverIfNeeded(currentMonth)

  const [categories, budgets, transactions] = await Promise.all([
    getCategories(),
    getMonthlyBudgets(currentMonth),
    getTransactionsByMonth(currentMonth),
  ])

  const budgetMap = new Map(budgets.map((b) => [
    b.category_id,
    b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)
  ]))

  // Separate income and expenses
  const incomeTransactions = transactions.filter(isIncomeTransaction)
  const expenseTransactions = transactions.filter((t) => !isIncomeTransaction(t))

  // Calculate spent per category (expenses only) - in CENTS
  const spentByCategory = new Map<string, number>()
  expenseTransactions.forEach((t) => {
    if (t.category_id) {
      const amountCents = t.amount_cents ?? dollarsToCents(t.amount)
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) ?? 0) + amountCents
      )
    }
  })

  // Calculate totals in CENTS
  const totalBudgetedCents = budgets.reduce((sum, b) =>
    sum + (b.budgeted_amount_cents ?? dollarsToCents(b.budgeted_amount)), 0
  )
  const totalIncomeCents = incomeTransactions.reduce((sum, t) =>
    sum + (t.amount_cents ?? dollarsToCents(t.amount)), 0
  )
  const totalExpensesCents = expenseTransactions.reduce((sum, t) =>
    sum + (t.amount_cents ?? dollarsToCents(t.amount)), 0
  )
  const netCashFlowCents = totalIncomeCents - totalExpensesCents

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{monthName}</p>
        </div>
        <div className="hidden md:block">
          <TransactionForm
            categories={categories}
            trigger={<Button>+ Add Transaction</Button>}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Content (Left on Desktop) */}
        <div className="md:col-span-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(totalIncomeCents)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(totalExpensesCents)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCashFlowCents < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                  {netCashFlowCents >= 0 ? '+' : ''}{formatMoney(netCashFlowCents).replace('$', '')}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden">
            {/* Quick Add Button logic handled by AppShell on mobile, but we can show inline form if needed here or just rely on FAB */}
          </div>

          {/* Recent Activity */}
          <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
          <RecentTransactions transactions={transactions.slice(0, 5)} />
        </div>

        {/* Sidebar Widgets (Right on Desktop) */}
        <div className="md:col-span-4 space-y-6">
          {/* Budget Progress */}
          {totalBudgetedCents > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(totalExpensesCents)} of {formatMoney(totalBudgetedCents)}
                  </span>
                  <span className={`text-xs font-medium ${totalBudgetedCents - totalExpensesCents < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {Math.round((totalExpensesCents / totalBudgetedCents) * 100)}%
                  </span>
                </div>
                <Progress
                  value={Math.min((totalExpensesCents / totalBudgetedCents) * 100, 100)}
                  className="h-2"
                  style={{
                    ['--progress-color' as string]:
                      totalExpensesCents > totalBudgetedCents ? '#ef4444' :
                        totalExpensesCents > totalBudgetedCents * 0.75 ? '#eab308' : '#22c55e'
                  }}
                />
                <p className={`text-xs mt-2 ${totalBudgetedCents - totalExpensesCents < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formatMoney(Math.abs(totalBudgetedCents - totalExpensesCents))} {totalBudgetedCents - totalExpensesCents >= 0 ? 'remaining' : 'over budget'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight">Categories</h2>
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="h-8">Edit</Button>
              </Link>
            </div>

            {categories.length === 0 ? (
              <Card className="bg-muted/50 border-dashed shadow-none">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No categories set up.
                  <br />
                  <Link href="/budget" className="underline hover:text-primary">
                    Create your budget
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const budgetedCents = budgetMap.get(category.id) ?? 0
                  const spentCents = spentByCategory.get(category.id) ?? 0
                  const remainingCents = budgetedCents - spentCents
                  const percentUsed = budgetedCents > 0 ? Math.min((spentCents / budgetedCents) * 100, 100) : 0

                  return (
                    <div key={category.id} className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${remainingCents < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {formatMoney(remainingCents)} left
                          </span>
                          <CategoryForm
                            category={category}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                <span className="sr-only">Edit {category.name}</span>
                              </Button>
                            }
                          />
                        </div>
                      </div>
                      <Progress
                        value={percentUsed}
                        className="h-1.5"
                        style={{
                          ['--progress-color' as string]:
                            percentUsed >= 100 ? '#ef4444' :
                              percentUsed >= 75 ? '#eab308' : '#22c55e'
                        }}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">
                        <span>{formatMoney(spentCents)} spent</span>
                        <span>{formatMoney(budgetedCents)} limit</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
