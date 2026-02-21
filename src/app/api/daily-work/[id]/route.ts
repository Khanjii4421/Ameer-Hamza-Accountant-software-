
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let companyId = req.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;
        const body = await req.json();
        const { date, project_id, weather, description, work_description, feet } = body;

        const stmt = db.prepare(`
            UPDATE daily_work_logs 
            SET date = COALESCE(?, date), 
                project_id = COALESCE(?, project_id), 
                weather = COALESCE(?, weather), 
                description = COALESCE(?, description), 
                work_description = COALESCE(?, work_description), 
                feet = COALESCE(?, feet)
            WHERE id = ? AND company_id = ?
        `);

        // Using COALESCE allows partial updates if we wanted, though strictly the body has all fields often.
        // But here we just pass the values. If body has them, great.
        // Actually the previous implementation passed all values. Let's stick to that but unsafe updates are filtered.

        const result = await stmt.run(date, project_id, weather, description, work_description, feet, id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Log not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Log updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        let companyId = req.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const { id } = await params;
        const stmt = db.prepare('DELETE FROM daily_work_logs WHERE id = ? AND company_id = ?');
        const result = await stmt.run(id, companyId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Log not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Log deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
    }
}
