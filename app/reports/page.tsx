import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonthlyReport, getMultiMonthTrend, getForecast, getYearSummary } from '@/lib/actions/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportCharts } from '@/components/reports/report-charts'
import Link from 'next/link'
import { getCurrentMonth, getLastNMonths } from '@/lib/utils/date'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const currentMonth = getCurrentMonth()
  const currentYear = new Date().getFullYear()
  // getLastNMonths returns months in reverse order (most recent first), so we reverse for chronological order
  const last6Months = getLastNMonths(6).reverse()

  const [monthlyReport, trendData, forecast, yearSummary] = await Promise.all([
    getMonthlyReport(currentMonth),
    getMultiMonthTrend(last6Months),
    getForecast(currentMonth),
    getYearSummary(currentYear),
  ]).catch(err => {
    console.error('Reports Data Fetch Error:', err)
    throw new Error(`Failed to load report data: ${err.message}`)
  })

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Budget Reports</h1>
        <p className="text-muted-foreground">{monthName}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${monthlyReport.totalBudgeted.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${monthlyReport.totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${monthlyReport.totalRemaining < 0 ? 'text-destructive' : ''}`}>
              ${monthlyReport.totalRemaining.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthlyReport.savingsRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Budget Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days Remaining:</span>
              <span className="font-semibold">{forecast.daysRemaining} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Daily Spend:</span>
              <span className="font-semibold">${forecast.averageDailySpend.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projected Month-End Spending:</span>
              <span className="font-semibold">${forecast.projectedSpending.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Projected Over/Under Budget:</span>
              <span className={`font-bold ${forecast.projectedOverUnder < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {forecast.projectedOverUnder < 0 ? '-' : '+'}${Math.abs(forecast.projectedOverUnder).toFixed(2)}
              </span>
            </div>
            {forecast.projectedOverUnder < 0 && (
              <p className="text-sm text-destructive mt-2">
                ⚠️ Warning: At this rate, you'll exceed your budget by ${Math.abs(forecast.projectedOverUnder).toFixed(2)}
              </p>
            )}
            {forecast.projectedOverUnder > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                ✓ On track to save ${forecast.projectedOverUnder.toFixed(2)} this month!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <ReportCharts
        transactionsByDay={monthlyReport.transactionsByDay}
        categories={monthlyReport.categories}
        trendData={trendData}
      />

      {/* Category Details Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold">Category</th>
                  <th className="text-right py-2 px-2 font-semibold">Budgeted</th>
                  <th className="text-right py-2 px-2 font-semibold">Spent</th>
                  <th className="text-right py-2 px-2 font-semibold">Remaining</th>
                  <th className="text-right py-2 px-2 font-semibold">% Used</th>
                  <th className="text-center py-2 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.categories.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-border">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span>{cat.categoryName}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-2">${cat.budgeted.toFixed(2)}</td>
                    <td className="text-right py-2 px-2">${cat.spent.toFixed(2)}</td>
                    <td className={`text-right py-2 px-2 ${cat.remaining < 0 ? 'text-destructive' : ''}`}>
                      ${cat.remaining.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-2">{cat.percentUsed.toFixed(0)}%</td>
                    <td className="text-center py-2 px-2">
                      {cat.percentUsed >= 100 ? '🔴' : cat.percentUsed >= 75 ? '🟡' : '🟢'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Transactions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top 10 Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {monthlyReport.topTransactions.map((transaction, index) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="text-muted-foreground text-sm">#{index + 1}</span>
                  <span className="ml-2 font-medium">${transaction.amount.toFixed(2)}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{transaction.description}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{transaction.categoryName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Year Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentYear} Year-End Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budgeted (YTD)</p>
              <p className="text-2xl font-bold">${yearSummary.totalBudgeted.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent (YTD)</p>
              <p className="text-2xl font-bold">${yearSummary.totalSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saved (YTD)</p>
              <p className={`text-2xl font-bold ${yearSummary.totalSaved < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                ${yearSummary.totalSaved.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Monthly Spend</p>
              <p className="text-2xl font-bold">${yearSummary.averageMonthlySpend.toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Highest Spend Month:</span>
              <span className="font-semibold">
                {yearSummary.highestSpendMonth.month && yearSummary.highestSpendMonth.month.match(/^\d{4}-\d{2}$/)
                  ? new Date(yearSummary.highestSpendMonth.month + '-01').toLocaleDateString('en-US', { month: 'long' })
                  : 'N/A'}
                - ${yearSummary.highestSpendMonth.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lowest Spend Month:</span>
              <span className="font-semibold">
                {yearSummary.lowestSpendMonth.month && yearSummary.lowestSpendMonth.month.match(/^\d{4}-\d{2}$/)
                  ? new Date(yearSummary.lowestSpendMonth.month + '-01').toLocaleDateString('en-US', { month: 'long' })
                  : 'N/A'}
                - ${yearSummary.lowestSpendMonth.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {yearSummary.categoryTotals.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="font-semibold mb-2">Top Spending Categories (YTD)</p>
              <div className="space-y-2">
                {yearSummary.categoryTotals.slice(0, 5).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-semibold">${cat.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">Back to Dashboard</Button>
        </Link>
        <Link href="/insights" className="flex-1">
          <Button variant="outline" className="w-full">Spending Insights</Button>
        </Link>
        <Link href="/transactions" className="flex-1">
          <Button variant="outline" className="w-full">View Transactions</Button>
        </Link>
      </div>
    </main>
  )
}
