'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import { numberToWords } from "@/utils/numberToWords";
import { api, CompanyProfile } from "@/lib/api";
import { generateIndependentExpensesPDF } from "@/utils/pdfGenerator";
import { Modal } from "@/components/ui/Modal";

interface Expense {
    id: string;
    sr_no: string;
    name: string;
    vendor_name: string;
    vendor_category: string;
    site: string;
    date: string;
    description: string;
    amount: number;
    slip_url?: string;
    created_at: string;
}

export default function IndependentExpensesPage() {
    const { user } = useAuth();

    // State
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [showToast, setShowToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });
    const firstInputRef = useRef<HTMLInputElement>(null);

    const [filters, setFilters] = useState({
        search: '',
        site: '',
        vendor: '',
        category: '',
        startDate: '',
        endDate: ''
    });

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfNotes, setPdfNotes] = useState('');
    const [includeStamp, setIncludeStamp] = useState(false);

    // Form State
    const [form, setForm] = useState({
        sr_no: '',
        name: '',
        vendor_name: '',
        vendor_category: '',
        site: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        slip_url: ''
    });

    useEffect(() => {
        if (user) {
            loadData();
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const profile = await api.profile.get();
            setCompanyProfile(profile);
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/independent-expenses', {
                headers: {
                    'X-Company-ID': user?.company_id || '' // Assuming we can get company_id from user context, if not I handles it in API
                }
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));

                // Calculate next Sr No
                let nextSrNo = '1';
                if (data.length > 0) {
                    const maxSrNo = Math.max(...data.map((e: any) => parseInt(e.sr_no) || 0));
                    nextSrNo = (maxSrNo + 1).toString();
                }

                // Reset form with next Sr No and keep other fields fresh
                setForm(prev => ({
                    ...prev,
                    sr_no: nextSrNo,
                    name: '',
                    vendor_name: '',
                    vendor_category: '',
                    site: '',
                    amount: '',
                    description: '',
                    slip_url: '',
                    date: prev.date || new Date().toISOString().split('T')[0]
                }));

                // Auto-focus the first field for next entry
                setTimeout(() => firstInputRef.current?.focus(), 100);
            }
        } catch (error) {
            console.error("Failed to load expenses", error);
        } finally {
            setLoading(false);
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
            // Assuming single file upload for now based on "slip" singular, taking first url
            const url = urls[0];
            setForm(prev => ({ ...prev, slip_url: url }));
        } catch (error) {
            console.error(error);
            alert('Failed to upload slip');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `/api/independent-expenses/${editingId}`
                : '/api/independent-expenses';

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Company-ID': user?.company_id || ''
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error("Failed to save");

            await loadData();
            setEditingId(null);

            // Central Success Toast
            setShowToast({
                message: editingId ? "Expense updated successfully!" : "Expense saved successfully!",
                visible: true
            });

            setTimeout(() => {
                setShowToast(prev => ({ ...prev, visible: false }));
            }, 3000);

        } catch (error) {
            console.error(error);
            alert("Error saving expense");
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setForm({
            sr_no: expense.sr_no,
            name: expense.name,
            vendor_name: expense.vendor_name,
            vendor_category: expense.vendor_category,
            site: expense.site,
            date: expense.date,
            description: expense.description,
            amount: expense.amount.toString(),
            slip_url: expense.slip_url || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        try {
            const res = await fetch(`/api/independent-expenses/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Company-ID': user?.company_id || ''
                }
            });
            if (!res.ok) throw new Error("Delete failed");
            await loadData();
            alert("Expense deleted successfully!");
        } catch (error) {
            console.error(error);
            alert("Error deleting expense");
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        loadData(); // This will reset the form and sr_no
    };

    // Filter Logic
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesSearch = !filters.search ||
                e.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                e.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                e.sr_no.includes(filters.search);

            const matchesSite = !filters.site || e.site === filters.site;
            const matchesVendor = !filters.vendor || e.vendor_name === filters.vendor;
            const matchesCategory = !filters.category || e.vendor_category === filters.category;

            const matchesDate = (!filters.startDate || e.date >= filters.startDate) &&
                (!filters.endDate || e.date <= filters.endDate);

            return matchesSearch && matchesSite && matchesVendor && matchesCategory && matchesDate;
        });
    }, [expenses, filters]);

    // Dashboard Calculations (Based on Filtered Data)
    const siteSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const site = e.site || 'Unknown';
            summary[site] = (summary[site] || 0) + Number(e.amount);
        });
        return summary;
    }, [filteredExpenses]);

    const categorySummary = useMemo(() => {
        const summary: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const cat = e.vendor_category || 'Uncategorized';
            summary[cat] = (summary[cat] || 0) + Number(e.amount);
        });
        return summary;
    }, [filteredExpenses]);

    const vendorSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const vendor = e.vendor_name || 'Unknown Vendor';
            summary[vendor] = (summary[vendor] || 0) + Number(e.amount);
        });
        return summary;
    }, [filteredExpenses]);

    const totalExpense = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const generatePDF = () => {
        setIsPdfModalOpen(true);
    };

    const confirmDownloadPDF = async () => {
        if (companyProfile) {
            await generateIndependentExpensesPDF(filteredExpenses, companyProfile, filters, pdfNotes, includeStamp);
            setIsPdfModalOpen(false);
            setPdfNotes('');
            setIncludeStamp(false);
        }
    };

    // Turbo Entry Helpers - Get unique historical values
    const history = useMemo(() => {
        const getUnique = (arr: (string | undefined)[]) => {
            const seen = new Set<string>();
            const unique: string[] = [];

            arr.filter(Boolean).forEach(val => {
                const normalized = val!.trim().toLowerCase();
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    unique.push(val!.trim());
                }
            });
            return unique.slice(0, 10);
        };

        return {
            names: getUnique(expenses.map(e => e.name)),
            vendors: getUnique(expenses.map(e => e.vendor_name)),
            categories: getUnique(expenses.map(e => e.vendor_category)),
            sites: getUnique(expenses.map(e => e.site)),
        };
    }, [expenses]);

    const QuickChips = ({ values, onSelect }: { values: string[], onSelect: (v: string) => void }) => (
        <div className="flex flex-wrap gap-1 mt-1">
            {values.slice(0, 3).map(v => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onSelect(v)}
                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors border border-slate-200"
                >
                    {v}
                </button>
            ))}
        </div>
    );

    const QuickDays = () => {
        if (!form.date) return null;
        const [year, month, dayStr] = form.date.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const currentDay = parseInt(dayStr);

        return (
            <div className="mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex justify-between">
                    <span>Quick Day ( {new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} )</span>
                </p>
                <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 border border-slate-100 rounded-xl overflow-y-auto max-h-24 scrollbar-hide">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => {
                                const newDay = day.toString().padStart(2, '0');
                                setForm({ ...form, date: `${year}-${month}-${newDay}` });
                            }}
                            className={`text-[11px] w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 ${currentDay === day
                                ? 'bg-primary text-white border-primary shadow-md font-bold'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <Header title="Daily Expenses (Independent)" />

            {/* Success Toast */}
            {showToast.visible && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/20 backdrop-blur-md">
                        <span className="text-xl">✅</span>
                        <span className="font-bold tracking-wide">{showToast.message}</span>
                    </div>
                </div>
            )}

            <div className="p-4 md:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Form */}
                    <Card title={editingId ? "Edit Expense Entry" : "New Expense Entry"} className="h-fit">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {editingId && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                                    <span>Editing Expense Sr No: {form.sr_no}</span>
                                    <button type="button" onClick={cancelEdit} className="text-blue-600 font-bold hover:underline">Cancel</button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Sr No"
                                    value={form.sr_no}
                                    onChange={e => setForm({ ...form, sr_no: e.target.value })}
                                    placeholder="e.g. 001"
                                />
                                <div className="space-y-1">
                                    <Input
                                        ref={firstInputRef}
                                        label="Person Name"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="Enter Name"
                                        list="history-names"
                                    />
                                    <datalist id="history-names">
                                        {history.names.map(n => <option key={n} value={n} />)}
                                    </datalist>
                                    <QuickChips values={history.names} onSelect={v => setForm({ ...form, name: v })} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        label="Vendor Name"
                                        value={form.vendor_name}
                                        onChange={e => setForm({ ...form, vendor_name: e.target.value })}
                                        placeholder="Enter Vendor Name"
                                        list="history-vendors"
                                    />
                                    <datalist id="history-vendors">
                                        {history.vendors.map(v => <option key={v} value={v} />)}
                                    </datalist>
                                    <QuickChips values={history.vendors} onSelect={v => setForm({ ...form, vendor_name: v })} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        label="Vendor Category"
                                        value={form.vendor_category}
                                        onChange={e => setForm({ ...form, vendor_category: e.target.value })}
                                        placeholder="e.g. Plumber, Electrician"
                                        list="history-categories"
                                    />
                                    <datalist id="history-categories">
                                        {history.categories.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                    <QuickChips values={history.categories} onSelect={v => setForm({ ...form, vendor_category: v })} />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        label="Site Name"
                                        value={form.site}
                                        onChange={e => setForm({ ...form, site: e.target.value })}
                                        placeholder="e.g. Site A"
                                        list="history-sites"
                                    />
                                    <datalist id="history-sites">
                                        {history.sites.map(s => <option key={s} value={s} />)}
                                    </datalist>
                                    <QuickChips values={history.sites} onSelect={v => setForm({ ...form, site: v })} />
                                </div>
                                <div className="space-y-1">
                                    <DatePicker
                                        label="Date"
                                        value={form.date}
                                        onChange={val => setForm({ ...form, date: val })}
                                    />
                                    <QuickDays />
                                </div>
                                <div className="space-y-1">
                                    <Input
                                        label="Expense Amount"
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                    {form.amount && !isNaN(parseFloat(form.amount)) && parseFloat(form.amount) > 0 && (
                                        <p className="text-xs font-bold text-primary italic px-1 animate-fade-in">
                                            {numberToWords(parseFloat(form.amount))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    rows={3}
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Enter expense details..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Upload Slip</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-primary file:text-white
                                            hover:file:bg-primary/90"
                                    />
                                    {isUploading && <span className="text-sm text-blue-500">Uploading...</span>}
                                    {form.slip_url && <span className="text-sm text-green-500">✓ Uploaded</span>}
                                </div>
                            </div>

                            <Button type="submit" variant="primary" className="w-full" disabled={isUploading}>
                                {editingId ? "Update Expense" : "Save Expense"}
                            </Button>
                        </form>
                    </Card>

                    {/* Dashboard Summary */}
                    <div className="space-y-6">
                        <Card title="Expense Summary Dashboard">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <p className="text-sm text-red-600 font-medium tracking-wide uppercase">Total Expense</p>
                                    <p className="text-3xl font-bold text-red-700 mt-1">Rs. {totalExpense.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-sm text-blue-600 font-medium tracking-wide uppercase">Filtered Entries</p>
                                    <p className="text-3xl font-bold text-blue-700 mt-1">{filteredExpenses.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <span>📍</span> By Site
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {Object.entries(siteSummary).length > 0 ? Object.entries(siteSummary).map(([site, amount]) => (
                                            <div key={site} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                                <span className="font-medium text-slate-600">{site}</span>
                                                <span className="font-bold text-slate-900">Rs. {amount.toLocaleString()}</span>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 text-center py-4 italic">No data matched</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <span>📁</span> By Category
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {Object.entries(categorySummary).length > 0 ? Object.entries(categorySummary).map(([cat, amount]) => (
                                            <div key={cat} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                                <span className="font-medium text-slate-600">{cat}</span>
                                                <span className="font-bold text-slate-900">Rs. {amount.toLocaleString()}</span>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 text-center py-4 italic">No data matched</p>}
                                    </div>
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <span>🤝</span> By Vendor
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {Object.entries(vendorSummary).length > 0 ? Object.entries(vendorSummary).map(([vendor, amount]) => (
                                            <div key={vendor} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                                <span className="font-medium text-slate-600">{vendor}</span>
                                                <span className="font-bold text-slate-900">Rs. {amount.toLocaleString()}</span>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 text-center py-4 italic">No data matched</p>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Filter Bar */}
                <Card title="Quick Filters & Search">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Input
                            placeholder="Search Sr No, Name, Desc..."
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                            className="text-sm"
                        />
                        <select
                            className="w-full h-[46px] px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            value={filters.site}
                            onChange={e => setFilters({ ...filters, site: e.target.value })}
                        >
                            <option value="">All Sites</option>
                            {history.sites.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            className="w-full h-[46px] px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            value={filters.vendor}
                            onChange={e => setFilters({ ...filters, vendor: e.target.value })}
                        >
                            <option value="">All Vendors</option>
                            {history.vendors.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select
                            className="w-full h-[46px] px-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            value={filters.category}
                            onChange={e => setFilters({ ...filters, category: e.target.value })}
                        >
                            <option value="">All Categories</option>
                            {history.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">From Date</label>
                            <DatePicker
                                value={filters.startDate}
                                onChange={val => setFilters({ ...filters, startDate: val })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">To Date</label>
                            <DatePicker
                                value={filters.endDate}
                                onChange={val => setFilters({ ...filters, endDate: val })}
                            />
                        </div>
                    </div>
                </Card>

                {/* Recent Transactions List */}
                <Card
                    title={`Transaction History (${filteredExpenses.length} Entries)`}
                    action={
                        <button
                            onClick={generatePDF}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bold text-sm"
                        >
                            <span>⏬</span>
                            Download PDF report
                        </button>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Sr No</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Date</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Person Name</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Vendor Name</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Category</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Site</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Description</th>
                                    <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic text-center">Slip</th>
                                    <th className="text-right py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Amount</th>
                                    <th className="text-center py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider italic">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 group border-b border-slate-50 last:border-0">
                                        <td className="py-4 px-4 text-sm text-slate-500 font-mono">#{expense.sr_no}</td>
                                        <td className="py-4 px-4 text-sm text-slate-600 whitespace-nowrap font-bold">
                                            {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-bold text-slate-900">{expense.name}</p>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-700 font-medium">{expense.vendor_name}</td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                                {expense.vendor_category}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-600">{expense.site}</td>
                                        <td className="py-4 px-4 text-sm text-slate-500 max-w-xs truncate" title={expense.description}>
                                            {expense.description}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {expense.slip_url ? (
                                                <a
                                                    href={expense.slip_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-10 h-10 inline-flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                                                    title="View Document"
                                                >
                                                    📄
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">N/A</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-right font-black text-slate-900">
                                            Rs. {Number(expense.amount).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    title="Edit Record"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    title="Delete Record"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* PDF Download Modal */}
            <Modal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                title="Download PDF Report"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm">
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

                    <div className="flex items-center space-x-2 bg-emerald-50 p-4 rounded-lg">
                        <input
                            type="checkbox"
                            id="includeStamp"
                            className="w-5 h-5 cursor-pointer"
                            checked={includeStamp}
                            onChange={e => setIncludeStamp(e.target.checked)}
                        />
                        <label htmlFor="includeStamp" className="text-sm font-bold text-emerald-900 cursor-pointer">
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
