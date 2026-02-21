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
        const { sr_no, name, vendor_name, vendor_category, site, date, description, amount, slip_url } = body;

        const stmt = await db.prepare(`
            UPDATE independent_expenses 
            SET sr_no = ?, name = ?, vendor_name = ?, vendor_category = ?, site = ?, date = ?, description = ?, amount = ?, slip_url = ?
            WHERE id = ? AND company_id = ?
        `);

        const result = await stmt.run(sr_no, name, vendor_name, vendor_category, site, date, description, amount, slip_url, id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const updated = await db.prepare('SELECT * FROM independent_expenses WHERE id = ? AND company_id = ?').get(id, companyId);
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
        const result = await db.prepare('DELETE FROM independent_expenses WHERE id = ? AND company_id = ?').run(id, companyId);
        if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
