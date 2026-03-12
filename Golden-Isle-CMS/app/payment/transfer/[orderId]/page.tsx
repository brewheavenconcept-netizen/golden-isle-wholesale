import PaymentTransferClient from './PaymentTransferClient';

export async function generateStaticParams() {
    return [{ orderId: "dummy" }];
}

export const dynamicParams = false;

export default function TransferPaymentPage() {
    return <PaymentTransferClient />;
}
