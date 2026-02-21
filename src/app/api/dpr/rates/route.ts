import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const rates = await db.prepare('SELECT * FROM dpr_rates WHERE company_id = ?').all(companyId);
        return NextResponse.json(rates);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { project_id, vendor_id, work_id, rate } = await request.json();
        if (!project_id || !vendor_id || !work_id || !rate) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const id = uuidv4();
        await db.prepare('INSERT INTO dpr_rates (id, project_id, vendor_id, work_id, rate, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            id, project_id, vendor_id, work_id, rate, companyId, new Date().toISOString()
        );

        return NextResponse.json({ id, project_id, vendor_id, work_id, rate });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
