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
        const id = params.id;

        const result = await db.prepare(`
            DELETE FROM hr_joining_reports 
            WHERE id = ? AND company_id = ?
        `).run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
