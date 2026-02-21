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
        const { title, description, location, status, client_id, start_date, end_date } = body;

        const stmt = await db.prepare(`
        UPDATE projects
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            location = COALESCE(?, location),
            status = COALESCE(?, status),
            client_id = COALESCE(?, client_id),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date)
        WHERE id = ? AND company_id = ?
        RETURNING *
    `);

        const updated = await stmt.get(title, description, location, status, client_id, start_date, end_date, id, companyId);
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(updated);
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
        const result = await db.prepare('DELETE FROM projects WHERE id = ? AND company_id = ?').run(id, companyId);
        if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
