import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const labors = await db.prepare('SELECT * FROM dpr_labors WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(labors);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { name, vendor_id, role } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const id = uuidv4();
        await db.prepare('INSERT INTO dpr_labors (id, name, vendor_id, role, company_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
            id, name, vendor_id || null, role || null, companyId, new Date().toISOString()
        );

        return NextResponse.json({ id, name, vendor_id, role });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
