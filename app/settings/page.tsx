import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { getAllKeywords } from '@/lib/actions/keywords'
import { CategoryForm } from '@/components/category-form'
import { ChangePinForm } from '@/components/change-pin-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { AutoRolloverToggle } from '@/components/auto-rollover-toggle'
import { KeywordManagement } from '@/components/keyword-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [categories, keywordsByCategory] = await Promise.all([
    getCategories(),
    getAllKeywords(),
  ])

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Theme */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Budget Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <AutoRolloverToggle />
        </CardContent>
      </Card>

      {/* Change PIN */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePinForm />
        </CardContent>
      </Card>

      {/* Manage Categories */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Categories</CardTitle>
          <CategoryForm trigger={<Button size="sm">+ Add</Button>} />
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <CategoryForm
                    category={category}
                    trigger={<Button variant="ghost" size="sm">Edit</Button>}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Import Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Configure keywords to automatically categorize transactions when importing CSV files.
              Keywords are matched against transaction descriptions to suggest categories.
            </p>
          </div>
          <KeywordManagement
            categories={categories}
            keywordsByCategory={keywordsByCategory}
          />
        </CardContent>
      </Card>
    </main>
  )
}
