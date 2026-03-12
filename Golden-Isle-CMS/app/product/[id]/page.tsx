import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import ProductPage from '@/components/store/ProductPage';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data } = await supabase
        .from('products')
        .select('name, description, image_url')
        .eq('id', id)
        .single();

    if (!data) {
        return {
            title: 'Product Not Found | Golden Isle Wholesale'
        };
    }

    const defaultDesc = "Premium wholesale supplier of whisky, wine, and craft beer. Duty-free prices for businesses in Malaysia.";
    const description = data.description ? data.description.substring(0, 160) : defaultDesc;

    return {
        title: `${data.name} | Golden Isle Wholesale`,
        description: description,
        openGraph: {
            title: `${data.name} | Golden Isle Wholesale`,
            description: description,
            type: 'website',
            images: data.image_url ? [{ url: data.image_url }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${data.name} | Golden Isle Wholesale`,
            description: description,
        }
    };
}

export async function generateStaticParams() {
    return [{ id: "dummy" }];
}

export const dynamicParams = false;

export default async function ProductRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#C9A84C]" />
                    <p className="text-[#5a5a4a] text-sm font-medium tracking-widest uppercase font-sans">Loading Selection...</p>
                </div>
            </div>
        }>
            <ProductPage />
        </Suspense>
    );
}
