'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { api, Project, LedgerEntry, Client } from "@/lib/api";

export default function ClientDetailsContent({ clientId }: { clientId: string }) {
    const { user } = useAuth();
    const canAdd = user?.role !== 'Viewer';

    // State
    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({ name: '', status: 'Active', description: '', location: '' });
    const [clientFormData, setClientFormData] = useState({ name: '', phone: '', email: '', address: '' });

    // Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            const [allClients, allProjects, allLedger] = await Promise.all([
                api.clients.getAll(),
                api.projects.getAll(),
                api.ledger.getAll({ client_id: clientId })
            ]);

            const currentClient = allClients.find(c => c.id === clientId);
            if (currentClient) {
                setClient(currentClient);
                setClientFormData({
                    name: currentClient.name,
                    phone: currentClient.phone || '',
                    email: currentClient.email || '',
                    address: currentClient.address || ''
                });
            }

            if (allProjects) {
                const clientProjects = allProjects.filter(p => p.client_id === clientId);
                setProjects(clientProjects);
            }
            if (allLedger) {
                setLedger(allLedger as any);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clientId]);

    const handleOpenAddModal = () => {
        setEditingProject(null);
        setFormData({ name: '', status: 'Active', description: '', location: '' });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (project: Project) => {
        setEditingProject(project);
        setFormData({
            name: project.title,
            status: project.status,
            description: project.description || '',
            location: project.location || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProject) {
                await api.projects.update(editingProject.id, {
                    title: formData.name,
                    status: formData.status as any,
                    description: formData.description,
                    location: formData.location
                });
            } else {
                await api.projects.add({
                    title: formData.name,
                    status: formData.status as any,
                    client_id: clientId,
                    description: formData.description,
                    location: formData.location
                });
            }
            setIsModalOpen(false);
            setEditingProject(null);
            setFormData({ name: '', status: 'Active', description: '', location: '' });
            await loadData();
        } catch (error) {
            alert(editingProject ? "Failed to update project" : "Failed to add project");
        }
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.clients.update(clientId, clientFormData);
            await loadData();
            setIsClientModalOpen(false);
        } catch (error) {
            alert("Failed to update client details");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <Header
                title={client ? `Projects: ${client.name}` : "Client Projects"}
                action={
                    <div className="flex gap-2">
                        {canAdd && (
                            <Button variant="secondary" onClick={() => setIsClientModalOpen(true)}>
                                ✏️ Client Profile
                            </Button>
                        )}
                        {canAdd && (
                            <Button variant="primary" onClick={handleOpenAddModal}>
                                + Add New Project
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="p-8">
                {client && (
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-50 border-none shadow-none">
                            <p className="text-xs text-slate-400 font-bold uppercase">Phone</p>
                            <p className="text-sm font-medium text-slate-700">{client.phone || '-'}</p>
                        </Card>
                        <Card className="bg-slate-50 border-none shadow-none">
                            <p className="text-xs text-slate-400 font-bold uppercase">Email</p>
                            <p className="text-sm font-medium text-slate-700">{client.email || '-'}</p>
                        </Card>
                        <Card className="bg-slate-50 border-none shadow-none md:col-span-2">
                            <p className="text-xs text-slate-400 font-bold uppercase">Office Address</p>
                            <p className="text-sm font-medium text-slate-700">{client.address || '-'}</p>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => {
                        const projectLedger = ledger.filter(e => e.project_id === project.id);
                        const totalReceived = projectLedger.filter(e => e.type === 'CREDIT').reduce((s, e) => s + Number(e.amount), 0);
                        const totalSpent = projectLedger.filter(e => e.type === 'DEBIT').reduce((s, e) => s + Number(e.amount), 0);

                        return (
                            <Card
                                key={project.id}
                                title={project.title}
                                action={canAdd && (
                                    <button
                                        onClick={() => handleOpenEditModal(project)}
                                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit Project Details"
                                    >
                                        ✏️
                                    </button>
                                )}
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${project.status === 'Active' ? 'bg-green-100 text-green-700' :
                                            project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Received</p>
                                            <p className="text-sm font-bold text-green-600">Rs. {totalReceived.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Expenses</p>
                                            <p className="text-sm font-bold text-red-600">Rs. {totalSpent.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {project.location && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <span>📍</span> {project.location}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Link href={`/projects/${project.id}`}>
                                            <Button variant="secondary" className="w-full">View Full Ledger</Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    {projects.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border-2 border-dashed">
                            <p className="text-gray-400">No projects found for this client.</p>
                            {canAdd && <Button variant="ghost" className="mt-2" onClick={handleOpenAddModal}>Create First Project</Button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Project Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProject(null); }} title={editingProject ? "Edit Project" : "Add New Project"}>
                <form onSubmit={handleSaveProject} className="space-y-4">
                    <Input
                        label="Project Title"
                        placeholder="e.g. Villa Construction"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Location"
                        placeholder="e.g. DHA Phase 6"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                    <Input
                        label="Description"
                        placeholder="Project details..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Status</label>
                        <select
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="Active">Active</option>
                            <option value="OnHold">On Hold</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditingProject(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Client Edit Modal */}
            <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Edit Client Profile">
                <form onSubmit={handleUpdateClient} className="space-y-4">
                    <Input
                        label="Client Name"
                        value={clientFormData.name}
                        onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Phone"
                        value={clientFormData.phone}
                        onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    />
                    <Input
                        label="Email"
                        value={clientFormData.email}
                        onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                    />
                    <Input
                        label="Address"
                        value={clientFormData.address}
                        onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsClientModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Update Profile</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
