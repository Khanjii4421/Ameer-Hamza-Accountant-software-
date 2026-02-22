import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { status } = body; // 'Approved' | 'Rejected'
        const { id } = await params;

        // ✅ FIX: Use .run() first, then .get() to avoid JSON serialization issues
        await db.prepare(`UPDATE hr_leaves SET status = ? WHERE id = ? AND company_id = ?`).run(status, id, companyId);
        const result = await db.prepare(`SELECT * FROM hr_leaves WHERE id = ?`).get(id) as any;

        if (!result) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });

        // Send notification to employee about the decision
        if (status === 'Approved' || status === 'Rejected') {
            try {
                const icon = status === 'Approved' ? '✅' : '❌';
                const notifId = uuidv4();
                await db.prepare(`
                    INSERT INTO notifications (id, title, message, type, related_id, is_read, created_at, user_id, company_id)
                    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
                `).run(
                    notifId,
                    `${icon} Leave ${status}`,
                    `Your leave request from ${result.from_date} to ${result.to_date} has been ${status.toLowerCase()} by Admin.`,
                    status === 'Approved' ? 'success' : 'error',
                    id,
                    new Date().toISOString(),
                    result.employee_id || null,
                    companyId
                );
            } catch (e) {
                console.error('Failed to create leave status notification:', e);
            }
        }

        return NextResponse.json({ success: true, leave: result });
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
        await db.prepare('DELETE FROM hr_leaves WHERE id = ? AND company_id = ?').run(id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
