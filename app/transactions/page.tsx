import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTransactions } from '@/lib/actions/transactions'
import { getCategories } from '@/lib/actions/categories'
import { TransactionForm } from '@/components/transaction-form'
import { TransactionList } from '@/components/transaction-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function TransactionsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategories(),
  ])

  const total = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Total: ${total.toFixed(2)}
          </p>
        </div>
        <TransactionForm
          categories={categories}
          trigger={<Button>+ Add Transaction</Button>}
        />
      </div>

      <TransactionList transactions={transactions} categories={categories} />
    </main>
  )
}
