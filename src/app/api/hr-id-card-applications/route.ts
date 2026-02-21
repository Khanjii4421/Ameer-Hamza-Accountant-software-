import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_id_card_applications WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(records);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const body = await request.json();

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_id_card_applications (
                id, name, designation, department, joining_date, dob,
                blood_group, issue_date, nic_no, contact_no, employee_code,
                photo_url, signature_url,
                company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, body.name, body.designation, body.department, body.joining_date, body.dob,
            body.blood_group, body.issue_date, body.nic_no, body.contact_no, body.employee_code,
            body.photo_url || null, body.signature_url || null,
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
