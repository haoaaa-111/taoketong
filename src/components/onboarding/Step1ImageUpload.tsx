'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

interface ParseResult {
    success: boolean;
    courses: ParsedCourse[];
    semester_start?: string;
    semester_end?: string;
}

export default function Step1ImageUpload({
    onParseComplete,
}: {
    onParseComplete: (result: ParseResult) => void;
}) {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = useCallback(async (file: File) => {
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/parse-image', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.message || '解析失败');
                return;
            }

            onParseComplete(data);
        } catch (e) {
            setError('网络请求失败');
        } finally {
            setUploading(false);
        }
    }, [onParseComplete]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    return (
        <div className="card max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">导入课表</h1>
            <p className="text-gray-400 mb-6">上传或粘贴你的课表截图，系统会自动解析</p>

            <label
                className="block border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                {uploading ? (
                    <div className="text-gray-400">正在解析中...</div>
                ) : (
                    <div className="text-gray-400">
                        <div className="text-lg mb-2">📸 拖拽图片到这里，或点击上传</div>
                        <div className="text-sm">支持 PNG, JPG, WebP</div>
                    </div>
                )}
            </label>

            {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    {error}
                </div>
            )}
        </div>
    );
}
