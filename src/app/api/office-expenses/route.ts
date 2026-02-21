import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const expenses = await db.prepare('SELECT * FROM office_expenses WHERE company_id = ? ORDER BY date DESC').all(companyId);
        return NextResponse.json(expenses);
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
        const { description, amount, category, date, created_by, proof_url, is_paid, payment_date } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO office_expenses (id, description, amount, category, date, created_by, company_id, created_at, proof_url, is_paid, payment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

        const result = await stmt.get(id, description, amount, category, date, created_by, companyId, created_at, proof_url, is_paid ? 1 : 0, payment_date);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
