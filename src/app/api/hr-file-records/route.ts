import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_file_records WHERE company_id = ? ORDER BY created_at DESC').all(companyId);

        // Parse JSON strings back to objects
        const parsedRecords = records.map((record: any) => ({
            ...record,
            checklist_data: record.checklist_data ? JSON.parse(record.checklist_data) : {},
            document_paths: record.document_paths ? JSON.parse(record.document_paths) : {}
        }));

        return NextResponse.json(parsedRecords);
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
        const {
            employee_name, designation, date_of_joining, department,
            checked_by_name, checked_by_designation, checked_by_date,
            checklist_data, document_paths
        } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO hr_file_records (
                id, employee_name, designation, date_of_joining, department,
                checked_by_name, checked_by_designation, checked_by_date,
                checklist_data, document_paths, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result: any = await stmt.get(
            id, employee_name, designation, date_of_joining, department,
            checked_by_name, checked_by_designation, checked_by_date,
            JSON.stringify(checklist_data || {}),
            JSON.stringify(document_paths || {}),
            companyId, created_at
        );

        // Parse back for return
        if (result) {
            result.checklist_data = JSON.parse(result.checklist_data);
            result.document_paths = JSON.parse(result.document_paths);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
