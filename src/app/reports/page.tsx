'use client';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState, useMemo, useEffect } from "react";
import { api, LedgerEntry, OfficeExpense, Vendor, CompanyProfile, LaborExpense, LaborPaymentReceived, Project, IndependentExpense } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ChartDisplay({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={10} tick={{ fill: '#666' }} />
                <YAxis fontSize={10} tick={{ fill: '#666' }} />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}

type DateFilter = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

interface Transaction {
    id: string;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    vendorName?: string;
    siteName?: string;
    isPaid?: boolean;
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

export default function ReportsPage() {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [officeExpenses, setOfficeExpenses] = useState<OfficeExpense[]>([]);
    const [laborExpenses, setLaborExpenses] = useState<LaborExpense[]>([]);
    const [independentExpenses, setIndependentExpenses] = useState<IndependentExpense[]>([]);
    const [paymentsReceived, setPaymentsReceived] = useState<LaborPaymentReceived[]>([]);
    const [allVendors, setAllVendors] = useState<Vendor[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [filterRange, setFilterRange] = useState<DateFilter>('month');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, oe, le, ine, v, prof, lp, prjs] = await Promise.all([
                api.ledger.getAll(),
                api.officeExpenses.getAll(),
                api.laborExpenses.getAll(),
                api.independentExpenses.getAll(),
                api.vendors.getAll(),
                api.profile.get(),
                api.laborPaymentsReceived.getAll(),
                api.projects.getAll()
            ]);
            if (l) setLedger(l as any);
            if (oe) setOfficeExpenses(oe);
            if (le) setLaborExpenses(le);
            if (ine) setIndependentExpenses(ine);
            if (v) setAllVendors(v);
            if (prof) setProfile(prof);
            if (lp) setPaymentsReceived(lp);
            if (prjs) setProjects(prjs as any);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 1. Unified Transaction List
    const allTransactions = useMemo<Transaction[]>(() => {
        const txns: Transaction[] = [];

        // 1. Ledger Entries
        ledger.forEach(e => {
            const vendor = allVendors.find(v => v.id === e.vendor_id);
            const project = projects.find(p => p.id === e.project_id);
            txns.push({
                id: e.id || Math.random().toString(),
                date: e.date,
                amount: Number(e.amount),
                type: e.type === 'CREDIT' ? 'income' : 'expense',
                category: vendor?.category || (e.type === 'CREDIT' ? 'Direct Income' : 'General Ledger'),
                description: e.description || 'Ledger Entry',
                vendorName: vendor ? vendor.name : (e.vendor_id ? 'Unknown Vendor' : undefined),
                siteName: project?.title || e.project_id || (e.project_id ? 'Project Site' : undefined),
                isPaid: true // Collections and ledger debits are considered confirmed
            });
        });

        // 2. Office Expenses
        officeExpenses.forEach(e => {
            txns.push({
                id: e.id,
                date: e.date,
                amount: Number(e.amount),
                type: 'expense',
                category: e.category || 'Office Expense',
                description: e.description,
                vendorName: 'Office / Admin',
                isPaid: !!e.is_paid
            });
        });

        // 3. Labor Expenses
        laborExpenses.forEach(e => {
            const vendor = allVendors.find(v => v.id === e.vendor_id);
            const project = projects.find(p => p.id === e.site_id);
            txns.push({
                id: e.id,
                date: e.date,
                amount: Number(e.amount),
                type: 'expense',
                category: e.category || 'Labor',
                description: e.description,
                vendorName: vendor?.name || 'Labor Worker',
                siteName: project?.title || e.site_name || 'Project Site',
                isPaid: !!e.is_paid
            });
        });

        // 7. Payments Received (Income)
        paymentsReceived.forEach(e => {
            txns.push({
                id: e.id,
                date: e.date,
                amount: Number(e.amount),
                type: 'income',
                category: 'Site Collection',
                description: e.description || `Payment from ${e.client_name}`,
                vendorName: e.client_name,
                siteName: e.project_title || 'Unknown Site',
                isPaid: true
            });
        });

        return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
    }, [ledger, officeExpenses, laborExpenses, independentExpenses, paymentsReceived, allVendors, projects]);

    // 2. Filter Transactions based on Range
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        return allTransactions.filter(t => {
            const tDate = new Date(t.date).getTime();

            switch (filterRange) {
                case 'today':
                    return tDate >= todayStart;
                case 'week': {
                    const d = new Date(now);
                    const weekStart = new Date(d.setDate(d.getDate() - d.getDay())).getTime();
                    return tDate >= weekStart;
                }
                case 'month': {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    return tDate >= monthStart;
                }
                case '3months': {
                    const d = new Date(now);
                    const threeMonthsAgo = new Date(d.setMonth(d.getMonth() - 3)).getTime();
                    return tDate >= threeMonthsAgo;
                }
                case '6months': {
                    const d = new Date(now);
                    const sixMonthsAgo = new Date(d.setMonth(d.getMonth() - 6)).getTime();
                    return tDate >= sixMonthsAgo;
                }
                case 'year': {
                    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
                    return tDate >= yearStart;
                }
                case 'all':
                default:
                    return true;
            }
        });
    }, [allTransactions, filterRange]);

    // 3. Stats and Summary Calculation
    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        let unpaid = 0;
        const byCategory: { [key: string]: number } = {};
        const bySite: { [key: string]: { income: number, expense: number } } = {};
        const chartData: { [key: string]: { date: string, income: number, expense: number } } = {};

        filteredTransactions.forEach(t => {
            const dateStr = new Date(t.date).toLocaleDateString();
            if (!chartData[dateStr]) chartData[dateStr] = { date: dateStr, income: 0, expense: 0 };

            if (t.type === 'income') {
                income += t.amount;
                chartData[dateStr].income += t.amount;
                const sName = t.siteName || 'General/Other';
                if (!bySite[sName]) bySite[sName] = { income: 0, expense: 0 };
                bySite[sName].income += t.amount;
            } else {
                expense += t.amount;
                chartData[dateStr].expense += t.amount;
                if (!t.isPaid) unpaid += t.amount;

                const cat = t.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + t.amount;

                const sName = t.siteName || 'Office/Admin';
                if (!bySite[sName]) bySite[sName] = { income: 0, expense: 0 };
                bySite[sName].expense += t.amount;
            }
        });

        const sortedChartData = Object.values(chartData)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-15); // Show last 15 days in chart

        return {
            income,
            expense,
            unpaid,
            net: income - expense,
            byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
            bySite: Object.entries(bySite).sort((a, b) => b[1].income - a[1].income),
            chartData: sortedChartData
        };
    }, [filteredTransactions]);


    // -- PDF REPORT GENERATION --
    const handleDownloadReport = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();
            const pageWidth = 210;
            const pageHeight = 297;
            let yPos = 20;

            // Helper to get image data for the letterhead
            const getImageData = (url: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = reject;
                    img.src = url;
                });
            };

            let letterheadImg: string | null = null;
            if (profile?.letterhead_url) {
                try {
                    letterheadImg = await getImageData(profile.letterhead_url);
                } catch (e) {
                    console.warn('Failed to load letterhead image', e);
                }
            }

            const applyPageDecorations = (d: any, forceLogo: boolean = false) => {
                const currentPage = d.internal.getCurrentPageInfo().pageNumber;
                if (letterheadImg && (currentPage === 1 || forceLogo)) {
                    // Place as a top header banner (approx 45mm height) shifted down by 10mm
                    d.addImage(letterheadImg, 'PNG', 0, 10, pageWidth, 45);
                } else if (currentPage > 1) {
                    // Simple Footer/Header for subsequent pages
                    d.setFontSize(8);
                    d.setTextColor(150);
                    d.text(`${profile?.name || 'Miran Builders'}`, 14, 10);
                    d.setDrawColor(240);
                    d.line(10, 12, pageWidth - 10, 12);
                } else if (currentPage === 1 && !letterheadImg) {
                    // Manual Fallback Header (Simple) for Page 1 if no image
                    d.setFontSize(18);
                    d.setFont('helvetica', 'bold');
                    d.setTextColor(40);
                    d.text(profile?.name || 'Miran Builders', pageWidth / 2, 15, { align: 'center' });
                    d.setDrawColor(200);
                    d.line(10, 20, pageWidth - 10, 20);
                }
            };

            // Initial apply (Page 1)
            applyPageDecorations(doc, true);
            yPos = profile?.letterhead_url ? 65 : 40; // Shifted down by 10-15mm

            // Internal helper for manual page breaks
            const addNewPage = () => {
                doc.addPage();
                applyPageDecorations(doc);
                yPos = 25; // Smaller top margin for subsequent pages
            };

            // 2. Report Title & Meta
            const getRangeDates = () => {
                const now = new Date();
                let start = new Date();
                switch (filterRange) {
                    case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
                    case 'week': start = new Date(new Date().setDate(now.getDate() - now.getDay())); break;
                    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
                    case '3months': start = new Date(new Date().setMonth(now.getMonth() - 3)); break;
                    case '6months': start = new Date(new Date().setMonth(now.getMonth() - 6)); break;
                    case 'year': start = new Date(now.getFullYear(), 0, 1); break;
                    case 'all': return 'All Records';
                }
                return `FROM ${start.toLocaleDateString()} TO ${new Date().toLocaleDateString()}`;
            };

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('DETAILED EXPENSE REPORT', pageWidth / 2, yPos, { align: 'center' });
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            const periodText = getRangeDates();
            doc.text(`Period: ${periodText} | Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            // 3. Summary Box
            doc.setFillColor(245, 247, 250);
            doc.rect(14, yPos, pageWidth - 28, 20, 'F');
            doc.setDrawColor(220);
            doc.rect(14, yPos, pageWidth - 28, 20, 'S');

            const colWidth = (pageWidth - 28) / 4;
            doc.setFontSize(9);
            doc.setTextColor(60);
            doc.text('Total Income', 14 + colWidth * 0.5, yPos + 8, { align: 'center' });
            doc.text('Total Expense', 14 + colWidth * 1.5, yPos + 8, { align: 'center' });
            doc.text('Unpaid (Dues)', 14 + colWidth * 2.5, yPos + 8, { align: 'center' });
            doc.text('Net Balance', 14 + colWidth * 3.5, yPos + 8, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);

            doc.setTextColor(22, 163, 74); // Green
            doc.text(`Rs. ${stats.income.toLocaleString()}`, 14 + colWidth * 0.5, yPos + 16, { align: 'center' });

            doc.setTextColor(220, 38, 38); // Red
            doc.text(`Rs. ${stats.expense.toLocaleString()}`, 14 + colWidth * 1.5, yPos + 16, { align: 'center' });

            doc.setTextColor(245, 158, 11); // Amber
            doc.text(`Rs. ${stats.unpaid.toLocaleString()}`, 14 + colWidth * 2.5, yPos + 16, { align: 'center' });

            doc.setTextColor(stats.net >= 0 ? 22 : 220, stats.net >= 0 ? 163 : 38, stats.net >= 0 ? 74 : 38);
            doc.text(`Rs. ${stats.net.toLocaleString()}`, 14 + colWidth * 3.5, yPos + 16, { align: 'center' });

            yPos += 30;

            // 4. Categorical Spending Summary
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Expense Summary by Category', 14, yPos);
            yPos += 7;

            const categoryData = stats.byCategory.map(([cat, amt]) => [
                cat,
                `Rs. ${amt.toLocaleString()}`,
                `${((amt / stats.expense) * 100).toFixed(1)}%`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Category', 'Total Amount', 'Percentage']],
                body: [
                    ...categoryData,
                    [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: `Rs. ${stats.expense.toLocaleString()}`, styles: { fontStyle: 'bold' } }, '100%']
                ],
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105], textColor: 255 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        // Just page number or simple line, no logo
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`${profile?.name || 'Miran Builders'}`, 14, 10);
                    }
                },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14, top: 25 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
            if (yPos > 260) { addNewPage(); }

            // 5. Site-wise Income Summary
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Income Summary by Site', 14, yPos);
            yPos += 7;

            const siteData = stats.bySite.map(([site, amt]) => [
                site,
                `Rs. ${amt.income.toLocaleString()}`,
                `${((amt.income / (stats.income || 1)) * 100).toFixed(1)}%`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Site / Project', 'Received Amount', 'Percentage']],
                body: [
                    ...siteData,
                    [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: `Rs. ${stats.income.toLocaleString()}`, styles: { fontStyle: 'bold' } }, '100%']
                ],
                theme: 'striped',
                headStyles: { fillColor: [51, 65, 85], textColor: 255 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        // Just page number or simple line, no logo
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`${profile?.name || 'Miran Builders'}`, 14, 10);
                    }
                },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14, top: 25 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
            if (yPos > 260) { addNewPage(); }

            // 6. Heading-wise Grouped Expenses
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 64, 175);
            doc.text('BREAKDOWN BY CATEGORY', pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;

            // Group transactions by category
            const grouped = filteredTransactions.reduce((acc: Record<string, Transaction[]>, t) => {
                if (t.type === 'expense') {
                    const cat = t.category || 'Other Expenses';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(t);
                }
                return acc;
            }, {});

            Object.entries(grouped).forEach(([category, items]) => {
                // Check if we need a new page for this category
                if (yPos > 240) {
                    addNewPage();
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(category.toUpperCase(), 14, yPos);
                yPos += 5;

                const categoryTotal = items.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
                const categoryUnpaid = items.filter(t => !t.isPaid).reduce((sum, t) => sum + t.amount, 0);

                const itemData = items.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.vendorName || '-',
                    t.description + (!t.isPaid ? ' [UNPAID]' : ''),
                    t.siteName || '-',
                    t.amount.toLocaleString()
                ]);

                const summaryRows: any[][] = [
                    [{ content: `TOTAL ${category.toUpperCase()}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: categoryTotal.toLocaleString(), styles: { fontStyle: 'bold' } }]
                ];

                if (categoryUnpaid > 0) {
                    summaryRows.push([
                        { content: `TOTAL UNPAID`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
                        { content: categoryUnpaid.toLocaleString(), styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }
                    ]);
                }

                autoTable(doc, {
                    startY: yPos,
                    head: [['Date', 'To / Vendor', 'Description', 'Site', 'Amount']],
                    body: [
                        ...itemData,
                        ...summaryRows
                    ] as any,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                    styles: { fontSize: 8 },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.row.index < itemData.length) {
                            const isUnpaid = itemData[data.row.index][2].toString().includes('[UNPAID]');
                            if (isUnpaid) {
                                data.cell.styles.textColor = [220, 38, 38];
                            }
                        }
                    },
                    didDrawPage: (data) => {
                        if (data.pageNumber > 1) applyPageDecorations(doc);
                    },
                    margin: { left: 14, right: 14, top: profile?.letterhead_url ? 50 : 30 }
                });

                yPos = (doc as any).lastAutoTable.finalY + 15;
            });

            // 7. Income Summary (Grouped by Site)
            if (yPos > 240) { addNewPage(); }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 163, 74);
            doc.text('INCOME SUMMARY BY SITE', 14, yPos);
            yPos += 7;

            const groupedIncome = filteredTransactions.reduce((acc: Record<string, Transaction[]>, t) => {
                if (t.type === 'income') {
                    const site = t.siteName || 'General Income';
                    if (!acc[site]) acc[site] = [];
                    acc[site].push(t);
                }
                return acc;
            }, {});

            Object.entries(groupedIncome).forEach(([site, items]) => {
                const siteTotal = items.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
                const tableData = items.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.vendorName || '-',
                    t.description,
                    t.amount.toLocaleString()
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [[{ content: `SITE: ${site.toUpperCase()}`, colSpan: 4, styles: { fillColor: [22, 163, 74], halign: 'center' } }], ['Date', 'Client/Source', 'Details', 'Amount']],
                    body: [
                        ...tableData,
                        [{ content: 'SITE TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: siteTotal.toLocaleString(), styles: { fontStyle: 'bold' } }]
                    ],
                    didDrawPage: (data) => {
                        if (data.pageNumber > 1) {
                            doc.setFontSize(8);
                            doc.setTextColor(150);
                            doc.text(`${profile?.name || 'Miran Builders'}`, 14, 10);
                        }
                    },
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    margin: { left: 14, right: 14, top: 25 }
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
                if (yPos > 260) { addNewPage(); }
            });

            // 8. UNPAID SUMMARY
            addNewPage();
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            doc.text('OUTSTANDING PAYMENTS (UNPAID)', 105, 30, { align: 'center' });

            const unpaidItems = filteredTransactions.filter(t => t.type === 'expense' && !t.isPaid);
            const unpaidTableData = unpaidItems.map(t => [
                new Date(t.date).toLocaleDateString(),
                t.category,
                t.vendorName || '-',
                t.description,
                t.amount.toLocaleString()
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Date', 'Category', 'Vendor', 'Description', 'Amount']],
                body: [
                    ...unpaidTableData,
                    [{ content: 'TOTAL UNPAID', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: stats.unpaid.toLocaleString(), styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }]
                ],
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`${profile?.name || 'Miran Builders'}`, 14, 10);
                    }
                },
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38], textColor: 255 },
                margin: { top: 25 }
            });

            // Final Footer with Page Numbers
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, 285, { align: 'right' });
                doc.text(`${profile?.name || 'Miran Builders'} - Confidential Report`, 20, 285, { align: 'left' });
            }

            doc.save(`Detailed_Report_${filterRange}_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (error) {
            console.error('PDF Generation Error', error);
            alert('Failed to generate report');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <Header
                title="Detailed Financial Reports"
                action={
                    <Button onClick={handleDownloadReport} variant="primary">
                        📥 Download PDF Report
                    </Button>
                }
            />

            <div className="p-8 space-y-6">

                {/* 1. Filter Bar */}
                <Card className="p-2">
                    <div className="flex flex-wrap gap-2">
                        {(['today', 'week', 'month', '3months', 'year', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterRange(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                                    ${filterRange === f
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {f === '3months' ? 'Quarter' :
                                    f === 'week' ? 'Last Week' :
                                        f === 'month' ? 'This Month' :
                                            f === 'today' ? 'Today' :
                                                f === 'year' ? 'This Year' : 'All Time'}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* 2. Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-green-500">
                        <p className="text-gray-500 font-medium text-xs">Total Income</p>
                        <p className="text-xl font-bold text-green-600">Rs. {stats.income.toLocaleString()}</p>
                    </Card>
                    <Card className="border-l-4 border-red-500">
                        <p className="text-gray-500 font-medium text-xs">Total Expenses</p>
                        <p className="text-xl font-bold text-red-600">Rs. {stats.expense.toLocaleString()}</p>
                    </Card>
                    <Card className="border-l-4 border-orange-500 bg-orange-50">
                        <p className="text-gray-500 font-medium text-xs">Unpaid Amount</p>
                        <p className="text-xl font-bold text-orange-600">Rs. {stats.unpaid.toLocaleString()}</p>
                        <div className="text-[10px] text-orange-400 font-bold uppercase mt-1">Outstanding</div>
                    </Card>
                    <Card className="border-l-4 border-blue-500">
                        <p className="text-gray-500 font-medium text-xs">Net Balance</p>
                        <p className={`text-xl font-bold ${stats.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            Rs. {stats.net.toLocaleString()}
                        </p>
                    </Card>
                </div>

                {/* --- FINANCIAL TREND GRAPH --- */}
                <Card title="Financial Analytics (Income vs Expenses)">
                    <div className="h-[300px] w-full pt-4">
                        <div className="flex gap-4 mb-4 justify-end text-xs font-medium">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Income</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Expense</span>
                        </div>
                        <ChartDisplay data={stats.chartData} />
                    </div>
                </Card>

                {/* 2b. Summary Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Site-wise Financial Status">
                        <div className="overflow-hidden rounded-lg border border-gray-100">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 font-bold uppercase">
                                    <tr>
                                        <th className="p-3">Site Name</th>
                                        <th className="p-3 text-right">Income</th>
                                        <th className="p-3 text-right">Expense</th>
                                        <th className="p-3 text-right">Profit/Loss</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.bySite.map(([site, data]) => (
                                        <tr key={site} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{site}</td>
                                            <td className="p-3 text-right text-green-600">Rs. {data.income.toLocaleString()}</td>
                                            <td className="p-3 text-right text-red-500">Rs. {data.expense.toLocaleString()}</td>
                                            <td className={`p-3 text-right font-bold ${data.income - data.expense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                Rs. {(data.income - data.expense).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Spending by Category">
                        <div className="space-y-4">
                            {stats.byCategory.map(([cat, amt]) => (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{cat}</span>
                                        <span className="font-bold">Rs. {amt.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(5, (amt / stats.expense) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* 3. Detailed Table Preview */}
                <Card title="Transaction Details" className="overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Vendor / Person</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-gray-600">
                                                {new Date(t.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-medium">
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-800 font-medium">
                                                {t.vendorName || '-'}
                                                {t.siteName && <div className="text-xs text-blue-600">{t.siteName}</div>}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={t.description}>
                                                {t.description}
                                            </td>
                                            <td className={`py-3 px-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'income' ? '+' : '-'} Rs. {t.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-400">
                                            No transactions found for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    );
}
