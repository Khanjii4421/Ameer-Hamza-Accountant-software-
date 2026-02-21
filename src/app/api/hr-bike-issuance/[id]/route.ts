import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

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

        // 1. Get record for photo path
        const record = await db.prepare('SELECT * FROM hr_bike_issuance WHERE id = ? AND company_id = ?').get(id, companyId) as any;

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // 2. Delete photo if exists
        if (record.photo_url) {
            try {
                const cleanPath = record.photo_url.startsWith('/') ? record.photo_url.substring(1) : record.photo_url;
                const absolutePath = path.join(process.cwd(), 'public', cleanPath);
                await unlink(absolutePath);
            } catch (e) {
                console.error("Failed to delete photo:", e);
            }
        }

        // 3. Delete record
        const result = await db.prepare(`
            DELETE FROM hr_bike_issuance 
            WHERE id = ? AND company_id = ?
        `).run(id, companyId);

        return NextResponse.json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
