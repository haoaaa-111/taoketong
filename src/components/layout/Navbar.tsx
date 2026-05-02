'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const isOnboarding = pathname?.startsWith('/onboarding');

    if (isOnboarding) return null;

    return (
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight hover:text-blue-400 transition-colors">
                    逃课通
                </Link>
                <div className="flex gap-4 text-sm">
                    <NavLink href="/schedule" active={pathname === '/schedule'}>课表</NavLink>
                    <NavLink href="/settings" active={pathname === '/settings'}>设置</NavLink>
                </div>
            </div>
        </nav>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link href={href} className={`px-3 py-1.5 rounded-lg transition-colors ${active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>
            {children}
        </Link>
    );
}
