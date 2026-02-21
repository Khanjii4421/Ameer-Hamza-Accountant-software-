import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const notifications = await db.prepare(
            'SELECT * FROM notifications WHERE company_id = ? OR company_id IS NULL ORDER BY created_at DESC LIMIT 50'
        ).all(companyId);

        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, markAllRead } = body;

        if (markAllRead) {
            let companyId = request.headers.get('X-Company-ID');
            await db.prepare('UPDATE notifications SET is_read = 1 WHERE company_id = ? OR company_id IS NULL').run(companyId);
        } else {
            if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
            await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
