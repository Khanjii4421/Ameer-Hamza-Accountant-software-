
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        let companyId = req.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const body = await req.json();
        const { date, project_id, weather, description, work_description, feet, employee_id, expenses, expense_description } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO daily_work_logs (id, date, project_id, weather, description, work_description, feet, company_id, created_at, employee_id, expenses, expense_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.run(id, date, project_id, weather, description, work_description, feet, companyId, created_at, employee_id || null, expenses || 0, expense_description || '');

        return NextResponse.json({ id, message: 'Log created successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create log' }, { status: 500 });
    }
}
