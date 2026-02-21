import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const id = params.id;
        const body = await request.json();

        // Dynamic update query construction
        const updates: string[] = [];
        const values: any[] = [];
        const allowedFields = [
            'vendor_id', 'client_id', 'project_id', 'date', 'amount',
            'description', 'payment_method', 'transaction_id',
            'cheque_number', 'bank_name', 'proof_url'
        ];

        // Always update updated_at
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(body[field] === '' ? null : body[field]);
            }
        }

        if (updates.length === 1) { // Only updated_at
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        values.push(companyId);

        const stmt = db.prepare(`
            UPDATE labor_payments_received
            SET ${updates.join(', ')}
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        // Apply parameter destructuring for run
        const result = await stmt.get(...values);

        if (!result) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const id = params.id;

        const stmt = db.prepare(`
            DELETE FROM labor_payments_received
            WHERE id = ? AND company_id = ?
        `);

        const info = await stmt.run(id, companyId);

        if (info.changes === 0) {
            return NextResponse.json({ error: 'Payment not found or not authorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
