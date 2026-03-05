'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Package, Plus, Loader2 } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import ProductTableRow from '@/components/admin/ProductTableRow';
import { Product } from '@/types';
import toast from 'react-hot-toast';
import { getProducts, deleteProduct, deleteProductImage } from '@/lib/storage';
import { useStore } from '@/context/StoreContext';

export default function AdminProductPage() {
    const { storeId } = useStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const loadProducts = async () => {
        setLoading(true);
        setProducts(await getProducts(storeId!));
        setLoading(false);
    };

    useEffect(() => {
        if (storeId) {
            const timer = setTimeout(() => loadProducts(), 0);
            return () => clearTimeout(timer);
        }
    }, [storeId]);

    const handleCreateNew = () => { setEditingProduct(null); setIsFormOpen(true); };
    const handleEditProduct = (product: Product) => { setEditingProduct(product); setIsFormOpen(true); };
    const handleCloseForm = () => { setIsFormOpen(false); setEditingProduct(null); };
    const handleFormSuccess = () => { handleCloseForm(); loadProducts(); };

    const handleDeleteProduct = async (id: string) => {
        if (!storeId || !confirm('Are you sure you want to delete this product?')) return;
        const product = products.find(p => p.id === id);
        await deleteProduct(id, storeId);

        if (product?.images?.length) {
            for (const img of product.images) {
                if (img.includes('/product-images/')) {
                    await deleteProductImage(img).catch(console.error);
                }
            }
        }

        toast.success('Product deleted!');
        loadProducts();
    };

    const handleSelect = (id: string, isSelected: boolean) => {
        setSelectedIds(prev => isSelected ? [...prev, id] : prev.filter(item => item !== id));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? products.map(p => p.id) : []);
    };

    const handleBulkDelete = async () => {
        if (!storeId || !confirm(`Delete ${selectedIds.length} products?`)) return;

        const productsToDelete = products.filter(p => selectedIds.includes(p.id));
        await Promise.all(selectedIds.map(id => deleteProduct(id, storeId)));

        for (const product of productsToDelete) {
            if (product?.images?.length) {
                for (const img of product.images) {
                    if (img.includes('/product-images/')) {
                        await deleteProductImage(img).catch(console.error);
                    }
                }
            }
        }

        toast.success('Bulk delete complete');
        setSelectedIds([]);
        loadProducts();
    };

    if (loading && !isFormOpen) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-[#111111] transition-colors duration-300 text-slate-400 animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading products...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Management</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{products.length} products total</p>
                </div>
                {!isFormOpen && (
                    <div className="flex gap-3">
                        <button onClick={handleCreateNew} className="hidden md:flex bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-sm transition-all items-center gap-2 font-medium text-base">
                            <Plus size={18} /> Add Product
                        </button>
                    </div>
                )}
            </div>

            {/* FORM vs TABLE */}
            {isFormOpen ? (
                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl shadow-sm border border-slate-100 dark:border-white/10 transition-colors duration-300">
                    <ProductForm initialData={editingProduct} onSuccess={handleFormSuccess} onCancel={handleCloseForm} />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 border-dashed transition-colors duration-300">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-slate-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No products found</h3>
                    <p className="text-slate-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Your inventory is empty. Add your first product to get started.</p>
                    <button onClick={handleCreateNew} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Create new product</button>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-[#111111]/50 border-b border-slate-100 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center md:table-cell hidden">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-[#111111]"
                                            checked={products.length > 0 && selectedIds.length === products.length} onChange={handleSelectAll} />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider w-20 md:table-cell hidden">Image</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider md:table-cell hidden">Product Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider w-32 md:table-cell hidden">Status / Stock</th>
                                    <th className="px-6 py-4 w-12 md:table-cell hidden"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                {products.map(product => (
                                    <ProductTableRow
                                        key={product.id}
                                        product={product}
                                        isSelected={selectedIds.includes(product.id)}
                                        onSelect={handleSelect}
                                        onEdit={() => handleEditProduct(product)}
                                        onDelete={handleDeleteProduct}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* FLOATING BULK DELETE BAR */}
            {selectedIds.length > 0 && !isFormOpen && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-[90%] md:w-auto max-w-md">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center justify-between md:justify-start gap-6 ring-1 ring-white/10">
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{selectedIds.length}</span>
                            <span className="text-sm font-medium text-slate-300">Selected</span>
                        </div>
                        <div className="h-4 w-px bg-white/20 hidden md:block" />
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedIds([])} className="text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors">
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isFormOpen && (
                <button
                    onClick={handleCreateNew}
                    title="Add Product"
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform scale-100 md:hidden"
                >
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
}
