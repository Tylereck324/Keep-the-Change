'use client'

import { useState } from 'react'
import { deleteCategory } from '@/lib/actions/categories'

interface CategoryDeleteButtonProps {
    categoryId: string
    categoryName: string
}

export function CategoryDeleteButton({ categoryId, categoryName }: CategoryDeleteButtonProps) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`Delete "${categoryName}"? Any transactions using this category will be uncategorized.`)) {
            return
        }

        setDeleting(true)
        try {
            await deleteCategory(categoryId)
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete category')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 p-1 rounded"
            title="Delete category"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
        </button>
    )
}
