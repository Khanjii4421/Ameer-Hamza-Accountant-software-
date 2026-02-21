import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        // Left join with projects to get site name and vendors to get vendor name
        const expenses = await db.prepare(`
            SELECT le.*, p.title as site_name, v.name as vendor_name
            FROM labor_expenses le
            LEFT JOIN projects p ON le.site_id = p.id
            LEFT JOIN vendors v ON le.vendor_id = v.id
            WHERE le.company_id = ? 
            ORDER BY le.date DESC
        `).all(companyId);

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
        const { description, amount, category, site_id, vendor_id, date, created_by, proof_url, is_paid, payment_date, worker_name } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();
        const isPaidInt = is_paid === false ? 0 : 1; // Default to paid if not specified

        const stmt = db.prepare(`
      INSERT INTO labor_expenses (id, description, amount, category, site_id, vendor_id, date, created_by, company_id, created_at, proof_url, is_paid, payment_date, worker_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

        const result = await stmt.get(id, description, amount, category, site_id, vendor_id, date, created_by, companyId, created_at, proof_url, isPaidInt, payment_date, worker_name);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
export async function PATCH(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { ids, updates } = await request.json();
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Invalid or empty IDs list' }, { status: 400 });
        }

        const { is_paid, payment_date } = updates;
        const isPaidInt = is_paid === undefined ? undefined : (is_paid ? 1 : 0);

        // Build dynamically if more updates needed, but for now specific to paid all
        const stmt = db.prepare(`
            UPDATE labor_expenses
            SET is_paid = COALESCE(?, is_paid),
                payment_date = COALESCE(?, payment_date)
            WHERE id = ? AND company_id = ?
        `);

        for (const id of ids) {
            await stmt.run(isPaidInt, payment_date, id, companyId);
        }

        return NextResponse.json({ success: true, updatedCount: ids.length });
    } catch (error: any) {
        console.error('Bulk update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
