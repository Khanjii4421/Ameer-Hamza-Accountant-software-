import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_joining_reports WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
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
        const {
            employee_name, father_name, designation, joining_date,
            address, contact, cnic
        } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_joining_reports (
                id, employee_name, father_name, designation, joining_date, 
                address, contact, cnic, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, employee_name, father_name, designation, joining_date,
            address, contact, cnic, companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
