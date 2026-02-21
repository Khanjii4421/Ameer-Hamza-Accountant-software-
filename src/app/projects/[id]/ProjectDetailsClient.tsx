'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState, useEffect } from "react";
import { generateLedgerPDF, generatePaymentSlip } from "@/utils/pdfGenerator";
import { useAuth } from "@/context/AuthContext";
import { api, LedgerEntry, Vendor, Project, Client, CompanyProfile } from "@/lib/api";
import Link from 'next/link';

export default function ProjectDetailsClient({ projectId }: { projectId: string }) {
    const { user } = useAuth();

    const isAdmin = user?.role === 'Admin';
    const canDeleteDirectly = isAdmin;
    const showDelete = canDeleteDirectly;
    const canEdit = user?.role !== 'Viewer';

    // -- STATE --
    const [activeTab, setActiveTab] = useState<'ledger' | 'vendors'>('ledger');

    // API Data
    const [project, setProject] = useState<any>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [projectVendors, setProjectVendors] = useState<Vendor[]>([]);
    const [allVendors, setAllVendors] = useState<Vendor[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // -- DATA FETCHING --
    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allProjects, allLedger, allV, prof] = await Promise.all([
                api.projects.getAll(),
                api.ledger.getAll({ project_id: projectId }),
                api.vendors.getAll(),
                api.profile.get()
            ]);

            const proj = (allProjects as any[]).find(p => p.id === projectId);
            if (proj) {
                setProject(proj);
            }

            const projEntries = (allLedger as any[]).filter(e => e.project_id === projectId);
            projEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEntries(projEntries);

            setAllVendors(allV);

            const vendorIds = new Set(projEntries.map(e => e.vendor_id).filter(Boolean));
            const projV = allV.filter(v => vendorIds.has(v.id));
            setProjectVendors(projV);

            if (prof) setProfile(prof);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // -- DERIVED DATA --
    let runningBal = 0;
    const detailedEntries = entries.map(entry => {
        const amt = Number(entry.amount);
        if (entry.type === 'CREDIT') runningBal += amt;
        else runningBal -= amt;
        return { ...entry, balance: runningBal, amount: amt };
    });

    const totalCredit = detailedEntries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = detailedEntries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalCredit - totalExpense;

    const expenseByCategory: Record<string, number> = {};
    detailedEntries.filter(e => e.type === 'DEBIT').forEach(e => {
        let cat = 'Uncategorized';
        if (e.vendor_id) {
            const v = allVendors.find(vend => vend.id === e.vendor_id);
            if (v) cat = v.category;
        }
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    // -- MODAL STATES --
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
    const [entryForm, setEntryForm] = useState({
        description: '',
        amount: '',
        type: 'DEBIT',
        paymentMethod: 'Cash',
        vendorId: '',
        transactionId: '',
        receivedBy: '',
        attachment_urls: [] as string[],
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5)
    });
    const [vendorForm, setVendorForm] = useState({ id: '', name: '', category: '', phone: '' });
    const [projectForm, setProjectForm] = useState({ title: '', description: '', location: '' });
    const [pdfNotes, setPdfNotes] = useState('');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    // -- ACTIONS --
    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectForm.title) return;

        try {
            await api.projects.update(projectId, {
                title: projectForm.title,
                description: projectForm.description,
                location: projectForm.location
            });
            await loadData();
            setIsEditProjectModalOpen(false);
        } catch (error) {
            alert('Failed to update project');
        }
    };

    const handleAddOrEditEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entryForm.amount || !entryForm.description) return;

        try {
            // Combine date and time into ISO datetime string
            const datetime = `${entryForm.date}T${entryForm.time}:00`;

            const entryData = {
                project_id: projectId,
                vendor_id: entryForm.vendorId || undefined,
                date: datetime, // Send combined datetime
                description: entryForm.description,
                amount: parseFloat(entryForm.amount),
                type: entryForm.type as 'CREDIT' | 'DEBIT',
                payment_method: entryForm.paymentMethod,
                transaction_id: entryForm.transactionId,
                received_by: entryForm.receivedBy,
                attachment_url: JSON.stringify(entryForm.attachment_urls)
            };

            if (editingEntryId) {
                await api.ledger.update(editingEntryId, entryData);
            } else {
                await api.ledger.add(entryData);
            }

            await loadData();
            setIsEntryModalOpen(false);
            setEditingEntryId(null);
            setEntryForm({
                description: '',
                amount: '',
                type: 'DEBIT',
                paymentMethod: 'Cash',
                vendorId: '',
                transactionId: '',
                receivedBy: '',
                attachment_urls: [],
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 5)
            });
        } catch (error) {
            alert(editingEntryId ? 'Failed to update transaction' : 'Failed to add transaction');
        }
    };

    const handleEditEntry = (entry: LedgerEntry) => {
        // Parse date and time from entry.date (which may be datetime string)
        const entryDate = new Date(entry.date);
        const dateStr = entryDate.toISOString().split('T')[0];
        const timeStr = entryDate.toTimeString().slice(0, 5);

        setEditingEntryId(entry.id);
        setEntryForm({
            description: entry.description,
            amount: entry.amount.toString(),
            type: entry.type,
            paymentMethod: entry.payment_method || 'Cash',
            vendorId: entry.vendor_id || '',
            transactionId: entry.transaction_id || '',
            receivedBy: entry.received_by || '',
            attachment_urls: parseProofUrls(entry.attachment_url),
            date: dateStr,
            time: timeStr
        });
        setIsEntryModalOpen(true);
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) return;
        try {
            await api.ledger.delete(id);
            await loadData();
            alert('Entry deleted successfully!');
        } catch (error: any) {
            console.error('Delete error:', error);
            alert(`Failed to delete entry: ${error.message || 'Unknown error occurred'}`);
        }
    };

    const handlePrintSlip = (entry: LedgerEntry) => {
        const vendor = entry.vendor_id ? allVendors.find(v => v.id === entry.vendor_id) : null;
        const adaptedEntry = { ...entry, vendorId: entry.vendor_id, projectId: entry.project_id, paymentMethod: entry.payment_method };
        generatePaymentSlip(adaptedEntry as any, project as any, vendor as any, profile);
    };

    const handleAddOrEditVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorForm.name) return;
        try {
            if (editingVendorId) {
                await api.vendors.update(editingVendorId, {
                    name: vendorForm.name,
                    category: vendorForm.category,
                    phone: vendorForm.phone,
                    address: ''
                });
            } else {
                await api.vendors.add({
                    name: vendorForm.name,
                    category: vendorForm.category,
                    phone: vendorForm.phone,
                    address: ''
                });
            }
            await loadData();
            setIsVendorModalOpen(false);
            setEditingVendorId(null);
            setVendorForm({ id: '', name: '', category: '', phone: '' });
        } catch (error) {
            alert('Failed to save vendor');
        }
    };

    const handleEditVendor = (vendor: Vendor) => {
        setEditingVendorId(vendor.id);
        setVendorForm({
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            phone: vendor.phone || ''
        });
        setIsVendorModalOpen(true);
    };

    const activeVendorEntries = (selectedVendorId) ? detailedEntries.filter(e => e.vendor_id === selectedVendorId) : [];
    const activeVendorTotal = activeVendorEntries.reduce((sum, e) => sum + e.amount, 0);

    const parseProofUrls = (proof_url?: string): string[] => {
        if (!proof_url) return [];
        try {
            const parsed = JSON.parse(proof_url);
            return Array.isArray(parsed) ? parsed : [proof_url];
        } catch {
            return [proof_url];
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('file', file));
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.urls) {
                setEntryForm(prev => ({
                    ...prev,
                    attachment_urls: [...prev.attachment_urls, ...data.urls]
                }));
            }
        } catch (err) { alert('Upload failed'); }
        finally {
            e.target.value = '';
        }
    };

    const removeFile = (urlToRemove: string) => {
        setEntryForm(prev => ({
            ...prev,
            attachment_urls: prev.attachment_urls.filter(url => url !== urlToRemove)
        }));
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <Header
                title={`Project: ${project?.title || 'Loading...'}`}
                action={
                    <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/50 flex-wrap sm:flex-nowrap max-w-full overflow-hidden">
                        {canEdit && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="whitespace-nowrap shrink-0 h-9"
                                onClick={() => {
                                    setProjectForm({
                                        title: project?.title || '',
                                        description: project?.description || '',
                                        location: project?.location || ''
                                    });
                                    setIsEditProjectModalOpen(true);
                                }}
                            >
                                ✏️ Edit
                            </Button>
                        )}
                        <Button
                            variant={activeTab === 'ledger' ? 'primary' : 'secondary'}
                            size="sm"
                            className="whitespace-nowrap shrink-0 h-9"
                            onClick={() => setActiveTab('ledger')}
                        >
                            Ledger
                        </Button>
                        <Button
                            variant={activeTab === 'vendors' ? 'primary' : 'secondary'}
                            size="sm"
                            className="whitespace-nowrap shrink-0 h-9"
                            onClick={() => setActiveTab('vendors')}
                        >
                            Project Vendors
                        </Button>
                    </div>
                }
            />

            <div className="p-4 md:p-8 space-y-6">
                {activeTab === 'ledger' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-l-4 border-green-500">
                                <p className="text-sm text-gray-500">Total Received (In)</p>
                                <p className="text-2xl font-bold text-green-600">Rs. {totalCredit.toLocaleString()}</p>
                            </Card>
                            <Card className="border-l-4 border-red-500">
                                <p className="text-sm text-gray-500">Total Expenses (Out)</p>
                                <p className="text-2xl font-bold text-red-600">Rs. {totalExpense.toLocaleString()}</p>
                            </Card>
                            <Card className={`border-l-4 ${balance >= 0 ? 'border-accent' : 'border-red-600'}`}>
                                <p className="text-sm text-gray-500">Net Balance</p>
                                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-accent' : 'text-red-600'}`}>Rs. {balance.toLocaleString()}</p>
                            </Card>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {Object.entries(expenseByCategory).map(([cat, amt]) => (
                                <div key={cat} className="min-w-[150px] bg-white p-3 rounded-lg border shadow-sm flex flex-col">
                                    <span className="text-xs text-gray-500 font-bold uppercase">{cat}</span>
                                    <span className="text-lg font-bold text-red-600">Rs. {amt.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsPdfModalOpen(true)} size="sm">Download Ledger PDF</Button>
                            <Button variant="primary" onClick={() => setIsEntryModalOpen(true)} size="sm">+ Add Transaction</Button>
                        </div>

                        <Card title="Project General Ledger">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date & Time</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-green-600">Received</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-red-600">Expense</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 border-l">Balance</th>
                                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {detailedEntries.map(entry => (
                                            <tr key={entry.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-gray-600 text-sm whitespace-nowrap">
                                                    <div>{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                    <div className="text-xs text-gray-400">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    <div>{entry.description}</div>
                                                    <div className="flex flex-row flex-wrap gap-2 mt-1 items-center">
                                                        {entry.payment_method && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-gray-500 inline-flex items-center">{entry.payment_method}</span>}
                                                        {entry.transaction_id && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 inline-flex items-center">ID: {entry.transaction_id}</span>}
                                                        {entry.received_by && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 inline-flex items-center">Rec: {entry.received_by}</span>}
                                                        {parseProofUrls(entry.attachment_url).map((url, idx) => (
                                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-100 inline-flex items-center gap-1" title={`View Proof ${idx + 1}`}>
                                                                📎 Proof {idx + 1}
                                                            </a>
                                                        ))}
                                                        {entry.vendor_id && (
                                                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 inline-flex items-center gap-1">
                                                                <span>👤</span>
                                                                {allVendors.find(v => v.id === entry.vendor_id)?.name || 'Vendor'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">{entry.type === 'CREDIT' ? <span className="text-green-600 font-medium">Rs. {entry.amount.toLocaleString()}</span> : '-'}</td>
                                                <td className="py-3 px-4 text-right">{entry.type === 'DEBIT' ? <span className="text-red-600 font-medium">Rs. {entry.amount.toLocaleString()}</span> : '-'}</td>
                                                <td className="py-3 px-4 text-right font-bold text-gray-900 border-l bg-gray-50/50">Rs. {entry.balance.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {entry.type === 'DEBIT' && (
                                                            <button onClick={() => handlePrintSlip(entry)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800" title="Print Slip">
                                                                🖨️
                                                            </button>
                                                        )}
                                                        {canEdit && (
                                                            <button onClick={() => handleEditEntry(entry)} className="p-1.5 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700" title="Edit">
                                                                ✏️
                                                            </button>
                                                        )}
                                                        {showDelete && (
                                                            <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500 hover:text-red-700" title="Delete">
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}

                {activeTab === 'vendors' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Project Vendors</h2>
                                <p className="text-sm text-gray-500">Vendors involved in this project (via transactions).</p>
                            </div>
                            <Button variant="primary" onClick={() => setIsVendorModalOpen(true)}>+ Create New Vendor</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projectVendors.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-white rounded-lg border">
                                    <p className="text-gray-500 text-lg mb-2">No vendors found for this project</p>
                                    <p className="text-gray-400 text-sm">Add transactions with vendors to see them here</p>
                                </div>
                            ) : (
                                projectVendors.map(vendor => {
                                    return (
                                        <div key={vendor.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{vendor.name}</h3>
                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-semibold">{vendor.category}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">{vendor.name.charAt(0)}</div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditVendor(vendor);
                                                        }}
                                                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-500 hover:text-blue-700 transition-colors"
                                                        title="Edit Vendor"
                                                    >
                                                        ✏️
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 flex items-center gap-2 cursor-pointer" onClick={() => setSelectedVendorId(vendor.id)}><span>📞</span> {vendor.phone || 'No phone'}</p>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* MODALS (Entry, Vendor, History) */}
                <Modal isOpen={!!selectedVendorId} onClose={() => setSelectedVendorId(null)} title="Vendor Payment History">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                            <span className="font-medium text-gray-700">Total Paid:</span>
                            <span className="font-bold text-red-600 text-xl">Rs. {activeVendorTotal.toLocaleString()}</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 border-b">
                                    <tr><th className="py-3 px-4 text-left font-semibold text-gray-600">Date & Time</th><th className="py-3 px-4 text-left font-semibold text-gray-600">Description</th><th className="py-3 px-4 text-right font-semibold text-gray-600">Amount</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeVendorEntries.map(e => (
                                        <tr key={e.id} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                                                <div>{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                <div className="text-xs text-gray-400">{new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="py-3 px-4"><div className="font-medium text-gray-900">{e.description}</div></td>
                                            <td className="py-3 px-4 text-right font-bold text-red-600">Rs. {e.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end pt-2"><Button variant="ghost" onClick={() => setSelectedVendorId(null)}>Close</Button></div>
                    </div>
                </Modal>

                <Modal isOpen={isEntryModalOpen} onClose={() => { setIsEntryModalOpen(false); setEditingEntryId(null); setEntryForm({ description: '', amount: '', type: 'DEBIT', paymentMethod: 'Cash', vendorId: '', transactionId: '', receivedBy: '', attachment_urls: [], date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) }); }} title={editingEntryId ? "Edit Transaction" : "New Transaction"}>
                    <form onSubmit={handleAddOrEditEntry} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction Type</label>
                            <div className="flex gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" checked={entryForm.type === 'CREDIT'} onChange={() => setEntryForm({ ...entryForm, type: 'CREDIT', vendorId: '' })} className="peer sr-only" /><div className="p-3 text-center border rounded-lg peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700">Received (In)</div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" checked={entryForm.type === 'DEBIT'} onChange={() => setEntryForm({ ...entryForm, type: 'DEBIT' })} className="peer sr-only" /><div className="p-3 text-center border rounded-lg peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-700">Expense (Out)</div>
                                </label>
                            </div>
                        </div>

                        {entryForm.type === 'DEBIT' && (
                            <select className="w-full px-4 py-2 bg-white border rounded-lg" value={entryForm.vendorId} onChange={e => setEntryForm({ ...entryForm, vendorId: e.target.value })}>
                                <option value="">-- No Specific Vendor --</option>
                                {allVendors.map(v => (<option key={v.id} value={v.id}>{v.name} ({v.category})</option>))}
                            </select>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Amount (Rs.)" type="number" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })} required />
                            <select className="w-full px-4 py-2 border rounded-lg" value={entryForm.paymentMethod} onChange={e => setEntryForm({ ...entryForm, paymentMethod: e.target.value })}>
                                <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Easypaisa</option><option>JazzCash</option><option>Online</option>
                            </select>
                        </div>

                        {/* DATE AND TIME FIELDS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <DatePicker
                                    label="Date"
                                    value={entryForm.date}
                                    onChange={val => setEntryForm({ ...entryForm, date: val })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                                <input
                                    type="time"
                                    value={entryForm.time}
                                    onChange={e => setEntryForm({ ...entryForm, time: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* CONDITIONAL FIELDS */}
                        {(entryForm.paymentMethod === 'Cash') ? (
                            <Input label="Received By / Handed To" placeholder="Person Name" value={entryForm.receivedBy} onChange={e => setEntryForm({ ...entryForm, receivedBy: e.target.value })} />
                        ) : (
                            <Input label="Transaction ID / Cheque No" placeholder="e.g. TRX-123456" value={entryForm.transactionId} onChange={e => setEntryForm({ ...entryForm, transactionId: e.target.value })} />
                        )}

                        {/* ATTACHMENT UPLOAD */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Upload Multiple)</label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUpload}
                                        multiple
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                </div>

                                {entryForm.attachment_urls.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {entryForm.attachment_urls.map((url, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline truncate max-w-[150px]">
                                                    File {index + 1}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(url)}
                                                    className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <Input label="Description" value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} required />

                        <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => { setIsEntryModalOpen(false); setEditingEntryId(null); setEntryForm({ description: '', amount: '', type: 'DEBIT', paymentMethod: 'Cash', vendorId: '', transactionId: '', receivedBy: '', attachment_urls: [], date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) }); }}>Cancel</Button><Button type="submit" variant="primary">{editingEntryId ? 'Update Record' : 'Save Record'}</Button></div>
                    </form>
                </Modal>

                <Modal isOpen={isVendorModalOpen} onClose={() => { setIsVendorModalOpen(false); setEditingVendorId(null); setVendorForm({ id: '', name: '', category: '', phone: '' }); }} title={editingVendorId ? "Edit Vendor" : "Create New Vendor"}>
                    <form onSubmit={handleAddOrEditVendor} className="space-y-4">
                        <Input label="Vendor Name" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} required />
                        <Input label="Category" value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })} required />
                        <Input label="Phone Number" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                        <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => { setIsVendorModalOpen(false); setEditingVendorId(null); setVendorForm({ id: '', name: '', category: '', phone: '' }); }}>Cancel</Button><Button type="submit" variant="primary">{editingVendorId ? 'Update Vendor' : 'Add Vendor'}</Button></div>
                    </form>
                </Modal>

                <Modal isOpen={isEditProjectModalOpen} onClose={() => setIsEditProjectModalOpen(false)} title="Edit Project Details">
                    <form onSubmit={handleEditProject} className="space-y-4">
                        <Input label="Project Name" value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} required autoFocus />
                        <Input label="Description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
                        <Input label="Location" value={projectForm.location} onChange={e => setProjectForm({ ...projectForm, location: e.target.value })} />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsEditProjectModalOpen(false)}>Cancel</Button>
                            <Button type="submit" variant="primary">Save Changes</Button>
                        </div>
                    </form>
                </Modal>

                <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="Download Ledger PDF">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                            <p className="text-xs text-gray-500 mb-2">These notes will be printed on the bottom left of the PDF.</p>
                            <textarea
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-accent outline-none resize-none"
                                rows={4}
                                placeholder="Enter notes here..."
                                value={pdfNotes}
                                onChange={(e) => setPdfNotes(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={() => {
                                generateLedgerPDF(project as any, detailedEntries as any, profile, pdfNotes);
                                setIsPdfModalOpen(false);
                            }}>Download PDF</Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
}
