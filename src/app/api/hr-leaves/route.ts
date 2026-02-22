import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const status = url.searchParams.get('status');

        let query = `SELECT * FROM hr_leaves WHERE company_id = ?`;
        const params: any[] = [companyId];

        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }

        query += ` ORDER BY from_date DESC`;
        const records = await db.prepare(query).all(...params);
        return NextResponse.json(records);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { employee_id, employee_name, from_date, to_date, reason, days_count, leave_type } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const leaveInsert = await db.prepare(`
            INSERT INTO hr_leaves (
                id, employee_id, employee_name, from_date, to_date, reason, 
                status, days_count, company_id, created_at, leave_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await leaveInsert.run(
            id, employee_id, employee_name, from_date, to_date, reason,
            'Pending', days_count, companyId, created_at, leave_type || 'Full'
        );

        try {
            const notifId = uuidv4();
            await db.prepare(`
                INSERT INTO notifications (id, title, message, type, related_id, is_read, created_at, company_id)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            `).run(
                notifId,
                'New Leave Request 📝',
                `${employee_name} has applied for ${leave_type || 'Full'} Day leave from ${from_date} to ${to_date} (${days_count} days).`,
                'info',
                id,
                created_at,
                companyId
            );
        } catch (e) {
            console.error('Failed to create notification', e);
        }

        return NextResponse.json({ id, message: 'Leave applied successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        return NextResponse.json({ error: 'Use /api/hr-leaves/[id] endpoint' }, { status: 405 });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
