'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { api, Client, Project, CompanyProfile } from "@/lib/api";

export default function ClientsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const canDeleteDirectly = isAdmin;
    const showDelete = canDeleteDirectly;
    const canAdd = user?.role !== 'Viewer';

    // Add/Edit Client Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, clientId: string | null }>({ isOpen: false, clientId: null });
    const [passwordInput, setPasswordInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [c, p, prof] = await Promise.all([
                api.clients.getAll(),
                api.projects.getAll(),
                api.profile.get()
            ]);
            if (c) setClients(c);
            if (p) setProjects(p);
            if (prof) setProfile(prof);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setEditingClient(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            if (editingClient) {
                await api.clients.update(editingClient.id, {
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address
                });
            } else {
                await api.clients.add({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address
                });
            }
            await loadData();
            setFormData({ name: '', phone: '', email: '', address: '' });
            setIsModalOpen(false);
            setEditingClient(null);
        } catch (error) {
            alert(editingClient ? 'Failed to update client' : 'Failed to add client');
        }
    };

    const handleDeleteClick = (clientId: string) => {
        if (canDeleteDirectly) {
            setDeleteModal({ isOpen: true, clientId });
            setPasswordInput('');
            setErrorMsg('');
        }
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (deleteModal.clientId) {
            try {
                await api.clients.delete(deleteModal.clientId);
                setClients(clients.filter(c => c.id !== deleteModal.clientId));
            } catch (err) {
                alert('Failed to delete client. They might have active projects.');
            }
        }
        setDeleteModal({ isOpen: false, clientId: null });
    };

    // SEARCH FILTER
    const filteredClients = clients.filter(client => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();

        // Search by client name
        if (client.name.toLowerCase().includes(query)) return true;

        // Search by phone number
        if (client.phone && client.phone.toLowerCase().includes(query)) return true;

        // Search by project name
        // Projects have client_id, we need to check if it matches
        const clientProjects = projects.filter(p => p.client_id === client.id);
        const hasMatchingProject = clientProjects.some(p =>
            p.title.toLowerCase().includes(query)
        );

        return hasMatchingProject;
    });

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <Header
                title="Clients & Projects"
                action={canAdd && <Button variant="primary" onClick={handleOpenAddModal}>+ Add New Client</Button>}
            />

            <div className="p-8">
                {/* Search Bar */}
                <div className="mb-6">
                    <Input
                        placeholder="🔍 Search by client name, phone number, or project name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-2xl"
                    />
                    {searchQuery && (
                        <p className="text-sm text-gray-500 mt-2">
                            Found {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                <Card className="min-h-[60vh]">
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">{searchQuery ? '🔍' : '👥'}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                {searchQuery ? 'No Clients Found' : 'No Clients Found'}
                            </h3>
                            <p className="text-gray-500 mt-2 max-w-sm mb-6">
                                {searchQuery
                                    ? `No clients match "${searchQuery}".`
                                    : 'Start by adding your first client to manage their projects and ledgers.'
                                }
                            </p>
                            {!searchQuery && canAdd && <Button variant="primary" onClick={handleOpenAddModal}>Create Client</Button>}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Client Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredClients.map(client => (
                                        <tr key={client.id} className="group hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 font-medium text-gray-900">{client.name}</td>
                                            <td className="py-3 px-4 text-gray-600">{client.phone}</td>
                                            <td className="py-3 px-4 text-gray-600">{client.email}</td>
                                            <td className="py-3 px-4 text-right flex justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleOpenEditModal(client)}
                                                >
                                                    ✏️ Edit
                                                </Button>
                                                <Link href={`/clients/${client.id}`}>
                                                    <Button variant="secondary" size="sm">View Projects</Button>
                                                </Link>
                                                {showDelete && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                                        onClick={() => handleDeleteClick(client.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add/Edit Client Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
                title={editingClient ? "Edit Client" : "Add New Client"}
            >
                <form onSubmit={handleSaveClient} className="space-y-4">
                    <Input
                        label="Client Name"
                        placeholder="e.g. Sheikh Construction Ltd."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <Input
                        label="Phone Number"
                        placeholder="+92 300 1234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="client@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Office Address"
                        placeholder="Office #12, Phase 6, DHA"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditingClient(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingClient ? 'Save Changes' : 'Save Client'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, clientId: null })}
                title="Confirm Deletion"
            >
                <form onSubmit={confirmDelete} className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
                        <p className="font-bold mb-1">Warning: Irreversible Action</p>
                        <p>Deleting a client will also remove access to their projects from this list. Ledger data might remain but organization will be lost.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setDeleteModal({ isOpen: false, clientId: null })}>Cancel</Button>
                        <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white">Confirm Delete</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
