import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Notice params is a Promise
) {
    // Resolve params promise
    const { id } = await context.params;

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
            id
        );

        return NextResponse.json({ success: true, message: 'Leave application updated successfully' });
    } catch (error: any) {
        console.error('Error updating leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.prepare('DELETE FROM hr_leave_applications WHERE id = ?').run(id);
        return NextResponse.json({ success: true, message: 'Leave application deleted' });
    } catch (error: any) {
        console.error('Error deleting leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
