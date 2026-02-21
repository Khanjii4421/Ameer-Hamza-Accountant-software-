import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        // Handle relative URLs
        const fullUrl = url.startsWith('http') || url.startsWith('data:')
            ? url
            : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            console.error('Failed to load image:', fullUrl);
            resolve('');
        };
        img.src = fullUrl;
    });
};

const getImageFormat = (dataUrl: string): 'PNG' | 'JPEG' => {
    return dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
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

const drawProfessionalLetterhead = async (doc: jsPDF, profile: any, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const rightMargin = pageWidth - 10;
    const leftMargin = 10;

    const hasLetterhead = !!profile?.letterhead_url;
    const isPdfLetterhead = profile?.letterhead_url?.startsWith('data:application/pdf');

    // 0. If it's an IMAGE letterhead, draw it as a full-page background
    if (hasLetterhead && !isPdfLetterhead) {
        try {
            const letterheadData = await getBase64ImageFromURL(profile.letterhead_url);
            if (letterheadData) {
                doc.addImage(letterheadData, getImageFormat(letterheadData), 0, 0, pageWidth, pageHeight);
            }
        } catch (e) {
            console.error("Failed to add image letterhead", e);
        }
    }


    // 1. Logo & Company Details (ONLY if NO letterhead is provided)
    if (!hasLetterhead) {
        // Logo (Top Left)
        try {
            const logoUrl = profile?.logo_url || profile?.sidebar_logo_url || '/hr-logo.png';
            const logoData = await getBase64ImageFromURL(logoUrl);
            if (logoData) {
                doc.addImage(logoData, getImageFormat(logoData), 10, 18, 30, 25);
            }
        } catch (e) { }

        // Address Block (Top Right)
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        const address = profile?.address || "";
        const phone = profile?.phone ? `Mob: ${profile.phone}` : "";
        const email = profile?.email || "";
        const web = profile?.website || "";

        doc.text(address, rightMargin, 22, { align: 'right' });
        doc.text(phone, rightMargin, 27, { align: 'right' });
        doc.text(email, rightMargin, 32, { align: 'right' });
        doc.text(web, rightMargin, 37, { align: 'right' });

        // Black Line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(leftMargin, 48, rightMargin, 48);

        // Company Name (Below Line)
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(profile?.name?.toUpperCase() || "", leftMargin, 47);

    }

    // 6. Title (Centered) - ONLY if NO letterhead is provided
    // If a letterhead is used, we assume it contains the title/branding
    if (title && !hasLetterhead) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(title.toUpperCase(), pageWidth / 2, 71, { align: 'center' });
        doc.setLineWidth(0.5);
        const titleWidth = doc.getTextWidth(title.toUpperCase());
        doc.line((pageWidth / 2) - (titleWidth / 2), 73, (pageWidth / 2) + (titleWidth / 2), 73);
        return 83;
    }
    return hasLetterhead ? 60 : 68; // Adjust starting Y based on presence of letterhead
};

const drawHeader = async (doc: jsPDF, project: any, profile: any) => {
    await drawProfessionalLetterhead(doc, profile, project.description || 'PROJECT LEDGER');

    // --- Project Info (Reordered as per User Request) ---
    // 1. Heading (Project Description) - CENTERED & BOLD
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18); // Slightly larger for emphasis
    doc.setTextColor(30, 64, 175); // Blue color
    const projectMainHeading = project.description || 'PROJECT LEDGER';
    doc.text(projectMainHeading.toUpperCase(), 105, 78, { align: 'center' });

    // 2. Client Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Client:', 15, 90);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61); // Green color
    const clientName = project.clients?.name || project.clientName || 'N/A';
    doc.text(clientName, 35, 90);

    // 3. Project Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Project:', 15, 97);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175); // Blue color
    const projectName = project.title || project.name || 'Unknown Project';
    doc.text(projectName.toUpperCase(), 35, 97);

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 190, 102, { align: 'right' });
};

const drawWatermark = async (doc: jsPDF, profile: any) => {
    if (profile.logo_url) {
        try {
            const imgProps = doc.getImageProperties(profile.logo_url);
            const width = 100;
            const height = (imgProps.height * width) / imgProps.width;
            const x = (210 - width) / 2;
            const y = (297 - height) / 2;

            // Opacity handling - increased opacity for better visibility
            doc.saveGraphicsState();
            // Cast to any to access GState if types are missing
            const gState = new (doc as any).GState({ opacity: 0.15 }); // Increased to 15%
            (doc as any).setGState(gState);

            const logoData = await getBase64ImageFromURL(profile.logo_url);
            if (logoData) {
                doc.addImage(logoData, getImageFormat(logoData), x, y, width, height);
            }
            doc.restoreGraphicsState();
        } catch (e) {
            console.log('Error adding watermark', e);
        }
    }
};

export const saveOrMergePDF = async (doc: jsPDF, profile: any, filename: string, isA5 = false, attachments: string[] = []) => {
    const hasPdfLetterhead = profile.letterhead_url && profile.letterhead_url.startsWith('data:application/pdf');
    const hasAttachments = attachments && attachments.length > 0;

    console.log('📎 PDF Generation:', { filename, hasAttachments, attachmentsCount: attachments.length, attachments });

    if (hasPdfLetterhead || hasAttachments) {
        try {
            const reportPdfBytes = doc.output('arraybuffer');
            const pdfDoc = await PDFDocument.create();
            const reportDoc = await PDFDocument.load(reportPdfBytes);

            let letterheadBytes: ArrayBuffer | null = null;
            let letterheadDims: { width: number, height: number } = {
                width: doc.internal.pageSize.getWidth(),
                height: doc.internal.pageSize.getHeight()
            };
            let embeddedLetterhead: any = null;

            if (hasPdfLetterhead) {
                letterheadBytes = await fetch(profile.letterhead_url).then(res => res.arrayBuffer());
                [embeddedLetterhead] = await pdfDoc.embedPdf(letterheadBytes!, [0]);
                letterheadDims = embeddedLetterhead.scale(1);
            }

            const embeddedReportPages = await pdfDoc.embedPdf(reportPdfBytes, reportDoc.getPageIndices());

            for (let i = 0; i < embeddedReportPages.length; i++) {
                const reportPage = embeddedReportPages[i];
                const newPage = pdfDoc.addPage([letterheadDims.width, letterheadDims.height]);

                // Draw letterhead only on the first page if present
                if (i === 0 && embeddedLetterhead) {
                    newPage.drawPage(embeddedLetterhead, {
                        x: 0,
                        y: 0,
                        width: letterheadDims.width,
                        height: letterheadDims.height
                    });
                }

                newPage.drawPage(reportPage, {
                    x: 0,
                    y: 0,
                    width: letterheadDims.width,
                    height: isA5 ? (letterheadDims.height / 2) : letterheadDims.height,
                });
            }

            // Append Attachments
            if (hasAttachments) {
                console.log('📎 Appending', attachments.length, 'attachments to PDF...');
                for (const url of attachments) {
                    try {
                        console.log('📎 Processing:', url);
                        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                        console.log('📎 Full URL:', fullUrl);
                        const resp = await fetch(fullUrl);
                        if (!resp.ok) {
                            console.error('📎 Fetch failed:', fullUrl, resp.status);
                            continue;
                        }
                        const bytes = await resp.arrayBuffer();
                        console.log('📎 Fetched', bytes.byteLength, 'bytes');

                        if (url.toLowerCase().endsWith('.pdf')) {
                            const attachmentDoc = await PDFDocument.load(bytes);
                            const copiedPages = await pdfDoc.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
                            copiedPages.forEach(page => pdfDoc.addPage(page));
                            console.log('📎 Added PDF attachment with', copiedPages.length, 'pages');
                        } else {
                            // Handle image
                            let image;
                            try {
                                image = url.toLowerCase().endsWith('.png')
                                    ? await pdfDoc.embedPng(bytes)
                                    : await pdfDoc.embedJpg(bytes);
                            } catch (imgErr) {
                                // Fallback to JPG if PNG embed fails or vice versa
                                try {
                                    image = await pdfDoc.embedJpg(bytes);
                                } catch (e2) {
                                    console.error('📎 Image embed failed:', url, e2);
                                    continue;
                                }
                            }

                            const page = pdfDoc.addPage([letterheadDims.width, letterheadDims.height]);
                            const { width, height } = page.getSize();
                            const imgDims = image.scaleToFit(width - 40, height - 40);
                            page.drawImage(image, {
                                x: (width - imgDims.width) / 2,
                                y: (height - imgDims.height) / 2,
                                width: imgDims.width,
                                height: imgDims.height,
                            });
                            console.log('📎 Added image attachment');
                        }
                    } catch (attErr) {
                        console.error("📎 Failed to append attachment:", url, attErr);
                    }
                }
                console.log('📎 Finished appending attachments');
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (e) {
            console.error("PDF Merge Error", e);
            doc.save(filename);
        }
    } else {
        doc.save(filename);
    }
}

export const generatePaymentSlip = async (
    entry: any,
    project: any,
    vendor: any,
    profile: any
) => {
    // SMALL SLIP SIZE (like bank receipt) - Half of A4 width
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [105, 148] // Small receipt size (half A4)
    });

    // Miran Builders Letterhead
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(profile?.name?.toUpperCase() || '', 74, 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(profile?.address || '', 74, 12, { align: 'center' });
    doc.text(`Phone: ${profile?.phone || ''}`, 74, 15, { align: 'center' });

    // Horizontal Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(5, 17, 143, 17);

    // Title & Ref
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('PAYMENT SLIP', 5, 25);

    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Ref #${entry.id.toString().slice(-6)}`, 143, 25, { align: 'right' });

    // Content
    let y = 28;
    const lineHeight = 6;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Date
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.date, 25, y);
    y += lineHeight;

    // Project
    doc.setFont('helvetica', 'bold');
    doc.text('Project:', 5, y);
    doc.setFont('helvetica', 'normal');
    const projectText = doc.splitTextToSize(project.name, 110);
    doc.text(projectText, 25, y);
    y += (projectText.length * 5) + 2;

    // Vendor
    if (vendor) {
        doc.setFont('helvetica', 'bold');
        doc.text('Paid To:', 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${vendor.name} (${vendor.category})`, 25, y);
        y += lineHeight;
    }

    // Description
    doc.setFont('helvetica', 'bold');
    doc.text('Details:', 5, y);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(entry.description, 110);
    doc.text(splitDesc, 25, y);
    y += (splitDesc.length * 5) + 4;

    // Amount Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(5, y, 138, 15, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Total Paid:', 10, y + 6);

    doc.setFontSize(16);
    doc.setTextColor(200, 0, 0);
    doc.text(`Rs. ${entry.amount.toLocaleString()}`, 138, y + 10, { align: 'right' });

    // Signature
    y += 22;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Authorized Signature', 110, y + 10, { align: 'center' });
    doc.line(90, y + 8, 130, y + 8);

    // Save and AUTO-PRINT
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Open in new window and trigger print dialog
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
        printWindow.onload = () => {
            printWindow.print();
        };
    }
};

export const generateLedgerPDF = async (
    project: any,
    entries: any[],
    profile: any,
    notes?: string
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const hasPdfLetterhead = profile.letterhead_url && profile.letterhead_url.startsWith('data:application/pdf');

    // Header Drawing Logic
    if (!hasPdfLetterhead) {
        if (profile.letterhead_url) {
            try {
                const letterheadData = await getBase64ImageFromURL(profile.letterhead_url);
                if (letterheadData) {
                    doc.addImage(letterheadData, getImageFormat(letterheadData), 0, 10, 210, 297);
                }
            } catch (e) { console.log('Letterhead img error', e); }
        } else {
            await drawHeader(doc, project, profile);
        }
    } else {
        // Just content overlay
        // --- Project Info Overlay (Reordered as per User Request) ---
        // 1. Heading (Project Description) - CENTERED & BOLD
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16); // Slightly larger
        doc.setTextColor(30, 64, 175); // Blue
        const projectMainHeading = project.description || 'PROJECT LEDGER';
        doc.text(projectMainHeading.toUpperCase(), 105, 88, { align: 'center' });

        // 2. Client Name
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Client:', 15, 100);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(21, 128, 61); // Green
        const clientName = project.clients?.name || project.clientName || 'N/A';
        doc.text(clientName, 35, 100);

        // 3. Project Name
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Project:', 15, 107);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 64, 175); // Blue
        const projectName = project.title || project.name || 'Unknown Project';
        doc.text(projectName.toUpperCase(), 35, 107);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 190, 112, { align: 'right' });
    }

    // Watermark (from uploaded letterhead/logo)
    await drawWatermark(doc, profile);

    // Calculate totals
    const safeEntries = Array.isArray(entries) ? entries : [];
    const totalReceived = safeEntries.reduce((sum, e) => sum + (e.type === 'CREDIT' ? e.amount : 0), 0);
    const totalExpense = safeEntries.reduce((sum, e) => sum + (e.type === 'DEBIT' ? e.amount : 0), 0);
    const finalBalance = safeEntries.length > 0 ? safeEntries[safeEntries.length - 1].balance : 0;

    // Prepare proof data with details and indices
    const allProofs: { url: string, details: string, originalIndex: number }[] = [];
    const entryProofMap: { [key: number]: { start: number, count: number } } = {};

    let currentProofIndex = 0;
    safeEntries.forEach((e, index) => {
        const urls = parseProofUrls(e.attachment_url || e.proof_url);
        entryProofMap[index] = { start: currentProofIndex, count: urls.length };

        urls.forEach(url => {
            allProofs.push({
                url,
                details: `${e.date} - ${e.description} (Rs. ${e.amount.toLocaleString()})`,
                originalIndex: currentProofIndex++
            });
        });
    });
    console.log('📎 Collected proof URLs:', allProofs.length);

    // Store link positions to create them later
    const linksToCreate: { pageFrom: number, x: number, y: number, w: number, h: number, proofIndex: number }[] = [];

    autoTable(doc, {
        startY: profile.letterhead_url ? 123 : 113, // Adjusted to 123 to account for +10mm shift
        head: [['Date', 'Description', 'Received (In)', 'Expense (Out)', 'Attachments', 'Balance']],
        body: safeEntries.map((e, idx) => {
            const { count } = entryProofMap[idx];

            // Create attachments cell content with multiple links
            let attachmentsContent: any;
            if (count === 0) {
                attachmentsContent = '-';
            } else if (count === 1) {
                attachmentsContent = 'View Slip';
            } else {
                attachmentsContent = Array.from({ length: count }, (_, i) => `Slip ${i + 1}`).join('\n');
            }

            return [
                new Date(e.date).toLocaleDateString(),
                e.description,
                e.type === 'CREDIT' ? `Rs. ${e.amount.toLocaleString()}` : '-',
                e.type === 'DEBIT' ? `Rs. ${e.amount.toLocaleString()}` : '-',
                attachmentsContent,
                `Rs. ${e.balance.toLocaleString()}`
            ];
        }),
        foot: [[
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
            { content: `Rs. ${totalReceived.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [0, 100, 0], fillColor: [240, 255, 240] } },
            { content: `Rs. ${totalExpense.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [200, 0, 0], fillColor: [255, 240, 240] } },
            { content: '-', styles: { fillColor: [240, 240, 240] } },
            { content: `Rs. ${finalBalance.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [255, 250, 200] } }
        ]],
        theme: 'grid',
        showFoot: 'lastPage',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 215, 0], fontSize: 10 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            2: { halign: 'right', textColor: [0, 100, 0] },
            3: { halign: 'right', textColor: [200, 0, 0] },
            4: { halign: 'center', textColor: [37, 99, 235], fontSize: 6, fontStyle: 'bold' }, // Attachments
            5: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                // Style attachments column
                if (data.column.index === 4) {
                    const raw = data.cell.raw as any;
                    // Always blue bold
                    data.cell.styles.textColor = [37, 99, 235];
                    data.cell.styles.fontStyle = 'bold';
                    if (typeof raw === 'string' && raw.includes('Slip')) {
                        data.cell.styles.fontSize = 6;
                    }
                }
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                const rowIndex = data.row.index;
                if (entryProofMap[rowIndex]) {
                    const { start, count } = entryProofMap[rowIndex];

                    if (count > 0) {
                        const pageNum = doc.internal.pages.length - 1;

                        if (count === 1) {
                            linksToCreate.push({
                                pageFrom: pageNum,
                                x: data.cell.x,
                                y: data.cell.y,
                                w: data.cell.width,
                                h: data.cell.height,
                                proofIndex: start
                            });
                        } else {
                            const cellHeight = data.cell.height;
                            const lineHeight = cellHeight / count;

                            for (let i = 0; i < count; i++) {
                                linksToCreate.push({
                                    pageFrom: pageNum,
                                    x: data.cell.x,
                                    y: data.cell.y + (i * lineHeight),
                                    w: data.cell.width,
                                    h: lineHeight,
                                    proofIndex: start + i
                                });
                            }
                        }
                    }
                }
            }
        },
        margin: { top: 15, bottom: 20, left: 10, right: 10 } // Better margins for printing
    });

    // Add Notes if present
    if (notes) {
        const finalY = (doc as any).lastAutoTable.finalY || 200;
        const pageHeight = doc.internal.pageSize.height;
        let startY = finalY + 10;

        // If not enough space (approx 40mm needed), add new page
        if (startY + 30 > pageHeight) {
            doc.addPage();
            startY = 40; // Start lower on new page
        }

        // Position at bottom left
        const notesY = Math.max(startY, pageHeight - 40);

        // Check if it overflows page
        if (notesY > pageHeight - 20) {
            doc.addPage();
            const newPageY = pageHeight - 40;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Notes:', 15, newPageY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(notes, 120);
            doc.text(splitNotes, 32, newPageY);
        } else {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Notes:', 15, notesY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(notes, 120);
            doc.text(splitNotes, 32, notesY);
        }
    }

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
    }

    // Add proof images as separate pages and track their page numbers
    const proofPageNumbers: { [key: number]: number } = {};

    if (allProofs.length > 0) {
        console.log('📎 Adding', allProofs.length, 'proof images to Project Ledger PDF...');

        for (let i = 0; i < allProofs.length; i++) {
            const proof = allProofs[i];
            try {
                console.log('📎 Loading proof image:', proof.url);
                const imageData = await getBase64ImageFromURL(proof.url);

                doc.addPage();
                const newPageNum = doc.internal.pages.length - 1;
                proofPageNumbers[i] = newPageNum;

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`Proof / Slip ${i + 1}`, pageWidth / 2, 15, { align: 'center' });

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text(`Ref: ${proof.details}`, pageWidth / 2, 22, { align: 'center' });

                try {
                    const imgProps = doc.getImageProperties(imageData);
                    const imgWidth = pageWidth - 40;
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                    let finalWidth = imgWidth;
                    let finalHeight = imgHeight;
                    const maxHeight = pageHeight - 60;

                    if (finalHeight > maxHeight) {
                        finalHeight = maxHeight;
                        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
                    }

                    const x = (pageWidth - finalWidth) / 2;
                    const y = 30;

                    doc.addImage(imageData, getImageFormat(imageData), x, y, finalWidth, finalHeight);
                    console.log('📎 Added proof image', i + 1);
                } catch (imgErr) {
                    console.error('Failed to add image to PDF:', imgErr);
                    doc.setFontSize(10);
                    doc.setTextColor(200, 0, 0);
                    doc.text('Failed to load image', pageWidth / 2, pageHeight / 2, { align: 'center' });
                }
            } catch (err) {
                console.error('Failed to load proof image:', proof.url, err);
            }
        }
        console.log('📎 Finished adding proof images');
    }

    // Create internal links
    console.log('📎 Creating internal links...', linksToCreate.length);
    linksToCreate.forEach(link => {
        const targetPage = proofPageNumbers[link.proofIndex];
        if (targetPage) {
            doc.setPage(link.pageFrom);
            doc.link(link.x, link.y, link.w, link.h, { pageNumber: targetPage });
        }
    });

    await saveOrMergePDF(doc, profile, `${project.title || project.name || 'Project'}_Ledger.pdf`, false, []);
};

export const generateVendorHistoryPDF = async (
    vendor: { name: string, category: string, phone: string },
    entries: any[],
    profile: any
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = doc.internal.pageSize.width;

    // 1. Company Letterhead (MIRAN BUILDERS)
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(profile?.name?.toUpperCase() || '', pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(profile?.address || '', pageWidth / 2, 36, { align: 'center' });
    doc.text(`Phone: ${profile?.phone || ''}`, pageWidth / 2, 41, { align: 'center' });

    // Horizontal Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(15, 46, pageWidth - 15, 46);

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('VENDOR HISTORY REPORT', pageWidth / 2, 58, { align: 'center' });

    // Vendor Info
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Vendor:', 15, 70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    const vendorName = vendor.name || 'Unknown Vendor';
    doc.text(vendorName.toUpperCase(), 35, 70);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Category: ${vendor.category}`, 15, 77);
    doc.text(`Phone: ${vendor.phone}`, 15, 84);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 190, 84, { align: 'right' });

    await drawWatermark(doc, profile);

    const safeEntries = Array.isArray(entries) ? entries : [];
    const totalPaid = safeEntries.reduce((s, e) => s + e.amount, 0);

    autoTable(doc, {
        startY: 93,
        head: [['Date', 'Project', 'Details', 'Amount']],
        body: safeEntries.map(e => [
            e.date,
            e.projectName,
            e.description + (e.paymentMethod ? ` (${e.paymentMethod})` : ''),
            `Rs. ${e.amount.toLocaleString()}`
        ]),
        foot: [[
            { content: 'TOTAL PAID', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rs. ${totalPaid.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [200, 0, 0] } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 215, 0], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { top: 15, bottom: 20, left: 10, right: 10 }
    });

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`${vendor.name.replace(/ /g, '_')}_History.pdf`);
};

export const generateLaborLedgerPDF = async (
    expenses: any[],
    profile: any,
    notes?: string
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const hasPdfLetterhead = profile.letterhead_url && profile.letterhead_url.startsWith('data:application/pdf');

    // Header Drawing Logic
    // Header Drawing Logic
    if (!hasPdfLetterhead) {
        await drawProfessionalLetterhead(doc, profile, 'LABOR EXPENSES REPORT');
    }

    await drawWatermark(doc, profile);

    const safeEntries = Array.isArray(expenses) ? expenses : [];
    const totalAmount = safeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPaid = safeEntries.filter(e => e.is_paid).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalUnpaid = totalAmount - totalPaid;

    // Prepare proof data with details and indices
    const allProofs: { url: string, details: string, originalIndex: number }[] = [];
    const entryProofMap: { [key: number]: { start: number, count: number } } = {};

    let currentProofIndex = 0;
    safeEntries.forEach((e, index) => {
        const urls = parseProofUrls(e.proof_url);
        entryProofMap[index] = { start: currentProofIndex, count: urls.length };

        urls.forEach(url => {
            allProofs.push({
                url,
                details: `${new Date(e.date).toLocaleDateString()} - ${e.description} (Rs. ${Number(e.amount).toLocaleString()})`,
                originalIndex: currentProofIndex++
            });
        });
    });
    console.log('📎 Collected proof URLs:', allProofs.length);

    // Store link positions to create them later
    const linksToCreate: { pageFrom: number, x: number, y: number, w: number, h: number, proofIndex: number }[] = [];


    autoTable(doc, {
        startY: 65,
        head: [['Date', 'Site / Project', 'Category', 'Description', 'Status', 'Attachments', 'Amount']],
        body: safeEntries.map((e, idx) => {
            const { count } = entryProofMap[idx];

            // Create attachments cell content with multiple links
            let attachmentsContent: any;
            if (count === 0) {
                attachmentsContent = '-';
            } else if (count === 1) {
                attachmentsContent = 'View Slip';
            } else {
                attachmentsContent = Array.from({ length: count }, (_, i) => `Slip ${i + 1}`).join('\n');
            }

            return [
                new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                e.site_name || 'N/A', // Changed from e.project?.title to match existing
                e.category || '-', // Changed from e.vendor?.category to match existing
                e.description,
                e.is_paid ? 'Paid' : 'Unpaid',
                attachmentsContent,
                `Rs. ${Number(e.amount).toLocaleString()}`
            ];
        }),
        foot: [
            [
                { content: 'Total Paid:', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74] } },
                { content: `Rs. ${totalPaid.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }
            ],
            [
                { content: 'Total Unpaid:', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [234, 179, 8] } },
                { content: `Rs. ${totalUnpaid.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [234, 179, 8] } }
            ],
            [
                { content: 'TOTAL LABOR COST:', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0] } },
                { content: `Rs. ${totalAmount.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [0, 0, 0] } }
            ]
        ],
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 215, 0], fontSize: 10 },
        styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0] },
        columnStyles: {
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', textColor: [37, 99, 235], fontSize: 6, fontStyle: 'bold' }, // Blue for attachments
            6: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] }
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                if (data.column.index === 4) {
                    const val = data.cell.raw as string;
                    if (val === 'Paid') data.cell.styles.textColor = [22, 163, 74];
                    else data.cell.styles.textColor = [234, 179, 8];
                }
                // Style attachments column
                if (data.column.index === 5) {
                    const raw = data.cell.raw as any;
                    // Always blue bold
                    data.cell.styles.textColor = [37, 99, 235];
                    data.cell.styles.fontStyle = 'bold';
                    if (typeof raw === 'string' && raw.includes('Slip')) {
                        data.cell.styles.fontSize = 6;
                    }
                }
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
                const rowIndex = data.row.index;
                if (entryProofMap[rowIndex]) {
                    const { start, count } = entryProofMap[rowIndex];

                    if (count > 0) {
                        const pageNum = doc.internal.pages.length - 1;

                        if (count === 1) {
                            linksToCreate.push({
                                pageFrom: pageNum,
                                x: data.cell.x,
                                y: data.cell.y,
                                w: data.cell.width,
                                h: data.cell.height,
                                proofIndex: start
                            });
                        } else {
                            const cellHeight = data.cell.height;
                            const lineHeight = cellHeight / count;

                            for (let i = 0; i < count; i++) {
                                linksToCreate.push({
                                    pageFrom: pageNum,
                                    x: data.cell.x,
                                    y: data.cell.y + (i * lineHeight),
                                    w: data.cell.width,
                                    h: lineHeight,
                                    proofIndex: start + i
                                });
                            }
                        }
                    }
                }
            }
        },
        margin: { top: 15, bottom: 20, left: 10, right: 10 }
    });

    // Add Notes & Signature
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    const pageHeight = doc.internal.pageSize.height;

    // Calculate start Y for footer (Notes + Signature)
    let footerY = finalY + 10;

    // Check if enough space for notes and signature (needs approx 30-40mm)
    // If not, add new page
    if (footerY + 40 > pageHeight) {
        doc.addPage();
        footerY = 40;
    }

    // Positions
    // Use footerY for Notes top
    // Use slightly lower for Signature line to align

    // 1. Notes (Left Side)
    if (notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notes:', 15, footerY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        // Wrap notes to 100mm width to not hit signature area
        const splitNotes = doc.splitTextToSize(notes, 100);
        doc.text(splitNotes, 15, footerY + 5);
    }

    // 2. Signature (Right Side) - ALWAYS SHOW
    // Approx align bottom of signature line with the notes content
    const signatureLineY = footerY + 20;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(130, signatureLineY, 190, signatureLineY); // Line

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Authorized Signature', 160, signatureLineY + 5, { align: 'center' });

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
    }

    // Add proof images as separate pages and track their page numbers
    const proofPageNumbers: { [key: number]: number } = {};

    if (allProofs.length > 0) {
        console.log('📎 Adding', allProofs.length, 'proof images to PDF...');

        for (let i = 0; i < allProofs.length; i++) {
            const proof = allProofs[i];
            try {
                console.log('📎 Loading proof image:', proof.url);
                const imageData = await getBase64ImageFromURL(proof.url);

                // Add new page for each proof
                doc.addPage();
                const newPageNum = doc.internal.pages.length - 1;
                proofPageNumbers[i] = newPageNum;

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Add title
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`Proof / Slip ${i + 1}`, pageWidth / 2, 15, { align: 'center' });

                // Add details
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text(`Ref: ${proof.details}`, pageWidth / 2, 22, { align: 'center' });

                // Add the image
                try {
                    const imgProps = doc.getImageProperties(imageData);
                    const imgWidth = pageWidth - 40; // 20mm margin on each side
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                    // If image is too tall, scale it down
                    let finalWidth = imgWidth;
                    let finalHeight = imgHeight;
                    const maxHeight = pageHeight - 60; // Leave space for title and margins

                    if (finalHeight > maxHeight) {
                        finalHeight = maxHeight;
                        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
                    }

                    const x = (pageWidth - finalWidth) / 2;
                    const y = 30;

                    doc.addImage(imageData, getImageFormat(imageData), x, y, finalWidth, finalHeight);
                    console.log('📎 Added proof image', i + 1);
                } catch (imgErr) {
                    console.error('📎 Failed to add image to PDF:', imgErr);
                    doc.setFontSize(10);
                    doc.setTextColor(200, 0, 0);
                    doc.text('Failed to load image', pageWidth / 2, pageHeight / 2, { align: 'center' });
                }
            } catch (err) {
                console.error('📎 Failed to load proof image:', proof.url, err);
            }
        }
    }

    // Create internal links
    console.log('📎 Creating internal links...', linksToCreate.length);
    linksToCreate.forEach(link => {
        const targetPage = proofPageNumbers[link.proofIndex];
        if (targetPage) {
            doc.setPage(link.pageFrom);
            doc.link(link.x, link.y, link.w, link.h, { pageNumber: targetPage });
        }
    });

    await saveOrMergePDF(doc, profile, `Labor_Expenses_Report.pdf`, false, []);
};

export const generateLaborVendorLedgerPDF = async (
    vendor: any,
    expenses: any[],
    totalOutstanding: number,
    profile: any,
    showStamp: boolean = false
) => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageWidth = 210;
    const pageHeight = 297;
    let yPos = 20;

    const hasPdfLetterhead = profile.letterhead_url && profile.letterhead_url.startsWith('data:application/pdf');

    const hasLetterhead = !!profile?.letterhead_url;
    const isPdfLetterhead = profile?.letterhead_url?.startsWith('data:application/pdf');

    // Header Drawing Logic
    if (hasLetterhead) {
        if (!isPdfLetterhead) {
            try {
                const letterheadData = await getBase64ImageFromURL(profile.letterhead_url);
                if (letterheadData) {
                    doc.addImage(letterheadData, getImageFormat(letterheadData), 0, 0, pageWidth, pageHeight);
                }
            } catch (e) { }
        }
        yPos = 78; // Start lower to give space for letterhead
    } else {
        await drawManualHeader();
    }

    async function drawManualHeader() {
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(profile?.name?.toUpperCase() || '', pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(profile?.address || '', pageWidth / 2, 26, { align: 'center' });
        doc.text(`Phone: ${profile?.phone || ''}`, pageWidth / 2, 31, { align: 'center' });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(15, 36, pageWidth - 15, 36);
        yPos = 48;
    }

    // Data shifted down by 3cm total as requested (1cm + 2cm)
    yPos += 30;

    // 3. Vendor Details Section
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 1, 1, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Vendor: ${vendor?.name || 'Unknown'}`, 20, yPos + 7.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Category: ${vendor?.category || 'N/A'}`, pageWidth - 20, yPos + 7.5, { align: 'right' });

    yPos += 18;

    // Watermark
    await drawWatermark(doc, profile);

    const tableData = expenses.map((exp, index) => [
        index + 1,
        new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        exp.site_name || 'N/A',
        exp.description,
        `Rs. ${Number(exp.amount).toLocaleString()}`,
        `Rs. ${exp.runningBalance.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Sr.', 'Date', 'Site', 'Description', 'Amount', 'Balance']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 3
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 8,
            halign: 'center',
            valign: 'middle',
            cellPadding: 3,
            lineColor: [226, 232, 240]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold', textColor: [100, 116, 139] },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto', halign: 'left' },
            4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
            5: { halign: 'right', textColor: [51, 65, 85], cellWidth: 28 }
        },
        margin: { top: 20, left: 15, right: 15 },
        didDrawPage: (data) => {
            const str = 'Page ' + doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150);
            doc.text(str, pageWidth - 15, pageHeight - 10, { align: 'right' });
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const currentTotalY = finalY > pageHeight - 30 ? 20 : finalY;
    if (finalY > pageHeight - 30) doc.addPage();

    doc.setFillColor(243, 244, 246);
    doc.rect(pageWidth - 80, currentTotalY, 66, 12, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Total Outstanding:', pageWidth - 75, currentTotalY + 8);

    doc.setTextColor(220, 38, 38);
    doc.text(`Rs. ${totalOutstanding.toLocaleString()}`, pageWidth - 18, currentTotalY + 8, { align: 'right' });

    if (showStamp) {
        const pageHeight = doc.internal.pageSize.getHeight();
        let sigY = pageHeight - 25;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 65, sigY, pageWidth - 15, sigY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("CEO Adnan Zafar", pageWidth - 40, sigY + 5, { align: 'center' });

        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) {
                doc.addImage(stampData, getImageFormat(stampData), pageWidth - 55, sigY - 25, 30, 30);
            }
        } catch (e) { }
    }

    const fileName = `Vendor_Ledger_${vendor?.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    await saveOrMergePDF(doc, profile, fileName);
};

export const generateOfficeExpensesPDF = async (
    expenses: any[],
    profile: any,
    category: string = 'All',
    status: string = 'All',
    notes: string = '',
    showStamp: boolean = false
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const rightMargin = pageWidth - 10;
    const leftMargin = 10;

    // 1. Watermark
    if (profile?.logo_url || profile?.sidebar_logo_url) {
        try {
            const logoUrl = profile.logo_url || profile.sidebar_logo_url;
            const logoData = await getBase64ImageFromURL(logoUrl);
            if (logoData) {
                doc.saveGraphicsState();
                (doc as any).setGState((doc as any).GState({ opacity: 0.05 }));
                const imgDim = 120;
                doc.addImage(logoData, getImageFormat(logoData), (pageWidth - imgDim) / 2, (pageHeight - imgDim) / 2, imgDim, imgDim);
                doc.restoreGraphicsState();
            }
        } catch (e) { }
    }

    // 2. Header Content (Professional Style)
    await drawProfessionalLetterhead(doc, profile, "OFFICE EXPENSES REPORT");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Category: ${category}   |   Status: ${status}`, 10, 70);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, rightMargin, 70, { align: 'right' });

    let currentY = 75;

    // Group expenses by category
    const grouped: Record<string, any[]> = {};
    expenses.forEach(e => {
        const cat = e.category || 'Uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(e);
    });

    const categoryKeys = Object.keys(grouped).sort();

    // Iterate through categories
    for (const cat of categoryKeys) {
        const catExpenses = grouped[cat];
        const catTotal = catExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Check if we need a new page for the header
        if (currentY + 30 > pageHeight) {
            doc.addPage();
            currentY = 20;
        }

        // Category Header
        doc.setFillColor(240, 248, 255); // Alice Blue
        doc.rect(10, currentY, pageWidth - 20, 8, 'F');

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`${cat} (${catExpenses.length})`, 12, currentY + 5.5);
        doc.text(`Total: Rs. ${catTotal.toLocaleString()}`, rightMargin - 2, currentY + 5.5, { align: 'right' });

        currentY += 10;

        // Table for this category
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Description', 'Status', 'Amount']],
            body: catExpenses.map((e: any) => [
                new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                e.description,
                e.is_paid ? 'Paid' : 'Unpaid',
                Number(e.amount).toLocaleString()
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [100, 100, 100],
                fontStyle: 'bold',
                lineWidth: 0,
                fontSize: 9
            },
            styles: { fontSize: 9, cellPadding: 3, textColor: [50, 50, 50] },
            columnStyles: {
                0: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    if (data.cell.raw === 'Paid') data.cell.styles.textColor = [22, 163, 74];
                    else data.cell.styles.textColor = [234, 179, 8];
                }
            },
            margin: { left: 10, right: 10 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Grand Summary
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPaid = expenses.filter(e => e.is_paid).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalUnpaid = totalExpense - totalPaid;

    if (currentY + 40 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }

    doc.setDrawColor(200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(10, currentY, pageWidth - 20, 25, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Grand Summary", 15, currentY + 8);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Total Expenses:", 15, currentY + 18);
    doc.text(`Rs. ${totalExpense.toLocaleString()}`, 45, currentY + 18);

    doc.setTextColor(22, 163, 74);
    doc.text(`Paid: Rs. ${totalPaid.toLocaleString()}`, 90, currentY + 18);

    doc.setTextColor(234, 179, 8); // Amber-600
    doc.text(`Unpaid: Rs. ${totalUnpaid.toLocaleString()}`, 150, currentY + 18);

    currentY += 35;

    // Notes
    if (notes) {
        if (currentY + 30 > pageHeight) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Notes:", leftMargin, currentY);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 30);
        doc.text(splitNotes, leftMargin + 15, currentY);
        currentY += (splitNotes.length * 5) + 10;
    }

    // Stamp / Signature
    if (showStamp) {
        const pageHeight = doc.internal.pageSize.getHeight();
        let sigY = pageHeight - 25;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(140, sigY, 190, sigY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("CEO Adnan Zafar", 165, sigY + 5, { align: 'center' });

        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) {
                doc.addImage(stampData, getImageFormat(stampData), 150, sigY - 25, 30, 30);
            }
        } catch (e) { }
    }

    // Page Numbers
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, 290, { align: 'right' });
    }

    await saveOrMergePDF(doc, profile, `Office_Expenses_${new Date().toISOString().split('T')[0]}.pdf`, false, []);
};

export const generateIndependentExpensesPDF = async (
    expenses: any[],
    profile: any,
    filters: any = {},
    notes: string = '',
    showStamp: boolean = false
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true,
        orientation: 'landscape'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 10;
    const rightMargin = pageWidth - 10;

    // 1. Watermark
    await drawWatermark(doc, profile);

    // 2. Letterhead
    await drawProfessionalLetterhead(doc, profile, "Independent Expenses Report");

    // 3. Filter Summary
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    let filterText = "Filters: ";
    if (filters.site) filterText += `Site: ${filters.site} | `;
    if (filters.vendor) filterText += `Vendor: ${filters.vendor} | `;
    if (filters.category) filterText += `Category: ${filters.category} | `;
    if (filters.search) filterText += `Search: ${filters.search} | `;
    if (!filters.site && !filters.vendor && !filters.category && !filters.search) filterText += "All";
    doc.text(filterText, leftMargin, 70);

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Summary Table
    autoTable(doc, {
        startY: 75,
        head: [['Summary', 'Value']],
        body: [
            ['Total Entries', expenses.length.toString()],
            ['Total Amount', `Rs. ${total.toLocaleString()}`]
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        margin: { left: pageWidth - 70 }
    });

    const tableStartY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
        startY: tableStartY,
        head: [['Sr No', 'Date', 'Person', 'Vendor', 'Category', 'Site', 'Description', 'Amount']],
        body: expenses.map(e => [
            e.sr_no,
            new Date(e.date).toLocaleDateString('en-GB'),
            e.name,
            e.vendor_name,
            e.vendor_category,
            e.site,
            e.description,
            Number(e.amount).toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 7: { halign: 'right', fontStyle: 'bold' } }
    });

    if (notes) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", leftMargin, finalY);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 30);
        doc.text(splitNotes, leftMargin + 15, finalY);
    }

    if (showStamp) {
        const pageHeight = doc.internal.pageSize.getHeight();
        let sigY = pageHeight - 25;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 60, sigY, pageWidth - 10, sigY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("CEO Adnan Zafar", pageWidth - 35, sigY + 5, { align: 'center' });

        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) {
                doc.addImage(stampData, getImageFormat(stampData), pageWidth - 50, sigY - 25, 30, 30);
            }
        } catch (e) { }
    }

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    await saveOrMergePDF(doc, profile, `Independent_Expenses_${new Date().toISOString().split('T')[0]}.pdf`, false, []);
};
