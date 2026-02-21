import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const documents = await db.prepare(`
            SELECT * FROM hr_resignation_letters 
            ORDER BY created_at DESC
        `).all();
        return NextResponse.json(documents);
    } catch (error: any) {
        console.error('Error fetching resignation letters:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        const result = await db.prepare(`
            INSERT INTO hr_resignation_letters (
                id, employee_name, designation, employee_id, resignation_date,
                last_working_day, reason, contact_number, email,
                company_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            crypto.randomUUID(),
            data.employee_name,
            data.designation,
            data.employee_id || '',
            data.resignation_date,
            data.last_working_day,
            data.reason || '',
            data.contact_number || '',
            data.email || '',
            'default-company'
        );

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid,
            message: 'Resignation letter saved successfully'
        });
    } catch (error: any) {
        console.error('Error saving resignation letter:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
