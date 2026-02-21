import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        const body = await request.json();
        const { amount, date, reason, deducted } = body;

        const stmt = await db.prepare(`
            UPDATE hr_advances SET amount = ?, date = ?, reason = ?, deducted = ?
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        const result = await stmt.get(amount, date, reason, deducted ? 1 : 0, params.id, companyId);
        if (!result) return NextResponse.json({ error: 'Advance not found' }, { status: 404 });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        await db.prepare('DELETE FROM hr_advances WHERE id = ? AND company_id = ?').run(params.id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
