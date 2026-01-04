'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteCategory } from '@/lib/actions/categories'

interface CategoryDeleteButtonProps {
    categoryId: string
    categoryName: string
}

export function CategoryDeleteButton({ categoryId, categoryName }: CategoryDeleteButtonProps) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const result = await deleteCategory(categoryId)
            const count = result?.affectedTransactions ?? 0
            const suffix = count === 1 ? '1 transaction moved' : `${count} transactions moved`
            toast.success(`Category "${categoryName}" deleted. ${suffix} to Uncategorized.`)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete category'
            toast.error(message)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button
                    disabled={deleting}
                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors disabled:opacity-50 p-2 -m-1 rounded"
                    aria-label={`Delete ${categoryName} category`}
                >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Delete &quot;{categoryName}&quot;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Any transactions using this category will become uncategorized.
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete Category
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
