import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_employees WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
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
            employee_name, father_name, designation, department, cnic,
            contact, email, address, joining_date, basic_salary,
            house_rent, medical_allowance, transport_allowance,
            other_allowance, bank_name, bank_account_no, status
        } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const countRes: any = await db.prepare('SELECT COUNT(*) as c FROM hr_employees WHERE company_id = ?').get(companyId);
        const nextNum = (countRes.c || 0) + 1;
        const employee_id_str = `EMP-${String(nextNum).padStart(3, '0')}`;

        const stmt = db.prepare(`
            INSERT INTO hr_employees (
                id, employee_id_str, employee_name, father_name, designation, department, cnic,
                contact, email, address, joining_date, basic_salary,
                house_rent, medical_allowance, transport_allowance,
                other_allowance, bank_name, bank_account_no, status,
                company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, employee_id_str, employee_name, father_name, designation, department, cnic,
            contact, email, address, joining_date, basic_salary || 0,
            house_rent || 0, medical_allowance || 0, transport_allowance || 0,
            other_allowance || 0, bank_name, bank_account_no, status || 'Active',
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
