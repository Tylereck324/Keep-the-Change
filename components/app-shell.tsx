'use client'

import { NavSidebar } from './nav-sidebar'
import { NavMobile } from './nav-mobile'

interface AppShellProps {
    children: React.ReactNode
    quickAdd?: React.ReactNode
}

export function AppShell({ children, quickAdd }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {/* Desktop Sidebar */}
            <NavSidebar />

            {/* Main Content Area */}
            <div className="flex flex-col md:pl-64 lg:pl-72 min-h-screen">
                <main className="flex-1 pb-20 md:pb-8">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <NavMobile>
                {quickAdd}
            </NavMobile>
        </div>
    )
}
