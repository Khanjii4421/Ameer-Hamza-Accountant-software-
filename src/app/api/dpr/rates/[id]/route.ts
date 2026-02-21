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
        const result = await db.prepare('DELETE FROM dpr_rates WHERE id = ? AND company_id = ?').run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Fixed rate not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Rate deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
