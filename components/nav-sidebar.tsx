'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, PieChart, BarChart3, Settings, Wallet } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Budget', href: '/budget', icon: Wallet },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Insights', href: '/insights', icon: PieChart },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export function NavSidebar() {
    const pathname = usePathname()

    return (
        <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72 h-screen fixed left-0 top-0">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <span className="text-xl tracking-tight font-bold">Keep the Change</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium lg:px-6">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                        isActive
                                            ? "bg-muted text-primary font-semibold"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-4 border-t">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm text-muted-foreground">Theme</span>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </div>
    )
}
