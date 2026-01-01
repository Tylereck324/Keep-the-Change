'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, Wallet, BarChart3, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavMobileProps {
    children?: React.ReactNode // For the FAB/QuickAdd button
}

export function NavMobile({ children }: NavMobileProps) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Txns', href: '/transactions', icon: CreditCard },
        // Middle slot for FAB
        { name: 'Budget', href: '/budget', icon: Wallet },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
    ]

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 backdrop-blur-lg border-t md:hidden">
            <div className="grid h-full grid-cols-5 items-center justify-items-center">
                {navItems.slice(0, 2).map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}

                {/* Center Slot (FAB Container) */}
                <div className="relative -top-5">
                    {children}
                </div>

                {navItems.slice(2, 4).map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
