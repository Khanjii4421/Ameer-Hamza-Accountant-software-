import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const data = await request.json();
        const { id } = await params;
        const { sr_no, date, weather, vendor_id, labor_ids, work_id, inches, sft, remarks, rate, total_balance } = data;

        await db.prepare(`
            UPDATE dpr_entries SET
                sr_no = ?, date = ?, weather = ?, vendor_id = ?, labor_ids = ?, 
                work_id = ?, inches = ?, sft = ?, remarks = ?, rate = ?, 
                total_balance = ?
            WHERE id = ? AND company_id = ?
        `).run(
            sr_no, date, weather, vendor_id, JSON.stringify(labor_ids || []), work_id,
            inches, sft, remarks, rate, total_balance, id, companyId
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;
        const result = await db.prepare('DELETE FROM dpr_entries WHERE id = ? AND company_id = ?').run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
