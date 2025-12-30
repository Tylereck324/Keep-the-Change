import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMerchantInsights, getRecurringCharges } from '@/lib/actions/insights'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MerchantTable } from '@/components/insights/merchant-table'
import { MerchantChart } from '@/components/insights/merchant-chart'
import { RecurringCard } from '@/components/insights/recurring-card'
import Link from 'next/link'

export default async function InsightsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [merchantInsights, recurringCharges] = await Promise.all([
    getMerchantInsights(),
    getRecurringCharges(),
  ])

  const totalMerchantSpend = merchantInsights.reduce((sum, m) => sum + m.totalSpent, 0)
  const totalRecurringMonthly = recurringCharges
    .filter(r => r.isActive)
    .reduce((sum, r) => sum + r.estimatedMonthlyCost, 0)

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Spending Insights</h1>
        <p className="text-gray-500 dark:text-gray-400">Last 6 months analysis</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Unique Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{merchantInsights.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Total Spend (6 mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalMerchantSpend.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 dark:text-gray-400">Recurring (Monthly Est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalRecurringMonthly.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Charges Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Detected Recurring Charges</h2>
        {recurringCharges.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
              No recurring charges detected yet. Keep adding transactions to detect patterns.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurringCharges.map((charge, index) => (
              <RecurringCard key={`${charge.merchant}-${index}`} charge={charge} />
            ))}
          </div>
        )}
      </div>

      {/* Top Merchants Chart */}
      {merchantInsights.length > 0 && (
        <div className="mb-6">
          <MerchantChart data={merchantInsights.slice(0, 10)} />
        </div>
      )}

      {/* Merchant Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">All Merchants</h2>
        {merchantInsights.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
              No transactions yet. Start adding transactions to see merchant insights.
            </CardContent>
          </Card>
        ) : (
          <MerchantTable data={merchantInsights} />
        )}
      </div>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">Back to Dashboard</Button>
        </Link>
        <Link href="/reports" className="flex-1">
          <Button variant="outline" className="w-full">View Reports</Button>
        </Link>
      </div>
    </main>
  )
}
