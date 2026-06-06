'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Package } from 'lucide-react';
import { Product } from '@/types';

interface ProductTableRowProps {
    product: Product;
    isSelected: boolean;
    onSelect: (id: string, selected: boolean) => void;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
}

export default function ProductTableRow({ product, isSelected, onSelect, onEdit, onDelete }: ProductTableRowProps) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const safeImages = product.images || [];

    return (
        <tr className={`
            md:table-row md:border-b md:border-white/20 dark:md:border-white/10 md:hover:bg-white/50 dark:md:hover:bg-white/5 md:transition-colors md:bg-transparent
            grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 p-4 border border-white/40 dark:border-white/10 rounded-2xl mb-3 bg-white/70 dark:bg-white/5 backdrop-blur-xl relative shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)] hover:border-blue-500/30 transition-all
            ${isSelected ? 'bg-white/90 dark:bg-white/10 ring-2 ring-blue-500 shadow-lg' : ''}
        `}>
            {/* Checkbox */}
            <td className="md:table-cell md:w-12 md:px-6 md:py-4 absolute top-4 left-4 z-10 md:static">
                <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-[#111111]"
                    checked={isSelected}
                    onChange={(e) => onSelect(product.id, e.target.checked)}
                />
            </td>

            {/* Thumbnail */}
            <td className="md:table-cell md:w-20 md:px-6 md:py-4 pl-10 md:pl-0">
                <div className="h-14 w-14 rounded-md overflow-hidden bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 flex-shrink-0 relative">
                    {safeImages[0] ? (
                        <>
                            <img
                                src={safeImages[0]}
                                alt={product.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            <div className="hidden absolute inset-0 w-full h-full flex items-center justify-center text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-700">
                                <Package size={20} />
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
                            <Package size={20} />
                        </div>
                    )}
                </div>
            </td>

            {/* Name + Price */}
            <td className="md:table-cell md:px-6 md:py-4 self-center">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white text-base truncate max-w-[200px] md:max-w-xs">{product.name}</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-bold mt-0.5">RM {product.price.toFixed(2)}</span>
                </div>
            </td>

            {/* Category */}
            <td className="md:table-cell md:w-32 md:px-6 md:py-4 col-start-2 -mt-1 md:mt-0 md:col-auto">
                <div className="flex items-center">
                    {(() => {
                        const c = product.category || 'Other';
                        const cfg: Record<string, { cls: string }> = {
                            'Whisky': { cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' },
                            'Craft Beer': { cls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800' },
                            'Wine': { cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' },
                            'Spirit': { cls: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' },
                            'Other': { cls: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
                        };
                        const { cls } = cfg[c] || cfg['Other'];
                        return (
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${cls} whitespace-nowrap`}>
                                {c}
                            </span>
                        );
                    })()}
                </div>
            </td>

            {/* Status / Stock */}
            <td className="md:table-cell md:w-40 md:px-6 md:py-4 col-start-2 -mt-2 md:mt-0 md:col-auto">
                <div className="flex flex-row md:flex-col gap-2 md:gap-1 items-center md:items-start">
                    {(() => {
                        const s = product.stock_status || 'in_stock';
                        const cfg: Record<string, { label: string; cls: string }> = {
                            in_stock: { label: 'Active', cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
                            low_stock: { label: 'Low Stock', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' },
                            out_of_stock: { label: 'Out of Stock', cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' },
                        };
                        const { label, cls } = cfg[s] ?? cfg.in_stock;
                        const qty = product.stock_quantity ?? product.stock ?? 0;
                        return (
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${cls} whitespace-nowrap`}>
                                {label} | {qty} units
                            </span>
                        );
                    })()}
                </div>
            </td>

            {/* Actions */}
            <td className="md:table-cell md:w-12 md:text-right md:px-6 md:py-4 absolute top-2 right-2 md:static">
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111111] rounded-lg shadow-xl border border-slate-100 dark:border-white/10 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(product); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Edit size={16} /> Edit Product
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(product.id); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete Product
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
