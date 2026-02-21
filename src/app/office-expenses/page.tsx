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
import { api, OfficeExpense, CompanyProfile } from "@/lib/api";
import { generateOfficeExpensesPDF } from "@/utils/pdfGenerator";

const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Internet', 'Maintenance', 'Supplies', 'Food', 'Transport', 'Stationery', 'Printing', 'Entertainment', 'Other'];

export default function OfficeExpensesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const canAccess = isAdmin || isManager;

    // State
    const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
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
            const [exp, prof] = await Promise.all([
                api.officeExpenses.getAll(),
                api.profile.get()
            ]);
            if (exp) setExpenses(exp.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            if (prof) {
                setProfile(prof);
                if (prof.expense_categories && prof.expense_categories.length > 0) {
                    setCategories(prof.expense_categories);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null);
    const [formData, setFormData] = useState({
        description: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        proof_urls: [] as string[],
        is_paid: true,
        payment_date: new Date().toISOString().split('T')[0]
    });
    const [newCategory, setNewCategory] = useState('');
    const [period, setPeriod] = useState<'monthly' | 'weekly' | 'quarterly' | 'yearly'>('monthly');
    const [isUploading, setIsUploading] = useState(false);

    // Delete state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, expenseId: string | null }>({ isOpen: false, expenseId: null });
    const [passwordInput, setPasswordInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedStatus, setSelectedStatus] = useState<'All' | 'Paid' | 'Unpaid'>('All');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfNotes, setPdfNotes] = useState('');
    const [includeStamp, setIncludeStamp] = useState(false);

    const filteredExpensesList = useMemo(() => {
        let filtered = expenses;
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(e => e.category === selectedCategory);
        }
        if (selectedStatus !== 'All') {
            const isPaid = selectedStatus === 'Paid';
            filtered = filtered.filter(e => !!e.is_paid === isPaid);
        }
        return filtered;
    }, [expenses, selectedCategory, selectedStatus]);

    const handleDownloadPDF = async () => {
        setIsPdfModalOpen(true);
    };

    const confirmDownloadPDF = async () => {
        if (profile) {
            await generateOfficeExpensesPDF(filteredExpensesList, profile, selectedCategory, selectedStatus, pdfNotes, includeStamp);
            setIsPdfModalOpen(false);
            setPdfNotes(''); // Reset after download
            setIncludeStamp(false);
        }
    };

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
            // Reset input
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
        if (!formData.amount || !formData.description || !formData.category || !formData.date) return;

        try {
            if (editingExpense) {
                // Edit existing
                const updated = await api.officeExpenses.update(editingExpense.id, {
                    description: formData.description,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    date: formData.date,
                    proof_url: JSON.stringify(formData.proof_urls),
                    is_paid: formData.is_paid,
                    payment_date: formData.is_paid ? formData.payment_date : undefined
                });
                setExpenses(expenses.map(e => e.id === editingExpense.id ? updated : e));
                setEditingExpense(null);
            } else {
                // Add new
                const nextExp = await api.officeExpenses.add({
                    date: formData.date,
                    description: formData.description,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    proof_url: JSON.stringify(formData.proof_urls),
                    is_paid: formData.is_paid,
                    payment_date: formData.is_paid ? formData.payment_date : undefined
                });
                setExpenses([...expenses, nextExp]);
            }
            setFormData({
                description: '',
                category: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                proof_urls: [],
                is_paid: true,
                payment_date: new Date().toISOString().split('T')[0]
            });
            setIsModalOpen(false);
        } catch (err) {
            alert('Failed to save expense');
        }
    };

    const handleEditClick = (expense: OfficeExpense) => {
        setEditingExpense(expense);
        setFormData({
            description: expense.description,
            category: expense.category,
            amount: expense.amount.toString(),
            date: expense.date.split('T')[0],
            proof_urls: parseProofUrls(expense.proof_url),
            is_paid: expense.is_paid ?? true,
            payment_date: expense.payment_date ? expense.payment_date.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (expenseId: string) => {
        if (isAdmin) {
            setDeleteModal({ isOpen: true, expenseId });
            setPasswordInput('');
            setErrorMsg('');
        }
    };

    const confirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (deleteModal.expenseId) {
            try {
                await api.officeExpenses.delete(deleteModal.expenseId);
                setExpenses(expenses.filter(exp => exp.id !== deleteModal.expenseId));
            } catch (err) {
                alert('Failed to delete expense');
            }
        }
        setDeleteModal({ isOpen: false, expenseId: null });
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
                expense_categories: updatedCategories
            });
        }
        setIsCategoryModalOpen(false);
    };

    // Period Analytics
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

    if (loading) return <div className="p-8">Loading...</div>;
    if (!canAccess) return <div className="p-8 text-center text-gray-500">Authorized Access Only. Redirecting...</div>;

    return (
        <>
            <Header
                title="Expenses & Analytics"
                action={
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>Manage Categories</Button>
                        <Button variant="primary" onClick={() => { setEditingExpense(null); setFormData({ description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0], proof_urls: [], is_paid: true, payment_date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}>+ Record Expense</Button>
                    </div>
                }
            />

            <div className="p-4 md:p-8 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-red-500">
                        <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                        <p className="text-3xl font-bold text-red-600">Rs. {totalExpense.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">{expenses.length} transactions</p>
                    </Card>
                    <Card className="border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 font-medium">Categories</p>
                        <p className="text-3xl font-bold text-blue-600">{categories.length}</p>
                        <p className="text-xs text-gray-400 mt-1">Active categories</p>
                    </Card>
                    <Card className="border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500 font-medium">Current Period</p>
                        <p className="text-2xl font-bold text-purple-600 capitalize">{period}</p>
                        <p className="text-xs text-gray-400 mt-1">{periodStats.length} periods tracked</p>
                    </Card>
                </div>

                {/* Period Analytics */}
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

                    {periodStats.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Period</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Spent</th>
                                        <th className="py-3 px-4 w-1/2">Visual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {periodStats.map(([period, amount]) => {
                                        const maxAmount = Math.max(...periodStats.map(s => s[1]));
                                        const percent = (amount / maxAmount) * 100;
                                        return (
                                            <tr key={period}>
                                                <td className="py-3 px-4 font-medium text-gray-900">{period}</td>
                                                <td className="py-3 px-4 text-right font-bold text-red-600">Rs. {amount.toLocaleString()}</td>
                                                <td className="py-3 px-4">
                                                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center py-8 text-gray-400">No data for selected period</p>
                    )}
                </Card>

                {/* Expenses Table */}
                <Card
                    title="All Expenses"
                    className="min-h-[50vh]"
                    action={
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Filter:</span>
                                <select
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary outline-none min-w-[150px] shadow-sm"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>

                                <select
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary outline-none min-w-[120px] shadow-sm ml-2"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={handleDownloadPDF}
                                disabled={filteredExpensesList.length === 0}
                            >
                                📥 Download PDF
                            </Button>
                        </div>
                    }
                >
                    {filteredExpensesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">🗂️</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">No Expenses Found</h3>
                            <p className="text-gray-500 mt-2 max-w-sm mb-6">
                                {expenses.length === 0
                                    ? "No expenses recorded yet."
                                    : `No expenses found matching filters.`}
                            </p>
                            {selectedCategory !== 'All' && (
                                <Button variant="ghost" onClick={() => setSelectedCategory('All')}>Clear Filter</Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredExpensesList.map(expense => (
                                        <tr key={expense.id} className="group hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-gray-600 font-bold">{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="py-3 px-4 font-medium text-gray-900">{expense.description}</td>
                                            <td className="py-3 px-4 text-gray-600">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">{expense.category}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {expense.is_paid ? (
                                                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Paid</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Unpaid</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-red-600">
                                                - Rs. {Number(expense.amount).toLocaleString()}
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
                    )}
                </Card>
            </div>

            {/* Add/Edit Expense Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingExpense(null); }}
                title={editingExpense ? "Edit Expense" : "Record Expense"}
            >
                <form onSubmit={handleAddOrEditExpense} className="space-y-4">
                    <DatePicker
                        label="Date"
                        value={formData.date}
                        onChange={(val) => setFormData({ ...formData, date: val })}
                        required
                    />

                    <Input
                        label="Description"
                        placeholder="e.g. Electricity Bill, Staff Lunch"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        autoFocus
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

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
                            <span>💡</span> This will be marked as <strong>Unpaid</strong> (to be reimbursed by Boss).
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
                        <Button type="submit" variant="primary" disabled={isUploading}>{editingExpense ? 'Update' : 'Save'} Expense</Button>
                    </div>
                </form>
            </Modal>

            {/* Category Management Modal */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Manage Categories"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <span key={cat} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, expenseId: null })}
                title="Confirm Deletion"
            >
                <form onSubmit={confirmDelete} className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
                        <p className="font-bold mb-1">Warning: Irreversible Action</p>
                        <p>This expense will be permanently deleted.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setDeleteModal({ isOpen: false, expenseId: null })}>Cancel</Button>
                        <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white">Confirm Delete</Button>
                    </div>
                </form>
            </Modal>

            {/* PDF Download Modal */}
            <Modal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                title="Download PDF Report"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
                        <p className="font-bold mb-1">Report Customization</p>
                        <p>Add optional notes that will appear at the bottom of the PDF report.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                        <textarea
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary outline-none resize-none"
                            rows={4}
                            placeholder="Enter notes here..."
                            value={pdfNotes}
                            onChange={(e) => setPdfNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-lg">
                        <input
                            type="checkbox"
                            id="includeStamp"
                            className="w-5 h-5 cursor-pointer"
                            checked={includeStamp}
                            onChange={e => setIncludeStamp(e.target.checked)}
                        />
                        <label htmlFor="includeStamp" className="text-sm font-bold text-blue-900 cursor-pointer">
                            Include Digital CEO Stamp / Signature
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={confirmDownloadPDF}>Download PDF</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
