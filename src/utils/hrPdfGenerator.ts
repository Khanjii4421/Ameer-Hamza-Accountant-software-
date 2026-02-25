import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './numberToWords';
import { saveOrMergePDF } from './pdfGenerator';

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
            console.warn('Failed to load image:', fullUrl);
            resolve('');
        };
        img.src = fullUrl;
    });
};

const renderUrduTextAsImage = (text: string, fontSize: number, color: number[] = [0, 0, 0], align: 'right' | 'center' | 'left' = 'right'): { dataUrl: string, width: number, height: number } => {
    if (!text || typeof document === 'undefined') return { dataUrl: '', width: 0, height: 0 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', width: 0, height: 0 };

    const scale = 4;
    ctx.canvas.dir = 'rtl';
    (ctx as any).direction = 'rtl';
    ctx.font = `${fontSize * scale}px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif`;
    const metrics = ctx.measureText(text);

    const padding = 10 * scale;
    canvas.width = metrics.width + padding;
    // Increased canvas height to prevent clipping tall Urdu characters like 'ک' (kaf)
    canvas.height = (fontSize * 3.5) * scale;

    ctx.canvas.dir = 'rtl';
    (ctx as any).direction = 'rtl';
    ctx.font = `${fontSize * scale}px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif`;
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.textBaseline = 'middle';

    if (align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    } else if (align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(text, canvas.width - (padding / 2), canvas.height / 2);
    } else {
        ctx.textAlign = 'left';
        ctx.fillText(text, padding / 2, canvas.height / 2);
    }

    // Convert back to document units (mm)
    const mmWidth = (canvas.width / scale) * 0.264583;
    const mmHeight = (canvas.height / scale) * 0.264583;

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: mmWidth,
        height: mmHeight
    };
};


const getImageFormat = (dataUrl: string): string => {
    if (dataUrl.includes('image/png')) return 'PNG';
    if (dataUrl.includes('image/webp')) return 'WEBP';
    return 'JPEG';
};

const drawSharedLetterhead = async (doc: jsPDF, profile: any, refNo?: string, dateStr?: string, title?: string) => {
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
            doc.addImage(letterheadData, 'PNG', 0, 0, pageWidth, pageHeight);
        } catch (e) { }
    }

    // 1. Watermark (Center Page) - Only if no letterhead
    if (!hasLetterhead) {
        try {
            const logoUrl = '/hr-logo.png';
            const logoData = await getBase64ImageFromURL(logoUrl);
            doc.saveGraphicsState();
            (doc as any).setGState((doc as any).GState({ opacity: 0.05 }));
            const imgDim = 120;
            const x = (pageWidth - imgDim) / 2;
            const y = (pageHeight - imgDim) / 2;
            doc.addImage(logoData, 'PNG', x, y, imgDim, imgDim);
            doc.restoreGraphicsState();
        } catch (e) { }
    }

    // 2. Header Content (ONLY if NO letterhead)
    if (!hasLetterhead) {
        // Logo (Top Left)
        try {
            const logoUrl = '/hr-logo.png';
            const logoData = await getBase64ImageFromURL(logoUrl);
            if (logoData) doc.addImage(logoData, getImageFormat(logoData), 10, 18, 35, 25);
        } catch (e) {
            // Fallback to profile logo
            if (profile?.logo_url || profile?.sidebar_logo_url) {
                try {
                    const logoUrl = profile.logo_url || profile.sidebar_logo_url;
                    const logoData = await getBase64ImageFromURL(logoUrl);
                    if (logoData) doc.addImage(logoData, getImageFormat(logoData), 10, 18, 30, 25);
                } catch (err) { }
            }
        }

        // Address Block (Top Right)
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        const address = profile?.address || "";
        const phone = profile?.phone ? `Mob: ${profile.phone}` : "";
        const tel = profile?.tel || "";
        const email = profile?.email || "";
        const web = profile?.website || "";

        let textY = 22;
        doc.text(address, rightMargin, textY, { align: 'right' });
        textY += 5;
        doc.text(phone, rightMargin, textY, { align: 'right' });
        textY += 5;
        doc.text(tel, rightMargin, textY, { align: 'right' });
        textY += 5;
        doc.text(email, rightMargin, textY, { align: 'right' });
        textY += 5;
        doc.text(web, rightMargin, textY, { align: 'right' });

        // Black Line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(leftMargin, 48, rightMargin, 48);

        // Subheader
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(profile?.name?.toUpperCase() || "", leftMargin, 47);
    }


    // Title only if NO letterhead
    if (title && !hasLetterhead) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);

        const upperTitle = title.toUpperCase();
        if (upperTitle.startsWith("SUBJECT:")) {
            doc.text("SUBJECT:", leftMargin, 71);
            const actualTitle = upperTitle.replace("SUBJECT:", "").trim();
            doc.text(actualTitle, pageWidth / 2, 71, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            const titleWidth = doc.getTextWidth(actualTitle);
            doc.line((pageWidth / 2) - (titleWidth / 2), 73, (pageWidth / 2) + (titleWidth / 2), 73);
        } else {
            doc.text(upperTitle, pageWidth / 2, 71, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            const titleWidth = doc.getTextWidth(upperTitle);
            doc.line((pageWidth / 2) - (titleWidth / 2), 73, (pageWidth / 2) + (titleWidth / 2), 73);
        }
        return 83;
    }

    return hasLetterhead ? 85 : 68;
};

const drawField = (doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number = 10) => {
    // Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);

    // Label (Small, Top Left)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 1.5, y + 3.5);

    // Value (Larger, Bold, Black)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Black
    doc.setFont('helvetica', 'bold');
    const text = value || "-";
    doc.text(text, x + 1.5, y + 8, { maxWidth: w - 3 });
};

export const generateHRFileRecordPDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // Use shared letterhead
    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-01`, data.created_at, "Check List of File Record");

    // --- Employee Info ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    doc.setFont('helvetica', 'normal');

    let y = startY;
    const leftX = 15;
    const rightX = 110;
    const fieldW = 85;
    const fieldH = 10;

    // Line 1
    drawField(doc, "Employee Name", data.employee_name, leftX, y, fieldW, fieldH);
    drawField(doc, "Designation", data.designation, rightX, y, fieldW, fieldH);

    y += 12;
    // Line 2
    drawField(doc, "Date of Joining", data.date_of_joining, leftX, y, fieldW, fieldH);
    drawField(doc, "Department", data.department, rightX, y, fieldW, fieldH);

    y += 15;

    // --- Document Table ---
    const checklistItems = [
        { id: 'job_desc', label: 'Job Descriptions', sr: '1.' },
        { id: 'joining_report', label: 'Joining Report', sr: '2.' },
        { id: 'bio_data', label: 'Bio-data Form', sr: '3.' },
        { id: 'appointment_letter', label: 'Appointment letter', sr: '4.' },
        { id: 'cv', label: 'CV', sr: '5.' },
        { id: 'credentials', label: 'Credentials', sr: '6.', isHeader: true },
        { id: 'qual', label: 'Qualification', sr: '6.1' },
        { id: 'domicile', label: 'Domicile', sr: '6.2' },
        { id: 'exp_letter', label: 'Experience Letter (if any)', sr: '6.3' },
        { id: 'id_card', label: 'ID Card of employee', sr: '7.' },
        { id: 'photos', label: 'Photographs of Employee', sr: '8.' },
        { id: 'other', label: 'Other Documents', sr: '9.' },
    ];

    const tableBody = checklistItems.map(item => {
        if (item.isHeader) {
            return [
                { content: item.sr, styles: { fontStyle: 'bold' } },
                { content: item.label, styles: { fontStyle: 'bold' } },
                '',
                ''
            ];
        }

        const isYes = data.checklist_data[item.id] === true || data.checklist_data[item.id] === 'yes';
        const isNo = data.checklist_data[item.id] === false || data.checklist_data[item.id] === 'no';

        return [
            item.sr,
            item.label,
            isYes ? 'Yes' : '',
            isNo ? 'No' : '' // Assuming if not Yes, it's No, or explicit check? User said "Yes No" columns. I'll just put checkmark or text.
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['Sr.#', 'Document', 'Yes', 'No']],
        body: tableBody as any,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3, lineColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 110 },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' }
        }
    });

    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25; // Moved up to avoid being too close to the end of the page

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(15, y, 65, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Candidate Signature", 40, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    await saveOrMergePDF(doc, profile, `HR_File_Record_${data.employee_name || 'New'}.pdf`);
};

export const generateJoiningReportPDF = async (data: any, profile: any, showStamp: boolean = false) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // Use shared letterhead
    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-LHR-HR-F-01`, data.joining_date, "Subject: Joining Report");

    // --- Body ---
    let y = startY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold'); // Bold Info
    const bodyText = `I, ${data.employee_name} hereby submit my joining report as a ${data.designation} in ${profile.name || ""} Lahore today i.e. ${data.joining_date}`;

    // Split text to fit width
    const splitBody = doc.splitTextToSize(bodyText, 180);
    doc.text(splitBody, 15, y);

    y += (splitBody.length * 6) + 20;

    doc.text("Thank You", 15, y);

    // --- Form Fields ---
    y = Math.max(y + 25, 140);
    const boxW = 85;
    const boxH = 10;

    // Row 1
    drawField(doc, "Name", data.employee_name, 15, y, boxW, boxH);
    drawField(doc, "S/D/O", data.father_name, 110, y, boxW, boxH);

    y += 12;
    // Row 2: Address (Full Width)
    drawField(doc, "Address", data.address || "", 15, y, 180, 15);

    y += 17;
    // Row 3: Contact & CNIC
    drawField(doc, "Contact", data.contact, 15, y, boxW, boxH);
    drawField(doc, "C.N.I.C", data.cnic, 110, y, boxW, boxH);

    y += 30; // Shifted down
    // Signature
    doc.text(`Signature: __________________________`, 15, y);

    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(15, y, 65, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", 40, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    if (showStamp) {
        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) doc.addImage(stampData, getImageFormat(stampData), 155, y - 35, 30, 30);
        } catch (e) { }
    }

    await saveOrMergePDF(doc, profile, `Joining_Report_${data.employee_name}.pdf`);
};

export const generateBioDataPDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-02`, undefined, "PERSONAL BIO-DATA FORM");

    // --- Personal Info Grid ---
    let y = startY + 5;
    const col1 = 15;
    const col2 = 110;
    const halfW = 88;
    const h = 10;

    // Row 1
    drawField(doc, "Full Name", data.full_name, col1, y, halfW, h);
    drawField(doc, "Father/Husband Name", data.father_husband_name, col2, y, 50, h);

    // Photo Box
    try {
        if (data.photo_url) {
            let photoData = data.photo_url;
            // Only fetch if it's a URL, not a base64 string
            if (!photoData.startsWith('data:')) {
                photoData = await getBase64ImageFromURL(data.photo_url);
            }

            if (photoData) {
                const format = getImageFormat(photoData) as any;
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.5);
                doc.rect(165, y, 30, 35);
                doc.addImage(photoData, format, 165, y, 30, 35);
            } else {
                drawPlaceholder();
            }
        } else {
            drawPlaceholder();
        }

        function drawPlaceholder() {
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(165, y, 30, 35);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'bold');
            doc.text("PHOTO", 180, y + 17, { align: 'center' });
        }
    } catch (e) {
        console.warn("Photo add failed", e);
    }

    y += 12;
    // Row 2
    drawField(doc, "Gender", data.gender, col1, y, 43, h);
    drawField(doc, "Marital Status", data.marital_status, col1 + 45, y, 43, h);
    drawField(doc, "CNIC Number", data.nic_number, col2, y, 50, h);

    y += 12;
    // Row 3 
    drawField(doc, "Date of Birth", data.date_of_birth || "", col1, y, 43, h);
    drawField(doc, "Nationality", data.nationality, col1 + 45, y, 43, h);
    drawField(doc, "Religion", data.religion, col2, y, 50, h);

    y += 12;
    // Row 4 
    drawField(doc, "Permanent Address", data.permanent_address, col1, y, 145, h);

    y += 12;
    drawField(doc, "Present Address", data.present_address, col1, y, 180, h);

    y += 12;
    // Contact Row
    drawField(doc, "Telephone (Res)", data.tel, col1, y, 58, h);
    drawField(doc, "Mobile", data.mobile, col1 + 60, y, 58, h);
    drawField(doc, "Email Address", data.email, col1 + 120, y, 60, h);

    y += 15;

    // --- Education ---
    doc.setFontSize(11);
    doc.setTextColor(0); // Black
    doc.setFont('helvetica', 'bold');
    doc.text("Academic Qualification", 15, y);
    y += 2;

    autoTable(doc, {
        startY: y,
        head: [['Degree / Certificate', 'Institute / Board', 'Year', 'Div / Grade', 'Major Subjects']],
        body: data.education_data.map((e: any) => [
            e.degree, e.institution, e.year, `${e.division} / ${e.grade}`, ""
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: 0, lineWidth: 0.1, textColor: [0, 0, 0] as any, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // --- Experience ---
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Employment History / Service Record", 15, y);
    y += 2;

    autoTable(doc, {
        startY: y,
        head: [['Designation', 'Organization', 'From', 'To', 'Experience (Yrs)']],
        body: data.service_record_data.map((e: any) => [
            e.designation, e.organization, e.from, e.to, e.remarks
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: 0, lineWidth: 0.1, textColor: [0, 0, 0] as any, fontStyle: 'bold' },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // --- Language Proficiency ---
    if (data.language_proficiency_data && data.language_proficiency_data.length > 0 && data.language_proficiency_data[0].language) {
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Language Proficiency", 15, y);
        y += 2;

        autoTable(doc, {
            startY: y,
            head: [['Language', 'Proficiency Level']],
            body: data.language_proficiency_data.map((l: any) => [l.language, l.proficiency]),
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
            styles: { fontSize: 9, cellPadding: 3, lineColor: 0, lineWidth: 0.1, textColor: [0, 0, 0] as any, fontStyle: 'bold' },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // --- Emergency & Other ---
    // Check space
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Other Details & Emergency Contact", 15, y);
    y += 4;

    // Grid for others
    drawField(doc, "Blood Group", data.blood_group, 15, y, 40, h);
    drawField(doc, "Dependents", data.dependents_count, 60, y, 40, h);
    drawField(doc, "Hobbies", data.hobbies, 105, y, 90, h);

    y += 12;
    drawField(doc, "Emergency Name", data.emergency_content_name, 15, y, 60, h);
    drawField(doc, "Relation", data.emergency_contact_relation, 80, y, 40, h);
    drawField(doc, "Emergency Contact No", data.emergency_contact_mobile, 125, y, 70, h);

    y += 12;
    drawField(doc, "Bank Name", data.bank_name, 15, y, 60, h);
    drawField(doc, "Account Number", data.bank_account_no, 80, y, 115, h);

    y += 20;

    // --- Footer Declaration ---
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold'); // Bold Info
    const declaration = data.terms_and_conditions || "I hereby certify that the information given above is correct and complete to the best of my knowledge and belief. I understand that any false information may lead to termination of my service.";
    const splitDec = doc.splitTextToSize(declaration, 180);

    // Draw a box around declaration for "proper boxed" look
    const decHeight = splitDec.length * 5 + 6;
    doc.setDrawColor(0, 0, 0);
    doc.rect(15, y - 2, 180, decHeight);
    doc.text(splitDec, 18, y + 4);

    y += decHeight + 20;

    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(15, y, 65, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", 40, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    // Footer Branding
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated by ${profile?.name || ''} Developers System`, 105, 290, { align: 'center' });


    await saveOrMergePDF(doc, profile, `BioData_${data.full_name || 'New'}.pdf`);
};

export const generateIDCardApplicationPDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-03`, undefined, "Application for Service Identity Card");

    // --- Form Fields ---
    let y = startY + 10;
    const leftX = 15;
    const rightX = 110;
    const lineSpacing = 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // Row 1
    const fieldW = 85;
    const fieldH = 10;

    drawField(doc, "Name", data.name, leftX, y, fieldW, fieldH);
    drawField(doc, "Designation", data.designation, rightX, y, fieldW, fieldH);

    y += 12;
    // Row 2
    drawField(doc, "Department", data.department, leftX, y, fieldW, fieldH);
    drawField(doc, "Date of Joining", data.joining_date, rightX, y, fieldW, fieldH);

    y += 12;
    // Row 3
    drawField(doc, "Date of Birth", data.dob, leftX, y, fieldW, fieldH);
    drawField(doc, "Blood Group", data.blood_group, rightX, y, fieldW, fieldH);

    y += 12;
    // Row 4
    drawField(doc, "Date of Issue", data.issue_date, leftX, y, fieldW, fieldH);
    drawField(doc, "NIC No", data.nic_no, rightX, y, fieldW, fieldH);

    y += 12;
    // Row 5
    drawField(doc, "Contact No.", data.contact_no, leftX, y, fieldW, fieldH);
    drawField(doc, "Employee Code", data.employee_code, rightX, y, fieldW, fieldH);


    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(15, y, 65, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", 40, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    await saveOrMergePDF(doc, profile, `ID_Card_App_${data.name || 'New'}.pdf`);
};

export const generateEmployeeIDCardPDF = async (data: any, profile: any) => {
    // Standard ID Card Size: 54mm x 85.6mm (Portrait)
    const width = 54;
    const height = 85.6;

    const doc = new jsPDF({
        unit: 'mm',
        format: [width, height],
        orientation: 'portrait',
        compress: true
    });


    // Professional Colors - Miran Builders Brand
    const NAVY_BLUE = { r: 0, g: 32, b: 96 }; // #c1d3f8ff
    const GOLD = { r: 255, g: 192, b: 0 }; // #FFC000
    const WHITE = { r: 255, g: 255, b: 255 };
    const LIGHT_GRAY = { r: 240, g: 240, b: 240 };

    // ==================== FRONT SIDE ====================

    // Background
    doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
    doc.rect(0, 0, width, height, 'F');

    // Add Watermark (Company Logo - Faded)
    if (profile.logo_url || profile.sidebar_logo_url) {
        const logoUrl = profile.logo_url || profile.sidebar_logo_url;
        const logoData = await getBase64ImageFromURL(logoUrl);
        if (logoData) {
            // Large faded watermark in center
            doc.saveGraphicsState();
            (doc as any).setGState((doc as any).GState({ opacity: 0.08 }));
            doc.addImage(logoData, getImageFormat(logoData), 10, 30, 34, 34);
            doc.restoreGraphicsState();
        }
    }

    // Top Navy Blue Header
    doc.setFillColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.rect(0, 0, width, 22, 'F');

    // Gold Accent Stripe
    doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    doc.rect(0, 22, width, 2, 'F');

    // Left Side Logo (New Miran Builders Logo)
    const leftLogoUrl = '/uploads/miran_logo_new.png';
    try {
        const leftLogoData = await getBase64ImageFromURL(leftLogoUrl);
        if (leftLogoData) {
            // White circle background for logo
            doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
            doc.circle(10, 11, 7, 'F');
            doc.addImage(leftLogoData, getImageFormat(leftLogoData), 4, 5, 12, 12);
        }
    } catch (e) {
        // Fallback to profile logo if left logo not found
        if (profile.logo_url || profile.sidebar_logo_url) {
            const logoUrl = profile.logo_url || profile.sidebar_logo_url;
            const logoData = await getBase64ImageFromURL(logoUrl);
            if (logoData) {
                doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
                doc.circle(10, 11, 7, 'F');
                doc.addImage(logoData, getImageFormat(logoData), 4, 5, 12, 12);
            }
        }
    }

    // Company Name in Header - Shifted 0.5cm (5mm) to the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    const companyName = profile.name || "Miran Builders";
    // Shift right by 5mm
    doc.text(companyName, (width / 2) + 5, 9, { align: 'center' });

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text("Engineering & Construction", (width / 2) + 5, 13, { align: 'center' });
    doc.text("www.miranbuilders.com", (width / 2) + 5, 17, { align: 'center' });

    // Employee Photo (Circular, High Quality) - More space for clarity
    const photoY = 30; // Increased from 28 for even more space
    const photoRadius = 11; // Slightly smaller for better balance
    const photoDiameter = photoRadius * 2;
    const photoX = (width - photoDiameter) / 2;

    // White border for photo
    doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
    doc.setDrawColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setLineWidth(0.5);
    doc.circle(width / 2, photoY + photoRadius, photoRadius + 1, 'FD');

    // Load and display photo - Fixed to handle both base64 and URL
    if (data.photo_url) {
        try {
            let photoData = data.photo_url;

            // If it's a URL (not base64), fetch it
            if (!photoData.startsWith('data:')) {
                photoData = await getBase64ImageFromURL(photoData);
            }

            if (photoData) {
                doc.saveGraphicsState();
                doc.circle(width / 2, photoY + photoRadius, photoRadius, 'S');
                doc.clip();

                // Determine image format
                const imageFormat = photoData.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(photoData, imageFormat, photoX, photoY, photoDiameter, photoDiameter);
                doc.restoreGraphicsState();
            }
        } catch (error) {
            console.error('Photo loading error:', error);
            // Show placeholder on error
            doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
            doc.circle(width / 2, photoY + photoRadius, photoRadius, 'F');
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text("No Photo", width / 2, photoY + photoRadius, { align: 'center' });
        }
    } else {
        // Placeholder
        doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
        doc.circle(width / 2, photoY + photoRadius, photoRadius, 'F');
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text("No Photo", width / 2, photoY + photoRadius, { align: 'center' });
    }

    // Employee Name - More space and clarity
    let y = 58; // Increased for better spacing
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text(data.name || "Employee Name", width / 2, y, { align: 'center' });

    // Designation Badge
    y += 6; // More space
    const designation = data.designation || "Designation";
    const badgeWidth = doc.getTextWidth(designation) + 8;
    doc.setFillColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.roundedRect((width - badgeWidth) / 2, y - 3.5, badgeWidth, 5, 1.5, 1.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    doc.text(designation, width / 2, y, { align: 'center' });

    // Employee Details Section - Clear and Bold Values
    y += 12; // More space before details for clarity
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);

    const details = [
        { label: "ID No", value: data.employee_code || "-" },
        { label: "Department", value: data.department || "-" },
        { label: "DOI", value: data.issue_date || "-" },
        { label: "Blood Gp", value: data.blood_group || "-" },
        { label: "Contact", value: data.contact_no || "-" }
    ];

    // Shift details 0.5cm (5mm) to the right
    const detailsLeftMargin = 11; // 6 + 5 = 11mm

    details.forEach(item => {
        // Label - Normal font
        doc.setFont("helvetica", "normal");
        doc.text(`${item.label}:`, detailsLeftMargin, y);

        // Value - BOLD font for clarity
        doc.setFont("helvetica", "bold");
        doc.text(String(item.value), detailsLeftMargin + 18, y);

        y += 6; // Increased spacing from 5 to 6 for better clarity
    });

    // ==================== BACK SIDE ====================
    doc.addPage();

    // Background
    doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
    doc.rect(0, 0, width, height, 'F');

    // Watermark on back too
    if (profile.logo_url || profile.sidebar_logo_url) {
        const logoUrl = profile.logo_url || profile.sidebar_logo_url;
        const logoData = await getBase64ImageFromURL(logoUrl);
        if (logoData) {
            doc.saveGraphicsState();
            (doc as any).setGState((doc as any).GState({ opacity: 0.05 }));
            doc.addImage(logoData, getImageFormat(logoData), 5, 20, 44, 44);
            doc.restoreGraphicsState();
        }
    }

    // Top Gold Header
    doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    doc.rect(0, 0, width, 6, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text("TERMS & CONDITIONS", width / 2, 4, { align: 'center' });

    // Terms Content
    y = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);

    const terms = [
        `1. This card is the property of ${profile.name || "Miran Builders"}.`,
        "2. It must be worn and displayed while on duty.",
        "3. In case of loss, report immediately to HR Department.",
        "4. This card is non-transferable and for official use only.",
        "5. Please return this card upon termination of employment.",
        "6. Misuse of this card may result in disciplinary action."
    ];

    terms.forEach(term => {
        const lines = doc.splitTextToSize(term, width - 8);
        doc.text(lines, 4, y);
        y += lines.length * 2.5 + 1;
    });

    // Contact Information Box
    y = height - 30;
    doc.setDrawColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setLineWidth(0.3);
    doc.line(4, y, width - 4, y);

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text("If found, please return to:", width / 2, y, { align: 'center' });

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Miran Builders", width / 2, y, { align: 'center' });

    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(profile?.address || "386-A LDA Avenue one Raiwand road lahore", width / 2, y, { align: 'center' });

    y += 2.5;
    doc.text(`Phone: ${profile?.phone || '03018456767'}`, width / 2, y, { align: 'center' });

    // Signature Section
    y = height - 12;

    // Employee Signature (Left)
    if (data.signature_url) {
        const sigData = await getBase64ImageFromURL(data.signature_url);
        if (sigData) {
            doc.addImage(sigData, getImageFormat(sigData), 4, y - 6, 18, 6);
        }
    }
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);
    doc.line(4, y, 22, y);
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    doc.text("Employee Signature", 13, y + 2, { align: 'center' });

    // Authority Signature (Right)
    doc.line(width - 22, y, width - 4, y);
    doc.text("Authorized Signature", width - 13, y + 2, { align: 'center' });

    // Footer
    doc.setFillColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.rect(0, height - 4, width, 4, 'F');
    doc.setFontSize(5);
    doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    doc.text("www.miranbuilders.com", width / 2, height - 1.5, { align: 'center' });

    doc.save(`ID_Card_${data.name || 'Employee'}.pdf`);
};

export const generatePerformanceAppraisalPDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, undefined, data.appraisal_date, "Performance Appraisal Form");

    let y = startY + 5;
    const leftX = 15;
    const rightX = 110;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const fieldW = 85;
    const fieldH = 10;

    drawField(doc, "Employee Name", data.employee_name, leftX, y, fieldW, fieldH);
    drawField(doc, "Employee Code", data.employee_code, rightX, y, fieldW, fieldH);

    y += 12;
    drawField(doc, "Department", data.department, leftX, y, fieldW, fieldH);
    drawField(doc, "Designation", data.designation, rightX, y, fieldW, fieldH);

    y += 12;
    drawField(doc, "Date of Joining", data.joining_date, leftX, y, fieldW, fieldH);
    drawField(doc, "Time in Position", data.present_position_time, rightX, y, fieldW, fieldH);

    y += 12;
    drawField(doc, "Year Covered", data.year_covered, leftX, y, fieldW, fieldH);
    drawField(doc, "Date of Appraisal", data.appraisal_date, rightX, y, fieldW, fieldH);

    y += 12;
    drawField(doc, "Name of Appraiser", data.appraiser_name, leftX, y, fieldW, fieldH);
    drawField(doc, "Appraiser Designation", data.appraiser_designation, rightX, y, fieldW, fieldH);


    y += 5;
    // Type of Appraisal
    doc.text("Type of Appraisal:", leftX, y);

    // Checkboxes
    const isProbation = data.appraisal_type === 'Probationary';
    const isAnnual = data.appraisal_type === 'Annual';

    doc.rect(rightX, y - 3, 4, 4);
    if (isProbation) doc.text("x", rightX + 1, y);
    doc.text("Probationary/Initial", rightX + 6, y);

    doc.rect(rightX + 50, y - 3, 4, 4);
    if (isAnnual) doc.text("x", rightX + 51, y);
    doc.text("Annual", rightX + 56, y);

    y += 10;

    // --- Performance Matrix ---
    doc.setFont('helvetica', 'bold');
    doc.text("Key Performance Criteria for Success", leftX, y);
    y += 2;

    const criteria = [
        "Command on job relevant skill and Knowledge",
        "Work Quality",
        "Ability for learning on one’s own",
        "Attendance / Punctuality",
        "Relation with peers/superiors/subordinates",
        "Ability to handle variety of assignments/ Multiple Tasks",
        "Results achievement and meeting deadlines",
        "Professional appearance (Self and Desk)",
        "Leadership ability and Team Management",
        "Steadiness under pressure",
        "Initiative",
        "Communication Skills (verbal/written)",
        "Compliance of MBE&C rules/ regulation (Discipline)",
        "Dependability"
    ];

    const ratings = typeof data.ratings === 'string' ? JSON.parse(data.ratings) : data.ratings || {};

    autoTable(doc, {
        startY: y,
        head: [['Criteria', '5', '4', '3', '2', '1']],
        body: criteria.map(c => {
            const score = ratings[c] || 0;
            return [
                c,
                score === 5 ? 'X' : '',
                score === 4 ? 'X' : '',
                score === 3 ? 'X' : '',
                score === 2 ? 'X' : '',
                score === 1 ? 'X' : ''
            ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Legend
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("5: Exceeds Expectations | 4: Fully Meets | 3: Meets Most | 2: Meets Some | 1: Does Not Meet", leftX, y);

    y += 10;

    // Check page break for comments
    if (y > 230) { doc.addPage(); y = 20; }

    const drawSection = (title: string, content: string, height: number = 20) => {
        if (y + height + 10 > 280) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, leftX, y);
        y += 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Rect for answer
        doc.roundedRect(leftX, y, 180, height, 1, 1);
        doc.text(doc.splitTextToSize(content || "", 175), leftX + 2, y + 5);
        y += height + 8;
    };

    drawSection("Any Issues (To be covered separately):", data.issues);
    drawSection(`Any Task Assigned by HOD (Status: ${data.task_status}):`, data.task_assigned);
    drawSection("Additional Comments:", data.additional_comments);
    drawSection("Recommended Training:", data.recommended_training);
    drawSection("Comments by Appraiser (HOD):", data.appraiser_comments);

    // Verification
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.text("Verification of Appraisal:", leftX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const verificationText = "By signing this form, you confirm that you have discussed this appraisal in detail with your appraiser. Signing this form does not necessarily indicate that you agree with this appraisal.";
    doc.text(doc.splitTextToSize(verificationText, 180), leftX, y);

    y += 30; // Shifted down
    doc.setFont('helvetica', 'bold'); // Bold
    doc.text("Signature by Appraisee: ___________________", leftX, y);
    doc.text("Date: ___________", 140, y);

    y += 25; // Shifted down
    doc.text("Signature by Appraiser: ___________________", leftX, y);
    doc.text("Date: ___________", 140, y);

    y += 20;
    doc.addPage();
    // --- Professional Footer Signatures (Final Page) ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(15, y, 65, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", 40, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    await saveOrMergePDF(doc, profile, `Performance_Appraisal_${data.employee_name || 'New'}.pdf`);
};


export const generateBikeIssuancePDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, data.ref_no || 'MBEC-HR-LHR-2021-0', data.date);

    let y = startY - 15; // Shifted up by 2.5cm (25mm) from original startY + 10

    // To Address
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("To,", 20, y);
    y += 5;

    const fieldW = 85;
    const fieldH = 10;
    drawField(doc, "Employee Name", data.employee_name || "", 20, y, fieldW, fieldH);
    drawField(doc, "Father Name", data.father_name || "", 110, y, fieldW, fieldH);

    y += 15;


    y += 20;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const title = "BIKE ISSUANCE LETTER";
    doc.text(title, 105, y, { align: "center" });

    doc.setLineWidth(0.5);
    const titleWidth = doc.getTextWidth(title);
    doc.line(105 - titleWidth / 2, y + 1.5, 105 + titleWidth / 2, y + 1.5);

    y += 12;

    // Body P1 - Rich Text Wrapping
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50); // Dark Grey
    const companyName = profile.name || "Miran Builders Engineering & Construction Pvt Ltd Lahore";

    // Text Segments
    const segments = [
        { text: "1.      ", bold: false },
        { text: data.employee_name || 'Employee', bold: true },
        { text: " S/O ", bold: false },
        { text: data.father_name || 'Father', bold: true },
        { text: " as an ", bold: false },
        { text: data.designation || 'Internee', bold: false },
        { text: " of ", bold: false },
        { text: companyName + ".", bold: false },
        { text: " The company assigned him a motorbike with the following details:", bold: false }
    ];

    let currentX = 20;
    const endX = 185; // Reduced margin for cleaner wrap
    const padding = 7; // Increased spacing

    segments.forEach(seg => {
        doc.setFont("helvetica", seg.bold ? "bold" : "normal");

        if (seg.text.startsWith("1. ")) {
            doc.text(seg.text, currentX, y);
            currentX += doc.getTextWidth(seg.text);
            return;
        }

        const words = seg.text.split(" ");

        words.forEach((word: string) => {
            if (word === "") return;

            // Smart Spacing
            const space = (currentX > 20) ? " " : "";
            const term = space + word;
            const termWidth = doc.getTextWidth(term);

            if (currentX + termWidth > endX) {
                currentX = 20;
                y += padding;
                doc.text(word, currentX, y);
                currentX += doc.getTextWidth(word);
            } else {
                doc.text(term, currentX, y);
                currentX += termWidth;
            }
        });
    });

    y += 8;

    // Bike Details List (Bold with Bullets)
    const listX = 35;
    const listLabelW = 45;

    const drawListItem = (label: string, value: string) => {
        doc.setFont("helvetica", "normal");
        doc.text("• " + label, listX - 5, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, listX + listLabelW, y);
        y += 6;
    };

    drawListItem("Motorbike Number:", data.bike_number);
    drawListItem("Chassis Number:", data.chassis_number);
    drawListItem("Engine Number:", data.engine_number);

    y += 4;

    doc.setFont("helvetica", "normal");
    const p2 = `2.      Bike is the property of the company that will be used for the purpose of company work. Bike will be returnable to the company when ${data.employee_name} left the job. Bike original documents are in the custody of ${companyName}.`;
    const splitP2 = doc.splitTextToSize(p2, 170);
    doc.text(splitP2, 20, y);
    y += (splitP2.length * 6) + 12;

    // Details Box
    const boxY = y;
    const boxHeight = 60;

    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(20, y, 170, boxHeight, 3, 3, 'FD');

    // Photo
    if (data.photo_url) {
        let photoData = data.photo_url;
        if (!photoData.startsWith('data:')) {
            photoData = await getBase64ImageFromURL(data.photo_url);
        }

        if (photoData) {
            const format = getImageFormat(photoData) as any;
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1);
            doc.rect(145, y + 5, 35, 45, 'S');
            doc.addImage(photoData, format, 145, y + 5, 35, 45);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            doc.rect(145, y + 5, 35, 45, 'S');
        } else {
            drawBikePlaceholder();
        }
    } else {
        drawBikePlaceholder();
    }

    function drawBikePlaceholder() {
        doc.setDrawColor(200, 200, 200);
        doc.rect(145, y + 5, 35, 45, 'S');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("Photo", 162.5, y + 27.5, { align: 'center' });
    }

    // Text Details
    let textY = y + 12;
    const labelX = 28;
    const valX = 75; // Increased from 65 to provide more space from labels

    const addLine = (label: string, val: string) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(label, labelX, textY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60); // Dark grey
        doc.text(val, valX, textY);
        textY += 12; // Increased from 9 for better spacing
    };

    addLine("Name:", data.employee_name);
    addLine("CNIC:", data.cnic || '-');
    addLine("Contact:", data.contact || '-');
    addLine("Bike Issuance Date:", data.issuance_date || '-');

    y += boxHeight + 50; // Shifted down

    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 15; // Moved down by 1cm (10mm) as requested (from -25)

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(20, y, 70, y); // Left
    doc.line(140, y, 190, y); // Right

    y += 5;
    doc.text("Employee Signature", 45, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 165, y, { align: 'center' });

    await saveOrMergePDF(doc, profile, `Bike_Issuance_${data.employee_name || 'Letter'}.pdf`);
};

export const generateLeaveApplicationPDF = async (data: any, profile: any, showStamp: boolean = false) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-LEAVE`, data.application_date, "Subject: Leave Application");

    // Color Palette
    const PRIMARY_COLOR = [30, 41, 59]; // Slate-800
    const ACCENT_COLOR = [202, 138, 4]; // Gold/Amber
    const SUCCESS_COLOR = [16, 185, 129]; // Emerald
    const DANGER_COLOR = [239, 68, 68]; // Red

    // --- Content ---
    let y = startY + 10;
    const leftMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Salutation - with color
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("To,", leftMargin, y);
    y += 5;
    doc.text("The CEO / HR Manager,", leftMargin, y);
    y += 5;
    // Removed "Lahore" - just company name with accent color
    doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
    doc.text(profile.name || "Miran Builders Engineering & Construction", leftMargin, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Respected Sir,", leftMargin, y);

    y += 10;

    // Body - Professional formatting
    const leaveType = data.leave_type || "Leave";
    const reason = data.reason || "personal matters";
    const days = data.total_days || "1";
    const dateRange = data.start_date === data.end_date
        ? `on ${new Date(data.start_date).toLocaleDateString('en-GB')}`
        : `from ${new Date(data.start_date).toLocaleDateString('en-GB')} to ${new Date(data.end_date).toLocaleDateString('en-GB')}`;

    doc.setFontSize(11);
    const bodyText = `Most respectfully, noting that I, ${data.employee_name} working as ${data.designation} in your esteemed organization. I humbly request you to grant me ${days} day(s) ${leaveType} ${dateRange} due to ${reason}.`;

    const splitBody = doc.splitTextToSize(bodyText, 180);
    doc.text(splitBody, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitBody.length * 6) + 5;

    const closingText = "I shall be very thankful to you for this act of kindness to grant my leave application.";
    const splitClosing = doc.splitTextToSize(closingText, 180);
    doc.text(splitClosing, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitClosing.length * 6) + 10;

    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, leftMargin + 50, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", leftMargin + 25, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    if (showStamp) {
        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) doc.addImage(stampData, getImageFormat(stampData), 155, y - 35, 30, 30);
        } catch (e) { }
    }

    // Footer branding
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated by ${profile?.name || ''} HR System`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    await saveOrMergePDF(doc, profile, `Leave_App_${data.employee_name.replace(/\s+/g, '_')}.pdf`);
};

export const generateResignationLetterPDF = async (data: any, profile: any) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-RES`, data.resignation_date, "Subject: Resignation Letter");

    // Color Palette
    const PRIMARY_COLOR = [30, 41, 59];
    const ACCENT_COLOR = [202, 138, 4];

    let y = startY + 10;
    const leftMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Salutation
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("To,", leftMargin, y);
    y += 5;
    doc.text("The CEO / HR Manager,", leftMargin, y);
    y += 5;
    doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
    doc.text(profile.name || "Miran Builders Engineering & Construction", leftMargin, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Respected Sir,", leftMargin, y);

    y += 10;

    // Body
    doc.setFontSize(11);
    const bodyText = `I am writing to formally notify you of my resignation from the position of ${data.designation} at ${profile.name || "Miran Builders Engineering & Construction"}, effective ${new Date(data.last_working_day).toLocaleDateString('en-GB')}.`;

    const splitBody = doc.splitTextToSize(bodyText, 180);
    doc.text(splitBody, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitBody.length * 6) + 8;

    const reasonText = data.reason ? `${data.reason}` : "I have accepted a new opportunity that aligns with my career goals.";
    const splitReason = doc.splitTextToSize(reasonText, 180);
    doc.text(splitReason, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitReason.length * 6) + 8;

    const closingText = `I want to express my sincere gratitude for the opportunities I have been given during my time here. I have learned a great deal and appreciate the support and guidance provided by you and the team. I am committed to ensuring a smooth transition and will do everything possible to hand over my responsibilities effectively.`;
    const splitClosing = doc.splitTextToSize(closingText, 180);
    doc.text(splitClosing, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitClosing.length * 6) + 8;

    const thankYouText = "Thank you once again for the opportunity to be part of this organization.";
    doc.text(thankYouText, leftMargin, y);

    y += 10;
    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, leftMargin + 50, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", leftMargin + 25, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated by ${profile?.name || ''} HR System`, pageWidth / 2, pageHeight - 5, { align: 'center' });


    await saveOrMergePDF(doc, profile, `Resignation_${data.employee_name.replace(/\s+/g, '_')}.pdf`);
};

export const generateAppreciationLetterPDF = async (data: any, profile: any, showStamp: boolean = false) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const startY = await drawSharedLetterhead(doc, profile || {}, `MBEC-HR-LHR-F-APP`, data.letter_date, "Subject: Letter of Appreciation");

    // Color Palette
    const PRIMARY_COLOR = [30, 41, 59];
    const ACCENT_COLOR = [202, 138, 4];
    const SUCCESS_COLOR = [16, 185, 129];

    let y = startY + 10;
    const leftMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Recipient
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("To,", leftMargin, y);
    y += 5;
    doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
    doc.text(data.employee_name, leftMargin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(data.designation, leftMargin, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Dear " + data.employee_name.split(' ')[0] + ",", leftMargin, y);

    y += 10;

    // Body
    const openingText = `On behalf of ${profile.name || "Miran Builders Engineering & Construction"}, I would like to express our sincere appreciation for your outstanding contribution and dedication to your work.`;
    const splitOpening = doc.splitTextToSize(openingText, 180);
    doc.text(splitOpening, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitOpening.length * 6) + 8;

    const achievementText = data.achievement || "Your exceptional performance, professionalism, and commitment to excellence have not gone unnoticed. Your hard work and positive attitude have made a significant impact on our team and the overall success of our projects.";
    const splitAchievement = doc.splitTextToSize(achievementText, 180);
    doc.text(splitAchievement, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitAchievement.length * 6) + 8;

    const recognitionText = "We recognize and value your efforts, and we are grateful to have you as part of our team. Your dedication serves as an inspiration to your colleagues, and we look forward to your continued success.";
    const splitRecognition = doc.splitTextToSize(recognitionText, 180);
    doc.text(splitRecognition, leftMargin, y, { align: 'justify', maxWidth: 180 });

    y += (splitRecognition.length * 6) + 8;

    doc.setFont("helvetica", "bold");
    const closingText = "Thank you once again for your excellent work. Keep up the great work!";
    doc.text(closingText, leftMargin, y);

    y += 15;
    // --- Professional Footer Signatures ---
    const pageHeight = doc.internal.pageSize.getHeight();
    y = pageHeight - 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Signature Lines
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, leftMargin + 50, y); // Left
    doc.line(145, y, 195, y); // Right

    y += 5;
    doc.text("Employee Signature", leftMargin + 25, y, { align: 'center' });
    doc.text("CEO Adnan Zafar", 170, y, { align: 'center' });

    if (showStamp) {
        try {
            const stampUrl = profile?.stamp_url || '/stamp.jpg';
            const stampData = await getBase64ImageFromURL(stampUrl);
            if (stampData) doc.addImage(stampData, getImageFormat(stampData), 155, y - 35, 30, 30);
        } catch (e) { }
    }

    // Decorative appreciation badge
    y += 20;
    doc.setDrawColor(SUCCESS_COLOR[0], SUCCESS_COLOR[1], SUCCESS_COLOR[2]);
    doc.setLineWidth(1);
    doc.setFillColor(SUCCESS_COLOR[0], SUCCESS_COLOR[1], SUCCESS_COLOR[2]);
    doc.circle(pageWidth / 2, y + 10, 15, 'D');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SUCCESS_COLOR[0], SUCCESS_COLOR[1], SUCCESS_COLOR[2]);
    doc.text("EXCELLENT", pageWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(10);
    doc.text("PERFORMANCE", pageWidth / 2, y + 13, { align: 'center' });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated by ${profile?.name || ''} HR System`, pageWidth / 2, pageHeight - 5, { align: 'center' });


    await saveOrMergePDF(doc, profile, `Appreciation_${data.employee_name.replace(/\s+/g, '_')}.pdf`);
};

export const generateAgreementPDF = async (data: any, profile: any, language: 'en' | 'ur' = 'en', showStamp: boolean = false) => {
    try {
        const doc = new jsPDF();
        const isUrdu = language === 'ur';
        const pageWidth = doc.internal.pageSize.getWidth();
        const leftX = 15;
        const rightX = 110;
        const SUCCESS_COLOR = [16, 185, 129]; // Emerald 500

        // drawSharedLetterhead returns the Y position where we should start content.
        let yPos = await drawSharedLetterhead(doc, profile, undefined, undefined, undefined);
        yPos += 5;

        // Draw 2px full page border around the letterhead area or complete page
        const drawPageBorder = () => {
            doc.setDrawColor(0, 0, 0);       // Black border
            doc.setLineWidth(0.5);           // Approx 2px width
            const margin = 10;
            const bWidth = pageWidth - margin * 2;
            const bHeight = doc.internal.pageSize.getHeight() - margin * 2;
            doc.rect(margin, margin, bWidth, bHeight, 'S'); // 'S' strokes the path (border only)
        };
        drawPageBorder();

        // 1. Title
        yPos -= 10;
        doc.setFillColor(0, 0, 0);
        doc.rect(leftX, yPos - 8, 180, 16, 'F');
        doc.setFillColor(SUCCESS_COLOR[0], SUCCESS_COLOR[1], SUCCESS_COLOR[2]);
        doc.rect(leftX, yPos - 8, 4, 16, 'F');
        doc.rect(leftX + 176, yPos - 8, 4, 16, 'F');

        if (isUrdu) {
            const titleImg = renderUrduTextAsImage(data.title, 22, [255, 255, 255], 'center'); // Bold heading with white text
            // Box is 16 height, starting at yPos - 8
            const titleCenterY = (yPos - 8) + (16 - titleImg.height) / 2;
            doc.addImage(titleImg.dataUrl, 'PNG', (pageWidth - titleImg.width) / 2, titleCenterY, titleImg.width, titleImg.height);
            yPos += Math.max(16, titleImg.height) + 6;
        } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            const titleText = data.title.toUpperCase();
            const splitTitle = doc.splitTextToSize(titleText, 170);
            doc.text(splitTitle, pageWidth / 2, yPos, { align: "center" });
            yPos += splitTitle.length * 7 + 8;
        }

        doc.setTextColor(0, 0, 0); // Reset text color

        // 2. Clients
        if (isUrdu) {
            const p1Label = renderUrduTextAsImage("فریق اول:", 13, [0, 0, 0], 'right');
            doc.addImage(p1Label.dataUrl, 'PNG', pageWidth - leftX - p1Label.width, yPos, p1Label.width, p1Label.height);

            const p2Label = renderUrduTextAsImage("فریق دوم:", 13, [0, 0, 0], 'right');
            doc.addImage(p2Label.dataUrl, 'PNG', pageWidth - rightX - p2Label.width, yPos, p2Label.width, p2Label.height);
            yPos += 10;

            const p1Name = renderUrduTextAsImage(data.party_one_name, 11, [0, 0, 0], 'right');
            doc.addImage(p1Name.dataUrl, 'PNG', pageWidth - leftX - p1Name.width, yPos, p1Name.width, p1Name.height);

            // Transliterate function to translate English company info to Urdu
            const translateToUrdu = (text: string) => {
                if (!text || /[\u0600-\u06FF]/.test(text)) return text; // If already Urdu, return as is

                let lower = text.toLowerCase().trim();

                // Specific matches overrides
                if (lower.includes("ameer") && lower.includes("hamza")) {
                    return "امیر حمزہ ڈویلپرز";
                }
                if (lower.includes("miran") && lower.includes("builder")) {
                    return text.replace(new RegExp("miran builders", "ig"), "میران بلڈرز");
                }
                if (lower.includes("jubilee town")) {
                    return "A-9 جوبلی ٹاؤن، لاہور";
                }
                if (lower.includes("lda avenue") || lower.includes("386")) {
                    return "آفس نمبر 386، ایل ڈی اے ایونیو ون، رائیونڈ روڈ، لاہور";
                }

                // General words mapping for other companies
                const wordMap: Record<string, string> = {
                    "ameer": "امیر", "hamza": "حمزہ", "developers": "ڈویلپرز", "developer": "ڈویلپر",
                    "miran": "میران", "builders": "بلڈرز", "builder": "بلڈر", "associates": "ایسوسی ایٹس",
                    "construction": "کنسٹرکشن", "company": "کمپنی", "town": "ٹاؤن", "lahore": "لاہور",
                    "karachi": "کراچی", "islamabad": "اسلام آباد", "road": "روڈ", "street": "سٹریٹ",
                    "house": "مکان", "office": "آفس", "no": "نمبر", "block": "بلاک", "phase": "فیز",
                    "city": "سٹی", "housing": "ہاؤسنگ", "scheme": "سکیم", "avenue": "ایونیو",
                    "jubilee": "جوبلی", "lda": "ایل ڈی اے", "group": "گروپ", "enterprises": "انٹرپرائزز"
                };

                let translated = text;
                Object.keys(wordMap).forEach(enWord => {
                    const regex = new RegExp(`\\b${enWord}\\b`, "ig");
                    translated = translated.replace(regex, wordMap[enWord]);
                });

                return translated;
            };

            let defaultUrduName = profile?.name || "میران بلڈرز";
            let defaultUrduAddress = profile?.address;

            if (defaultUrduName.toLowerCase().includes("ameer") && defaultUrduName.toLowerCase().includes("hamza")) {
                let checkAddress = (defaultUrduAddress || "").toLowerCase();
                if (!checkAddress || checkAddress.includes("lda") || checkAddress.includes("386")) {
                    defaultUrduAddress = "A-9 جوبلی ٹاؤن، لاہور";
                }
            } else if (!defaultUrduAddress) {
                defaultUrduAddress = "آفس نمبر 386، ایل ڈی اے ایونیو ون، رائیونڈ روڈ، لاہور";
            }

            let companyNameUrdu = translateToUrdu(defaultUrduName);
            let companyAddressUrdu = translateToUrdu(defaultUrduAddress);

            const p2Name = renderUrduTextAsImage(companyNameUrdu, 11, [0, 0, 0], 'right');
            doc.addImage(p2Name.dataUrl, 'PNG', pageWidth - rightX - p2Name.width, yPos, p2Name.width, p2Name.height);
            yPos += p1Name.height + 2;

            const p1Details = data.party_one_details || "";
            let p1DetHeight = 0;
            if (p1Details) {
                const lines = p1Details.split('\n');
                let currY = yPos;
                for (let line of lines) {
                    const lImg = renderUrduTextAsImage(line.trim(), 12, [80, 80, 80], 'right'); // Increased font
                    if (lImg.width > 0) {
                        doc.addImage(lImg.dataUrl, 'PNG', pageWidth - leftX - lImg.width, currY, lImg.width, lImg.height);
                        currY += lImg.height + 4; // increased spacing
                    }
                }
                p1DetHeight = currY - yPos;
            }

            // Use the companyAddressUrdu determined above
            const p2AddrImg = renderUrduTextAsImage(companyAddressUrdu, 12, [80, 80, 80], 'right'); // Increased font
            doc.addImage(p2AddrImg.dataUrl, 'PNG', pageWidth - rightX - p2AddrImg.width, yPos, p2AddrImg.width, p2AddrImg.height);
            yPos += Math.max(p1DetHeight, p2AddrImg.height) + 12;
        } else {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Client 1:", leftX, yPos);
            doc.text("Client 2:", rightX, yPos);
            yPos += 6;

            doc.setFontSize(11);
            const p1NameLines = doc.splitTextToSize(data.party_one_name, 85);
            doc.text(p1NameLines, leftX, yPos);

            const companyName = profile?.name || "Miran Builders";
            const p2NameLines = doc.splitTextToSize(companyName, 85);
            doc.text(p2NameLines, rightX, yPos);

            let currentYLeft = yPos + p1NameLines.length * 5 + 2;
            let currentYRight = yPos + p2NameLines.length * 5 + 2;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const p1DetailsLines = doc.splitTextToSize(data.party_one_details || "", 85);
            doc.text(p1DetailsLines, leftX, currentYLeft);
            currentYLeft += p1DetailsLines.length * 5;

            const p2Address = profile?.address || "Address: 386-A, LDA Avenue One Scheme, Raiwind Road, Lahore";
            const p2Phone = profile?.phone || "Phone: +92321-9300005";
            const p2AddrLines = doc.splitTextToSize(p2Address, 85);
            doc.text(p2AddrLines, rightX, currentYRight);
            currentYRight += p2AddrLines.length * 5;
            doc.text(p2Phone, rightX, currentYRight);
            currentYRight += 5;
            yPos = Math.max(currentYLeft, currentYRight) + 12;
        }

        // Colors setup
        const THEME_BG = [0, 0, 0];
        const THEME_TEXT = [255, 255, 255];
        const NUMBER_COLORS = [[37, 99, 235], [220, 38, 38], [22, 163, 74], [202, 138, 4], [147, 51, 234], [234, 88, 12], [13, 148, 136]];

        const drawSection = (title: string, items: string[]) => {
            if (yPos > 240) {
                doc.addPage();
                drawPageBorder(); // Re-apply border for new page
                yPos = 20;
            }

            // Heading background element
            doc.setFillColor(THEME_BG[0], THEME_BG[1], THEME_BG[2]);
            doc.rect(leftX, yPos, 180, 10, 'F');

            // Decorative blank sides for heading
            doc.setFillColor(SUCCESS_COLOR[0], SUCCESS_COLOR[1], SUCCESS_COLOR[2]); // Emerald accent
            doc.rect(leftX, yPos, 4, 10, 'F');
            doc.rect(leftX + 176, yPos, 4, 10, 'F');

            if (isUrdu) {
                const titleImg = renderUrduTextAsImage(title, 16, THEME_TEXT, 'center'); // Bigger heading
                // Box start is yPos, height is 10. Center vertically
                const titleCenterY = yPos + (10 - titleImg.height) / 2;
                doc.addImage(titleImg.dataUrl, 'PNG', (pageWidth - titleImg.width) / 2, titleCenterY, titleImg.width, titleImg.height);
            } else {
                doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(THEME_TEXT[0], THEME_TEXT[1], THEME_TEXT[2]);
                doc.text(title, pageWidth / 2, yPos + 7, { align: "center" });
            }
            yPos += 14; // Minimal space underneath heading

            if (!items || items.length === 0) {
                doc.text(isUrdu ? "" : "No details defined.", leftX + 5, yPos);
                yPos += 8;
            } else {
                items.forEach((item: string, index: number) => {
                    const lineSpacing = isUrdu ? 12 : 6;

                    if (yPos > 270) {
                        doc.addPage();
                        drawPageBorder(); // Re-apply border for new page
                        yPos = 20;
                    }

                    if (isUrdu) {
                        const fullText = `${index + 1}.   ${item}`; // Space after number
                        const itemImg = renderUrduTextAsImage(fullText, 14, [0, 0, 0], 'right'); // Font increased further

                        const rightPaddingX = pageWidth - leftX - 10;

                        if (itemImg.width > 165) {
                            doc.addImage(itemImg.dataUrl, 'PNG', rightPaddingX - 165, yPos, 165, itemImg.height);
                        } else {
                            doc.addImage(itemImg.dataUrl, 'PNG', rightPaddingX - itemImg.width, yPos, itemImg.width, itemImg.height);
                        }
                        yPos += itemImg.height + 2; // Optimal spacing

                    } else {
                        const numColor = NUMBER_COLORS[index % NUMBER_COLORS.length];
                        doc.setTextColor(numColor[0], numColor[1], numColor[2]);
                        doc.setFont("helvetica", "bold");
                        const numText = `${index + 1}. `;
                        const numWidth = doc.getTextWidth(numText);
                        doc.text(numText, leftX + 5, yPos);

                        doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
                        const splitLines = doc.splitTextToSize(item, 170 - numWidth);
                        doc.text(splitLines, leftX + 5 + numWidth, yPos);
                        yPos += splitLines.length * lineSpacing + 2;
                    }
                });
            }
            yPos += 4; // Minimal space after section
        };

        const sectionsToDraw = [];
        if (data.scope_of_work && !Array.isArray(data.scope_of_work) && data.scope_of_work.is_dynamic) {
            sectionsToDraw.push(...data.scope_of_work.sections);
        } else {
            sectionsToDraw.push({ heading: data.scope_heading || (isUrdu ? "ورک سکوپ" : "Scope of Work"), items: Array.isArray(data.scope_of_work) ? data.scope_of_work : [] });
            sectionsToDraw.push({ heading: data.rates_heading || (isUrdu ? "ادائیگی کی شرح" : "Rates of Work"), items: Array.isArray(data.rates_of_work) ? data.rates_of_work : [] });
            sectionsToDraw.push({ heading: data.payment_heading || (isUrdu ? "ادائیگی کا طریقہ کار" : "Payment Schedule"), items: Array.isArray(data.payment_schedule) ? data.payment_schedule : [] });
        }

        for (const section of sectionsToDraw) {
            if (section.items && section.items.length > 0 && section.items[0] !== '') {
                drawSection(section.heading, section.items);
            }
        }

        // Signatures
        yPos = Math.max(yPos + 5, 235); // Decreased minimum height push
        if (yPos > 260) {
            doc.addPage();
            drawPageBorder(); // Re-apply border for new page
            yPos = 20;
        }

        if (isUrdu) {
            const sig1Label = renderUrduTextAsImage("فریق اول کے دستخط / انگوٹھا", 12, [0, 0, 0], 'center');

            const sig2Title = renderUrduTextAsImage("CEO", 12, [0, 0, 0], 'center');
            const sig2Name1 = renderUrduTextAsImage("Adnan", 12, [0, 0, 0], 'center');
            const sig2Name2 = renderUrduTextAsImage("Zafar", 12, [0, 0, 0], 'center');

            doc.setLineWidth(0.3);
            doc.line(25, yPos, 75, yPos); // Condensed lines
            doc.line(135, yPos, 185, yPos);

            doc.addImage(sig1Label.dataUrl, 'PNG', 50 - (sig1Label.width / 2), yPos + 2, sig1Label.width, sig1Label.height);

            // Tighter spacing for CEO details
            doc.addImage(sig2Title.dataUrl, 'PNG', 160 - (sig2Title.width / 2), yPos + 1, sig2Title.width, sig2Title.height);
            doc.addImage(sig2Name1.dataUrl, 'PNG', 160 - (sig2Name1.width / 2), yPos + 6, sig2Name1.width, sig2Name1.height);
            doc.addImage(sig2Name2.dataUrl, 'PNG', 160 - (sig2Name2.width / 2), yPos + 11, sig2Name2.width, sig2Name2.height);
        } else {
            doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text("_______________________", 20, yPos);
            doc.text("_______________________", 130, yPos);
            doc.text("Client 1 Signature/Thumb", 20, yPos + 8);
            doc.text("CEO\nAdnan\nZafar", 160, yPos + 8, { align: 'center' });
        }

        if (showStamp && profile?.stamp_url) {
            try {
                const stampBase64 = await getBase64ImageFromURL(profile.stamp_url);
                doc.addImage(stampBase64, getImageFormat(stampBase64), 160 - 15, yPos - 30, 30, 30);
            } catch (e) { }
        }

        const titleStr = data.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        await saveOrMergePDF(doc, profile, `Agreement_${titleStr}_${language.toUpperCase()}.pdf`);
    } catch (error) {
        console.error("Error generating Agreement PDF:", error);
        throw error;
    }
};
