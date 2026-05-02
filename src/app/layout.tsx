import type { Metadata } from 'next';
import './globals.css';
import { ensureDatabaseReady } from '@/db/init';
import Navbar from '@/components/layout/Navbar';

ensureDatabaseReady();

export const metadata: Metadata = {
    title: '逃课通',
    description: 'AI 逃课规划方案',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" className="dark">
            <body className="min-h-screen bg-gray-950 text-gray-100">
                <Navbar />
                {children}
            </body>
        </html>
    );
}
