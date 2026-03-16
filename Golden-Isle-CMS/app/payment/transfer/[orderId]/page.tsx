import PaymentTransferClient from './PaymentTransferClient';

export async function generateStaticParams() {
    return [{ orderId: "dummy" }];
}

export const dynamicParams = true;

export default function TransferPaymentPage() {
    return <PaymentTransferClient />;
}
