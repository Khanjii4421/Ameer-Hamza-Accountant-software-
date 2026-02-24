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
        const { type, amount, description, payment_method, date, client_id, vendor_id, project_id, transaction_id, received_by, attachment_url } = body;

        const stmt = db.prepare(`
            UPDATE ledger_entries 
            SET type = ?, 
                amount = ?, 
                description = ?, 
                payment_method = ?, 
                date = ?, 
                client_id = ?, 
                vendor_id = ?, 
                project_id = ?,
                transaction_id = ?,
                received_by = ?,
                attachment_url = ?
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        const result = await stmt.get(type, amount, description, payment_method, date, client_id, vendor_id, project_id, transaction_id, received_by, attachment_url, id, companyId);

        if (!result) {
            return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
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

        // First check if the entry exists
        const checkStmt = db.prepare('SELECT * FROM ledger_entries WHERE id = ? AND company_id = ?');
        const entry = await checkStmt.get(id, companyId);

        if (!entry) {
            return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
        }

        // Delete the entry
        const deleteStmt = db.prepare('DELETE FROM ledger_entries WHERE id = ? AND company_id = ?');
        const result = await deleteStmt.run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Failed to delete ledger entry' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Ledger entry deleted successfully' });
    } catch (error: any) {
        console.error('Delete ledger entry error:', error);
        return NextResponse.json({
            error: 'Failed to delete ledger entry',
            details: error.message
        }, { status: 500 });
    }
}
