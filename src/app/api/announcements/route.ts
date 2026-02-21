import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all announcements for the company
export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const announcements = await db.prepare(`
            SELECT * FROM announcements 
            WHERE company_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        `).all(companyId);

        return NextResponse.json(announcements);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create a new announcement (Admin)
export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { title, message, type = 'announcement', holiday_date } = body;

        if (!title || !message) return NextResponse.json({ error: 'Title and message required' }, { status: 400 });

        const id = uuidv4();
        const created_at = new Date().toISOString();

        await db.prepare(`
            INSERT INTO announcements (id, title, message, type, holiday_date, company_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, title, message, type, holiday_date || null, companyId, created_at);

        // Also push as a notification so all employees see it in their bell
        const notifId = uuidv4();
        const icon = type === 'holiday' ? '🏖️' : type === 'urgent' ? '🚨' : '📢';
        await db.prepare(`
            INSERT INTO notifications (id, title, message, type, related_id, is_read, created_at, company_id)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `).run(notifId, `${icon} ${title}`, message, 'info', id, created_at, companyId);

        return NextResponse.json({ id, success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE an announcement
export async function DELETE(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await db.prepare('DELETE FROM announcements WHERE id = ? AND company_id = ?').run(id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
