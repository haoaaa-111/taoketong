'use client';

import { useState } from 'react';
import Step1ImageUpload from '@/components/onboarding/Step1ImageUpload';
import Step1CoursePreview from '@/components/onboarding/Step1CoursePreview';
import { ParsedCourseGroup } from '@/types';

interface ParseResult {
    success: boolean;
    courses: ParsedCourseGroup[];
    semester_start?: string;
    semester_end?: string;
}

export default function OnboardingStep1() {
    const [parsedData, setParsedData] = useState<ParseResult | null>(null);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            {!parsedData ? (
                <Step1ImageUpload onParseComplete={setParsedData as any} />
            ) : (
                <Step1CoursePreview
                    courses={parsedData.courses}
                    semesterStart={parsedData.semester_start}
                    semesterEnd={parsedData.semester_end}
                />
            )}
        </div>
    );
}
