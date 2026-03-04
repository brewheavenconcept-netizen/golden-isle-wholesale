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

    const [formData, setFormData] = useState<Partial<Product>>({
        name: '', price: 0, sku: '', stock: 1,
        category: 'Whisky', description: '', status: 'active', images: [], variants: [],
        stock_status: 'in_stock',
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            if (initialData.images?.length) setImagePreview(initialData.images[0]);
        }
    }, [initialData]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setImageUploading(true);
            try {
                const url = await uploadProductImage(file, storeId || 'default');
                setImagePreview(url);
                setFormData(prev => ({ ...prev, images: [url] }));
                toast.success('Image uploaded successfully');
            } catch (err: any) {
                toast.error(err.message || 'Failed to upload image');
                // Reset file input
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
        } catch (err: any) {
            toast.error(`Error: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto bg-slate-50 dark:bg-[#111111]/50 p-6 rounded-xl transition-colors duration-300">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
                    <button type="submit" disabled={loading || imageUploading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-md">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COL */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">General Information</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Product Name</label>
                            <input required type="text" className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-blue-500 outline-none"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Description</label>
                            <textarea className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white h-32 outline-none"
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>

                    {/* MEDIA */}
                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">Media</h3>
                        <div className={`border-2 border-dashed ${imageUploading ? 'border-blue-400 bg-blue-50' : 'border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-gray-700/50'} rounded-lg p-8 text-center transition cursor-pointer relative`}>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" accept="image/png, image/jpeg, image/webp" onChange={handleFileSelect} disabled={loading || imageUploading} />
                            <div className="flex flex-col items-center pointer-events-none">
                                {imageUploading ? (
                                    <>
                                        <Loader2 className="w-8 h-8 text-blue-500 mb-2 animate-spin" />
                                        <span className="text-blue-600 font-medium">Uploading image...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-blue-600 font-medium">Click to upload image</span>
                                        <span className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 2MB</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {imagePreview && !imageUploading && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border mt-4 group">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => { setImagePreview(null); setFormData(p => ({ ...p, images: [] })); }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* CATEGORY */}
                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">Category</h3>
                        <select
                            required
                            className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Whisky">🥃 Whisky</option>
                            <option value="Wine">🍷 Wine</option>
                            <option value="Craft Beer">🍺 Craft Beer</option>
                        </select>
                    </div>
                </div>

                {/* RIGHT COL */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">Status</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Availability</label>
                            <select className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                                value={formData.stock_status || 'in_stock'}
                                onChange={e => setFormData({ ...formData, stock_status: e.target.value as any })}>
                                <option value="in_stock">✅ In Stock</option>
                                <option value="low_stock">⚠️ Low Stock</option>
                                <option value="out_of_stock">❌ Out of Stock</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">Pricing</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Price (RM)</label>
                            <input
                                required
                                type="text"
                                inputMode="decimal"
                                className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
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

                    <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4 transition-colors duration-300">
                        <h3 className="font-semibold text-slate-700 dark:text-gray-300">Inventory</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-400 mb-1">Quantity</label>
                            <input type="number" className="w-full p-2 bg-white dark:bg-[#111111] border dark:border-white/10 rounded-lg text-slate-900 dark:text-white"
                                value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
