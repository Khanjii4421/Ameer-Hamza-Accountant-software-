import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

        const entries = await db.prepare(`
            SELECT e.*, v.name as vendor_name, w.name as work_name
            FROM dpr_entries e
            LEFT JOIN dpr_vendors v ON e.vendor_id = v.id
            LEFT JOIN dpr_works w ON e.work_id = w.id
            WHERE e.company_id = ? AND e.project_id = ?
            ORDER BY e.sr_no ASC
        `).all(companyId, projectId);

        // Parse labor_ids for each entry
        const processedEntries = entries.map((e: any) => ({
            ...e,
            labor_ids: e.labor_ids ? JSON.parse(e.labor_ids) : []
        }));

        return NextResponse.json(processedEntries);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const data = await request.json();
        const { project_id, sr_no, date, weather, vendor_id, labor_ids, work_id, inches, sft, remarks, rate, total_balance } = data;

        const id = uuidv4();
        await db.prepare(`
            INSERT INTO dpr_entries (
                id, project_id, sr_no, date, weather, vendor_id, labor_ids, work_id, 
                inches, sft, remarks, rate, total_balance, company_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, project_id, sr_no, date, weather, vendor_id, JSON.stringify(labor_ids || []), work_id,
            inches, sft, remarks, rate, total_balance, companyId, new Date().toISOString()
        );

        return NextResponse.json({ id, ...data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
