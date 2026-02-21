import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;
        const body = await request.json();
        const { description, amount, category, site_id, vendor_id, date, is_paid, payment_date, proof_url, worker_name } = body;

        const stmt = db.prepare(`
            UPDATE labor_expenses
            SET description = COALESCE(?, description),
                amount = COALESCE(?, amount),
                category = COALESCE(?, category),
                site_id = COALESCE(?, site_id),
                vendor_id = COALESCE(?, vendor_id),
                date = COALESCE(?, date),
                is_paid = COALESCE(?, is_paid),
                payment_date = COALESCE(?, payment_date),
                proof_url = COALESCE(?, proof_url),
                worker_name = COALESCE(?, worker_name)
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        // Convert boolean to integer for SQLite if necessary
        const isPaidInt = is_paid === undefined ? undefined : (is_paid ? 1 : 0);

        const result = await stmt.get(description, amount, category, site_id, vendor_id, date, isPaidInt, payment_date, proof_url, worker_name, id, companyId);

        if (!result) {
            return NextResponse.json({ error: 'Expense not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;
        const stmt = db.prepare('DELETE FROM labor_expenses WHERE id = ? AND company_id = ?');
        const result = await stmt.run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Expense not found or not authorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
