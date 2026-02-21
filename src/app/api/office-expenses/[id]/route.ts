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
        const { description, amount, category, date, proof_url, is_paid, payment_date } = body;

        const stmt = await db.prepare(`
        UPDATE office_expenses
        SET description = COALESCE(?, description),
            amount = COALESCE(?, amount),
            category = COALESCE(?, category),
            date = COALESCE(?, date),
            proof_url = COALESCE(?, proof_url),
            is_paid = COALESCE(?, is_paid),
            payment_date = COALESCE(?, payment_date)
        WHERE id = ? AND company_id = ?
        RETURNING *
    `);

        const updated = await stmt.get(description, amount, category, date, proof_url, is_paid !== undefined ? (is_paid ? 1 : 0) : null, payment_date, id, companyId);
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(updated);
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
        const result = await db.prepare('DELETE FROM office_expenses WHERE id = ? AND company_id = ?').run(id, companyId);
        if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
