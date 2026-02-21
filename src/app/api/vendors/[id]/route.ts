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
        const { name, phone, address, category } = body;

        const stmt = await db.prepare(`
            UPDATE vendors 
            SET name = ?, phone = ?, address = ?, category = ?
            WHERE id = ? AND company_id = ?
        `);

        const result = await stmt.run(name, phone, address, category, id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }

        // Fetch and return the updated vendor
        const updatedVendor = await db.prepare('SELECT * FROM vendors WHERE id = ? AND company_id = ?').get(id, companyId);
        return NextResponse.json(updatedVendor);
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
        const result = await db.prepare('DELETE FROM vendors WHERE id = ? AND company_id = ?').run(id, companyId);
        if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
