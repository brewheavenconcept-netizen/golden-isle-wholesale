import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import ProductPage from '@/components/store/ProductPage';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data } = await supabase
        .from('products')
        .select('name, description, image_url')
        .eq('id', params.id)
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

export default function ProductRoute() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#d4a853]" />
                    <p className="text-[#6b6b6b] text-sm font-medium tracking-widest uppercase">Loading Product...</p>
                </div>
            </div>
        }>
            <ProductPage />
        </Suspense>
    );
}
