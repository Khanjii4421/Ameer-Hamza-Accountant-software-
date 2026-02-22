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
import { api, LaborPaymentReceived, CompanyProfile, Client, Project } from "@/lib/api";

const PAYMENT_METHODS = ['Bank', 'Online', 'JazzCash', 'EasyPaisa', 'Cash', 'Cheque'] as const;

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

export default function LaborPaymentsReceivedPage() {
    const { user } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const canAccess = isAdmin || isManager;

    // State
    const [payments, setPayments] = useState<LaborPaymentReceived[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Modal states
    const [paymentModal, setPaymentModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<LaborPaymentReceived | null>(null);

    const [paymentForm, setPaymentForm] = useState({
        client_id: '',
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        payment_method: 'Cash' as typeof PAYMENT_METHODS[number],
        transaction_id: '',
        cheque_number: '',
        bank_name: '',
        proof_urls: [] as string[]
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
            const [paymentsData, prof, clientsData, projectsData] = await Promise.all([
                api.laborPaymentsReceived.getAll(),
                api.profile.get(),
                api.clients.getAll(),
                api.projects.getAll()
            ]);
            if (paymentsData) setPayments(paymentsData);
            if (prof) setProfile(prof);
            if (clientsData) setClients(clientsData);
            if (projectsData) setProjects(projectsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter payments
    const filteredPayments = useMemo(() => {
        let filtered = payments;

        if (selectedClient) {
            filtered = filtered.filter(p => p.client_id === selectedClient);
        }

        if (selectedProject) {
            filtered = filtered.filter(p => p.project_id === selectedProject);
        }

        if (selectedPaymentMethod) {
            filtered = filtered.filter(p => p.payment_method === selectedPaymentMethod);
        }

        if (startDate) {
            filtered = filtered.filter(p => p.date >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(p => p.date <= endDate);
        }

        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [payments, selectedClient, selectedProject, selectedPaymentMethod, startDate, endDate]);

    // Calculate total
    const totalReceived = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    }, [filteredPayments]);

    const handleEdit = (payment: LaborPaymentReceived) => {
        setEditingPayment(payment);
        setPaymentForm({
            client_id: payment.client_id || '',
            project_id: payment.project_id || '',
            date: payment.date,
            amount: payment.amount.toString(),
            description: payment.description,
            payment_method: payment.payment_method,
            transaction_id: payment.transaction_id || '',
            cheque_number: payment.cheque_number || '',
            bank_name: payment.bank_name || '',
            proof_urls: parseProofUrls(payment.proof_url)
        });
        setPaymentModal(true);
    };

    const handleDelete = async (paymentId: string) => {
        if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;

        try {
            await api.laborPaymentsReceived.delete(paymentId);
            setPayments(payments.filter(p => p.id !== paymentId));
            alert('Payment record deleted successfully');
        } catch (error) {
            console.error('Failed to delete payment:', error);
            alert('Failed to delete payment record');
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
            setPaymentForm(prev => ({ ...prev, proof_urls: [...prev.proof_urls, ...urls] }));
        } catch (error) {
            console.error(error);
            alert('Failed to upload proof');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const removeFile = (urlToRemove: string) => {
        setPaymentForm(prev => ({
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

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!paymentForm.client_id || !paymentForm.amount || !paymentForm.date) {
            alert('Please fill in all required fields (Client, Amount, Date)');
            return;
        }

        try {
            if (editingPayment) {
                // Update existing payment
                await api.laborPaymentsReceived.update(editingPayment.id, {
                    client_id: paymentForm.client_id,
                    project_id: paymentForm.project_id || undefined,
                    date: paymentForm.date,
                    amount: parseFloat(paymentForm.amount),
                    description: paymentForm.description,
                    payment_method: paymentForm.payment_method,
                    transaction_id: paymentForm.transaction_id || undefined,
                    cheque_number: paymentForm.cheque_number || undefined,
                    bank_name: paymentForm.bank_name || undefined,
                    proof_url: JSON.stringify(paymentForm.proof_urls)
                });
                alert('Payment record updated successfully!');
            } else {
                // Add new payment
                await api.laborPaymentsReceived.add({
                    client_id: paymentForm.client_id,
                    project_id: paymentForm.project_id || undefined,
                    date: paymentForm.date,
                    amount: parseFloat(paymentForm.amount),
                    description: paymentForm.description,
                    payment_method: paymentForm.payment_method,
                    transaction_id: paymentForm.transaction_id || undefined,
                    cheque_number: paymentForm.cheque_number || undefined,
                    bank_name: paymentForm.bank_name || undefined,
                    proof_url: JSON.stringify(paymentForm.proof_urls),
                    client_name: undefined,
                    project_title: undefined
                });
                alert('Payment record added successfully!');
            }

            // Reload data
            await loadData();

            // Reset and close
            resetPaymentForm();
        } catch (error: any) {
            const msg = error?.message || 'Unknown error';
            alert(editingPayment ? `Failed to update payment: ${msg}` : `Failed to add payment: ${msg}`);
            console.error(error);
        }
    };

    const resetPaymentForm = () => {
        setPaymentForm({
            client_id: '',
            project_id: '',
            date: new Date().toISOString().split('T')[0],
            amount: '',
            description: '',
            payment_method: 'Cash',
            transaction_id: '',
            cheque_number: '',
            bank_name: '',
            proof_urls: []
        });
        setEditingPayment(null);
        setPaymentModal(false);
    };

    // Filter projects based on selected client in form
    const formProjects = useMemo(() => {
        if (!paymentForm.client_id) return [];
        return projects.filter(p => p.client_id === paymentForm.client_id);
    }, [projects, paymentForm.client_id]);

    // Filter projects for filter dropdown
    const filterProjects = useMemo(() => {
        if (!selectedClient) return projects;
        return projects.filter(p => p.client_id === selectedClient);
    }, [projects, selectedClient]);

    // Show conditional fields based on payment method
    const showTransactionId = ['Bank', 'Online', 'JazzCash', 'EasyPaisa'].includes(paymentForm.payment_method);
    const showChequeNumber = paymentForm.payment_method === 'Cheque';
    const showBankName = ['Bank', 'Cheque'].includes(paymentForm.payment_method);

    const handleDownloadPDF = async () => {
        if (!selectedClient) {
            alert('Please select a specific Client to generage a Ledger PDF.');
            return;
        }
        try {
            console.log('Starting PDF generation...');

            // Dynamic import for jsPDF and autoTable
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF({ format: 'a4', unit: 'mm' });
            const pageWidth = 210;
            const pageHeight = 297;
            let yPos = 20;

            // 1. Company Letterhead / Header
            let headerAdded = false;
            if (profile?.letterhead_url) {
                yPos = 75; // Shifted down by 10mm
                try {
                    const imgData = await getBase64ImageFromURL(profile.letterhead_url);
                    doc.addImage(imgData, 'PNG', 0, 10, pageWidth, pageHeight);
                    headerAdded = true;
                } catch (err) {
                    console.warn('Could not add letterhead as image (likely a PDF):', err);
                }
            }

            /* 
            if (!headerAdded) {
                // Fallback header
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text((profile?.name || 'Company Name').toUpperCase(), pageWidth / 2, 20, { align: 'center' });

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100);
                const address = profile?.address || '';
                if (address) doc.text(address, pageWidth / 2, 28, { align: 'center' });
                yPos = 40;
            } 
            */

            /* 
            // 2. Report Title (generic, no client name in heading)
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('LABOR PAYMENTS RECEIVED - LDGER', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10; 
            */

            // (Removed "Generated on / Client / Project" sub-header from PDF)
            // If you ever want to add some other small subtitle, you can do it here.
            yPos += 5;

            // 3. Table
            const tableData = filteredPayments.map((p, index) => [
                index + 1,
                new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                p.client_name || '-',
                p.project_title || '-',
                p.description || '-',
                p.payment_method,
                `Rs. ${Number(p.amount).toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Sr.', 'Date', 'Client', 'Project', 'Description', 'Method', 'Amount']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [22, 163, 74], // Green-600 match
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [51, 65, 85]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 'auto' },
                    5: { cellWidth: 20, halign: 'center' },
                    6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
                },
                didDrawPage: (data) => {
                    const str = 'Page ' + doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.text(str, pageWidth - 15, pageHeight - 15, { align: 'right' });
                }
            });

            // 4. Totals
            const finalY = (doc as any).lastAutoTable.finalY + 10;

            // Check for page break
            if (finalY > pageHeight - 20) {
                doc.addPage();
            }

            const boxY = finalY > pageHeight - 20 ? 20 : finalY;

            doc.setFillColor(240, 253, 244); // Green-50
            doc.rect(pageWidth - 80, boxY, 65, 12, 'F');

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('Total Received:', pageWidth - 75, boxY + 8);

            doc.setTextColor(22, 163, 74); // Green-600
            doc.text(`Rs. ${totalReceived.toLocaleString()}`, pageWidth - 18, boxY + 8, { align: 'right' });

            // Save on company letterhead (supports both image and PDF letterhead)
            const safeClientName = (clients.find(c => c.id === selectedClient)?.name || 'Client').replace(/\s+/g, '_');
            const filename = `Labor_Payments_Ledger_${safeClientName}_${new Date().toISOString().split('T')[0]}.pdf`;

            const hasPdfLetterhead = profile?.letterhead_url && profile.letterhead_url.startsWith('data:application/pdf');

            if (hasPdfLetterhead) {
                try {
                    const { PDFDocument } = await import('pdf-lib');

                    const reportPdfBytes = doc.output('arraybuffer');
                    const letterheadBytes = await fetch(profile!.letterhead_url as string).then(res => res.arrayBuffer());

                    const pdfDoc = await PDFDocument.create();
                    const reportDoc = await PDFDocument.load(reportPdfBytes);

                    const [embeddedLetterhead] = await pdfDoc.embedPdf(letterheadBytes, [0]);
                    const embeddedReportPages = await pdfDoc.embedPdf(reportPdfBytes, reportDoc.getPageIndices());

                    const letterheadDims = embeddedLetterhead.scale(1);

                    for (let i = 0; i < embeddedReportPages.length; i++) {
                        const reportPage = embeddedReportPages[i];
                        const newPage = pdfDoc.addPage([letterheadDims.width, letterheadDims.height]);

                        // Draw letterhead as background
                        newPage.drawPage(embeddedLetterhead, {
                            x: 0,
                            y: 0,
                            width: letterheadDims.width,
                            height: letterheadDims.height,
                        });

                        // Draw generated report page on top (full page)
                        newPage.drawPage(reportPage, {
                            x: 0,
                            y: 0,
                            width: letterheadDims.width,
                            height: letterheadDims.height,
                        });
                    }

                    const mergedBytes = await pdfDoc.save();
                    const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = filename;
                    link.click();
                } catch (e) {
                    console.error('PDF letterhead merge error:', e);
                    doc.save(filename);
                }
            } else {
                // Fallback: normal save (for image letterhead we already drew it above)
                doc.save(filename);
            }

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Check console for details.');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!canAccess) return <div className="p-8 text-center text-gray-500">Authorized Access Only. Redirecting...</div>;

    return (
        <>
            <Header
                title="Labor Payments Received (From Clients)"
                action={
                    <Button variant="secondary" onClick={() => router.push('/labor-expenses')}>
                        ← Back to Labor Expenses
                    </Button>
                }
            />

            <div className="p-4 md:p-8 space-y-6">
                {/* Filters */}
                <Card title="Filter Payments">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date From</label>
                            <DatePicker
                                value={startDate}
                                onChange={(val) => setStartDate(val)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date To</label>
                            <DatePicker
                                value={endDate}
                                onChange={(val) => setEndDate(val)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedClient}
                                onChange={(e) => {
                                    setSelectedClient(e.target.value);
                                    setSelectedProject(''); // Reset project when client changes
                                }}
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="">All Projects</option>
                                {filterProjects.map(project => (
                                    <option key={project.id} value={project.id}>{project.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={selectedPaymentMethod}
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            >
                                <option value="">All Methods</option>
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="primary"
                            onClick={() => {
                                setPaymentForm({ ...paymentForm, date: new Date().toISOString().split('T')[0] });
                                setPaymentModal(true);
                            }}
                            className="flex-1"
                        >
                            + Add Labor Payment From Client
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleDownloadPDF}
                            className="flex-1"
                        >
                            📄 Download PDF
                        </Button>
                    </div>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-green-500">
                        <p className="text-sm text-gray-500 font-medium">Total Labor Received</p>
                        <p className="text-3xl font-bold text-green-600">
                            Rs. {totalReceived.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{filteredPayments.length} transactions</p>
                    </Card>
                    <Card className="border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 font-medium">Clients Paid</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {new Set(filteredPayments.map(p => p.client_id)).size}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Different clients</p>
                    </Card>
                    <Card className="border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500 font-medium">Latest Payment</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {filteredPayments.length > 0 ? new Date(filteredPayments[filteredPayments.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Most recent transaction</p>
                    </Card>
                </div>

                {/* Payments Table */}
                <Card title="Payment Records" className="min-h-[60vh]">
                    {filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">💰</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                No Payment Records Found
                            </h3>
                            <p className="text-gray-500 mt-2 max-w-sm">
                                No payment records found. Click "Add Labor Payment Received" to record a new payment.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <div className="min-w-max">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Sr.</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Client</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Project</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Method</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Details</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                                            {isAdmin && <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {filteredPayments.map((payment, index) => (
                                            <tr key={payment.id} className="group hover:bg-gray-50 transition-colors whitespace-nowrap">
                                                <td className="py-3 px-4 text-gray-500 font-mono text-xs">{index + 1}</td>
                                                <td className="py-3 px-4 text-gray-600 font-bold whitespace-nowrap">
                                                    {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">{payment.client_name || 'N/A'}</td>
                                                <td className="py-3 px-4 text-gray-600 text-sm">{payment.project_title || 'N/A'}</td>
                                                <td className="py-3 px-4 text-gray-800">{payment.description}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                        {payment.payment_method}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 text-sm">
                                                    {payment.transaction_id || payment.cheque_number || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-green-600">
                                                    Rs. {Number(payment.amount).toLocaleString()}
                                                </td>
                                                {isAdmin && (
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {parseProofUrls(payment.proof_url).map((url, idx) => (
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
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                title="Edit"
                                                                onClick={() => handleEdit(payment)}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            >
                                                                ✏️
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                title="Delete"
                                                                onClick={() => handleDelete(payment.id)}
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
                                            <td colSpan={7} className="py-3 px-4 text-right font-bold text-gray-900">
                                                Total Received:
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-green-600 text-xl">
                                                Rs. {totalReceived.toLocaleString()}
                                            </td>
                                            <td colSpan={isAdmin ? 1 : 0}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add/Edit Payment Modal */}
            <Modal
                isOpen={paymentModal}
                onClose={resetPaymentForm}
                title={editingPayment ? "Edit Payment Record" : "Add Payment Received"}
            >
                <form onSubmit={handleSavePayment} className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-800 text-sm">
                        <p className="font-bold mb-1">{editingPayment ? 'Editing Payment Record' : 'Recording Payment Received'}</p>
                        <p>Enter the details of the amount received from client for labor.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client *</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={paymentForm.client_id}
                                onChange={(e) => {
                                    setPaymentForm({ ...paymentForm, client_id: e.target.value, project_id: '' });
                                }}
                                required
                            >
                                <option value="">Select Client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project *</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={paymentForm.project_id}
                                onChange={(e) => setPaymentForm({ ...paymentForm, project_id: e.target.value })}
                                required
                                disabled={!paymentForm.client_id}
                            >
                                <option value="">Select Project</option>
                                {formProjects.map(project => (
                                    <option key={project.id} value={project.id}>{project.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <DatePicker
                            label="Date *"
                            value={paymentForm.date}
                            onChange={(val) => setPaymentForm({ ...paymentForm, date: val })}
                            required
                        />

                        <Input
                            label="Amount (Rs.) *"
                            type="number"
                            step="0.01"
                            placeholder="Enter amount"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method *</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={paymentForm.payment_method}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as typeof PAYMENT_METHODS[number] })}
                                required
                            >
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {showTransactionId && (
                        <Input
                            label="Transaction ID"
                            type="text"
                            placeholder="Enter transaction ID"
                            value={paymentForm.transaction_id}
                            onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                        />
                    )}

                    {showChequeNumber && (
                        <Input
                            label="Cheque Number"
                            type="text"
                            placeholder="Enter cheque number"
                            value={paymentForm.cheque_number}
                            onChange={(e) => setPaymentForm({ ...paymentForm, cheque_number: e.target.value })}
                        />
                    )}

                    {showBankName && (
                        <Input
                            label="Bank Name"
                            type="text"
                            placeholder="Enter bank name"
                            value={paymentForm.bank_name}
                            onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                        />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            rows={3}
                            placeholder="Enter payment description or notes"
                            value={paymentForm.description}
                            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Proof / Receipt (Upload Multiple)</label>
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

                            {paymentForm.proof_urls.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {paymentForm.proof_urls.map((url, index) => (
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
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={resetPaymentForm}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isUploading}>
                            {editingPayment ? 'Update Payment' : 'Add Payment'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
