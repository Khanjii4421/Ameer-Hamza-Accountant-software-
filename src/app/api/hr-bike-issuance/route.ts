import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_bike_issuance WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
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
            INSERT INTO hr_bike_issuance (
                id, ref_no, date, employee_name, father_name, designation,
                cnic, contact, bike_number, chassis_number, engine_number,
                issuance_date, photo_url, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, body.ref_no, body.date, body.employee_name, body.father_name, body.designation,
            body.cnic, body.contact, body.bike_number, body.chassis_number, body.engine_number,
            body.issuance_date, body.photo_url || null,
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
