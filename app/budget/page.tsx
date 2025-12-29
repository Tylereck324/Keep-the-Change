import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { CategoryCard } from '@/components/category-card'
import { CategoryForm } from '@/components/category-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function BudgetPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const categories = await getCategories()

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Budget Setup</h1>
        </div>
        <CategoryForm
          trigger={<Button>+ New Category</Button>}
        />
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No categories yet. Create your first one!
        </p>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              spent={0}
            />
          ))}
        </div>
      )}
    </main>
  )
}
