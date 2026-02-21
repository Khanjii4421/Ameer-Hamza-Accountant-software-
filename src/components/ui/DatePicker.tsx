import React, { useRef } from 'react';
import { Input } from './Input';

interface DatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, className = '', required = false }) => {
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Format YYYY-MM-DD to DD Month YYYY for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDisplayClick = () => {
        if (dateInputRef.current) {
            // Logic to open the native calendar
            try {
                // @ts-ignore - showPicker is modern but might not be in all TS types
                if (dateInputRef.current.showPicker) {
                    // @ts-ignore
                    dateInputRef.current.showPicker();
                } else {
                    dateInputRef.current.click();
                }
            } catch (e) {
                dateInputRef.current.focus();
            }
        }
    };

    return (
        <div className="relative w-full">
            <div onClick={handleDisplayClick} className="cursor-pointer">
                <Input
                    label={label}
                    value={formatDate(value)}
                    readOnly
                    placeholder="DD/MM/YYYY"
                    className={`cursor-pointer bg-white ${className}`}
                    required={required}
                />
                <span className="absolute right-4 top-[38px] text-slate-400 pointer-events-none">
                    📅
                </span>
            </div>
            <input
                ref={dateInputRef}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 left-0"
                tabIndex={-1}
            />
        </div>
    );
};
