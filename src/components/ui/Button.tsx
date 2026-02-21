import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-slate-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-transparent",
        secondary: "bg-white text-slate-800 border border-slate-200 hover:border-primary hover:bg-slate-50 shadow-sm",
        outline: "bg-transparent text-primary border-2 border-primary hover:bg-primary/5",
        danger: "bg-danger text-white hover:bg-red-600 shadow-md hover:shadow-red-500/20",
        ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    };

    const sizes = {
        sm: "h-9 px-4 text-xs tracking-wide uppercase",
        md: "h-11 px-6 py-2.5 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10 p-2"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {children}
        </button>
    );
};
