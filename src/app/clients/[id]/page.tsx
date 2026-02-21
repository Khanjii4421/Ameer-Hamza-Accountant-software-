import ClientDetailsContent from "./ClientDetailsContent";
import { use } from "react";

export async function generateStaticParams() {
    return [];
}

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <ClientDetailsContent clientId={id} />;
}
