import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const stmt = db.prepare(`
            SELECT * FROM independent_expenses
            WHERE company_id = ?
            ORDER BY CAST(sr_no AS INTEGER) DESC
        `);
        const expenses = await stmt.all(companyId);
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
        const { sr_no, name, vendor_name, vendor_category, site, date, description, amount, slip_url } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO independent_expenses (id, sr_no, name, vendor_name, vendor_category, site, date, description, amount, slip_url, company_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(id, sr_no, name, vendor_name, vendor_category, site, date, description, amount, slip_url, companyId, created_at);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
