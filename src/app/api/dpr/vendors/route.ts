import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const vendors = await db.prepare('SELECT * FROM dpr_vendors WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(vendors);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const id = uuidv4();
        await db.prepare('INSERT INTO dpr_vendors (id, name, company_id, created_at) VALUES (?, ?, ?, ?)').run(
            id, name, companyId, new Date().toISOString()
        );

        return NextResponse.json({ id, name });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
