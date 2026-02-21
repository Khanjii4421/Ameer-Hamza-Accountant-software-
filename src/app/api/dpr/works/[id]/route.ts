import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;

        // Perform deletes
        await db.prepare('UPDATE dpr_entries SET work_id = NULL WHERE work_id = ? AND company_id = ?').run(id, companyId);
        await db.prepare('DELETE FROM dpr_rates WHERE work_id = ? AND company_id = ?').run(id, companyId);
        const result = await db.prepare('DELETE FROM dpr_works WHERE id = ? AND company_id = ?').run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Work type not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
