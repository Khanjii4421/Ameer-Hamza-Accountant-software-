import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const document = await db.prepare(`
            SELECT * FROM hr_leave_applications WHERE id = ?
        `).get(params.id);

        if (!document) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error: any) {
        console.error('Error fetching leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const data = await req.json();

        await db.prepare(`
            UPDATE hr_leave_applications SET
                employee_name = ?,
                designation = ?,
                department = ?,
                leave_type = ?,
                start_date = ?,
                end_date = ?,
                total_days = ?,
                reason = ?,
                contact_number = ?,
                contact_number_2 = ?,
                backup_person = ?,
                application_date = ?
            WHERE id = ?
        `).run(
            data.employee_name,
            data.designation,
            data.department || '',
            data.leave_type,
            data.start_date,
            data.end_date,
            data.total_days,
            data.reason,
            data.contact_number || '',
            data.contact_number_2 || '',
            data.backup_person || '',
            data.application_date,
            params.id
        );

        return NextResponse.json({ success: true, message: 'Leave application updated successfully' });
    } catch (error: any) {
        console.error('Error updating leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await db.prepare(`DELETE FROM hr_leave_applications WHERE id = ?`).run(params.id);
        return NextResponse.json({ success: true, message: 'Leave application deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}