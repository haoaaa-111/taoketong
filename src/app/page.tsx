'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface InitResponse {
    has_data: boolean;
    last_session?: any;
    last_actions?: any[];
}

export default function HomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/init')
            .then(res => res.json())
            .then((data: InitResponse) => {
                if (data.has_data) {
                    router.push('/schedule');
                } else {
                    router.push('/onboarding');
                }
            })
            .catch(() => router.push('/onboarding'))
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
                <div className="text-xl">加载中...</div>
            </div>
        );
    }

    return null;
}
