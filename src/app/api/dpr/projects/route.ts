import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const projects = await db.prepare('SELECT * FROM dpr_projects WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(projects);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { name, contractor_name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

        const id = uuidv4();
        await db.prepare('INSERT INTO dpr_projects (id, name, contractor_name, company_id, created_at) VALUES (?, ?, ?, ?, ?)').run(
            id, name, contractor_name || '', companyId, new Date().toISOString()
        );

        return NextResponse.json({ id, name, contractor_name });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
