type RawOrderItem = Record<string, any>;

export interface NormalizedOrderItem {
    product_id?: string;
    name: string;
    category: string;
    price: string;
    priceNum: number;
    quantity: number;
    total: string;
    image_url?: string;
}

function parseMoney(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

export function normalizeMalaysiaPhone(value?: string | null): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) return `6${digits}`;
    if (digits.startsWith('60')) return digits;
    return digits;
}

export function getMalaysiaPhoneVariants(value?: string | null): string[] {
    const normalized = normalizeMalaysiaPhone(value);
    const variants = new Set<string>();
    const raw = String(value || '').trim();

    if (raw) variants.add(raw);
    if (normalized) {
        variants.add(normalized);
        variants.add(`+${normalized}`);
        if (normalized.startsWith('60')) variants.add(`0${normalized.slice(2)}`);
    }

    return Array.from(variants).filter(Boolean);
}

export function buildPhoneOrFilter(fields: string[], value?: string | null): string {
    const variants = getMalaysiaPhoneVariants(value);
    return fields
        .flatMap(field => variants.map(phone => `${field}.eq.${phone}`))
        .join(',');
}

export function normalizeOrderItem(item: RawOrderItem): NormalizedOrderItem {
    const product = item?.product || {};
    const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
    const unitPrice = parseMoney(
        item?.priceNum ??
        item?.unit_price ??
        item?.price ??
        product?.price
    );
    const totalNum = parseMoney(item?.total) || unitPrice * quantity;
    const name = item?.name || item?.product_name || product?.name || 'Produk';

    return {
        product_id: item?.product_id || product?.id,
        name,
        category: item?.category || product?.category || 'Beverage',
        price: `RM ${unitPrice.toFixed(2)}`,
        priceNum: unitPrice,
        quantity,
        total: `RM ${totalNum.toFixed(2)}`,
        image_url: item?.image_url || item?.image || product?.image_url || product?.images?.[0],
    };
}

export function normalizeOrderItems(items: unknown): NormalizedOrderItem[] {
    return Array.isArray(items) ? items.map(item => normalizeOrderItem(item || {})) : [];
}
