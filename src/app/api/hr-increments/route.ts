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
                SELECT i.*, e.employee_name
                FROM hr_increments i
                LEFT JOIN hr_employees e ON i.employee_id = e.id
                WHERE i.company_id = ? AND i.employee_id = ?
                ORDER BY i.effective_date DESC
            `).all(companyId, employeeId);
        } else {
            records = await db.prepare(`
                SELECT i.*, e.employee_name
                FROM hr_increments i
                LEFT JOIN hr_employees e ON i.employee_id = e.id
                WHERE i.company_id = ?
                ORDER BY i.effective_date DESC
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
        const {
            employee_id, previous_salary, new_salary, increment_amount,
            increment_type, effective_date, reason
        } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_increments (
                id, employee_id, previous_salary, new_salary, increment_amount,
                increment_type, effective_date, reason, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, employee_id, previous_salary || 0, new_salary || 0, increment_amount || 0,
            increment_type || 'Fixed', effective_date, reason,
            companyId, created_at
        );

        // Also update employee's basic salary
        if (new_salary) {
            db.prepare('UPDATE hr_employees SET basic_salary = ? WHERE id = ? AND company_id = ?')
                .run(new_salary, employee_id, companyId);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
