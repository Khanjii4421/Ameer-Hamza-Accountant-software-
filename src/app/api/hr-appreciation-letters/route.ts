import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const documents = await db.prepare(`
            SELECT * FROM hr_appreciation_letters 
            ORDER BY created_at DESC
        `).all();
        return NextResponse.json(documents);
    } catch (error: any) {
        console.error('Error fetching appreciation letters:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        const result = await db.prepare(`
            INSERT INTO hr_appreciation_letters (
                id, employee_name, designation, letter_date,
                achievement, company_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            crypto.randomUUID(),
            data.employee_name,
            data.designation,
            data.letter_date,
            data.achievement || '',
            'default-company'
        );

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid,
            message: 'Appreciation letter saved successfully'
        });
    } catch (error: any) {
        console.error('Error saving appreciation letter:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
