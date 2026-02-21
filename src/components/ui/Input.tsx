'use client';
import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', type = 'text', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPasswordField = type === 'password';
        const inputType = isPasswordField && showPassword ? 'text' : type;

        return (
            <div className="w-full space-y-1.5 relative">
                {label && <label className="block text-sm font-semibold text-slate-700 ml-0.5">{label}</label>}
                <div className="relative">
                    <input
                        ref={ref}
                        type={inputType}
                        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 placeholder:text-slate-400 shadow-sm ${error ? 'border-red-500 focus:ring-red-500/10' : ''} ${className} ${isPasswordField ? 'pr-12' : ''}`}
                        {...props}
                    />
                    {isPasswordField && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
                {error && <p className="mt-1 text-xs font-medium text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

