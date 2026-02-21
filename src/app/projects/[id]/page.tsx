import ProjectDetailsClient from "./ProjectDetailsClient";
import { use } from "react";

export async function generateStaticParams() {
    return [];
}

export default function ProjectLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <ProjectDetailsClient projectId={id} />;
}
