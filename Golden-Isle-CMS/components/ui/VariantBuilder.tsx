'use client';

import React from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { ProductVariant, VariantOption } from '@/types';

interface VariantBuilderProps {
    value: ProductVariant[];
    onChange: (variants: ProductVariant[]) => void;
}

export default function VariantBuilder({ value, onChange }: VariantBuilderProps) {
    const addVariantType = () => {
        onChange([...value, { name: '', options: [{ name: '' }] }]);
    };

    const removeVariantType = (variantIndex: number) => {
        onChange(value.filter((_, i) => i !== variantIndex));
    };

    const updateVariantName = (variantIndex: number, name: string) => {
        const updated = [...value];
        updated[variantIndex] = { ...updated[variantIndex], name };
        onChange(updated);
    };

    const addOption = (variantIndex: number) => {
        const updated = [...value];
        updated[variantIndex].options.push({ name: '' });
        onChange(updated);
    };

    const removeOption = (variantIndex: number, optionIndex: number) => {
        const updated = [...value];
        updated[variantIndex].options = updated[variantIndex].options.filter((_, i) => i !== optionIndex);
        onChange(updated);
    };

    const updateOption = (variantIndex: number, optionIndex: number, field: keyof VariantOption, val: string | number) => {
        const updated = [...value];
        updated[variantIndex].options[optionIndex] = {
            ...updated[variantIndex].options[optionIndex],
            [field]: val
        };
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {value.length === 0 && (
                <div className="text-center py-8 text-brew-foam/60 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <p className="mb-2">No variants added yet</p>
                    <p className="text-sm">Add variants like Size, Color, Material, etc.</p>
                </div>
            )}

            {value.map((variant, variantIndex) => (
                <div key={variantIndex} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                    <div className="flex items-center gap-3">
                        <input suppressHydrationWarning
                            type="text"
                            placeholder="Variant name (e.g., Size, Color)"
                            value={variant.name}
                            onChange={(e) => updateVariantName(variantIndex, e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-brew-stout-surface font-medium"
                        />
                        <button suppressHydrationWarning
                            type="button"
                            onClick={() => removeVariantType(variantIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove variant type"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="space-y-2 ml-4">
                        {variant.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                                <input suppressHydrationWarning
                                    type="text"
                                    placeholder="Option name (e.g., Small, Red)"
                                    value={option.name}
                                    onChange={(e) => updateOption(variantIndex, optionIndex, 'name', e.target.value)}
                                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-brew-stout-surface text-sm"
                                />
                                <input suppressHydrationWarning
                                    type="number"
                                    step="0.01"
                                    placeholder="Price +/-"
                                    value={option.price_modifier || ''}
                                    onChange={(e) => updateOption(variantIndex, optionIndex, 'price_modifier', parseFloat(e.target.value) || 0)}
                                    className="w-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-brew-stout-surface text-sm"
                                    title="Price modifier (e.g., -5 or +10)"
                                />
                                <input suppressHydrationWarning
                                    type="text"
                                    placeholder="SKU"
                                    value={option.sku_suffix || ''}
                                    onChange={(e) => updateOption(variantIndex, optionIndex, 'sku_suffix', e.target.value)}
                                    className="w-20 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-brew-stout-surface text-sm"
                                    title="SKU suffix (e.g., -SM)"
                                />
                                <button suppressHydrationWarning
                                    type="button"
                                    onClick={() => removeOption(variantIndex, optionIndex)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Remove option"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}

                        <button suppressHydrationWarning
                            type="button"
                            onClick={() => addOption(variantIndex)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
                        >
                            <Plus size={16} />
                            Add Option
                        </button>
                    </div>

                    {variant.options.length > 0 && variant.options.every(o => o.name) && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-600">
                                <span className="font-medium">{variant.options.length} options:</span>{' '}
                                {variant.options.map(o => o.name).join(', ')}
                            </p>
                        </div>
                    )}
                </div>
            ))}

            <button suppressHydrationWarning
                type="button"
                onClick={addVariantType}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium border-2 border-dashed border-blue-200"
            >
                <Plus size={20} />
                Add Variant Type
            </button>

            {value.length > 0 && value.every(v => v.name && v.options.length > 0 && v.options.every(o => o.name)) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                        📦 Total Combinations: {value.reduce((acc, v) => acc * v.options.length, 1)}
                    </p>
                    <p className="text-xs text-blue-700">
                        This product will have {value.reduce((acc, v) => acc * v.options.length, 1)} unique variant combinations
                    </p>
                </div>
            )}
        </div>
    );
}
