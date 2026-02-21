import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        await db.prepare('DELETE FROM hr_increments WHERE id = ? AND company_id = ?').run(params.id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
