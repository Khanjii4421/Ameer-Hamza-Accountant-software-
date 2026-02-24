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

interface PaymentEntry extends LaborExpense {
    payment_date?: string;
    is_paid?: boolean;
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

const getLocalDateString = () => {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
};

export default function LaborVendorLedgerPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const canAccess = isAdmin || isManager;

    // State
    const [expenses, setExpenses] = useState<PaymentEntry[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sites, setSites] = useState<Project[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    // New filter for employee/worker
    const [selectedWorker, setSelectedWorker] = useState<string>('');

    // Filter states
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    // Worker filter state already added above

    // Transaction modal (Add/Edit)
    const [transactionModal, setTransactionModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<PaymentEntry | null>(null);

    const [transactionForm, setTransactionForm] = useState({
        amount: '',
        description: '',
        date: getLocalDateString(),
        proof_url: ''
    });
    const [isUploading, setIsUploading] = useState(false);

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
            if (exp) setExpenses(exp);
            if (prof) setProfile(prof);
            if (projects) setSites(projects as unknown as Project[]);
            if (vends) setVendors(vends);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique categories from vendors
    const categories = useMemo(() => {
        const cats = new Set(vendors.map(v => v.category));
        return Array.from(cats).filter(Boolean);
    }, [vendors]);

    // Filter vendors by category
    const filteredVendors = useMemo(() => {
        if (!selectedCategory) return vendors;
        return vendors.filter(v => v.category === selectedCategory);
    }, [vendors, selectedCategory]);

    // Filter expenses
    const filteredExpenses = useMemo(() => {
        let filtered = expenses;

        if (selectedVendor) {
            filtered = filtered.filter(e => e.vendor_id === selectedVendor);
        }

        if (selectedWorker) {
            filtered = filtered.filter(e => e.worker_name === selectedWorker);
        }

        if (selectedSite) {
            filtered = filtered.filter(e => e.site_id === selectedSite);
        }

        if (selectedCategory) {
            filtered = filtered.filter(e => e.category === selectedCategory);
        }

        if (startDate) {
            filtered = filtered.filter(e => e.date >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(e => e.date <= endDate);
        }

        // Sort by date ascending for running balance calculation
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [expenses, selectedVendor, selectedWorker, selectedSite, selectedCategory, startDate, endDate]);

    // Calculate running balance (negative for liability)
    const expensesWithBalance = useMemo(() => {
        let runningBalance = 0;
        return filteredExpenses.map(exp => {
            runningBalance -= Number(exp.amount); // Negative because it's money we owe
            return { ...exp, runningBalance };
        });
    }, [filteredExpenses]);

    // Total outstanding
    const totalOutstanding = useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    }, [filteredExpenses]);

    // Get selected vendor info
    const selectedVendorInfo = useMemo(() => {
        return vendors.find(v => v.id === selectedVendor);
    }, [vendors, selectedVendor]);

    const handleEdit = (expense: PaymentEntry) => {
        setEditingExpense(expense);
        setTransactionForm({
            amount: expense.amount.toString(),
            description: expense.description,
            date: expense.date,
            proof_url: expense.proof_url || ''
        });
        setTransactionModal(true);
    };

    const handleDelete = async (expenseId: string) => {
        if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;

        try {
            await api.laborExpenses.delete(expenseId);
            setExpenses(expenses.filter(e => e.id !== expenseId));
            alert('Expense deleted successfully');
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense');
        }
    };

    const handleDeleteAllFiltered = async () => {
        if (!expensesWithBalance || expensesWithBalance.length === 0) return;
        if (!confirm(`Are you sure you want to delete ALL ${expensesWithBalance.length} currently filtered records?\n\nThis will delete these specific records forever.`)) return;

        try {
            // Delete one by one
            for (const exp of expensesWithBalance) {
                await api.laborExpenses.delete(exp.id);
            }

            // Remove from local state
            const deletedIds = new Set(expensesWithBalance.map(e => e.id));
            setExpenses(expenses.filter(e => !deletedIds.has(e.id)));
            alert('Filtered expenses deleted successfully');
        } catch (error) {
            console.error('Failed to delete some expenses:', error);
            alert('Error occurred while deleting some expenses. Please refresh.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = new FormData();
            data.append('file', file);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data
            });
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();
            setTransactionForm(prev => ({ ...prev, proof_url: url }));
        } catch (error) {
            console.error(error);
            alert('Failed to upload proof');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedVendor || !selectedSite) {
            alert('Please select both vendor and site before adding a transaction');
            return;
        }

        if (!transactionForm.amount || !transactionForm.description || !transactionForm.date) {
            alert('Please fill in all required fields (Amount, Description, Date)');
            return;
        }

        try {
            if (editingExpense) {
                // Update existing expense
                await api.laborExpenses.update(editingExpense.id, {
                    vendor_id: selectedVendor,
                    site_id: selectedSite,
                    category: selectedCategory || selectedVendorInfo?.category || 'General',
                    amount: parseFloat(transactionForm.amount),
                    description: transactionForm.description,
                    date: transactionForm.date,
                    proof_url: transactionForm.proof_url
                });
                alert('Transaction updated successfully!');
            } else {
                // Add new expense
                await api.laborExpenses.add({
                    vendor_id: selectedVendor,
                    site_id: selectedSite,
                    category: selectedCategory || selectedVendorInfo?.category || 'General',
                    amount: parseFloat(transactionForm.amount),
                    description: transactionForm.description,
                    date: transactionForm.date,
                    is_paid: false,
                    proof_url: transactionForm.proof_url
                });
                alert('Transaction added successfully!');
            }

            // Reload data for correct ordering/balances
            await loadData();

            // Reset and close
            resetTransactionForm();
        } catch (error) {
            alert(editingExpense ? 'Failed to update transaction' : 'Failed to add transaction');
            console.error(error);
        }
    };

    const resetTransactionForm = () => {
        setTransactionForm({
            amount: '',
            description: '',
            date: getLocalDateString(),
            proof_url: ''
        });
        setEditingExpense(null);
        setTransactionModal(false);
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedVendor) {
            alert('Please select a vendor first and choose a file');
            return;
        }

        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { raw: false });

            if (!jsonData || jsonData.length === 0) {
                alert('No data found in Excel file');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const row of jsonData) {
                try {
                    const getVal = (keyStr: string) => {
                        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
                        return key ? row[key] : undefined;
                    };

                    const rowDate = getVal('date');
                    const rowSite = getVal('site');
                    const rowDesc = getVal('description') || getVal('desc');
                    const rowAmount = getVal('amount');

                    if (!rowDate || !rowDesc || !rowAmount) {
                        console.warn('Skipping invalid row', row);
                        errorCount++;
                        continue;
                    }

                    // Format Date
                    let formattedDate = getLocalDateString();
                    if (rowDate) {
                        try {
                            const dateStr = String(rowDate).trim();

                            // Try to parse DD/MM/YYYY or DD-MM-YYYY
                            const dmY = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                            // Try to parse YYYY-MM-DD
                            const Ymd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);

                            if (dmY) {
                                formattedDate = `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
                            } else if (Ymd) {
                                formattedDate = `${Ymd[1]}-${Ymd[2].padStart(2, '0')}-${Ymd[3].padStart(2, '0')}`;
                            } else {
                                // Default JS parsing
                                const d = new Date(dateStr);
                                if (!isNaN(d.getTime())) {
                                    formattedDate = [
                                        d.getFullYear(),
                                        String(d.getMonth() + 1).padStart(2, '0'),
                                        String(d.getDate()).padStart(2, '0')
                                    ].join('-');
                                }
                            }

                            // Check if it's an Excel numeric date
                            if (!isNaN(Number(rowDate)) && Number(rowDate) > 20000) {
                                const d = new Date((Number(rowDate) - (25567 + 1)) * 86400 * 1000);
                                if (!isNaN(d.getTime())) {
                                    formattedDate = [
                                        d.getFullYear(),
                                        String(d.getMonth() + 1).padStart(2, '0'),
                                        String(d.getDate()).padStart(2, '0')
                                    ].join('-');
                                }
                            }

                        } catch (e) { }
                    }

                    // Clean amount
                    const amountStr = String(rowAmount).replace(/[^0-9.-]+/g, '');
                    const amount = parseFloat(amountStr);
                    if (isNaN(amount)) {
                        console.warn('Skipping row, invalid amount', row);
                        errorCount++;
                        continue;
                    }

                    // Match site
                    let matchedSiteId = selectedSite; // fallback to selected
                    if (rowSite) {
                        const s = sites.find(s => s.title.toLowerCase().trim() === String(rowSite).toLowerCase().trim());
                        if (s) {
                            matchedSiteId = s.id;
                        } else if (!matchedSiteId) {
                            console.warn('Skipping row, site not found', row);
                            errorCount++;
                            continue;
                        }
                    } else if (!matchedSiteId) {
                        console.warn('Skipping row, no site specified', row);
                        errorCount++;
                        continue;
                    }

                    await api.laborExpenses.add({
                        vendor_id: selectedVendor,
                        site_id: matchedSiteId,
                        category: selectedCategory || selectedVendorInfo?.category || 'General',
                        amount: amount,
                        description: String(rowDesc),
                        date: formattedDate,
                        is_paid: false,
                        proof_url: ''
                    });
                    successCount++;
                } catch (error) {
                    console.error('Error adding row', error);
                    errorCount++;
                }
            }

            alert(`Upload Complete. Successfully added: ${successCount} entries. Failed/Skipped: ${errorCount}`);
            if (successCount > 0) {
                await loadData();
            }

        } catch (error) {
            console.error('Excel upload error:', error);
            alert('Failed to process Excel file');
        } finally {
            // Reset file input
            e.target.value = '';
        }
    };


    const handleDownloadPDF = async () => {
        if (!selectedVendor) {
            alert('Please select a vendor to generate PDF');
            return;
        }

        try {
            const { generateLaborVendorLedgerPDF } = await import('@/utils/pdfGenerator');
            await generateLaborVendorLedgerPDF(
                selectedVendorInfo,
                expensesWithBalance,
                totalOutstanding,
                profile
            );
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please check the console for details.');
        }
    };

    const handlePrintVoucher = async (expense: PaymentEntry) => {
        try {
            const jsPDF = (await import('jspdf')).default;
            // A5 landscape for a nice voucher feel, or A5 portrait. Let's do A5 Landscape (210x148)
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a5'
            });

            const width = doc.internal.pageSize.getWidth();
            let yPos = 10;

            // Add Letterhead if available
            // Voucher Header
            let voucherHeaderAdded = false;

            if (profile?.letterhead_url) {
                try {
                    const imgData = await getBase64ImageFromURL(profile.letterhead_url);
                    const imgWidth = width - 10;
                    const imgHeight = 25;
                    doc.addImage(imgData, 'PNG', 5, 15, imgWidth, imgHeight);
                    yPos += 42; // Shifted down to accommodate logo at y=15
                    voucherHeaderAdded = true;
                } catch (e) {
                    console.warn('Voucher letterhead error', e);
                }
            }



            // Voucher Title
            doc.setFillColor(240, 240, 240);
            doc.rect(5, yPos, width - 10, 8, 'F');
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT VOUCHER', width / 2, yPos + 6, { align: 'center' });
            yPos += 12;

            // Details Box
            doc.setDrawColor(200, 200, 200);
            doc.rect(5, yPos, width - 10, 50);

            // Left Column
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const leftX = 10;
            const rightX = width / 2 + 5;
            const lineHeight = 8;
            let currentY = yPos + 6;

            doc.text(`Voucher No: ${expense.id.slice(0, 8).toUpperCase()}`, leftX, currentY);
            doc.text(`Date: ${new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, rightX, currentY);
            currentY += lineHeight;

            doc.text(`Paid To: ${selectedVendorInfo?.name || 'N/A'}`, leftX, currentY);
            doc.text(`Site: ${expense.site_name || 'N/A'}`, rightX, currentY);
            currentY += lineHeight;

            doc.text(`Category: ${selectedVendorInfo?.category || 'General'}`, leftX, currentY);
            if (expense.is_paid && expense.payment_date) {
                doc.text(`Paid On: ${new Date(expense.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, rightX, currentY);
            }
            currentY += lineHeight;

            // Amount Box
            currentY += 2;
            doc.setFillColor(245, 245, 245);
            doc.rect(10, currentY, width - 20, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(`Amount: Rs. ${Number(expense.amount).toLocaleString()}`, width / 2, currentY + 7, { align: 'center' });
            currentY += 15;

            // Description
            doc.setFont('helvetica', 'normal');
            doc.text(`Description: ${expense.description}`, leftX, currentY);

            // Signatures
            const sigY = 105; // Moved up slightly from 110
            doc.line(10, sigY, 60, sigY);
            doc.text('Authorized Signature', 15, sigY + 5);

            doc.line(width - 60, sigY, width - 10, sigY);
            doc.text('Receiver Signature', width - 55, sigY + 5);

            doc.save(`Voucher_${expense.id}.pdf`);
        } catch (error) {
            console.error('Voucher print error:', error);
            alert('Failed to print voucher');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!canAccess) return <div className="p-8 text-center text-gray-500">Authorized Access Only. Redirecting...</div>;

    return (
        <>
            <Header
                title="Labor Vendor Ledger"
                action={
                    <Button variant="secondary" onClick={() => router.push('/labor-expenses')}>
                        ← Back to Labor Expenses
                    </Button>
                }
            />

            <div className="p-8 space-y-6">
                {/* Filters */}
                <Card title="Filter Ledger">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date From</label>
                            <DatePicker
                                value={startDate}
                                onChange={(val) => setStartDate(val)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date To</label>
                            <DatePicker
                                value={endDate}
                                onChange={(val) => setEndDate(val)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            {/* Spacer or additional filter, could merge the vendor/cat filters here if layout needs */}
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setSelectedVendor('');
                                    setSelectedWorker('');
                                }}
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedVendor}
                                onChange={(e) => {
                                    setSelectedVendor(e.target.value);
                                    setSelectedWorker('');
                                }}
                            >
                                <option value="">Select Vendor</option>
                                {filteredVendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Worker / Employee</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedWorker}
                                onChange={(e) => setSelectedWorker(e.target.value)}
                            >
                                <option value="">All Workers</option>
                                {/* Populate distinct workers from expenses */}
                                {Array.from(new Set(expenses.map(e => e.worker_name).filter(Boolean))).map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Filter</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                            >
                                <option value="">All Sites</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedCategory('');
                                    setSelectedVendor('');
                                    setSelectedWorker('');
                                    setSelectedSite('');
                                }}
                                className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Clear All Filters ✕
                            </button>
                        </div>
                    </div>

                    {selectedVendor && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-blue-900">Selected Vendor: {selectedVendorInfo?.name}</h3>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                                <div>
                                    <span className="text-gray-600">Phone:</span> <span className="font-medium">{selectedVendorInfo?.phone || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Category:</span> <span className="font-medium">{selectedVendorInfo?.category}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Address:</span> <span className="font-medium">{selectedVendorInfo?.address || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-4">
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setTransactionForm({ ...transactionForm, date: getLocalDateString() });
                                        setTransactionModal(true);
                                    }}
                                    disabled={!selectedSite}
                                    className="flex-1"
                                >
                                    + Add Transaction
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => document.getElementById('excel-upload')?.click()}
                                    className="flex-1"
                                >
                                    📤 Excel Upload
                                </Button>
                                <input
                                    type="file"
                                    id="excel-upload"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={handleExcelUpload}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={handleDownloadPDF}
                                    className="flex-1"
                                >
                                    📄 Download PDF
                                </Button>
                                {isAdmin && expensesWithBalance.length > 0 && (
                                    <Button
                                        variant="secondary"
                                        onClick={handleDeleteAllFiltered}
                                        className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-red-100 font-bold"
                                    >
                                        🗑️ Delete All Filtered
                                    </Button>
                                )}
                            </div>

                            {!selectedSite && (
                                <p className="text-xs text-amber-600 mt-2">
                                    ⚠️ Please select a site to add transactions individually (not needed for Excel if site is in the sheet)
                                </p>
                            )}
                        </div>
                    )}
                </Card>

                {/* Summary Stats */}
                {selectedVendor && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-l-4 border-red-500">
                            <p className="text-sm text-gray-500 font-medium">Total Outstanding</p>
                            <p className="text-3xl font-bold text-red-600">
                                Rs. {totalOutstanding.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{filteredExpenses.length} transactions</p>
                        </Card>
                        <Card className="border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500 font-medium">Sites Worked</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {new Set(filteredExpenses.map(e => e.site_id)).size}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Different project sites</p>
                        </Card>
                        <Card className="border-l-4 border-yellow-500">
                            <p className="text-sm text-gray-500 font-medium">Latest Payment</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {filteredExpenses.length > 0 ? new Date(filteredExpenses[filteredExpenses.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Most recent transaction</p>
                        </Card>
                    </div>
                )}

                {/* Ledger Table */}
                <Card title={selectedVendor ? `${selectedVendorInfo?.name} - Payment Ledger` : "Vendor Ledger"} className="min-h-[60vh]">
                    {!selectedVendor ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">📋</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                Select a Vendor to View Ledger
                            </h3>
                            <p className="text-gray-500 mt-2 max-w-sm">
                                Choose a vendor from the filters above to view their complete payment history and outstanding balance.
                            </p>
                        </div>
                    ) : expensesWithBalance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">💰</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                No Payments Found
                            </h3>
                            <p className="text-gray-500 mt-2 max-w-sm">
                                No payment records found for this vendor{selectedSite ? ' on the selected site' : ''}.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Sr.</th>
                                        <th>Date</th>
                                        <th>Site</th>
                                        <th>Description</th>
                                        <th className="text-right">Amount</th>
                                        <th>Worker</th>
                                        <th className="text-right">Balance</th>
                                        {isAdmin && <th className="text-center">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {expensesWithBalance.map((expense, index) => (
                                        <tr key={expense.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="font-mono text-xs text-slate-400">{index + 1}</td>
                                            <td className="text-slate-600 font-bold whitespace-nowrap">
                                                {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="font-bold text-slate-900">{expense.site_name || 'N/A'}</td>
                                            <td className="text-slate-600">{expense.description}</td>
                                            <td className="text-right font-bold text-red-600">
                                                Rs. {Number(expense.amount).toLocaleString()}
                                            </td>
                                            <td>{expense.worker_name || '—'}</td>
                                            <td className="text-right font-bold text-slate-900">
                                                Rs. {expense.runningBalance.toLocaleString()}
                                            </td>
                                            {isAdmin && (
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {expense.proof_url && (
                                                            <a
                                                                href={expense.proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                                title="View Proof"
                                                            >
                                                                📎
                                                            </a>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Print Voucher"
                                                            onClick={() => handlePrintVoucher(expense)}
                                                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                        >
                                                            🖨️
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Edit"
                                                            onClick={() => handleEdit(expense)}
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        >
                                                            ✏️
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Delete"
                                                            onClick={() => handleDelete(expense.id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                    <tr>
                                        <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-900">
                                            Total Outstanding:
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-red-600 text-xl">
                                            Rs. {totalOutstanding.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-red-700 text-xl">
                                            Rs. -{totalOutstanding.toLocaleString()}
                                        </td>
                                        <td colSpan={isAdmin ? 1 : 0}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </Card >
            </div >

            {/* Add/Edit Transaction Modal */}
            <Modal
                isOpen={transactionModal}
                onClose={resetTransactionForm}
                title={editingExpense ? "Edit Transaction" : "Add New Transaction"}
            >
                <form onSubmit={handleSaveTransaction} className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
                        <p className="font-bold mb-1">{editingExpense ? 'Editing Expense for:' : 'Adding Expense for:'}</p>
                        <p>Vendor: <span className="font-semibold">{selectedVendorInfo?.name}</span></p>
                        <p>Site: <span className="font-semibold">{sites.find(s => s.id === selectedSite)?.title}</span></p>
                    </div>

                    <Input
                        label="Amount (Rs.) *"
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                        <textarea
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            rows={3}
                            placeholder="Enter description of work/expense"
                            value={transactionForm.description}
                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                            required
                        />
                    </div>

                    <DatePicker
                        label="Date *"
                        value={transactionForm.date}
                        onChange={(val) => setTransactionForm({ ...transactionForm, date: val })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Proof / Slip (Optional)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-primary file:text-white
                                  hover:file:bg-blue-600
                                "
                                disabled={isUploading}
                            />
                            {isUploading && <span className="text-sm text-gray-400">Uploading...</span>}
                        </div>
                        {transactionForm.proof_url && (
                            <div className="mt-2">
                                <a href={transactionForm.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                                    View Attached Proof
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={resetTransactionForm}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingExpense ? 'Update Transaction' : 'Add Transaction'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
