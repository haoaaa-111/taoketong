'use client';

interface ChipSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label?: string;
}

export default function ChipSelect({ options, selected, onChange, label }: ChipSelectProps) {
    const toggle = (opt: string) => {
        onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
    };

    return (
        <div>
            {label && <label className="text-gray-400 text-sm mb-2 block">{label}</label>}
            <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                    const active = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => toggle(opt)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                active
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
