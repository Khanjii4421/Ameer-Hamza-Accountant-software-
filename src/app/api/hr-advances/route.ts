import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const employeeId = url.searchParams.get('employee_id');

        let records;
        if (employeeId) {
            records = await db.prepare(`
                SELECT a.*, e.employee_name
                FROM hr_advances a
                LEFT JOIN hr_employees e ON a.employee_id = e.id
                WHERE a.company_id = ? AND a.employee_id = ?
                ORDER BY a.date DESC
            `).all(companyId, employeeId);
        } else {
            records = await db.prepare(`
                SELECT a.*, e.employee_name
                FROM hr_advances a
                LEFT JOIN hr_employees e ON a.employee_id = e.id
                WHERE a.company_id = ?
                ORDER BY a.date DESC
            `).all(companyId);
        }

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
        const { employee_id, amount, date, reason, deducted } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_advances (
                id, employee_id, amount, date, reason, deducted, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, employee_id, amount || 0, date, reason, deducted ? 1 : 0,
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
