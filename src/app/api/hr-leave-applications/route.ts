import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const documents = await db.prepare(`
            SELECT * FROM hr_leave_applications 
            ORDER BY created_at DESC


        `).all();
        return NextResponse.json(documents);
    } catch (error: any) {
        console.error('Error fetching leave applications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        const result = await db.prepare(`
            INSERT INTO hr_leave_applications (
                id, employee_name, designation, department, leave_type,
                start_date, end_date, total_days, reason,
                contact_number, contact_number_2, backup_person,
                application_date, company_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            crypto.randomUUID(),
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
            'default-company' // TODO: Get from session
        );

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid,
            message: 'Leave application saved successfully'
        });
    } catch (error: any) {
        console.error('Error saving leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
