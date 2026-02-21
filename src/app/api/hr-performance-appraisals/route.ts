import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_performance_appraisals WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(records);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const body = await request.json();

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_performance_appraisals (
                id, employee_name, employee_code, department, designation, joining_date,
                present_position_time, year_covered, appraisal_date, appraiser_name, appraiser_designation,
                appraisal_type, ratings, issues, task_assigned, task_status,
                additional_comments, recommended_training, appraiser_comments, hr_comments,
                company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, body.employee_name, body.employee_code, body.department, body.designation, body.joining_date,
            body.present_position_time, body.year_covered, body.appraisal_date, body.appraiser_name, body.appraiser_designation,
            body.appraisal_type, JSON.stringify(body.ratings), body.issues, body.task_assigned, body.task_status,
            body.additional_comments, body.recommended_training, body.appraiser_comments, body.hr_comments,
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

