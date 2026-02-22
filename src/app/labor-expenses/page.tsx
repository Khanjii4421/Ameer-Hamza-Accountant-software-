'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, LaborExpense, CompanyProfile, Project, Vendor } from "@/lib/api";
import { generateLaborLedgerPDF } from "@/utils/pdfGenerator";

const DEFAULT_CATEGORIES = ['Excavator', 'Shuttering', 'Mason', 'Labor', 'Electrician', 'Plumber', 'Steel Fixer', 'Painter'];

export default function LaborExpensesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const canAccess = isAdmin || isManager;

    // State
    const [expenses, setExpenses] = useState<LaborExpense[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [sites, setSites] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && !canAccess) {
            router.push('/');
        }
    }, [user, canAccess, router]);

    // Load Data
    useEffect(() => {
        if (canAccess) {
            loadData();
        }
    }, [canAccess]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [exp, prof, projects, vends] = await Promise.all([
                api.laborExpenses.getAll(),
                api.profile.get(),
                api.projects.getAll(),
                api.vendors.getAll()
            ]);
            if (exp) setExpenses(exp.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            if (prof) {
                setProfile(prof);
                if (prof.labor_categories && prof.labor_categories.length > 0) {
                    setCategories(prof.labor_categories);
                }
            }
            if (projects) setSites(projects as unknown as Project[]);
            if (vends) setVendors(vends);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<LaborExpense | null>(null);
    const [formData, setFormData] = useState({
        description: '',
        category: '',
        amount: '',
        site_id: '',
        vendor_id: '',
        worker_name: '',
        date: new Date().toISOString().split('T')[0],
        proof_urls: [] as string[],
        is_paid: true,
        payment_date: new Date().toISOString().split('T')[0]
    });
    const [isUploading, setIsUploading] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [period, setPeriod] = useState<'monthly' | 'weekly' | 'quarterly' | 'yearly'>('monthly');

    // Delete state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, expenseId: string | null }>({ isOpen: false, expenseId: null });

    // PDF State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfNotes, setPdfNotes] = useState('');

    // Filtering State
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterSiteId, setFilterSiteId] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterVendorName, setFilterVendorName] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            const data = new FormData();
            files.forEach(file => data.append('file', file));
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data
            });
            if (!res.ok) throw new Error('Upload failed');
            const { urls } = await res.json();
            setFormData(prev => ({ ...prev, proof_urls: [...prev.proof_urls, ...urls] }));
        } catch (error) {
            console.error(error);
            alert('Failed to upload proof');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const removeFile = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            proof_urls: prev.proof_urls.filter(url => url !== urlToRemove)
        }));
    };

    const parseProofUrls = (proof_url?: string): string[] => {
        if (!proof_url) return [];
        try {
            const parsed = JSON.parse(proof_url);
            return Array.isArray(parsed) ? parsed : [proof_url];
        } catch {
            return [proof_url];
        }
    };

    const handleAddOrEditExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.category || !formData.site_id || !formData.date) return;

        // If description is empty but vendor is selected, use vendor name as description
        let finalDescription = formData.description;
        if (!finalDescription) finalDescription = 'Labor Expense';

        try {
            if (editingExpense) {
                // Edit existing
                const updated = await api.laborExpenses.update(editingExpense.id, {
                    description: finalDescription,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    site_id: formData.site_id,
                    vendor_id: formData.vendor_id || undefined,
                    worker_name: formData.worker_name,
                    date: formData.date,
                    proof_url: JSON.stringify(formData.proof_urls),
                    is_paid: formData.is_paid,
                    payment_date: formData.is_paid ? formData.payment_date : undefined
                });

                // Manually join site name for immediate UI update or reload
                const site = sites.find(s => s.id === formData.site_id);
                updated.site_name = site?.title;
                const vendor = vendors.find(v => v.id === formData.vendor_id);
                updated.vendor_name = vendor?.name;
                updated.worker_name = formData.worker_name;

                setExpenses(expenses.map(e => e.id === editingExpense.id ? updated : e));
                setEditingExpense(null);
            } else {
                // Add new
                const newExp = await api.laborExpenses.add({
                    date: formData.date,
                    description: finalDescription,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    site_id: formData.site_id,
                    vendor_id: formData.vendor_id || undefined,
                    worker_name: formData.worker_name,
                    proof_url: JSON.stringify(formData.proof_urls),
                    is_paid: formData.is_paid,
                    payment_date: formData.is_paid ? formData.payment_date : undefined
                });

                const site = sites.find(s => s.id === formData.site_id);
                newExp.site_name = site?.title;
                const vendor = vendors.find(v => v.id === formData.vendor_id);
                newExp.vendor_name = vendor?.name;
                newExp.worker_name = formData.worker_name;

                setExpenses([...expenses, newExp]);
            }
            setFormData({
                description: '',
                category: '',
                amount: '',
                site_id: '',
                vendor_id: '',
                worker_name: '',
                date: new Date().toISOString().split('T')[0],
                proof_urls: [] as string[],
                is_paid: true,
                payment_date: new Date().toISOString().split('T')[0]
            });
            setIsModalOpen(false);
        } catch (err) {
            alert('Failed to save expense');
        }
    };

    const handleEditClick = (expense: LaborExpense) => {
        setEditingExpense(expense);
        setFormData({
            description: expense.description,
            category: expense.category,
            amount: expense.amount.toString(),
            site_id: expense.site_id || '',
            vendor_id: expense.vendor_id || '',
            worker_name: expense.worker_name || '',
            date: expense.date.split('T')[0],
            proof_urls: parseProofUrls(expense.proof_url),
            is_paid: expense.is_paid ?? true,
            payment_date: expense.payment_date ? expense.payment_date.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const filteredVendors = useMemo(() => {
        if (!formData.category) return [];
        return vendors.filter(v => v.category === formData.category);
    }, [vendors, formData.category]);

    const handleDeleteClick = (expenseId: string) => {
        if (isAdmin) {
            setDeleteModal({ isOpen: true, expenseId });
        }
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (deleteModal.expenseId) {
            try {
                await api.laborExpenses.delete(deleteModal.expenseId);
                setExpenses(expenses.filter(exp => exp.id !== deleteModal.expenseId));
            } catch (err) {
                alert('Failed to delete expense');
            }
        }
        setDeleteModal({ isOpen: false, expenseId: null });
    };

    const handleMarkAllPaid = async () => {
        const unpaidIds = filteredHistory.filter(e => !e.is_paid).map(e => e.id);
        if (unpaidIds.length === 0) return;

        if (!confirm(`Are you sure you want to mark all ${unpaidIds.length} unpaid expenses as PAID?`)) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            await api.laborExpenses.patchBulk(unpaidIds, {
                is_paid: true,
                payment_date: today
            });

            // Update local state
            setExpenses(expenses.map(exp =>
                unpaidIds.includes(exp.id)
                    ? { ...exp, is_paid: true, payment_date: today }
                    : exp
            ));

            alert('Successfully marked all as paid');
        } catch (error) {
            console.error(error);
            alert('Failed to update expenses');
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory || categories.includes(newCategory)) return;

        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        setNewCategory('');

        // Update profile in DB
        if (profile) {
            await api.profile.update({
                labor_categories: updatedCategories
            });
        }
        setIsCategoryModalOpen(false);
    };

    const periodStats = useMemo(() => {
        const groups: Record<string, number> = {};

        expenses.forEach(exp => {
            const date = new Date(exp.date);
            let key = '';

            if (period === 'weekly') {
                const weekNum = Math.ceil((date.getDate()) / 7);
                key = `Week ${weekNum}, ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
            } else if (period === 'monthly') {
                key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else if (period === 'quarterly') {
                const quarter = Math.ceil((date.getMonth() + 1) / 3);
                key = `Q${quarter} ${date.getFullYear()}`;
            } else if (period === 'yearly') {
                key = date.getFullYear().toString();
            }

            groups[key] = (groups[key] || 0) + Number(exp.amount);
        });

        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [expenses, period]);

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const paidTotal = expenses.filter(e => e.is_paid).reduce((sum, e) => sum + Number(e.amount), 0);
    const unpaidTotal = totalExpense - paidTotal;

    const filteredHistory = useMemo(() => {
        return expenses.filter(exp => {
            const dateMatch = (!filterStartDate || exp.date >= filterStartDate) &&
                (!filterEndDate || exp.date <= filterEndDate);
            const siteMatch = !filterSiteId || exp.site_id === filterSiteId;
            const categoryMatch = !filterCategory || exp.category === filterCategory;

            const vendorMatch = !filterVendorName ||
                (exp.vendor_name && exp.vendor_name.toLowerCase().includes(filterVendorName.toLowerCase())) ||
                (exp.worker_name && exp.worker_name.toLowerCase().includes(filterVendorName.toLowerCase())) ||
                (exp.description && exp.description.toLowerCase().includes(filterVendorName.toLowerCase()));

            const statusMatch = filterStatus === 'all' ||
                (filterStatus === 'paid' && exp.is_paid) ||
                (filterStatus === 'unpaid' && !exp.is_paid);

            return dateMatch && siteMatch && categoryMatch && vendorMatch && statusMatch;
        });
    }, [expenses, filterStartDate, filterEndDate, filterSiteId, filterCategory, filterVendorName, filterStatus]);

    const siteStats = useMemo(() => {
        const groups: Record<string, number> = {};
        expenses.forEach(exp => {
            const siteName = exp.site_name || 'Unknown Site';
            groups[siteName] = (groups[siteName] || 0) + Number(exp.amount);
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]); // Sort by amount desc
    }, [expenses]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!canAccess) return <div className="p-8 text-center text-gray-500">Authorized Access Only. Redirecting...</div>;

    return (
        <>
            <Header
                title="Labor Expenses & Site Payments"
                action={
                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => router.push('/labor-vendor-ledger')}>📋 Vendor Ledger</Button>
                        <Button variant="secondary" size="sm" onClick={() => setIsPdfModalOpen(true)}>Download Report</Button>
                        <Button variant="secondary" size="sm" onClick={() => setIsCategoryModalOpen(true)}>Manage Categories</Button>
                        {expenses.some(e => !e.is_paid) && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                                onClick={handleMarkAllPaid}
                            >
                                ✅ Paid All
                            </Button>
                        )}
                        <Button variant="primary" size="sm" onClick={() => {
                            setEditingExpense(null);
                            setFormData({
                                description: '',
                                category: '',
                                amount: '',
                                site_id: '',
                                vendor_id: '',
                                worker_name: '',
                                date: new Date().toISOString().split('T')[0],
                                proof_urls: [] as string[],
                                is_paid: true,
                                payment_date: new Date().toISOString().split('T')[0]
                            });
                            setIsModalOpen(true);
                        }}>+ Record Labor</Button>
                    </div>
                }
            />

            <div className="p-4 md:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500 font-medium">Total Labor Cost</p>
                        <p className="text-2xl font-bold text-yellow-600">Rs. {totalExpense.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">{expenses.length} payments</p>
                    </Card>
                    <Card className="border-l-4 border-green-500">
                        <p className="text-sm text-gray-500 font-medium">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">Rs. {paidTotal.toLocaleString()}</p>
                        <p className="text-xs text-green-400 mt-1">Cleared entries</p>
                    </Card>
                    <Card className="border-l-4 border-red-500">
                        <p className="text-sm text-gray-500 font-medium">Total Unpaid</p>
                        <p className="text-2xl font-bold text-red-600">Rs. {unpaidTotal.toLocaleString()}</p>
                        <p className="text-xs text-red-400 mt-1">Pending reimbursement</p>
                    </Card>
                    <Card className="border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 font-medium">Active Sites</p>
                        <p className="text-2xl font-bold text-blue-600">{sites.filter(s => s.status === 'Active').length}</p>
                        <p className="text-xs text-gray-400 mt-1">Total {sites.length} sites</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Expense Trends">
                        <div className="flex gap-2 mb-4">
                            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${period === p ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="h-64 overflow-auto">
                            {periodStats.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-600">Period</th>
                                            <th className="text-right py-2 px-3 text-sm font-semibold text-gray-600">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodStats.map(([period, amount]) => (
                                            <tr key={period} className="border-b last:border-0">
                                                <td className="py-2 px-3 text-sm text-gray-900">{period}</td>
                                                <td className="py-2 px-3 text-right text-sm font-bold text-gray-900">Rs. {amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-gray-400 mt-10">No data</p>}
                        </div>
                    </Card>

                    <Card title="Cost by Site">
                        <div className="h-80 overflow-auto">
                            {expenses.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-2 px-3 text-sm font-semibold text-gray-600">Site</th>
                                            <th className="text-right py-2 px-3 text-sm font-semibold text-gray-600">Total Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {siteStats.map(([site, amount]) => (
                                            <tr key={site} className="border-b last:border-0">
                                                <td className="py-2 px-3 text-sm text-gray-900">{site}</td>
                                                <td className="py-2 px-3 text-right text-sm font-bold text-gray-900">Rs. {amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-gray-400 mt-10">No data</p>}
                        </div>
                    </Card>
                </div>

                <Card title="Labor Payment History" className="min-h-[50vh]">
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">From Date</label>
                            <DatePicker
                                value={filterStartDate}
                                onChange={(val) => setFilterStartDate(val)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">To Date</label>
                            <DatePicker
                                value={filterEndDate}
                                onChange={(val) => setFilterEndDate(val)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Filter by Site</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={filterSiteId}
                                onChange={(e) => setFilterSiteId(e.target.value)}
                            >
                                <option value="">All Sites</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Filter by Category</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Vendor / Worker Name</label>
                            <Input
                                placeholder="Search Name..."
                                value={filterVendorName}
                                onChange={(e) => setFilterVendorName(e.target.value)}
                                className="w-full text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Payment Status</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'paid' | 'unpaid')}
                            >
                                <option value="all">All Status</option>
                                <option value="paid">Paid Only</option>
                                <option value="unpaid">Unpaid Only</option>
                            </select>
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setFilterStartDate('');
                                    setFilterEndDate('');
                                    setFilterSiteId('');
                                    setFilterCategory('');
                                    setFilterVendorName('');
                                    setFilterStatus('all');
                                }}
                                className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Clear All Filters ✕
                            </button>
                        </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">🔍</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">No Payments Found</h3>
                            <p className="text-gray-500 mt-2 max-w-sm mb-6">
                                Try adjusting your filters or search for a different date range.
                            </p>
                            <Button variant="secondary" onClick={() => {
                                setFilterStartDate('');
                                setFilterEndDate('');
                                setFilterSiteId('');
                                setFilterCategory('');
                                setFilterVendorName('');
                                setFilterStatus('all');
                            }}>Clear Filters</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <div className="min-w-max">
                                <div className="mb-2 text-right w-full pr-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Filtered Total: </span>
                                    <span className="text-sm font-black text-red-600">Rs. {filteredHistory.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}</span>
                                </div>
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Site</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Vendor / Worker</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {filteredHistory.map(expense => (
                                            <tr key={expense.id} className="group hover:bg-gray-50 transition-colors whitespace-nowrap">
                                                <td className="py-3 px-4 text-gray-600 font-bold">{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="py-3 px-4 font-medium text-gray-900">{expense.site_name || 'N/A'}</td>
                                                <td className="py-3 px-4 text-gray-800 font-medium">
                                                    {expense.vendor_name ? (
                                                        <span className="text-blue-600">{expense.vendor_name}</span>
                                                    ) : expense.worker_name ? (
                                                        <span className="text-gray-800 font-bold">{expense.worker_name}</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-gray-800">{expense.description}</td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md text-xs font-medium">{expense.category}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {expense.is_paid ? (
                                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Paid</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Unpaid</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-red-600">
                                                    Rs. {Number(expense.amount).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {parseProofUrls(expense.proof_url).map((url, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded bg-white shadow-sm border border-blue-100"
                                                                title={`View Proof ${idx + 1}`}
                                                            >
                                                                📎
                                                            </a>
                                                        ))}
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(expense)}>✏️ Edit</Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                                                            onClick={() => handleDeleteClick(expense.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingExpense(null); }}
                title={editingExpense ? "Edit Labor Expense" : "Record Labor Expense"}
            >
                <form onSubmit={handleAddOrEditExpense} className="space-y-4">
                    <DatePicker
                        label="Date"
                        value={formData.date}
                        onChange={(val) => setFormData({ ...formData, date: val })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Site / Project</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={formData.site_id}
                            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                            required
                        >
                            <option value="">Select Site</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>
                                    {site.title} {site.status !== 'Active' ? '(Inactive)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Labor Category</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value, vendor_id: '' })}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {filteredVendors.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Vendor / Worker ({formData.category})</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.vendor_id}
                                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                            >
                                <option value="">Select Worker (Optional)</option>
                                {filteredVendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!formData.vendor_id && (
                        <div className="animate-fade-in-down">
                            <Input
                                label="Worker Name (Manual)"
                                placeholder="Enter name e.g. Ali, Ahmed..."
                                value={formData.worker_name}
                                onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
                            />
                        </div>
                    )}

                    <Input
                        label="Description"
                        placeholder="e.g. Daily wage, 5 Excavators, etc."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required={!formData.vendor_id}
                    />

                    <Input
                        label="Amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                    />

                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.is_paid}
                                onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">Has Been Paid?</span>
                        </label>
                    </div>

                    {formData.is_paid && (
                        <div className="animate-fade-in">
                            <DatePicker
                                label="Payment Date"
                                value={formData.payment_date}
                                onChange={(val) => setFormData({ ...formData, payment_date: val })}
                                required={formData.is_paid}
                            />
                        </div>
                    )}

                    {!formData.is_paid && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-center gap-2 animate-pulse">
                            <span>💡</span> This will be marked as <strong>Unpaid</strong> (to be reimbursed later).
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Proof / Slip (Upload Multiple)</label>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    multiple
                                    className="block w-full text-sm text-gray-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-primary file:text-white
                                      hover:file:bg-blue-600
                                      cursor-pointer
                                    "
                                    disabled={isUploading}
                                />
                                {isUploading && <span className="text-sm text-gray-400 animate-pulse">Uploading...</span>}
                            </div>

                            {formData.proof_urls.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {formData.proof_urls.map((url, index) => (
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

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isUploading}>{editingExpense ? 'Update' : 'Save'} Payment</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Manage Labor Categories"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <span key={cat} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                {cat}
                            </span>
                        ))}
                    </div>

                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <Input
                            placeholder="New category name..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button type="submit" variant="primary">Add</Button>
                    </form>
                </div>
            </Modal>

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, expenseId: null })}
                title="Confirm Deletion"
            >
                <form onSubmit={confirmDelete} className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
                        <p className="font-bold mb-1">Warning: Irreversible Action</p>
                        <p>This labor expense record will be permanently deleted.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setDeleteModal({ isOpen: false, expenseId: null })}>Cancel</Button>
                        <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white">Confirm Delete</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="Download Labor Report PDF">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">These notes will be printed on the bottom left of the PDF.</p>
                        <textarea
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary outline-none resize-none"
                            rows={4}
                            placeholder="Enter notes here..."
                            value={pdfNotes}
                            onChange={(e) => setPdfNotes(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => {
                            generateLaborLedgerPDF(filteredHistory, profile, pdfNotes);
                            setIsPdfModalOpen(false);
                        }}>Download PDF</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
