import OrderReviewClient from './OrderReviewClient';

export async function generateStaticParams() {
    return [{ orderId: "dummy" }];
}

export const dynamicParams = true;

export default function OrderReviewPage() {
    return <OrderReviewClient />;
}
