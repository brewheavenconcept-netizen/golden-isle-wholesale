'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Product } from '@/types';
import toast from 'react-hot-toast';
import { addProduct, updateProduct, uploadProductImage } from '@/lib/storage';
import { useStore } from '@/context/StoreContext';

interface ProductFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialData?: Product | null;
}

export default function ProductForm({ onSuccess, onCancel, initialData }: ProductFormProps) {
    const { storeId } = useStore();
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [manualCategoryOverride, setManualCategoryOverride] = useState(false);

    const [formData, setFormData] = useState<Partial<Product>>({
        name: '', price: 0, sku: '', stock_quantity: 0,
        category: 'Whisky', description: '', status: 'active', images: [], variants: [],
        stock_status: 'in_stock',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                stock_quantity: initialData.stock_quantity ?? initialData.stock ?? 0
            });
            if (initialData.images?.length) setImagePreview(initialData.images[0]);
            setManualCategoryOverride(true);
        }
    }, [initialData]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => {
            let nextCategory = prev.category;
            if (!manualCategoryOverride && value.trim() !== '') {
                const nameLower = value.toLowerCase();
                if (['whisky', 'macallan', 'johnnie', 'chivas'].some(k => nameLower.includes(k))) {
                    nextCategory = 'Whisky';
                } else if (['beer', 'asahi', 'stout', 'lager', 'craft'].some(k => nameLower.includes(k))) {
                    nextCategory = 'Craft Beer';
                } else if (['wine', 'red', 'white', 'penfolds'].some(k => nameLower.includes(k))) {
                    nextCategory = 'Wine';
                } else if (['hennessy', 'spirit', 'brandy', 'cognac'].some(k => nameLower.includes(k))) {
                    nextCategory = 'Spirit';
                } else {
                    nextCategory = 'Other';
                }
            }
            return { ...prev, name: value, category: nextCategory };
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setImageUploading(true);
            try {
                const url = await uploadProductImage(file, storeId || 'default');
                setImagePreview(url);
                setFormData(prev => ({ ...prev, images: [url] }));
                toast.success('Image uploaded successfully');
            } catch (err: unknown) {
                const error = err as Error;
                toast.error(error.message || 'Failed to upload image');
                e.target.value = '';
            } finally {
                setImageUploading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) { toast.error('Store not found. Please refresh.'); return; }
        setLoading(true);
        try {
            if (initialData?.id) {
                await updateProduct(initialData.id, formData, storeId);
            } else {
                await addProduct(formData as Omit<Product, 'id' | 'created_at'>, storeId);
            }
            toast.success("Product saved successfully!");
            onSuccess();
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(`Error: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            {/* ── STICKY HEADER ── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                        {initialData ? 'Edit Product' : 'Add New Product'}
                    </h2>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                        type="submit"
                        disabled={loading || imageUploading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* ── SECTIONS (single column, stacked) ── */}
            <div className="space-y-4">

                {/* General Info */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">General Info</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Product Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Macallan 12 Year"
                                className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition"
                                value={formData.name}
                                onChange={handleNameChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Description</label>
                            <textarea
                                rows={4}
                                placeholder="Product description..."
                                className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none transition"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Media */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">Media</h3>
                    </div>
                    <div className="p-4">
                        <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition relative
                            ${imageUploading
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                                : 'border-slate-200 dark:border-white/10 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}>
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleFileSelect}
                                disabled={loading || imageUploading}
                            />
                            <div className="flex flex-col items-center pointer-events-none">
                                {imageUploading ? (
                                    <>
                                        <Loader2 className="w-8 h-8 text-blue-500 mb-2 animate-spin" />
                                        <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3">
                                            <Upload className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            Drag and drop your product images here, or click to browse
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-gray-500 mt-1">PNG, JPG, WebP, up to 2MB</span>
                                    </>
                                )}
                            </div>
                        </label>

                        {imagePreview && !imageUploading && (
                            <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 group">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setImagePreview(null); setFormData(p => ({ ...p, images: [] })); }}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-700 dark:text-gray-300">Image uploaded</p>
                                    <p className="text-xs text-slate-400 dark:text-gray-500">Tap thumbnail to remove</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details: Category + Status side by side on mobile too */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">Details</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Category</label>
                            <select
                                required
                                className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none cursor-pointer"
                                value={formData.category}
                                onChange={e => {
                                    setFormData({ ...formData, category: e.target.value });
                                    setManualCategoryOverride(true);
                                }}
                            >
                                <option value="Whisky">🥃 Whisky</option>
                                <option value="Wine">🍷 Wine</option>
                                <option value="Craft Beer">🍺 Craft Beer</option>
                                <option value="Spirit">🍶 Spirit</option>
                                <option value="Other">📦 Other</option>
                            </select>
                        </div>

                        {/* Pricing */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Price (RM)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-500 font-medium">RM</span>
                                <input
                                    required
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    value={formData.price === 0 ? '' : formData.price}
                                    onChange={e => {
                                        const value = e.target.value;
                                        if (value === '' || !isNaN(Number(value))) {
                                            setFormData({ ...formData, price: value === '' ? 0 : parseFloat(value) });
                                        }
                                    }}
                                    onBlur={e => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setFormData({ ...formData, price: value });
                                    }}
                                />
                            </div>
                        </div>

                        {/* Inventory */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Quantity</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={!formData.stock_quantity ? '' : formData.stock_quantity}
                                onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setFormData({ ...formData, stock_quantity: val, stock: val });
                                }}
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Availability</label>
                            <select
                                className="w-full px-3 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none cursor-pointer"
                                value={formData.stock_status || 'in_stock'}
                                onChange={e => setFormData({ ...formData, stock_status: e.target.value as Product['stock_status'] })}
                            >
                                <option value="in_stock">✅ In Stock</option>
                                <option value="low_stock">⚠️ Low Stock</option>
                                <option value="out_of_stock">❌ Out of Stock</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom save button - easy thumb reach on mobile */}
            <div className="mt-6 flex gap-3">
                <button
                    type="submit"
                    disabled={loading || imageUploading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Saving...' : 'Save Product'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 text-sm font-medium text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
