import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './numberToWords';
import { saveOrMergePDF } from './pdfGenerator';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const fullUrl = url.startsWith('http') || url.startsWith('data:')
            ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = fullUrl;
    });
};

const getImageFormat = (dataUrl: string): string => {
    if (dataUrl.includes('image/png')) return 'PNG';
    if (dataUrl.includes('image/webp')) return 'WEBP';
    return 'JPEG';
};

export const generateSalarySlipPDF = async (record: any, employee: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const rightEdge = pageWidth - margin;
    const contentWidth = pageWidth - (margin * 2);

    const hasLetterhead = !!profile?.letterhead_url;
    const isPdfLetterhead = profile?.letterhead_url?.startsWith('data:application/pdf');

    // Draw letterhead image background if available
    if (hasLetterhead && !isPdfLetterhead) {
        try {
            const lhData = await getBase64ImageFromURL(profile.letterhead_url);
            if (lhData) doc.addImage(lhData, 'PNG', 0, 0, pageWidth, pageHeight);
        } catch (e) { }
    }

    let y = 10;

    // === HEADER ===
    if (!hasLetterhead) {
        try {
            const logoUrl = '/hr-logo.png';
            const logoData = await getBase64ImageFromURL(logoUrl);
            if (logoData) doc.addImage(logoData, getImageFormat(logoData), margin, y, 30, 22);
        } catch (e) {
            if (profile?.logo_url || profile?.sidebar_logo_url) {
                try {
                    const l = profile.logo_url || profile.sidebar_logo_url;
                    const ld = await getBase64ImageFromURL(l);
                    if (ld) doc.addImage(ld, getImageFormat(ld), margin, y, 30, 22);
                } catch (err) { }
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 51, 102);
        const companyName = (profile?.name || 'Company Name').toUpperCase();
        doc.text(companyName, rightEdge, y + 8, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100);
        const addr = profile?.address || '';
        const phone = profile?.phone ? `Phone: ${profile.phone}` : '';
        doc.text(addr, rightEdge, y + 14, { align: 'right' });
        doc.text(phone, rightEdge, y + 19, { align: 'right' });

        y += 35;
    } else {
        y = 40;
    }

    y += 10;

    // === PERIOD LABEL ===
    const monthLabel = record.salary_month || '';
    let periodStr = monthLabel;

    if (monthLabel.includes(' to ')) {
        try {
            const [start, end] = monthLabel.split(' to ');
            const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
            periodStr = `${new Date(start).toLocaleDateString('en-GB', options)} to ${new Date(end).toLocaleDateString('en-GB', options)}`;
        } catch { periodStr = monthLabel; }
    } else if (monthLabel.includes('-') && monthLabel.split('-').length === 2) {
        const [yr, mn] = monthLabel.split('-');
        const year = parseInt(yr), monthIndex = parseInt(mn) - 1;
        let startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        if (employee.joining_date) {
            const jd = new Date(employee.joining_date);
            if (!isNaN(jd.getTime()) && jd.getMonth() === monthIndex && jd.getFullYear() === year && jd.getDate() > 1) {
                startDate = jd;
            }
        }
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        periodStr = `${startDate.toLocaleDateString('en-GB', options)} to ${endDate.toLocaleDateString('en-GB', options)}`;
    }

    // Title row
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('Salary Slip', margin, y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Pay Period: ${periodStr}`, rightEdge, y, { align: 'right' });

    y += 12;

    // Divider line
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.6);
    doc.line(margin, y, rightEdge, y);
    y += 8;

    // === EMPLOYEE DETAILS GRID ===
    const col2X = pageWidth / 2 + 10;
    const lineH = 8;

    const drawInfoLine = (label: string, value: string, x: number, currentY: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(label, x, currentY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20);
        doc.text(value, x + 35, currentY);
    };

    drawInfoLine('Employee:', employee.employee_name || '-', margin, y);
    drawInfoLine('Payment Date:', record.payment_date || '-', col2X, y);
    y += lineH;

    drawInfoLine('Department:', employee.department || '-', margin, y);
    drawInfoLine('Joining Date:', employee.joining_date || '-', col2X, y);
    y += lineH;

    drawInfoLine('Designation:', employee.designation || '-', margin, y);
    drawInfoLine('Bank:', employee.bank_name || '-', col2X, y);
    y += lineH;

    drawInfoLine('Account No:', employee.bank_account_no || '-', margin, y);
    drawInfoLine('Status:', record.payment_status || 'Pending', col2X, y);
    y += lineH + 4;

    // ═══════════════════════════════════════════════════════════════════
    // ATTENDANCE SUMMARY BOX  ← This is the key section that was missing
    // ═══════════════════════════════════════════════════════════════════
    const leavesCount = Number(record.leaves_count || 0);
    const absentCount = Number(record.absent_count || 0);
    const totalDays = Number(record.total_days_in_month || 30);
    const daysWorked = Number(record.days_worked || 0);
    // Present = payable days minus approved leaves (both are payable)
    const presentDays = Math.max(0, daysWorked - leavesCount);
    // Sundays included in payable, so working days = payable - leaves
    const daysRatio = `${daysWorked} / ${totalDays}`;

    // Box background
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.4);
    const boxH = 24;
    doc.roundedRect(margin, y, contentWidth, boxH, 3, 3, 'FD');

    // Box title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 51, 102);
    doc.text('ATTENDANCE SUMMARY', margin + 4, y + 6);

    // 4 stats inside the box, evenly distributed
    const colW = contentWidth / 4;
    const stats = [
        { icon: '✓', label: 'Present Days', value: String(presentDays), color: [0, 130, 80] as [number, number, number] },
        { icon: '⊘', label: 'Leave Days', value: String(leavesCount), color: [0, 86, 179] as [number, number, number] },
        { icon: '✗', label: 'Absent Days', value: String(absentCount), color: [200, 0, 0] as [number, number, number] },
        { icon: '=', label: 'Paid Days', value: daysRatio, color: [60, 60, 60] as [number, number, number] },
    ];

    stats.forEach((s, i) => {
        const cx = margin + colW * i + colW / 2;

        // Value (big)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...s.color);
        doc.text(s.value, cx, y + 15, { align: 'center' });

        // Label (small)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(s.label, cx, y + 21, { align: 'center' });
    });

    y += boxH + 10;

    // ═══════════════════════════════════════════════════════════════════
    // EARNINGS & DEDUCTIONS TABLES
    // ═══════════════════════════════════════════════════════════════════
    const monthlySalaryBase = (record.basic_salary || 0) + (record.house_rent || 0) +
        (record.medical_allowance || 0) + (record.transport_allowance || 0) + (record.other_allowance || 0);
    const dailyRate = Math.round(monthlySalaryBase / 30);
    const absentDeductionAmt = Math.round(absentCount * dailyRate);

    const earnings: [string, number][] = [
        ['Basic Salary', record.basic_salary || 0],
        ['House Rent Allowance', record.house_rent || 0],
        ['Medical Allowance', record.medical_allowance || 0],
        ['Transport Allowance', record.transport_allowance || 0],
        ['Other Allowance', record.other_allowance || 0],
    ];
    if ((record.overtime_hours || 0) > 0) earnings.push(['Overtime', (record.overtime_hours || 0) * (record.overtime_rate || 0)]);
    if ((record.bonus || 0) > 0) earnings.push(['Bonus', record.bonus]);

    const deductions: [string, number][] = [];
    // ✅ Absent deduction shown explicitly (absentCount × dailyRate)
    if (absentDeductionAmt > 0) deductions.push([`Absent Days (${absentCount} × Rs.${dailyRate}/day)`, absentDeductionAmt]);
    if ((record.advance_deduction || 0) > 0) deductions.push(['Advance Salary', record.advance_deduction]);
    if ((record.loan_deduction || 0) > 0) deductions.push(['Loan Repayment', record.loan_deduction]);
    if ((record.tax_deduction || 0) > 0) deductions.push(['Income Tax', record.tax_deduction]);
    if ((record.other_deduction || 0) > 0) deductions.push(['Other Deduction', record.other_deduction]);
    if ((record.deductions || 0) > 0) deductions.push(['Already Paid Amount', record.deductions]);

    const totalDed = deductions.reduce((s, [, v]) => s + (v || 0), 0);

    // Earnings table
    autoTable(doc, {
        startY: y,
        head: [['EARNINGS', 'AMOUNT (PKR)']],
        body: [
            ...earnings.map(([label, val]) => [label, (val || 0).toLocaleString()]),
            ['', ''],
            [{ content: 'Gross Pay', styles: { fontStyle: 'bold' } }, { content: (record.gross_salary || 0).toLocaleString(), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        tableWidth: contentWidth / 2 - 5,
        margin: { left: margin },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: 220, lineWidth: 0.1, textColor: 50 },
        alternateRowStyles: { fillColor: [248, 251, 255] },
        columnStyles: { 1: { halign: 'right' } }
    });

    const earnY = (doc as any).lastAutoTable.finalY;

    // Deductions / Paid Amount table
    const dedBody = deductions.length > 0
        ? deductions.map(([label, val]) => [label, (val || 0).toLocaleString()])
        : [['No Deductions', '0']];

    autoTable(doc, {
        startY: y,
        head: [['PAID AMOUNT', 'AMOUNT (PKR)']],
        body: [
            ...dedBody,
            ['', ''],
            [{ content: 'Total Paid', styles: { fontStyle: 'bold' } }, { content: totalDed.toLocaleString(), styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        tableWidth: contentWidth / 2 - 5,
        margin: { left: pageWidth / 2 + 5 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: 220, lineWidth: 0.1, textColor: 50 },
        alternateRowStyles: { fillColor: [248, 251, 255] },
        columnStyles: { 1: { halign: 'right' } }
    });

    const dedY = (doc as any).lastAutoTable.finalY;
    y = Math.max(earnY, dedY) + 12;

    // === NET PAY BOX ===
    doc.setFillColor(236, 245, 255);
    doc.rect(margin, y, contentWidth, 15, 'F');
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 15, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('NET SALARY PAYABLE', margin + 5, y + 10);

    doc.setFontSize(12);
    doc.text(`PKR ${(record.net_salary || 0).toLocaleString()}/-`, rightEdge - 5, y + 10, { align: 'right' });

    y += 18;

    // Amount in words
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const words = numberToWords(Math.round(record.net_salary || 0));
    doc.text(`In Words: ${words} Rupees Only`, margin, y);

    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120);
    const absentNote = absentDeductionAmt > 0 ? `  −  Absent Deduction Rs.${absentDeductionAmt.toLocaleString()}` : '';
    doc.text(`( Gross Rs.${(record.gross_salary || 0).toLocaleString()}${absentNote}  −  Other Deductions Rs.${(totalDed - absentDeductionAmt).toLocaleString()}  =  Net Rs.${(record.net_salary || 0).toLocaleString()} )`, margin, y);

    // === FOOTER / SIGNATURE ===
    const sigY = pageHeight - 25;

    if (profile?.stamp_url) {
        try {
            const stampData = await getBase64ImageFromURL(profile.stamp_url);
            if (stampData) doc.addImage(stampData, 'PNG', rightEdge - 45, sigY - 20, 35, 20);
        } catch (e) { }
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(rightEdge - 60, sigY, rightEdge, sigY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Employee Signature', rightEdge - 30, sigY + 6, { align: 'center' });

    await saveOrMergePDF(doc, profile, `Salary_Slip_${employee.employee_name}_${record.salary_month}.pdf`);
};
