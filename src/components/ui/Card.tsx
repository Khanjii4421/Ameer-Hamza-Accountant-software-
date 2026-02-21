import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export const Card = ({ children, className = '', title, action }: CardProps) => {
    return (
        <div className={`glass-card rounded-2xl border border-white/40 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-300/60 animate-fade-in ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50">
                    {title && <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};
