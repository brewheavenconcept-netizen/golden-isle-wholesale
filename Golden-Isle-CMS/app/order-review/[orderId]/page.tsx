import OrderReviewClient from './OrderReviewClient';

export async function generateStaticParams() {
    return [{ orderId: "dummy" }];
}

export const dynamicParams = false;

export default function OrderReviewPage() {
    return <OrderReviewClient />;
}
