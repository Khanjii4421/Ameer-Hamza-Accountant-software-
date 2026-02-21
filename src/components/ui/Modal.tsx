import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    const [mounted, setMounted] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            // Reset position when closed
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStartPos.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Check if the click is on a button or input
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) {
            return;
        }

        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    if (!mounted) return null;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div
                    className={`flex items-center justify-between px-8 py-6 border-b border-slate-100 select-none ${!isDragging ? 'lg:cursor-move' : 'cursor-grabbing'}`}
                    onMouseDown={handleMouseDown}
                >
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        ✕
                    </button>
                </div>
                <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
